-- ============================================================================
-- SCRIPT DE SEMBRADO (SEED): CATÁLOGO DE CUENTAS DE PROYECCIÓN FINANCIERA (KFC)
-- ============================================================================

-- Asegurar restricción única para idempotencia (evita duplicados si se ejecuta varias veces)
ALTER TABLE account_items 
ADD CONSTRAINT uq_account_group_item UNIQUE (group_name, item_name);

-- Inserción masiva del catálogo de rubros
INSERT INTO account_items (group_name, item_name, value_type, sort_order) VALUES

-- 1. VENTAS E IMPUESTOS
('Ventas', 'Ventas Brutas', 'CURRENCY', 10),
('Ventas', 'Impuesto Servicio', 'BOTH', 11),
('Ventas', 'Impuesto IVA', 'BOTH', 12),
('Ventas', 'Ventas Netas', 'CURRENCY', 13),

-- 2. COSTOS DE PRODUCCIÓN
('Costos de Producción', 'Aceites y vinagres', 'BOTH', 20),
('Costos de Producción', 'Bebidas', 'BOTH', 21),
('Costos de Producción', 'Café', 'BOTH', 22),
('Costos de Producción', 'Cárnicos', 'BOTH', 23),
('Costos de Producción', 'Chocolates y bombones', 'BOTH', 24),
('Costos de Producción', 'Granos', 'BOTH', 25),
('Costos de Producción', 'Harinas', 'BOTH', 26),
('Costos de Producción', 'Helados', 'BOTH', 27),
('Costos de Producción', 'Lácteos', 'BOTH', 28),
('Costos de Producción', 'Material de empaque', 'BOTH', 29),
('Costos de Producción', 'Otros Ingredientes', 'BOTH', 30),
('Costos de Producción', 'Papas', 'BOTH', 31),
('Costos de Producción', 'Postres', 'BOTH', 32),
('Costos de Producción', 'Salsas', 'BOTH', 33),
('Costos de Producción', 'Trigo', 'BOTH', 34),
('Costos de Producción', 'Vegetales', 'BOTH', 35),

-- 3. MANO DE OBRA
('Mano de Obra', 'Nómina Local', 'BOTH', 40),
('Mano de Obra', 'Nómina Jefes de Área', 'BOTH', 41),
('Mano de Obra', 'Provisión operación tiendas R', 'BOTH', 42),

-- 4. SERVICIOS BÁSICOS Y OPERACIÓN
('Servicios Básicos', 'Agua Potable', 'BOTH', 50),
('Servicios Básicos', 'Aseo Local', 'BOTH', 51),
('Servicios Básicos', 'Comunicaciones', 'BOTH', 52),
('Servicios Básicos', 'Correo', 'BOTH', 53),
('Servicios Básicos', 'Degustación', 'BOTH', 54),
('Servicios Básicos', 'Fletes', 'BOTH', 55),
('Servicios Básicos', 'Gas', 'BOTH', 56),
('Servicios Básicos', 'Honorarios Mantenimiento', 'BOTH', 57),
('Servicios Básicos', 'Inversión Maq y eq de sistemas', 'BOTH', 58),
('Servicios Básicos', 'Lunch', 'BOTH', 59),
('Servicios Básicos', 'Luz Eléctrica', 'BOTH', 60),
('Servicios Básicos', 'Mantenimiento Equipo de Sistemas', 'BOTH', 61),
('Servicios Básicos', 'Mantenimiento y Reparación de Equipos', 'BOTH', 62),
('Servicios Básicos', 'Mantenimiento y Reparación de Local', 'BOTH', 63),
('Servicios Básicos', 'Movilización', 'BOTH', 64),
('Servicios Básicos', 'Otros Gastos', 'BOTH', 65),
('Servicios Básicos', 'Repuestos y Accesorios', 'BOTH', 66),
('Servicios Básicos', 'Suministros de Oficina', 'BOTH', 67),
('Servicios Básicos', 'Teléfono', 'BOTH', 68),
('Servicios Básicos', 'Uniformes', 'BOTH', 69),
('Servicios Básicos', 'Viáticos y Expreso', 'BOTH', 70),

-- 5. GASTOS GENERALES
('Gastos Generales', 'Agregadores y Logística', 'BOTH', 80),
('Gastos Generales', 'Cortesías', 'BOTH', 81),
('Gastos Generales', 'Delivery', 'BOTH', 82),
('Gastos Generales', 'Gastos Contables', 'BOTH', 83),

-- 6. ARRIENDOS Y ALÍCUOTAS
('Arriendos y Alícuotas', 'Alícuotas', 'BOTH', 90),
('Arriendos y Alícuotas', 'Arriendos', 'BOTH', 91),

-- 7. GASTOS PORCENTUALES
('Gastos Porcentuales', 'Administrativos', 'BOTH', 100),
('Gastos Porcentuales', 'Financieros', 'BOTH', 101),
('Gastos Porcentuales', 'Planta Gasto Fabril', 'BOTH', 102),
('Gastos Porcentuales', 'Publicidad', 'BOTH', 103),
('Gastos Porcentuales', 'Regalías', 'BOTH', 104),

-- 8. MERMAS
('Mermas', 'Mermas General', 'BOTH', 110),

-- 9. DEPRECIACIÓN
('Depreciación', 'Depreciación activos', 'CURRENCY', 120),

-- 10. RESULTADOS E INDICADORES
('Resultados', 'Resultado total sin DEPRECIACIÓN', 'CURRENCY', 130)

ON CONFLICT (group_name, item_name) DO UPDATE SET
    value_type = EXCLUDED.value_type,
    sort_order = EXCLUDED.sort_order;