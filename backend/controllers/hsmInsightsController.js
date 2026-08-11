const { query } = require('../config/database');

const PAGE_KEYS = ['breakdown-analysis', 'roll-change-activity', 'delay-report'];

function parsePages(raw) {
  if (!raw || String(raw).trim() === '' || String(raw).trim() === 'all') {
    return [...PAGE_KEYS];
  }
  const requested = String(raw)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const selected = PAGE_KEYS.filter((k) => requested.includes(k));
  return selected.length ? selected : [...PAGE_KEYS];
}

function defaultDateRange() {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth(); // 0-based
  const from = `${y}-${String(m + 1).padStart(2, '0')}-01`;
  const lastDay = new Date(y, m + 1, 0).getDate();
  const to = `${y}-${String(m + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  return { from, to };
}

async function delayInsights(dateFrom, dateTo) {
  const [summary, byShift, byAgency, byReason, daily, hotoutMiss] = await Promise.all([
    query(
      `SELECT
         COUNT(*)::int AS total,
         COUNT(DISTINCT report_date)::int AS unique_days,
         COALESCE(SUM(total_minutes), 0)::int AS total_minutes,
         COALESCE(ROUND(AVG(total_minutes)::numeric, 1), 0)::float AS avg_minutes
       FROM hsm_delay_reports
       WHERE report_date >= $1::date AND report_date <= $2::date`,
      [dateFrom, dateTo]
    ),
    query(
      `SELECT shift, COUNT(*)::int AS count,
              COALESCE(SUM(total_minutes), 0)::int AS total_minutes
       FROM hsm_delay_reports
       WHERE report_date >= $1::date AND report_date <= $2::date
       GROUP BY shift
       ORDER BY shift`,
      [dateFrom, dateTo]
    ),
    query(
      `SELECT COALESCE(NULLIF(TRIM(agency), ''), '(not set)') AS agency,
              COUNT(*)::int AS count,
              COALESCE(SUM(total_minutes), 0)::int AS total_minutes
       FROM hsm_delay_reports
       WHERE report_date >= $1::date AND report_date <= $2::date
       GROUP BY 1
       ORDER BY count DESC
       LIMIT 10`,
      [dateFrom, dateTo]
    ),
    query(
      `SELECT COALESCE(NULLIF(TRIM(reason), ''), '(not set)') AS reason,
              COUNT(*)::int AS count,
              COALESCE(SUM(total_minutes), 0)::int AS total_minutes
       FROM hsm_delay_reports
       WHERE report_date >= $1::date AND report_date <= $2::date
       GROUP BY 1
       ORDER BY count DESC
       LIMIT 10`,
      [dateFrom, dateTo]
    ),
    query(
      `SELECT report_date::text AS day,
              COUNT(*)::int AS count,
              COALESCE(SUM(total_minutes), 0)::int AS total_minutes
       FROM hsm_delay_reports
       WHERE report_date >= $1::date AND report_date <= $2::date
       GROUP BY report_date
       ORDER BY report_date`,
      [dateFrom, dateTo]
    ),
    query(
      `SELECT
         COUNT(*) FILTER (
           WHERE hotout_source IS NOT NULL OR hotout_thickness IS NOT NULL
              OR hotout_width IS NOT NULL OR hotout_mt IS NOT NULL
              OR hotout_pieces IS NOT NULL OR hotout_remark IS NOT NULL
         )::int AS hotout_count,
         COUNT(*) FILTER (
           WHERE miss_thickness IS NOT NULL OR miss_width IS NOT NULL
              OR miss_mt IS NOT NULL OR miss_location IS NOT NULL
              OR miss_pieces IS NOT NULL OR miss_operator_name IS NOT NULL
              OR miss_remark IS NOT NULL
         )::int AS miss_roll_count
       FROM hsm_delay_reports
       WHERE report_date >= $1::date AND report_date <= $2::date`,
      [dateFrom, dateTo]
    ),
  ]);

  const s = summary.rows[0] || {};
  const hm = hotoutMiss.rows[0] || {};
  return {
    key: 'delay-report',
    label: 'Delay Report',
    history_path: '/hsm/delay-report/history',
    summary: {
      total: s.total || 0,
      unique_days: s.unique_days || 0,
      total_minutes: s.total_minutes || 0,
      avg_minutes: s.avg_minutes || 0,
      hotout_count: hm.hotout_count || 0,
      miss_roll_count: hm.miss_roll_count || 0,
    },
    by_shift: byShift.rows,
    by_agency: byAgency.rows,
    top_reasons: byReason.rows,
    daily: daily.rows,
  };
}

async function breakdownInsights(dateFrom, dateTo) {
  const [summary, byMachine, byType, byDept, daily] = await Promise.all([
    query(
      `SELECT
         COUNT(*)::int AS total,
         COUNT(DISTINCT report_date)::int AS unique_days,
         COALESCE(SUM(total_downtime_minutes), 0)::int AS total_downtime_minutes,
         COALESCE(ROUND(AVG(total_downtime_minutes)::numeric, 1), 0)::float AS avg_downtime_minutes
       FROM hsm_breakdown_analysis_logs
       WHERE report_date >= $1::date AND report_date <= $2::date`,
      [dateFrom, dateTo]
    ),
    query(
      `SELECT COALESCE(NULLIF(TRIM(machine_name), ''), '(not set)') AS machine_name,
              COUNT(*)::int AS count,
              COALESCE(SUM(total_downtime_minutes), 0)::int AS total_downtime_minutes
       FROM hsm_breakdown_analysis_logs
       WHERE report_date >= $1::date AND report_date <= $2::date
       GROUP BY 1
       ORDER BY count DESC
       LIMIT 10`,
      [dateFrom, dateTo]
    ),
    query(
      `SELECT COALESCE(NULLIF(TRIM(breakdown_type), ''), '(not set)') AS breakdown_type,
              COUNT(*)::int AS count,
              COALESCE(SUM(total_downtime_minutes), 0)::int AS total_downtime_minutes
       FROM hsm_breakdown_analysis_logs
       WHERE report_date >= $1::date AND report_date <= $2::date
       GROUP BY 1
       ORDER BY count DESC
       LIMIT 10`,
      [dateFrom, dateTo]
    ),
    query(
      `SELECT COALESCE(NULLIF(TRIM(department), ''), '(not set)') AS department,
              COUNT(*)::int AS count
       FROM hsm_breakdown_analysis_logs
       WHERE report_date >= $1::date AND report_date <= $2::date
       GROUP BY 1
       ORDER BY count DESC
       LIMIT 10`,
      [dateFrom, dateTo]
    ),
    query(
      `SELECT report_date::text AS day,
              COUNT(*)::int AS count,
              COALESCE(SUM(total_downtime_minutes), 0)::int AS total_downtime_minutes
       FROM hsm_breakdown_analysis_logs
       WHERE report_date >= $1::date AND report_date <= $2::date
       GROUP BY report_date
       ORDER BY report_date`,
      [dateFrom, dateTo]
    ),
  ]);

  const s = summary.rows[0] || {};
  return {
    key: 'breakdown-analysis',
    label: 'Breakdown Analysis',
    history_path: '/hsm/breakdown-analysis/history',
    summary: {
      total: s.total || 0,
      unique_days: s.unique_days || 0,
      total_downtime_minutes: s.total_downtime_minutes || 0,
      avg_downtime_minutes: s.avg_downtime_minutes || 0,
    },
    by_machine: byMachine.rows,
    by_type: byType.rows,
    by_department: byDept.rows,
    daily: daily.rows,
  };
}

async function rollChangeInsights(dateFrom, dateTo) {
  const [summary, byArea, byShift, daily, eqMp] = await Promise.all([
    query(
      `SELECT
         COUNT(*)::int AS total,
         COUNT(DISTINCT report_date)::int AS unique_days
       FROM hsm_roll_change_activity_logs
       WHERE report_date >= $1::date AND report_date <= $2::date`,
      [dateFrom, dateTo]
    ),
    query(
      `SELECT area, COUNT(*)::int AS count
       FROM hsm_roll_change_activity_logs
       WHERE report_date >= $1::date AND report_date <= $2::date
       GROUP BY area
       ORDER BY count DESC`,
      [dateFrom, dateTo]
    ),
    query(
      `SELECT shift, COUNT(*)::int AS count
       FROM hsm_roll_change_activity_logs
       WHERE report_date >= $1::date AND report_date <= $2::date
       GROUP BY shift
       ORDER BY shift`,
      [dateFrom, dateTo]
    ),
    query(
      `SELECT report_date::text AS day, COUNT(*)::int AS count
       FROM hsm_roll_change_activity_logs
       WHERE report_date >= $1::date AND report_date <= $2::date
       GROUP BY report_date
       ORDER BY report_date`,
      [dateFrom, dateTo]
    ),
    query(
      `SELECT
         (SELECT COUNT(*)::int
          FROM hsm_roll_change_equipment_entries e
          JOIN hsm_roll_change_activity_logs l ON e.log_id = l.id
          WHERE l.report_date >= $1::date AND l.report_date <= $2::date) AS equipment_entries,
         (SELECT COUNT(*)::int
          FROM hsm_roll_change_manpower_entries m
          JOIN hsm_roll_change_activity_logs l ON m.log_id = l.id
          WHERE l.report_date >= $1::date AND l.report_date <= $2::date) AS manpower_entries`,
      [dateFrom, dateTo]
    ),
  ]);

  const s = summary.rows[0] || {};
  const em = eqMp.rows[0] || {};
  return {
    key: 'roll-change-activity',
    label: 'Roll Change Activity',
    history_path: '/hsm/roll-change-activity/history',
    summary: {
      total: s.total || 0,
      unique_days: s.unique_days || 0,
      equipment_entries: em.equipment_entries || 0,
      manpower_entries: em.manpower_entries || 0,
    },
    by_area: byArea.rows,
    by_shift: byShift.rows,
    daily: daily.rows,
  };
}

class HsmInsightsController {
  static async getInsights(req, res) {
    try {
      const defaults = defaultDateRange();
      const dateFrom = req.query.date_from || defaults.from;
      const dateTo = req.query.date_to || defaults.to;
      const pages = parsePages(req.query.pages);

      const builders = {
        'delay-report': delayInsights,
        'breakdown-analysis': breakdownInsights,
        'roll-change-activity': rollChangeInsights,
      };

      const sections = await Promise.all(pages.map((key) => builders[key](dateFrom, dateTo)));

      res.json({
        success: true,
        data: {
          date_from: dateFrom,
          date_to: dateTo,
          pages,
          available_pages: [
            { key: 'breakdown-analysis', label: 'Breakdown Analysis' },
            { key: 'roll-change-activity', label: 'Roll Change Activity' },
            { key: 'delay-report', label: 'Delay Report' },
          ],
          sections,
        },
      });
    } catch (error) {
      console.error('HSM insights error:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch insights' });
    }
  }
}

module.exports = HsmInsightsController;
