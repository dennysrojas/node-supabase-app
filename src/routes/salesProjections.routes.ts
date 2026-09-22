import { Router, Request, Response, RequestHandler } from 'express';
import { supabase } from '../config/supabase.js';
import { authMiddleware, AuthenticatedRequest } from '../middlewares/auth.middleware.js';
import { requireModuleScope } from '../middlewares/scope.middleware.js';

const router = Router();

const SALES_CHANNEL_KEYS = ['salon', 'drive', 'domicilio', 'corners', 'ticket'] as const;

function readErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof Error && err.message) return err.message;
  if (err && typeof err === 'object' && 'message' in err && typeof err.message === 'string' && err.message) {
    return err.message;
  }
  return fallback;
}

function normalizeChannels(raw: unknown) {
  if (!raw || typeof raw !== 'object') return null;
  const source = raw as Record<string, { transactions?: unknown; average_ticket?: unknown }>;
  const normalized: Record<string, { transactions: number; average_ticket: number; gross_sales: number }> = {};

  for (const key of SALES_CHANNEL_KEYS) {
    const entry = source[key];
    if (!entry) continue;
    const transactions = Math.max(0, Math.round(Number(entry.transactions) || 0));
    const averageTicket = Math.max(0, Math.round((Number(entry.average_ticket) || 0) * 100) / 100);
    normalized[key] = {
      transactions,
      average_ticket: averageTicket,
      gross_sales: Math.round(transactions * averageTicket * 100) / 100
    };
  }

  return Object.keys(normalized).length > 0 ? normalized : null;
}

// =============================================================================
// 1. T1.1 - OBTENER CONFIGURACIÓN DE MARCA (brand_config)
// =============================================================================
router.get('/config/brand/:brandCode', authMiddleware as RequestHandler, (async (req: Request, res: Response) => {
  try {
    const { brandCode } = req.params;
    const { data, error } = await supabase
      .from('brand_config')
      .select('*')
      .eq('brand_code', brandCode.toUpperCase())
      .single();

    if (error || !data) {
      return res.status(404).json({ success: false, message: 'Configuración de marca no encontrada.' });
    }

    return res.json({ success: true, data });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error al obtener configuración de marca';
    return res.status(500).json({ success: false, message });
  }
}) as RequestHandler);

// =============================================================================
// 2. T1.2 - CONSULTAR Y GUARDAR VENTAS DIARIAS (KFC)
// =============================================================================
router.get(
  '/daily',
  authMiddleware as RequestHandler,
  requireModuleScope('SALES', ['CAPTURADOR', 'SUPERVISOR', 'ADMIN_GLOBAL', 'AUDITOR']) as RequestHandler,
  (async (req: Request, res: Response) => {
  try {
    const { store_id, year, month } = req.query;

    if (!store_id || !year || !month) {
      return res.status(400).json({ success: false, message: 'store_id, year y month son obligatorios.' });
    }

    const { data, error } = await supabase
      .from('sales_projections_daily')
      .select('*')
      .eq('store_id', String(store_id))
      .eq('year', Number(year))
      .eq('month', Number(month))
      .order('day', { ascending: true });

    if (error) throw error;

    return res.json({ success: true, data: data || [] });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error al consultar ventas diarias';
    return res.status(500).json({ success: false, message });
  }
}) as RequestHandler);

