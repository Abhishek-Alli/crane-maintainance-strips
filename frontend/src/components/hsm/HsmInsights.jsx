import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { hsmAPI } from '../../services/api';

const STORAGE_KEY = 'hsm_insights_pages';

const PAGE_OPTIONS = [
  { key: 'breakdown-analysis', label: 'Breakdown Analysis' },
  { key: 'roll-change-activity', label: 'Roll Change Activity' },
  { key: 'delay-report', label: 'Delay Report' },
  { key: 'fm-daily-checklist', label: 'FM Daily Check List' },
];

function defaultMonthRange() {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const from = `${y}-${String(m + 1).padStart(2, '0')}-01`;
  const last = new Date(y, m + 1, 0).getDate();
  const to = `${y}-${String(m + 1).padStart(2, '0')}-${String(last).padStart(2, '0')}`;
  return { from, to };
}

function loadSelectedPages() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return PAGE_OPTIONS.map((p) => p.key);
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || !parsed.length) return PAGE_OPTIONS.map((p) => p.key);
    return PAGE_OPTIONS.map((p) => p.key).filter((k) => parsed.includes(k));
  } catch {
    return PAGE_OPTIONS.map((p) => p.key);
  }
}

function formatMins(mins) {
  if (mins == null) return '—';
  const m = Math.round(Number(mins));
  if (Number.isNaN(m)) return '—';
  const h = Math.floor(m / 60);
  const rem = m % 60;
  if (h <= 0) return `${rem} min`;
  return `${h}h ${rem}m`;
}

function formatDay(d) {
  if (!d) return '—';
  const s = String(d).slice(0, 10);
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return s;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
  });
}

function Stat({ label, value, sub }) {
  return (
    <div className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">{label}</p>
      <p className="text-xl font-bold text-gray-900 mt-1">{value}</p>
      {sub ? <p className="text-xs text-gray-500 mt-0.5">{sub}</p> : null}
    </div>
  );
}

