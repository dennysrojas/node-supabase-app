# Node Supabase Data Entry API

![Node.js](https://img.shields.io/badge/Node.js-22.x-green)
![TypeScript](https://img.shields.io/badge/TypeScript-5.5-blue)
![Express](https://img.shields.io/badge/Express-4.19-lightgray)
![Supabase](https://img.shields.io/badge/Supabase-DB-3ECF8E)
![Docker](https://img.shields.io/badge/Docker-Enabled-2496ED)

API REST robusta construida con **Node.js, Express y TypeScript** utilizando **Supabase** como backend/base de datos. Diseñada para manejar procesos de "Data Entry" y gestionar entidades como `products`.

## 🚀 Características Principales

- **TypeScript Completo**: Tipado estático en todo el proyecto.
- **Validación de Datos**: Validación robusta de esquemas mediante `Zod`.
- **Integración con Supabase**: Interacciones seguras a la base de datos PostgreSQL utilizando `@supabase/supabase-js`.
- **Arquitectura en Capas**: Controladores, Servicios, Rutas y Middlewares separados.
- **Testing**: Pruebas unitarias y de integración implementadas con `Vitest` y `Supertest`.
- **Docker Ready**: Configurado para construir imágenes optimizadas Multi-Stage en Alpine Linux.

## 📁 Estructura del Proyecto

```text
node-supabase-app/
├── .env                 # Variables de entorno (no incluido en git)
├── Dockerfile           # Configuración multi-stage para Docker
├── src/                 # Código fuente
│   ├── config/          # Configuraciones (ej. cliente de Supabase)
│   ├── controllers/     # Lógica de los endpoints
│   ├── middlewares/     # Interceptores (ej. validaciones, auth, manejo de errores)
│   ├── routes/          # Definición de rutas API
│   ├── services/        # Lógica de negocio e interacción con BD
│   ├── types/           # Definiciones de tipos TypeScript
│   ├── app.ts           # Configuración de Express
│   └── server.ts        # Punto de entrada de la aplicación
├── supabase/            # Migraciones y configuraciones locales de Supabase
├── tests/               # Pruebas automatizadas (Vitest + Supertest)
├── package.json         # Dependencias y scripts
└── tsconfig.json        # Configuración del compilador TypeScript
```

## 🛠️ Requisitos Previos

- [Node.js](https://nodejs.org/) (v22.x recomendado)
- [Docker](https://www.docker.com/) (Para ejecución contenerizada)
- CLI de [Supabase](https://supabase.com/docs/guides/cli) (Opcional, útil para desarrollo local de la DB)

## 💻 Instalación y Desarrollo Local

1. **Instalar las dependencias**
   ```bash
   npm install
   ```

2. **Configurar Variables de Entorno**
   Renombra o crea un archivo `.env` en la raíz del proyecto usando las siguientes variables:
   ```env
   PORT=3000
   SUPABASE_URL=tu_supabase_url
   SUPABASE_KEY=tu_supabase_anon_key_o_service_role
   ```

3. **Ejecutar en modo de desarrollo**
   El siguiente comando usará `tsx` para compilar y reiniciar el servidor en vivo ante cualquier cambio:
   ```bash
   npm run dev
   ```

## 🐳 Ejecución con Docker

El proyecto cuenta con un `Dockerfile` optimizado en dos etapas (Builder y Runner) para producción.

1. **Construir la imagen**
   ```bash
   docker build -t node-supabase-api:1.0.0 .
   ```

2. **Correr el contenedor**
   Asegúrate de tener un archivo `.env` o pasar las variables de entorno.
   ```bash
   docker run -d -p 3000:3000 --name api-data-entry --env-file .env node-supabase-api:1.0.0
   ```
   > El contenedor expone el puerto `3000` e incluye un `HEALTHCHECK` integrado apuntando al endpoint `/health`.

## 🧪 Pruebas (Testing)

Se utilizan `Vitest` y `Supertest` para ejecutar las pruebas.

```bash
# Ejecutar todas las pruebas
npm run test
```

## 📦 Construcción para Producción

Para generar los artefactos JavaScript finales a partir del código TypeScript:

```bash
npm run build
```
El código compilado se colocará en la carpeta `/dist`, desde donde puedes iniciar el servidor con `npm run start` o `node dist/server.js`.
