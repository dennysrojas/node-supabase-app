import { supabase } from "../config/supabase.js";
import {
  CreateProjectionDTO,
  ProjectionHeaderResponse,
} from "../types/projection.types.js";

export class ProjectionService {
  /**
   * Registra o actualiza una proyección financiera completa (Cabecera + Detalles)
   */
  async createProjection(
    dto: CreateProjectionDTO,
    userId?: string,
  ): Promise<ProjectionHeaderResponse> {
    const {
      store_id,
      period_year,
      period_month,
      scenario = "BASE",
      details,
    } = dto;

    // 1. Inserción o actualización idempotente de la cabecera (Upsert)
    const { data: header, error: headerError } = await supabase
      .from("projection_headers")
      .upsert(
        {
          store_id,
          period_year,
          period_month,
          scenario,
          created_by: userId || null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "store_id,period_year,period_month,scenario" },
      )
      .select()
      .single();

    if (headerError || !header) {
      throw new Error(
        `Error al guardar la cabecera de proyección: ${headerError?.message}`,
      );
    }

    // 2. Limpiar detalles preexistentes si se está re-guardando el periodo
    const { error: deleteError } = await supabase
      .from("projection_details")
      .delete()
      .eq("projection_header_id", header.id);

    if (deleteError) {
      throw new Error(
        `Error al limpiar detalles previos: ${deleteError.message}`,
      );
    }

    // 3. Mapear y preparar los registros de detalle
    const detailsToInsert = details.map((item) => ({
      projection_header_id: header.id,
      account_item_id: item.account_item_id,
      amount_usd: item.amount_usd,
      percentage: item.percentage ?? 0,
    }));

    // 4. Inserción masiva en lote (Batch Insert)
    const { error: detailsError } = await supabase
      .from("projection_details")
      .insert(detailsToInsert);

    if (detailsError) {
      throw new Error(
        `Error al guardar los rubros de detalle: ${detailsError.message}`,
      );
    }

    // 5. Retornar respuesta estructurada
    return {
      id: header.id,
      store_id: header.store_id,
      period_year: header.period_year,
      period_month: header.period_month,
      scenario: header.scenario,
      total_sales_net: Number(header.total_sales_net ?? 0),
      result_before_depreciation: Number(
        header.result_before_depreciation ?? 0,
      ),
      created_at: header.created_at,
    };
  }

  /**
   * Obtiene el catálogo completo de cuentas ordenado por sort_order
   */
  async getAccountItems() {
    const { data, error } = await supabase
      .from("account_items")
      .select("*")
      .order("sort_order", { ascending: true });

    if (error) {
      throw new Error(
        `Error al consultar el catálogo de cuentas: ${error.message}`,
      );
    }

    return data;
  }

  /**
   * Obtiene el catálogo completo de tiendas/locales
   */
  async getStores() {
    const { data, error } = await supabase
      .from("stores")
      .select("*")
      .order("code", { ascending: true });

    if (error) {
      throw new Error(
        `Error al consultar el catálogo de tiendas: ${error.message}`,
      );
    }

    return data;
  }

  /**
   * Consulta la proyección completa (P&L) de un local para un año, mes y escenario dados
   */
  async getProjectionByStoreAndPeriod(
    storeId: string,
    year: number,
    month: number,
    scenario = "BASE",
  ) {
    // 1. Obtener la cabecera junto con los datos de la tienda
    const { data: header, error: headerError } = await supabase
      .from("projection_headers")
      .select(
        `
        id,
        store_id,
        period_year,
        period_month,
        scenario,
        total_sales_net,
        result_before_depreciation,
        created_at,
        updated_at,
        stores (
          code,
          name
        )
      `,
      )
      .eq("store_id", storeId)
      .eq("period_year", year)
      .eq("period_month", month)
      .eq("scenario", scenario)
      .maybeSingle();

    if (headerError) {
      throw new Error(`Error al consultar la cabecera: ${headerError.message}`);
    }

    if (!header) {
      return null;
    }

    // 2. Obtener todos los detalles unidos con el catálogo de cuentas
    const { data: details, error: detailsError } = await supabase
      .from("projection_details")
      .select(
        `
        id,
        amount_usd,
        percentage,
        account_items (
          id,
          group_name,
          item_name,
          value_type,
          sort_order
        )
      `,
      )
      .eq("projection_header_id", header.id);

    if (detailsError) {
      throw new Error(
        `Error al consultar los detalles del P&L: ${detailsError.message}`,
      );
    }

    // 3. Formatear y ordenar los rubros según sort_order
    const formattedDetails = ((details || []) as Array<{
      id: string;
      amount_usd: number;
      percentage: number;
      account_items: any;
    }>)
      .map((item) => {
        const account = Array.isArray(item.account_items)
          ? item.account_items[0]
          : item.account_items;

        return {
          id: item.id,
          account_item_id: account?.id,
          group_name: account?.group_name,
          item_name: account?.item_name,
          value_type: account?.value_type,
          sort_order: (account?.sort_order as number) ?? 0,
          amount_usd: Number(item.amount_usd ?? 0),
          percentage: Number(item.percentage ?? 0),
        };
      })
      .sort((a: { sort_order: number }, b: { sort_order: number }) => a.sort_order - b.sort_order);


    return {
      id: header.id,
      store: header.stores,
      period_year: header.period_year,
      period_month: header.period_month,
      scenario: header.scenario,
      total_sales_net: Number(header.total_sales_net ?? 0),
      result_before_depreciation: Number(
        header.result_before_depreciation ?? 0,
      ),
      updated_at: header.updated_at,
      details: formattedDetails,
    };
  }
}

export const projectionService = new ProjectionService();
