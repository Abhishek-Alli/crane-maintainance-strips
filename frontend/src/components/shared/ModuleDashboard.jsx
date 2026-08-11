import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { getBreakdownModule } from './breakdownModuleConfig';

const formatDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const formatDowntime = (mins) => {
  if (mins == null) return '—';
  const m = parseInt(mins, 10);
  if (Number.isNaN(m)) return String(mins);
  const h = Math.floor(m / 60);
  const rem = m % 60;
  if (h <= 0) return `${rem} min`;
  return `${h}h ${rem}m`;
};

export default function ModuleDashboard({ module: moduleKey = 'sms' }) {
  const mod = getBreakdownModule(moduleKey);
  const [recent, setRecent] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    mod.api.getBreakdownAnalysisLogs({ limit: 5 })
      .then((res) => setRecent(res?.data || []))
      .catch(() => toast.error('Failed to load recent reports'))
      .finally(() => setLoading(false));
  }, [mod.api]);

  const today = new Date().toLocaleDateString('en-IN', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
  });

  const actions = [
    {
      to: `${mod.base}/breakdown-analysis/new`,
      label: 'Breakdown Analysis Report',
      sub: 'RCA · 5-Why · CA / PA',
      primary: true,
      icon: '⚠',
    },
    {
      to: `${mod.base}/breakdown-analysis/history`,
      label: 'View History',
      sub: 'Past analysis reports',
      icon: '📋',
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{mod.title}</h1>
          <p className="text-gray-500 mt-1 text-sm">{today}</p>
        </div>

        <div className="mb-8">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Reports</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {actions.map((a) => (
              <Link
                key={a.to}
                to={a.to}
                className={`flex flex-col bg-white border border-gray-200 rounded-xl p-5 transition-all hover:shadow-md ${mod.hoverCard}`}
              >
                <span className="text-2xl mb-2">{a.icon}</span>
                <p className="font-semibold text-gray-900 text-sm leading-tight">{a.label}</p>
                <p className="text-xs text-gray-500 mt-1">{a.sub}</p>
                {a.primary && (
                  <span className={`mt-3 inline-flex w-fit text-xs font-semibold ${mod.text} ${mod.badge} px-2 py-0.5 rounded`}>
                    Fill new report
                  </span>
                )}
              </Link>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-bold text-gray-900">Recent Breakdown Analysis</h2>
            <Link to={`${mod.base}/breakdown-analysis/history`} className={`text-xs font-semibold ${mod.text} hover:opacity-80`}>
              View all →
            </Link>
          </div>
          {loading ? (
            <div className="p-10 flex justify-center">
              <div className={`animate-spin rounded-full h-8 w-8 border-b-2 ${mod.spinner}`} />
            </div>
          ) : recent.length === 0 ? (
            <div className="p-10 text-center text-gray-400 text-sm">No reports yet. Fill your first Breakdown Analysis Report.</div>
          ) : (
            <div className="divide-y divide-gray-100">
              {recent.map((log) => (
                <Link
                  key={log.id}
                  to={`${mod.base}/breakdown-analysis/${log.id}`}
                  className={`flex items-center justify-between px-5 py-3.5 transition-colors ${mod.hoverRow}`}
                >
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">{log.machine_name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {formatDate(log.report_date)}
                      {log.department ? ` · ${log.department}` : ''}
                      {log.breakdown_type ? ` · ${log.breakdown_type}` : ''}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={`text-xs font-semibold ${mod.text}`}>{formatDowntime(log.total_downtime_minutes)}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{log.filled_by_name || '—'}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
