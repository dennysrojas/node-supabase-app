import { z } from 'zod';

export const appRoleEnum = z.enum(['CAPTURADOR', 'SUPERVISOR', 'ADMIN_GLOBAL', 'AUDITOR', 'ADMIN_MODULO']);
export const appModuleEnum = z.enum(['SALES', 'PYG', 'SURVEYS', 'QUALITY']);

export const createUserSchema = z.object({
  email: z.string().email({ message: 'Email inválido' }),
  full_name: z.string().min(2, { message: 'El nombre completo debe tener al menos 2 caracteres' }),
  password: z.string().min(6, { message: 'La contraseña debe tener al menos 6 caracteres' }),
  global_role: appRoleEnum.optional().default('CAPTURADOR')
});

export const updateUserSchema = z.object({
  full_name: z.string().min(2).optional(),
  global_role: appRoleEnum.optional(),
  is_active: z.boolean().optional()
});

export const assignScopeSchema = z.object({
  user_id: z.string().min(1, { message: 'ID de usuario requerido' }),
  module_code: appModuleEnum,
  store_uid: z.string().nullable().optional(),
  zone_code: z.string().nullable().optional(),
  role: appRoleEnum.optional().default('CAPTURADOR')
});

export const assignBulkScopesSchema = z.object({
  user_id: z.string().min(1, { message: 'ID de usuario requerido' }),
  module_code: appModuleEnum,
  store_uids: z.array(z.string().min(1, { message: 'ID de tienda inválido' })).min(1, { message: 'Debe especificar al menos una tienda' }),
  role: appRoleEnum.optional().default('CAPTURADOR')
});

export type AssignBulkScopesInput = z.infer<typeof assignBulkScopesSchema>;

export const queryAuditLogsSchema = z.object({
  module_code: z.string().optional(),
  store_uid: z.string().optional(),
  user_id: z.string().optional(),
  action: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
  offset: z.coerce.number().int().min(0).optional().default(0)
});
