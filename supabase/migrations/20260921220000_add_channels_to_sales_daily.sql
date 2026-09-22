-- Conserva el ticket y las transacciones de cada canal (Salón, Drive, Domicilio, Corners).
-- Sin esta columna el upsert diario rechaza el payload y la pantalla muestra
-- "Error al guardar ventas diarias".

ALTER TABLE public.sales_projections_daily
  ADD COLUMN IF NOT EXISTS channels JSONB;

COMMENT ON COLUMN public.sales_projections_daily.channels IS
  'Desglose por canal: transacciones, ticket promedio y venta bruta.';
