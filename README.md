# Node Supabase Data Entry & KFC Projections API

![Node.js](https://img.shields.io/badge/Node.js-22.x-green)
![TypeScript](https://img.shields.io/badge/TypeScript-5.5-blue)
![Express](https://img.shields.io/badge/Express-4.19-lightgray)
![Supabase](https://img.shields.io/badge/Supabase-DB-3ECF8E)
![Docker](https://img.shields.io/badge/Docker-Enabled-2496ED)

API REST robusta construida con **Node.js, Express y TypeScript** utilizando **Supabase (PostgreSQL)** como motor de base de datos y autenticación corporativa. Diseñada para gestionar el módulo de **Proyecciones Financieras P&L de KFC**, control de accesos por roles (RBAC) y catálogos institucionales de tiendas y cuentas contables.

---

## 🚀 Características Principales

- **TypeScript Completo**: Tipado estático en todo el proyecto y contratos DTO estrictos.
- **Autenticación & Control de Accesos por Rol (RBAC / ABAC - Fases 1, 2 & 3)**:
  - Verificación de tokens JWT mediante Supabase Auth SDK.
  - Middlewares de seguridad `authMiddleware` y `requireModuleScope` por tupla ($\text{User} \times \text{Module} \times \text{Store} \times \text{Role}$).
  - Interceptor automático de auditoría `auditInterceptorMiddleware` que registra todas las mutaciones en `public.audit_logs`.
  - Roles soportados: `ADMIN_GLOBAL`, `SUPERVISOR`, `CAPTURADOR`, `AUDITOR`.
- **Validación de Datos en Tiempo Real**: Esquema de validación mediante `Zod` preparado para identificadores alfanuméricos de tiendas (ej. `H001ECU`, `K002ECU`) y rubros contables.
- **Modelo Master-Detail de Proyecciones P&L**:
  - `projection_headers`: Almacena metadatos por local, año, mes, escenario, ventas netas y resultado operativo (EBITDA).
  - `projection_details`: Almacena el desglose por rubro contable en monto (USD) y porcentaje (%).
- **Reestructuración Dinámica de Tiendas (`public.stores`)**: Soporta `store_uid` (Alfanumérico Primary Key), `store_id` único y columna generada `store_id_and_name`.
- **Ingestión Masiva e Idempotente (Upsert)**: Scripts de migración SQL para la carga masiva desde plantillas oficiales de Excel.
- **Testing & Docker Ready**: Suite de pruebas automatizadas con `Vitest` + `Supertest` y contenedorización multi-etapa en Alpine.

---

## 📁 Estructura del Proyecto

```text
node-supabase-app/
├── .env                 # Variables de entorno local/remoto
├── Dockerfile           # Configuración multi-stage para Docker
├── src/                 # Código fuente de la API
│   ├── config/          # Cliente de Supabase e inicialización de env
│   ├── controllers/     # Controladores HTTP (Admin, Proyecciones, Tiendas, Rubros)
│   ├── middlewares/     # Middlewares de Auth JWT, Scope RBAC y Audit Interceptor
│   ├── routes/          # Rutas API v1 (/api/v1/sales-projections, /api/users, /api/scopes, /api/audit)
│   ├── schemas/         # Esquemas de validación Zod (admin.schema.ts, projection.schema.ts)
│   ├── services/        # Lógica de negocio y consultas Supabase (admin.service.ts, pnlService.ts)
│   ├── types/           # Interfaces TypeScript (database.types.ts, projection.types.ts)
│   ├── app.ts           # Configuración de Express y CORS
│   └── server.ts        # Punto de entrada del servidor Node
├── supabase/            # Migraciones DDL/DML y configuraciones locales
│   └── migrations/      # Historial de migraciones SQL estructurado
├── tests/               # Pruebas automatizadas (Admin, Auth, Scopes, Audit, Projections)
├── package.json         # Scripts de compilación y dependencias
└── tsconfig.json        # Configuración de compilación TypeScript
```

---

## 🗄️ Historial Reciente de Migraciones SQL (`supabase/migrations`)

| Timestamp | Archivo de Migración | Descripción de los Cambios |
| :--- | :--- | :--- |
| `2026-07-22` | `20260722120000_create_kfc_projections_module.sql` | Estructura base Master-Detail y semilla de catálogo de cuentas P&L. |
| `2026-07-28` | `20260728100000_update_stores_table_structure.sql` | Reestructuración de `stores` a `store_uid VARCHAR(100)` y actualización de FKs. |
| `2026-07-28` | `20260728110000_insert_real_stores_data.sql` | Inserción masiva de los 143 locales oficiales KFC Ecuador. |
| `2026-08-01` | `20260801_phase1_sales_and_pnl_schema.sql` | Esquema de proyecciones diarias de ventas por canal y mensuales. |
| `2026-08-18` | `20260818100000_create_rbac_modules_user_scopes_audit.sql` | Tablas DDL RBAC (`modules`, `user_profiles`, `user_module_scopes`, `audit_logs`). |
| `2026-08-19` | `20260819090000_create_rls_policies_and_scope_helper.sql` | Función PL/pgSQL `fn_has_module_store_access()` y políticas RLS. |
| `2026-08-19` | `20260819100000_seed_rbac_initial_data.sql` | Seeding de usuarios semilla demo con contraseñas encriptadas. |

---

## 💻 Instalación y Desarrollo Local

```bash
# Instalar dependencias
npm install

# Iniciar servidor de desarrollo en Node (TSX)
npm run dev

# Ejecutar suite de pruebas de integración (Vitest / Supertest)
npm run test

# Verificación de tipos TypeScript
npm run typecheck

# Compilar para producción
npm run build
```
