export interface Store {
  id: string;
  code: string;
  name: string;
  is_active: boolean;
}

export type AccountGroup =
  | "Ventas"
  | "Costos de Producción"
  | "Servicios Básicos"
  | "Gastos Generales"
  | "Mano de Obra"
  | "Arriendos y Alícuotas"
  | "Gastos Porcentuales"
  | "Depreciación"
  | "Mermas";

export interface AccountItem {
  id: string;
  group_name: AccountGroup;
  item_name: string;
  value_type: "CURRENCY" | "PERCENTAGE" | "BOTH";
  sort_order: number;
}

export interface ProjectionDetailItemInput {
  account_item_id: string;
  amount_usd: number;
  percentage?: number;
}

export interface CreateProjectionDTO {
  store_id: string;
  period_year: number;
  period_month: number;
  scenario?: string;
  details: ProjectionDetailItemInput[];
}

export interface ProjectionHeaderResponse {
  id: string;
  store_id: string;
  period_year: number;
  period_month: number;
  scenario: string;
  total_sales_net: number;
  result_before_depreciation: number;
  created_at: string;
  details?: Array<{
    group_name: string;
    item_name: string;
    amount_usd: number;
    percentage: number;
  }>;
}
