import { z } from "zod";

export const createProjectionSchema = z.object({
  store_id: z.string().min(1, { message: "ID de tienda requerido" }),
  period_year: z.number().int().min(2020).max(2050),
  period_month: z.number().int().min(1).max(12),
  scenario: z.string().optional().default("BASE"),
  total_sales_net: z.number().optional().default(0),
  result_before_depreciation: z.number().optional().default(0),
  details: z
    .array(
      z.object({
        account_item_id: z.string().uuid({ message: "ID de rubro inválido" }),
        amount_usd: z
          .number()
          .min(0, { message: "El monto no puede ser negativo" }),
        percentage: z.number().min(0).optional().default(0),
      }),
    )
    .min(1, { message: "Debe incluir al menos un detalle de rubro" }),
});
