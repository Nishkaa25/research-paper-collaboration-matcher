-- =====================================================================
--  File 08 : Database-level security (least privilege)
--  usage:  psql -d rpcm -v app_password='<choose-a-strong-password>' -f 08_security_roles.sql
--  The password is supplied at run time and is never stored in source code.
-- =====================================================================
\if :{?app_password}
\else
  \echo 'Pass a password:  -v app_password=...'
  \quit
\endif

-- Application role used by the Next.js API layer (LOGIN, no DDL, no superuser)
SELECT format('CREATE ROLE rpcm_app LOGIN PASSWORD %L NOSUPERUSER NOCREATEDB NOCREATEROLE', :'app_password')
WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'rpcm_app') \gexec
SELECT format('ALTER ROLE rpcm_app PASSWORD %L', :'app_password') \gexec

-- Read-only role for reporting / demos
SELECT 'CREATE ROLE rpcm_readonly NOLOGIN'
WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'rpcm_readonly') \gexec

SELECT format('GRANT CONNECT ON DATABASE %I TO rpcm_app', current_database()) \gexec
GRANT USAGE ON SCHEMA public TO rpcm_app, rpcm_readonly;

-- Application role: DML only (no DDL, no TRUNCATE)
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO rpcm_app;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO rpcm_app;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO rpcm_app;
GRANT EXECUTE ON ALL PROCEDURES IN SCHEMA public TO rpcm_app;

-- Password hashes can be written (register / change password) but NEVER read back by the app
REVOKE SELECT ON researcher FROM rpcm_app;
GRANT  SELECT (researcher_id, full_name, email, bio, department, join_date, affiliation_id,
               orcid, h_index, role, is_active) ON researcher TO rpcm_app;

-- Login check runs with the owner's rights, so the app never needs to read password_hash
ALTER FUNCTION authenticate_researcher(TEXT, TEXT) SECURITY DEFINER SET search_path = public, pg_temp;

-- Reporting role sees only views, never base tables
GRANT SELECT ON v_researcher_profile, v_paper_details, v_top_matches, mv_topic_trends TO rpcm_readonly;

-- ---------------- Self-test of the privileges ----------------
\echo '--- privilege tests (SET ROLE)'
SET ROLE rpcm_app;
SELECT 'app can log a user in via function' AS test, COUNT(*) AS rows FROM authenticate_researcher('ananya.rao@pes.example.edu', 'Welcome@123');
DO $$ BEGIN
    PERFORM password_hash FROM researcher LIMIT 1;
    RAISE NOTICE 'FAIL: app role could read password_hash';
EXCEPTION WHEN insufficient_privilege THEN RAISE NOTICE 'PASS: app role cannot read password_hash'; END $$;
DO $$ BEGIN
    EXECUTE 'DROP TABLE paper_topic';
    RAISE NOTICE 'FAIL: app role could DROP a table';
EXCEPTION WHEN insufficient_privilege THEN RAISE NOTICE 'PASS: app role cannot DROP tables'; END $$;
DO $$ BEGIN
    EXECUTE 'ALTER TABLE paper ADD COLUMN hack INT';
    RAISE NOTICE 'FAIL: app role could ALTER a table';
EXCEPTION WHEN insufficient_privilege THEN RAISE NOTICE 'PASS: app role cannot ALTER tables'; END $$;
RESET ROLE;

SET ROLE rpcm_readonly;
DO $$ BEGIN
    PERFORM 1 FROM researcher LIMIT 1;
    RAISE NOTICE 'FAIL: read-only role could read a base table';
EXCEPTION WHEN insufficient_privilege THEN RAISE NOTICE 'PASS: read-only role cannot read base tables'; END $$;
DO $$ BEGIN
    PERFORM 1 FROM v_researcher_profile LIMIT 1;
    RAISE NOTICE 'PASS: read-only role can read views';
EXCEPTION WHEN insufficient_privilege THEN RAISE NOTICE 'FAIL: read-only role cannot read views'; END $$;
RESET ROLE;
