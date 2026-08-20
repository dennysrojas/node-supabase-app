import { supabaseAdmin } from '../config/supabase.js';
import type { Json } from '../types/database.types.js';

export type AppRoleType = 'CAPTURADOR' | 'SUPERVISOR' | 'ADMIN_GLOBAL' | 'AUDITOR' | 'ADMIN_MODULO';

export interface CreateUserData {
  email: string;
  full_name: string;
  password: string;
  global_role?: AppRoleType;
}

export interface UpdateUserData {
  full_name?: string;
  global_role?: AppRoleType;
  is_active?: boolean;
}

export interface AssignScopeData {
  user_id: string;
  module_code: 'SALES' | 'PYG' | 'SURVEYS' | 'QUALITY';
  store_uid?: string | null;
  zone_code?: string | null;
  role?: AppRoleType;
}

export interface AuditFilterData {
  module_code?: string;
  store_uid?: string;
  user_id?: string;
  action?: string;
  limit?: number;
  offset?: number;
}

export class AdminService {
  /**
   * Listar todos los perfiles de usuario
   */
  static async listUsers(filterRole?: string, filterActive?: boolean) {
    let query = supabaseAdmin
      .from('user_profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (filterRole) {
      query = query.eq('global_role', filterRole as AppRoleType);
    }

    if (filterActive !== undefined) {
      query = query.eq('is_active', filterActive);
    }

    const { data, error } = await query;
    if (error) throw new Error(`Error al listar usuarios: ${error.message}`);
    return data || [];
  }

  /**
   * Obtener perfil de usuario por ID junto con sus alcances asignados
   */
  static async getUserById(userId: string) {
    const { data: profile, error: profileErr } = await supabaseAdmin
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (profileErr || !profile) {
      throw new Error(`Usuario no encontrado con ID: ${userId}`);
    }

    const { data: scopes } = await supabaseAdmin
      .from('user_module_scopes')
      .select('*')
      .eq('user_id', userId);

    return {
      ...profile,
      scopes: scopes || []
    };
  }

  /**
   * Crear nuevo usuario en Supabase Auth y sincronizar perfil en public.user_profiles
   */
  static async createUser(userData: CreateUserData, adminUserId?: string) {
    const globalRole = userData.global_role || 'CAPTURADOR';

    // 1. Crear en Supabase Auth
    const { data: authUser, error: authErr } = await supabaseAdmin.auth.admin.createUser({
      email: userData.email,
      password: userData.password,
      email_confirm: true,
      user_metadata: {
        full_name: userData.full_name
      }
    });

    if (authErr || !authUser.user) {
      throw new Error(`Fallo al crear usuario en Supabase Auth: ${authErr?.message || 'Error desconocido'}`);
    }

    const newUserId = authUser.user.id;

    // 2. Insertar/Actualizar perfil en public.user_profiles
    const { data: profile, error: profileErr } = await supabaseAdmin
      .from('user_profiles')
      .upsert({
        id: newUserId,
        email: userData.email,
        full_name: userData.full_name,
        global_role: globalRole,
        is_active: true
      })
      .select()
      .single();

    if (profileErr) {
      throw new Error(`Error al crear perfil de usuario: ${profileErr.message}`);
    }

    // 3. Registrar log de auditoría
    await this.logAudit({
      user_id: adminUserId || newUserId,
      user_email: userData.email,
      action: 'USER_CREATED',
      details: { created_user_id: newUserId, email: userData.email, global_role: globalRole }
    });

    return profile;
  }

