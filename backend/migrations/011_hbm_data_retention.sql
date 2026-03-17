-- ============================================================
-- MIGRATION 011: HBM Data Retention Policy (1 Year Auto-Delete)
-- Run this in Supabase SQL Editor
-- ============================================================

-- =====================
-- STEP 1: Enable pg_cron extension (Supabase has this built-in)
-- Go to: Supabase Dashboard → Database → Extensions → Enable pg_cron
-- OR run:
-- =====================
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- =====================
-- STEP 2: Grant usage to postgres user
-- =====================
GRANT USAGE ON SCHEMA cron TO postgres;

-- =====================
-- STEP 3: Create the daily cleanup job
-- Runs every day at 2:00 AM UTC (7:30 AM IST)
-- Deletes HBM checksheets older than 1 year
-- hbm_checksheet_values auto-deletes via CASCADE
-- =====================
SELECT cron.schedule(
  'hbm-data-cleanup-1year',         -- job name (unique)
  '0 2 * * *',                       -- every day at 2:00 AM UTC
  $$
    -- Delete checksheets older than 1 year
    -- Values cascade-delete automatically
    DELETE FROM hbm_checksheets
    WHERE created_at < NOW() - INTERVAL '1 year';

    -- Log the cleanup (optional - writes to pg_cron logs)
  $$
);

-- =====================
-- STEP 4: Verify the job was created
-- Run this to confirm:
-- SELECT * FROM cron.job WHERE jobname = 'hbm-data-cleanup-1year';
-- =====================

-- =====================
-- STEP 5: To check job run history in Supabase:
-- SELECT * FROM cron.job_run_details WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'hbm-data-cleanup-1year') ORDER BY start_time DESC LIMIT 10;
-- =====================

-- =====================
-- STEP 6: To remove the job if needed:
-- SELECT cron.unschedule('hbm-data-cleanup-1year');
-- =====================


-- ============================================================
-- WHAT GETS DELETED (CASCADE CHAIN):
-- ============================================================
-- hbm_checksheets (older than 1 year)
--   └── hbm_checksheet_values  ← AUTO CASCADE DELETE
-- ============================================================
-- hbm_machines, hbm_checksheet_templates,
-- hbm_checksheet_sections, hbm_checksheet_items
-- → NOT deleted (these are master config data, not time-series)
-- ============================================================