router.post(
  '/daily/upsert',
  authMiddleware as RequestHandler,
  requireModuleScope('SALES', ['CAPTURADOR', 'SUPERVISOR', 'ADMIN_GLOBAL']) as RequestHandler,
  (async (req: Request, res: Response) => {
  try {
    const { store_id, year, month, days_data, tax_discount_pct } = req.body;

    if (!store_id || !year || !month || !Array.isArray(days_data)) {
      return res.status(400).json({ success: false, message: 'Payload inválido para guardado de ventas diarias.' });
    }

    // Verificar si la proyección ya está LOCKED
    const { data: existingRecords } = await supabase
      .from('sales_projections_daily')
      .select('status')
      .eq('store_id', store_id)
      .eq('year', Number(year))
      .eq('status', 'LOCKED')
      .limit(1);

    if (existingRecords && existingRecords.length > 0) {
      return res.status(422).json({
        success: false,
        message: 'La proyección de ventas de este año se encuentra ASENTADA (LOCKED). Debe desbloquearla antes de guardar otro mes.'
      });
    }

    const taxFactor = Number(tax_discount_pct) || 0.12;

    // Preparar registros con recálculo de Venta Neta
    const payload = days_data.map((dayItem: Record<string, unknown>) => {
      const channels = normalizeChannels(dayItem.channels);
      const channelTotals = channels
        ? Object.values(channels).reduce(
            (acc, channel) => {
              acc.transactions += channel.transactions;
              acc.gross += channel.transactions * channel.average_ticket;
              return acc;
            },
            { transactions: 0, gross: 0 }
          )
        : null;

      const transactions = channelTotals
        ? channelTotals.transactions
        : Math.max(0, Number(dayItem.total_transactions ?? dayItem.transactions) || 0);
      const averageTicketInput = Math.max(0, Number(dayItem.average_ticket) || 0);
      const grossSales = channelTotals
        ? channelTotals.gross
        : Number(dayItem.total_gross_sales ?? dayItem.gross_sales) || Math.round(transactions * averageTicketInput * 100) / 100;
      const averageTicket = transactions > 0
        ? Math.round((grossSales / transactions) * 100) / 100
        : averageTicketInput;
      const netSales = Math.round(grossSales * (1 - taxFactor) * 100) / 100;

      const formattedMonth = String(month).padStart(2, '0');
      const formattedDay = String(dayItem.day).padStart(2, '0');
      const projectionDate = `${year}-${formattedMonth}-${formattedDay}`;

      return {
        store_id,
        year: Number(year),
        month: Number(month),
        day: Number(dayItem.day),
        projection_date: projectionDate,
        transactions,
        average_ticket: averageTicket,
        net_sales: netSales,
        channels,
        status: 'DRAFT',
        updated_at: new Date().toISOString()
      };
    });

    const { data, error } = await supabase
      .from('sales_projections_daily')
      .upsert(payload, { onConflict: 'store_id,projection_date' })
      .select();

    if (error) throw error;

    return res.json({
      success: true,
      message: 'Ventas diarias actualizadas correctamente.',
      data
    });
  } catch (err: unknown) {
    const message = readErrorMessage(err, 'Error al guardar ventas diarias');
    return res.status(500).json({ success: false, message });
  }
}) as RequestHandler);

// =============================================================================
// 3. T1.2 - CONSULTAR Y GUARDAR VENTAS MENSUALES (CAJUN / FABRIL)
// =============================================================================
router.get(
  '/monthly',
  authMiddleware as RequestHandler,
  requireModuleScope('SALES', ['CAPTURADOR', 'SUPERVISOR', 'ADMIN_GLOBAL', 'AUDITOR']) as RequestHandler,
  (async (req: Request, res: Response) => {
  try {
    const { store_id, year } = req.query;

    if (!store_id || !year) {
      return res.status(400).json({ success: false, message: 'store_id y year son obligatorios.' });
    }

    const { data, error } = await supabase
      .from('sales_projections_monthly')
      .select('*')
      .eq('store_id', String(store_id))
      .eq('year', Number(year))
      .order('month', { ascending: true });

    if (error) throw error;

    return res.json({ success: true, data: data || [] });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error al consultar ventas mensuales';
    return res.status(500).json({ success: false, message });
  }
}) as RequestHandler);

