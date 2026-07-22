export interface ProjectionDetailItemDTO {
  account_item_id: string;
  amount_usd: number;
  percentage?: number;
}

export interface CreateProjectionDTO {
  store_id: string;
  period_year: number;
  period_month: number;
  scenario?: string;
  details: ProjectionDetailItemDTO[];
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
}
