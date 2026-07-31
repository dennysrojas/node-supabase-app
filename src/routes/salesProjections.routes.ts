import { Router, Request, Response, RequestHandler } from 'express';
import { supabase } from '../config/supabase.js';

const router = Router();

/**
 * Middleware auxiliar para verificar rol de Supervisor/Admin para desbloqueo
 */
const requireSupervisorRole: RequestHandler = async (req: Request, res: Response, next) => {
  const userRole = (req.headers['x-user-role'] as string) || 'USER';
  if (userRole !== 'SUPERVISOR' && userRole !== 'ADMIN') {
    res.status(403).json({
      success: false,
      message: 'Acceso denegado: Solo los usuarios con rol SUPERVISOR o ADMIN pueden desbloquear proyecciones.'
    });
    return;
  }
  next();
};

// =============================================================================
// 1. T1.1 - OBTENER CONFIGURACIÓN DE MARCA (brand_config)
// =============================================================================
router.get('/config/brand/:brandCode', (async (req: Request, res: Response) => {
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
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}) as RequestHandler);

// =============================================================================
// 2. T1.2 - CONSULTAR Y GUARDAR VENTAS DIARIAS (KFC)
// =============================================================================
router.get('/daily', (async (req: Request, res: Response) => {
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
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}) as RequestHandler);

router.post('/daily/upsert', (async (req: Request, res: Response) => {
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
      .eq('month', Number(month))
      .eq('status', 'LOCKED')
      .limit(1);

    if (existingRecords && existingRecords.length > 0) {
      return res.status(422).json({
        success: false,
        message: 'La proyección de ventas para este periodo se encuentra ASENTADA (LOCKED). Debe desbloquearla primero.'
      });
    }

    const taxFactor = Number(tax_discount_pct) || 0.12;

    // Preparar registros con recálculo de Venta Neta
    const payload = days_data.map((dayItem: any) => {
      const transactions = Math.max(0, Number(dayItem.transactions) || 0);
      const averageTicket = Math.max(0, Number(dayItem.average_ticket) || 0);
      const grossSales = Math.round(transactions * averageTicket * 100) / 100;
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
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}) as RequestHandler);

// =============================================================================
// 3. T1.2 - CONSULTAR Y GUARDAR VENTAS MENSUALES (CAJUN / FABRIL)
// =============================================================================
router.get('/monthly', (async (req: Request, res: Response) => {
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
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}) as RequestHandler);

router.post('/monthly/upsert', (async (req: Request, res: Response) => {
  try {
    const { store_id, year, months_data, tax_discount_pct } = req.body;

    if (!store_id || !year || !Array.isArray(months_data)) {
      return res.status(400).json({ success: false, message: 'Payload inválido para ventas mensuales.' });
    }

    const taxFactor = Number(tax_discount_pct) || 0.12;

    const payload = months_data.map((mItem: any) => {
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
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}) as RequestHandler);

// =============================================================================
// 4. T1.3 - ENDPOINTS DE ASENTAMIENTO / BLOQUEO (LOCK / UNLOCK)
// =============================================================================
router.post('/lock', (async (req: Request, res: Response) => {
  try {
    const { store_id, year, target_module } = req.body; // target_module: 'SALES' | 'PYG'
    const userId = (req.headers['x-user-id'] as string) || null;

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
      // Bloqueo de PyG
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
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}) as RequestHandler);

router.post('/unlock', requireSupervisorRole, (async (req: Request, res: Response) => {
  try {
    const { store_id, year, target_module } = req.body;

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
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}) as RequestHandler);

export default router;
