# Node Supabase Data Entry & KFC Projections API

![Node.js](https://img.shields.io/badge/Node.js-22.x-green)
![TypeScript](https://img.shields.io/badge/TypeScript-5.5-blue)
![Express](https://img.shields.io/badge/Express-4.19-lightgray)
![Supabase](https://img.shields.io/badge/Supabase-DB-3ECF8E)
![Docker](https://img.shields.io/badge/Docker-Enabled-2496ED)

API REST robusta construida con **Node.js, Express y TypeScript** utilizando **Supabase (PostgreSQL)** como motor de base de datos. Diseñada para gestionar el módulo de **Proyecciones Financieras P&L de KFC** y catálogos institucionales de tiendas y cuentas contables.

---

## 🚀 Características Principales

- **TypeScript Completo**: Tipado estático en todo el proyecto y contratos DTO estrictos.
- **Validación de Datos en Tiempo Real**: Esquema de validación mediante `Zod` preparado para identificadores alfanuméricos de tiendas (ej. `H001ECU`, `K002ECU`) y rubros contables.
- **Modelo Master-Detail de Proyecciones P&L**:
  - `projection_headers`: Almacena metadatos por local, año, mes, escenario, ventas netas y resultado operativo (EBITDA).
  - `projection_details`: Almacena el desglose por rubro contable en monto (USD) y porcentaje (%).
- **Reestructuración Dinámica de Tiendas (`public.stores`)**: Soporta `store_uid` (Alfanumérico Primary Key), `store_id` único y columna generada `store_id_and_name`.
- **Ingestión Masiva e Idempotente (Upsert)**: Scripts de migración SQL para la carga masiva desde plantillas oficiales de Excel.
- **Testing & Docker Ready**: Pruebas automatizadas con `Vitest` + `Supertest` y contenedorización multi-etapa en Alpine.

---

## 📁 Estructura del Proyecto

```text
node-supabase-app/
├── .env                 # Variables de entorno local/remoto
├── Dockerfile           # Configuración multi-stage para Docker
├── src/                 # Código fuente de la API
│   ├── config/          # Cliente de Supabase e inicialización de env
│   ├── controllers/     # Controladores HTTP (Proyecciones, Tiendas, Rubros)
│   ├── middlewares/     # Manejo global de errores y validaciones Zod
│   ├── routes/          # Rutas API v1 (/api/v1/projections)
│   ├── schemas/         # Esquemas de validación Zod (projection.schema.ts)
│   ├── services/        # Lógica de negocio y consultas Supabase (projection.service.ts)
│   ├── types/           # Interfaces TypeScript (projection.types.ts, database.types.ts)
│   ├── app.ts           # Configuración de Express y CORS
│   └── server.ts        # Punto de entrada del servidor Node
├── supabase/            # Migraciones DDL/DML y configuraciones locales
│   └── migrations/      # Historial de migraciones SQL estructurado
├── tests/               # Pruebas automatizadas
├── package.json         # Scripts de compilación y dependencias
└── tsconfig.json        # Configuración de compilación TypeScript
```

---

## 🗄️ Historial Reciente de Migraciones SQL (`supabase/migrations`)

| Fecha / Timestamp | Archivo de Migración | Descripción de los Cambios |
| :--- | :--- | :--- |
| `2026-07-22` | `20260722120000_create_kfc_projections_module.sql` | Estructura base Master-Detail y semilla de catálogo de cuentas P&L. |
| `2026-07-28` | `20260728100000_update_stores_table_structure.sql` | Reestructuración de `stores` a `store_uid VARCHAR(100)` y actualización de FKs. |
| `2026-07-28` | `20260728110000_insert_real_stores_data.sql` | Inserción masiva de los 143 locales oficiales KFC Ecuador. |
| `2026-07-28` | `20260728120000_insert_additional_stores_and_h001ecu_projections.sql` | Registro de 24 tiendas adicionales (islas de helados y oficinas). |
| `2026-07-28` | `20260728130000_add_net_sales_to_projection_details.sql` | Ajuste idempotente para garantizar la presencia de 'Ventas Netas'. |
| `2026-07-28` | `20260728140000_insert_complete_h001_excel_data.sql` | Ingestión automatizada de los 12 meses P&L para `H001ECU` desde Excel. |

---

## 🛠️ Requisitos Previos

- [Node.js](https://nodejs.org/) (v22.x recomendado)
- CLI de [Supabase](https://supabase.com/docs/guides/cli)
- [Docker](https://www.docker.com/) (Para base de datos local)

---

## 💻 Instalación y Desarrollo Local

1. **Instalar dependencias**
   ```bash
   npm install
   ```

2. **Iniciar Supabase Local**
   ```bash
   npx supabase start
   npx supabase db reset
   ```

3. **Ejecutar el Servidor API en Desarrollo**
   ```bash
   npm run dev
   ```

4. **Desplegar Migraciones al Servidor Remoto (Producción)**
   ```bash
   npx supabase db push --db-url "postgresql://<user>:<pass>@<host>:5432/postgres" --include-all
   ```

---

## 📦 Compilación para Producción

```bash
npm run build
npm run start
```
