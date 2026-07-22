import { z } from "zod";

export const createProjectionSchema = z.object({
  store_id: z.string().uuid({ message: "ID de tienda inválido" }),
  period_year: z.number().int().min(2024).max(2035),
  period_month: z.number().int().min(1).max(12),
  scenario: z.string().optional().default("BASE"),
  details: z
    .array(
      z.object({
        account_item_id: z.string().uuid(),
        amount_usd: z
          .number()
          .min(0, { message: "El monto no puede ser negativo" }),
        percentage: z.number().min(0).max(1).optional().default(0),
      }),
    )
    .min(1, { message: "Debe incluir al menos un detalle de rubro" }),
});
