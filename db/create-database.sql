-- ============================================================================
-- Creación de la base de datos (SQL Server)
-- Prisma Migrate NO crea la base de datos en SQL Server (a diferencia de
-- Postgres/MySQL): hay que ejecutar esto una vez por entorno, conectado a
-- `master`, antes de `npm run prisma:migrate`. El nombre debe coincidir con
-- el que se use en DATABASE_URL (backend/.env).
-- ============================================================================

IF DB_ID(N'CarteleriaDigital') IS NULL
BEGIN
    CREATE DATABASE CarteleriaDigital;
END
GO