router.post(
  '/monthly/upsert',
  authMiddleware as RequestHandler,
  requireModuleScope('SALES', ['CAPTURADOR', 'SUPERVISOR', 'ADMIN_GLOBAL']) as RequestHandler,
  (async (req: Request, res: Response) => {
  try {
    const { store_id, year, months_data, tax_discount_pct } = req.body;

    if (!store_id || !year || !Array.isArray(months_data)) {
      return res.status(400).json({ success: false, message: 'Payload inválido para ventas mensuales.' });
    }

    // Verificar si la proyección ya está LOCKED
    const { data: existingRecords } = await supabase
      .from('sales_projections_monthly')
      .select('status')
      .eq('store_id', store_id)
      .eq('year', Number(year))
      .eq('status', 'LOCKED')
      .limit(1);

    if (existingRecords && existingRecords.length > 0) {
      return res.status(422).json({
        success: false,
        message: 'La proyección de ventas mensuales para este periodo se encuentra ASENTADA (LOCKED). Debe desbloquearla primero.'
      });
    }

    const taxFactor = Number(tax_discount_pct) || 0.12;

    const payload = months_data.map((mItem: Record<string, unknown>) => {
      const grossSales = Math.max(0, Number(mItem.gross_sales) || 0);
      const netSales = Math.round(grossSales * (1 - taxFactor) * 100) / 100;

      return {
        store_id,
        year: Number(year),
        month: Number(mItem.month),
        gross_sales: grossSales,
        net_sales: netSales,
        status: 'DRAFT',
        updated_at: new Date().toISOString()
      };
    });

    const { data, error } = await supabase
      .from('sales_projections_monthly')
      .upsert(payload, { onConflict: 'store_id,year,month' })
      .select();

    if (error) throw error;

    return res.json({
      success: true,
      message: 'Ventas mensuales guardadas correctamente.',
      data
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error al guardar ventas mensuales';
    return res.status(500).json({ success: false, message });
  }
}) as RequestHandler);

// =============================================================================
// 4. T1.3 - ENDPOINTS DE ASENTAMIENTO / BLOQUEO (LOCK / UNLOCK)
// =============================================================================
router.post(
  '/lock',
  authMiddleware as RequestHandler,
  requireModuleScope('SALES', ['CAPTURADOR', 'SUPERVISOR', 'ADMIN_GLOBAL']) as RequestHandler,
  (async (req: Request, res: Response) => {
    try {
      const { store_id, year, target_module = 'SALES' } = req.body;
      const userId = (req as AuthenticatedRequest).user?.id || null;

      if (!store_id || !year) {
        return res.status(400).json({ success: false, message: 'store_id y year son obligatorios.' });
      }

      if (target_module === 'SALES') {
        await supabase
          .from('sales_projections_daily')
          .update({ status: 'LOCKED', updated_at: new Date().toISOString() })
          .eq('store_id', store_id)
          .eq('year', Number(year));

        await supabase
          .from('sales_projections_monthly')
          .update({ status: 'LOCKED', updated_at: new Date().toISOString() })
          .eq('store_id', store_id)
          .eq('year', Number(year));
      } else {
        // Bloqueo de PyG: Validar precondición de que las ventas estén asentadas (TC-30)
        const { data: draftDaily } = await supabase
          .from('sales_projections_daily')
          .select('id')
          .eq('store_id', store_id)
          .eq('year', Number(year))
          .eq('status', 'DRAFT')
          .limit(1);

        const { data: draftMonthly } = await supabase
          .from('sales_projections_monthly')
          .select('id')
          .eq('store_id', store_id)
          .eq('year', Number(year))
          .eq('status', 'DRAFT')
          .limit(1);

        if ((draftDaily && draftDaily.length > 0) || (draftMonthly && draftMonthly.length > 0)) {
          return res.status(422).json({
            success: false,
            message: 'La proyección de Ventas debe estar asentada (LOCKED) antes de asentar la Matriz PyG.'
          });
        }

        const { data: pygHeaders, error: pygHeadersError } = await supabase
          .from('projection_headers')
          .select('id')
          .eq('store_id', store_id)
          .eq('period_year', Number(year));

        if (pygHeadersError) {
          throw new Error(pygHeadersError.message);
        }

        if (!pygHeaders || pygHeaders.length === 0) {
          return res.status(422).json({
            success: false,
            message: 'Guarda la matriz PyG antes de asentarla. No hay meses persistidos para bloquear.'
          });
        }

        await supabase
          .from('projection_headers')
          .update({
            status: 'LOCKED',
            locked_at: new Date().toISOString(),
            locked_by: userId
          })
          .eq('store_id', store_id)
          .eq('period_year', Number(year));
      }

    return res.json({
      success: true,
      message: `Proyección de ${target_module} ASENTADA correctamente. Edición bloqueada.`
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error al asentar proyección';
    return res.status(500).json({ success: false, message });
  }
}) as RequestHandler);

router.post(
  '/unlock',
  authMiddleware as RequestHandler,
  requireModuleScope('SALES', ['SUPERVISOR', 'ADMIN_GLOBAL']) as RequestHandler,
  (async (req: Request, res: Response) => {
  try {
    const { store_id, year, target_module = 'SALES' } = req.body;

    if (!store_id || !year) {
      return res.status(400).json({ success: false, message: 'store_id y year son obligatorios.' });
    }

    if (target_module === 'SALES') {
      await supabase
        .from('sales_projections_daily')
        .update({ status: 'DRAFT', updated_at: new Date().toISOString() })
        .eq('store_id', store_id)
        .eq('year', Number(year));

      await supabase
        .from('sales_projections_monthly')
        .update({ status: 'DRAFT', updated_at: new Date().toISOString() })
        .eq('store_id', store_id)
        .eq('year', Number(year));
    } else {
      await supabase
        .from('projection_headers')
        .update({
          status: 'DRAFT',
          locked_at: null,
          locked_by: null
        })
        .eq('store_id', store_id)
        .eq('period_year', Number(year));
    }

    return res.json({
      success: true,
      message: `Proyección de ${target_module} DESBLOQUEADA exitosamente por Supervisor.`
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error al desbloquear proyección';
    return res.status(500).json({ success: false, message });
  }
}) as RequestHandler);

export default router;
