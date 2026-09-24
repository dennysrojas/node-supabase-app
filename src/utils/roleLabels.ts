const ROLE_LABELS: Record<string, string> = {
  ADMIN_GLOBAL: 'Administrador',
  SUPERVISOR: 'Supervisor',
  CAPTURADOR: 'Planificador',
  AUDITOR: 'Auditor',
  ADMIN_MODULO: 'Admin de Módulo',
};

export function roleLabel(role: string | null | undefined): string {
  if (!role) return 'Usuario';
  return ROLE_LABELS[role] ?? role;
}
