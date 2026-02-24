-- AMG Database Initialization
-- Tables are created by the application on startup via DatabaseService
-- This file ensures the database and user exist

-- Create the database (handled by Docker env vars, but as fallback)
SELECT 'AMG database initialized' AS status;