function RankList({ title, rows, labelKey, valueKey = 'count', valueFmt }) {
  const max = Math.max(1, ...rows.map((r) => Number(r[valueKey]) || 0));
  return (
    <div className="bg-white border border-gray-100 rounded-xl p-4">
      <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-3">{title}</h4>
      {!rows.length ? (
        <p className="text-sm text-gray-400">No data</p>
      ) : (
        <ul className="space-y-2.5">
          {rows.map((r) => {
            const label = r[labelKey];
            const val = Number(r[valueKey]) || 0;
            const pct = Math.round((val / max) * 100);
            return (
              <li key={`${label}-${val}`}>
                <div className="flex items-center justify-between gap-2 text-sm mb-1">
                  <span className="text-gray-800 truncate font-medium">{label}</span>
                  <span className="text-gray-600 shrink-0 tabular-nums">
                    {valueFmt ? valueFmt(val, r) : val}
                  </span>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${pct}%` }} />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function DailyBars({ rows, valueKey = 'count' }) {
  const max = Math.max(1, ...rows.map((r) => Number(r[valueKey]) || 0));
  if (!rows.length) return <p className="text-sm text-gray-400">No daily data</p>;
  return (
    <div className="bg-white border border-gray-100 rounded-xl p-4">
      <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-3">Daily trend</h4>
      <div className="flex items-end gap-1 h-28 overflow-x-auto pb-1">
        {rows.map((r) => {
          const val = Number(r[valueKey]) || 0;
          const h = Math.max(4, Math.round((val / max) * 100));
          return (
            <div key={r.day} className="flex flex-col items-center min-w-[18px] flex-1" title={`${formatDay(r.day)}: ${val}`}>
              <div className="w-full flex items-end justify-center h-24">
                <div className="w-full max-w-[14px] bg-indigo-500 rounded-t" style={{ height: `${h}%` }} />
              </div>
              <span className="text-[9px] text-gray-400 mt-1 rotate-0">{String(r.day).slice(8)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DelaySection({ data }) {
  const s = data.summary || {};
  return (
    <section className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between gap-3">
        <div>
          <h3 className="font-bold text-gray-900">{data.label}</h3>
          <p className="text-xs text-gray-500 mt-0.5">Delay minutes · shift · agency · HOTOUT / Miss Roll</p>
        </div>
        <Link to={data.history_path} className="text-xs font-semibold text-indigo-700 hover:opacity-80 shrink-0">
          History →
        </Link>
      </div>
      <div className="p-5 space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <Stat label="Reports" value={s.total} />
          <Stat label="Days" value={s.unique_days} />
          <Stat label="Total delay" value={formatMins(s.total_minutes)} />
          <Stat label="Avg delay" value={formatMins(s.avg_minutes)} />
          <Stat label="HOTOUT" value={s.hotout_count} />
          <Stat label="Miss Roll" value={s.miss_roll_count} />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <RankList title="By shift" rows={data.by_shift || []} labelKey="shift" valueFmt={(v, r) => `${v} · ${formatMins(r.total_minutes)}`} />
          <RankList title="Top agencies" rows={data.by_agency || []} labelKey="agency" />
          <RankList title="Top reasons" rows={data.top_reasons || []} labelKey="reason" />
        </div>
        <DailyBars rows={data.daily || []} valueKey="total_minutes" />
      </div>
    </section>
  );
}

function BreakdownSection({ data }) {
  const s = data.summary || {};
  return (
    <section className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between gap-3">
        <div>
          <h3 className="font-bold text-gray-900">{data.label}</h3>
          <p className="text-xs text-gray-500 mt-0.5">Downtime · machine · type · department</p>
        </div>
        <Link to={data.history_path} className="text-xs font-semibold text-indigo-700 hover:opacity-80 shrink-0">
          History →
        </Link>
      </div>
      <div className="p-5 space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Stat label="Reports" value={s.total} />
          <Stat label="Days" value={s.unique_days} />
          <Stat label="Total downtime" value={formatMins(s.total_downtime_minutes)} />
          <Stat label="Avg downtime" value={formatMins(s.avg_downtime_minutes)} />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <RankList title="Top machines" rows={data.by_machine || []} labelKey="machine_name" valueFmt={(v, r) => `${v} · ${formatMins(r.total_downtime_minutes)}`} />
          <RankList title="Breakdown type" rows={data.by_type || []} labelKey="breakdown_type" />
          <RankList title="Department" rows={data.by_department || []} labelKey="department" />
        </div>
        <DailyBars rows={data.daily || []} valueKey="total_downtime_minutes" />
      </div>
    </section>
  );
}

function RollChangeSection({ data }) {
  const s = data.summary || {};
  return (
    <section className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between gap-3">
        <div>
          <h3 className="font-bold text-gray-900">{data.label}</h3>
          <p className="text-xs text-gray-500 mt-0.5">Area · shift · equipment · manpower</p>
        </div>
        <Link to={data.history_path} className="text-xs font-semibold text-indigo-700 hover:opacity-80 shrink-0">
          History →
        </Link>
      </div>
      <div className="p-5 space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Stat label="Reports" value={s.total} />
          <Stat label="Days" value={s.unique_days} />
          <Stat label="Equipment entries" value={s.equipment_entries} />
          <Stat label="Manpower entries" value={s.manpower_entries} />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <RankList title="By area" rows={data.by_area || []} labelKey="area" />
          <RankList title="By shift" rows={data.by_shift || []} labelKey="shift" />
        </div>
        <DailyBars rows={data.daily || []} />
      </div>
    </section>
  );
}

function FmDailySection({ data }) {
  const s = data.summary || {};
  return (
    <section className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between gap-3">
        <div>
          <h3 className="font-bold text-gray-900">{data.label}</h3>
          <p className="text-xs text-gray-500 mt-0.5">Shift · sheets with NOT OK items</p>
        </div>
        <Link to={data.history_path} className="text-xs font-semibold text-indigo-700 hover:opacity-80 shrink-0">
          History →
        </Link>
      </div>
      <div className="p-5 space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <Stat label="Checklists" value={s.total} />
          <Stat label="Days" value={s.unique_days} />
          <Stat label="Sheets with NOT OK" value={s.sheets_with_not_ok} />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <RankList title="By shift" rows={data.by_shift || []} labelKey="shift" />
          <DailyBars rows={data.daily || []} />
        </div>
      </div>
    </section>
  );
}

const SECTION_RENDER = {
  'delay-report': DelaySection,
  'breakdown-analysis': BreakdownSection,
  'roll-change-activity': RollChangeSection,
  'fm-daily-checklist': FmDailySection,
};

export default function HsmInsights() {
  const navigate = useNavigate();
  const defaults = useMemo(() => defaultMonthRange(), []);
  const [dateFrom, setDateFrom] = useState(defaults.from);
  const [dateTo, setDateTo] = useState(defaults.to);
  const [selected, setSelected] = useState(loadSelectedPages);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  const fetchInsights = async (pages = selected, from = dateFrom, to = dateTo) => {
    if (!pages.length) {
      toast.info('Select at least one page');
      setData(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await hsmAPI.getInsights({
        pages: pages.join(','),
        date_from: from || undefined,
        date_to: to || undefined,
      });
      setData(res?.data || null);
    } catch {
      toast.error('Failed to load insights');
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInsights();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const togglePage = (key) => {
    setSelected((prev) => {
      const next = prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <button
            type="button"
            onClick={() => navigate('/hsm/dashboard')}
            className="text-sm text-gray-500 hover:text-gray-700 mb-1"
          >
            ← Back to Dashboard
          </button>
          <h1 className="text-2xl font-bold text-gray-900">HSM Insights</h1>
          <p className="text-sm text-gray-500 mt-1">
            Select pages to show custom analysis for each.
          </p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 mb-6 space-y-4">
          <div>
            <p className="text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">Pages</p>
            <div className="flex flex-wrap gap-2">
              {PAGE_OPTIONS.map((p) => {
                const on = selected.includes(p.key);
                return (
                  <button
                    key={p.key}
                    type="button"
                    onClick={() => togglePage(p.key)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                      on
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-white text-gray-700 border-gray-300 hover:border-indigo-300'
                    }`}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 items-end">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">From</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">To</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
            <button
              type="button"
              onClick={() => fetchInsights(selected, dateFrom, dateTo)}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700"
            >
              Apply
            </button>
          </div>
        </div>

        {loading ? (
          <div className="p-16 flex justify-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" />
          </div>
        ) : !data?.sections?.length ? (
          <div className="bg-white rounded-xl border border-gray-200 p-10 text-center text-gray-400 text-sm">
            Select one or more pages and click Apply.
          </div>
        ) : (
          <div className="space-y-6">
            {data.sections.map((section) => {
              const Comp = SECTION_RENDER[section.key];
              if (!Comp) return null;
              return <Comp key={section.key} data={section} />;
            })}
          </div>
        )}
      </div>
    </div>
  );
}
