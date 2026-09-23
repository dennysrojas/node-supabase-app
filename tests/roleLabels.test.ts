import { describe, expect, it } from 'vitest';
import { roleLabel } from '../src/utils/roleLabels.js';

describe('roleLabel', () => {
  it('traduce los códigos que ve el usuario', () => {
    expect(roleLabel('CAPTURADOR')).toBe('Planificador');
    expect(roleLabel('ADMIN_GLOBAL')).toBe('Administrador');
    expect(roleLabel('SUPERVISOR')).toBe('Supervisor');
    expect(roleLabel('AUDITOR')).toBe('Auditor');
  });
});
