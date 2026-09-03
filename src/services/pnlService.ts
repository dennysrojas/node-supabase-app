import { supabase } from '../config/supabase.js';

export interface PnLMatrixQuery {
  storeId: string;
  year: number;
}

/**
 * T1.4 - Obtiene las Ventas Netas agregadas directamente del módulo de ventas (Diarias o Mensuales)
 */
export const getConsolidatedNetSalesFromSalesModule = async (storeId: string, year: number) => {
  // 1. Obtener la tienda para determinar la marca
  const { data: storeData } = await supabase
    .from('stores')
    .select('store_uid, store_id, brand_name')
    .or(`store_uid.eq.${storeId},store_id.eq.${storeId}`)
    .maybeSingle();

  const rawBrand = (storeData?.brand_name || 'KFC').toUpperCase();
  const brandCode = rawBrand.includes('CAJUN') ? 'CAJUN' : rawBrand.includes('FABRIL') ? 'FABRIL' : 'KFC';

  const { data: brandConfig } = await supabase
    .from('brand_config')
    .select('sales_periodicity')
    .eq('brand_code', brandCode)
    .maybeSingle();

  const isDaily = brandConfig?.sales_periodicity === 'DAILY' || brandCode === 'KFC';

  const monthlyNetSalesMap: Record<number, number> = {};
  for (let m = 1; m <= 12; m++) monthlyNetSalesMap[m] = 0;

  if (isDaily) {
    // 0. Intentar agregación directa en PostgreSQL vía función RPC (3.1)
    try {
      if (typeof (supabase as any).rpc === 'function') {
        const { data: aggregated, error: rpcError } = await (supabase as any).rpc(
          'fn_get_monthly_sales_aggregated',
          { p_store_id: storeId, p_year: year }
        );

        if (!rpcError && Array.isArray(aggregated) && aggregated.length > 0) {
          aggregated.forEach((row: { month: number; net_sales: number }) => {
            monthlyNetSalesMap[row.month] = Number(row.net_sales) || 0;
          });
          return monthlyNetSalesMap;
        }
      }
    } catch {
      // Fallback si la función RPC aún no está disponible
    }

    // Fallback: Sumar ventas diarias agregadas por mes
    const { data: dailySales } = await supabase
      .from('sales_projections_daily')
      .select('month, net_sales')
      .eq('store_id', storeId)
      .eq('year', year);

    (dailySales || []).forEach((row) => {
      monthlyNetSalesMap[row.month] = Math.round(((monthlyNetSalesMap[row.month] || 0) + Number(row.net_sales)) * 100) / 100;
    });
  } else {
    // Consultar tabla de ventas mensuales directas
    const { data: monthlySales } = await supabase
      .from('sales_projections_monthly')
      .select('month, net_sales')
      .eq('store_id', storeId)
      .eq('year', year);

    (monthlySales || []).forEach((row) => {
      monthlyNetSalesMap[row.month] = Number(row.net_sales) || 0;
    });
  }

  return monthlyNetSalesMap;
};

/**
 * T1.4 - Genera la Matriz PyG fijando el escenario único 'BASE' e inyectando las ventas originadas en Ventas
 */
export const getPnLMatrix = async ({ storeId, year }: PnLMatrixQuery) => {
  // Obtener la fuente de verdad de ventas desde el módulo de Ventas
  const salesMap = await getConsolidatedNetSalesFromSalesModule(storeId, year);

  // Consultar las cabeceras de los 12 meses fijando 'BASE'
  const { data: headers } = await supabase
    .from('projection_headers')
    .select('*, details:projection_details(*, account_item:account_items(*))')
    .eq('store_id', storeId)
    .eq('period_year', year)
    .eq('scenario', 'BASE')
    .order('period_month', { ascending: true });

  return {
    headers: headers || [],
    salesMap
  };
};

export const pnlService = {
  getConsolidatedNetSalesFromSalesModule,
  getPnLMatrix
};
