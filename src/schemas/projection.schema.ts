import { z } from 'zod';

export const projectionDetailItemSchema = z.object({
  account_item_id: z.string().uuid({ message: 'El ID de rubro (account_item_id) debe ser un UUID válido' }),
  amount_usd: z.number({ required_error: 'El monto en USD es requerido' }),
  percentage: z.number().optional(),
});

export const createProjectionSchema = z.object({
  store_id: z.string().uuid({ message: 'El ID de tienda (store_id) debe ser un UUID válido' }),
  period_year: z
    .number({ required_error: 'El año del periodo es requerido' })
    .int()
    .min(2000, { message: 'El año debe ser mayor o igual a 2000' })
    .max(2100, { message: 'El año debe ser menor o igual a 2100' }),
  period_month: z
    .number({ required_error: 'El mes del periodo es requerido' })
    .int()
    .min(1, { message: 'El mes debe ser entre 1 y 12' })
    .max(12, { message: 'El mes debe ser entre 1 y 12' }),
  scenario: z.string().default('BASE'),
  details: z
    .array(projectionDetailItemSchema)
    .min(1, { message: 'Debe incluir al menos un detalle de rubro en la proyección' }),
});