  /**
   * Actualizar perfil de usuario
   */
  static async updateUser(userId: string, updateData: UpdateUserData, adminUserId?: string) {
    const { data, error } = await supabaseAdmin
      .from('user_profiles')
      .update({
        ...updateData,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select()
      .single();

    if (error || !data) {
      throw new Error(`Error al actualizar usuario: ${error?.message || 'Usuario no encontrado'}`);
    }

    // Registrar log de auditoría
    await this.logAudit({
      user_id: adminUserId || userId,
      user_email: data.email,
      action: 'USER_UPDATED',
      details: { updated_user_id: userId, changes: updateData }
    });

    return data;
  }

  /**
   * Listar alcances por usuario o módulo
   */
  static async listScopes(filterUserId?: string, filterModule?: string) {
    let query = supabaseAdmin
      .from('user_module_scopes')
      .select('*')
      .order('created_at', { ascending: false });

    if (filterUserId) {
      query = query.eq('user_id', filterUserId);
    }

    if (filterModule) {
      query = query.eq('module_code', filterModule);
    }

    const { data, error } = await query;
    if (error) throw new Error(`Error al listar alcances: ${error.message}`);
    return data || [];
  }

  /**
   * Asignar nuevo alcance (Usuario x Módulo x Tienda x Rol)
   */
  static async assignScope(scopeData: AssignScopeData, assignedByUserId?: string) {
    const role = scopeData.role || 'CAPTURADOR';
    const storeUid = scopeData.store_uid ?? null;

    const { data, error } = await supabaseAdmin
      .from('user_module_scopes')
      .upsert({
        user_id: scopeData.user_id,
        module_code: scopeData.module_code,
        store_uid: storeUid,
        zone_code: scopeData.zone_code ?? null,
        role: role,
        assigned_by: assignedByUserId ?? null
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Error al asignar alcance: ${error.message}`);
    }

    await this.logAudit({
      user_id: assignedByUserId || scopeData.user_id,
      module_code: scopeData.module_code,
      store_uid: storeUid || undefined,
      action: 'SCOPE_ASSIGNED',
      details: { target_user_id: scopeData.user_id, role, store_uid: storeUid }
    });

    return data;
  }

  /**
   * Revocar alcance por ID
   */
  static async revokeScope(scopeId: string, revokedByUserId?: string) {
    const { data, error } = await supabaseAdmin
      .from('user_module_scopes')
      .delete()
      .eq('id', scopeId)
      .select()
      .single();

    if (error || !data) {
      throw new Error(`Error al revocar alcance: ${error?.message || 'Alcance no encontrado'}`);
    }

    await this.logAudit({
      user_id: revokedByUserId || data.user_id,
      module_code: data.module_code,
      store_uid: data.store_uid || undefined,
      action: 'SCOPE_REVOKED',
      details: { revoked_scope_id: scopeId, target_user_id: data.user_id }
    });

    return data;
  }

  /**
   * Consultar bitácora de auditoría con filtros
   */
  static async queryAuditLogs(filters: AuditFilterData) {
    const limit = filters.limit || 50;
    const offset = filters.offset || 0;

    let query = supabaseAdmin
      .from('audit_logs')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (filters.module_code) {
      query = query.eq('module_code', filters.module_code);
    }
    if (filters.store_uid) {
      query = query.eq('store_uid', filters.store_uid);
    }
    if (filters.user_id) {
      query = query.eq('user_id', filters.user_id);
    }
    if (filters.action) {
      query = query.eq('action', filters.action);
    }

    const { data, error, count } = await query;
    if (error) throw new Error(`Error al consultar logs de auditoría: ${error.message}`);

    return {
      data: data || [],
      total: count || 0,
      limit,
      offset
    };
  }

  /**
   * Registrar evento en bitácora de auditoría
   */
  static async logAudit(payload: {
    user_id?: string;
    user_email?: string;
    user_role?: AppRoleType;
    action: string;
    module_code?: string;
    store_uid?: string;
    details?: Record<string, unknown>;
    ip_address?: string;
  }) {
    try {
      await supabaseAdmin.from('audit_logs').insert({
        user_id: payload.user_id ?? null,
        user_email: payload.user_email ?? null,
        user_role: payload.user_role ?? null,
        action: payload.action,
        module_code: payload.module_code ?? null,
        store_uid: payload.store_uid ?? null,
        details: (payload.details ?? null) as unknown as Json,
        ip_address: payload.ip_address ?? null
      });
    } catch {
      // Evitar bloquear operación principal por falla de log
    }
  }
}
