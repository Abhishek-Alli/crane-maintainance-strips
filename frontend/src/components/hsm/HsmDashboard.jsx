import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { hsmAPI } from '../../services/api';

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

export default function HsmDashboard() {
  const [baRecent, setBaRecent] = useState([]);
  const [rcRecent, setRcRecent] = useState([]);
  const [delayRecent, setDelayRecent] = useState([]);
  const [loading, setLoading] = useState(true);

  const isAdminUser = (() => {
    try {
      const u = JSON.parse(localStorage.getItem('user'));
      return u?.role === 'ADMIN' || u?.user_type === 'ADMIN';
    } catch {
      return false;
    }
  })();

  useEffect(() => {
    Promise.all([
      hsmAPI.getBreakdownAnalysisLogs({ limit: 5 }).catch(() => ({ data: [] })),
      hsmAPI.getRollChangeActivityLogs({ limit: 5 }).catch(() => ({ data: [] })),
      hsmAPI.getDelayReportLogs({ limit: 5 }).catch(() => ({ data: [] })),
    ])
      .then(([ba, rc, delay]) => {
        setBaRecent(ba?.data || []);
        setRcRecent(rc?.data || []);
        setDelayRecent(delay?.data || []);
      })
      .catch(() => toast.error('Failed to load recent reports'))
      .finally(() => setLoading(false));
  }, []);

  const today = new Date().toLocaleDateString('en-IN', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
  });

  const actions = [
    {
      to: '/hsm/breakdown-analysis/new',
      label: 'Breakdown Analysis Report',
      sub: 'RCA · 5-Why · CA / PA',
      primary: true,
    },
    {
      to: '/hsm/breakdown-analysis/history',
      label: 'Breakdown Analysis History',
      sub: 'Past analysis reports',
    },
    {
      to: '/hsm/roll-change-activity/new',
      label: 'Mechanical Activities During Roll Change',
      sub: 'Area equipment · manpower · remarks',
      primary: true,
    },
    {
      to: '/hsm/roll-change-activity/history',
      label: 'Roll Change Activity History',
      sub: 'Past roll change reports',
    },
    {
      to: '/hsm/delay-report/new',
      label: 'Delay Report',
      sub: 'HOTOUT · Miss Roll · total time',
      primary: true,
    },
    {
      to: '/hsm/delay-report/history',
      label: 'Delay Report History',
      sub: 'Past delay reports',
    },
    ...(isAdminUser
      ? [{
          to: '/hsm/insights',
          label: 'Insights',
          sub: 'Custom analysis — pick pages to compare',
          primary: true,
        }]
      : []),
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">HSM Checksheets</h1>
          <p className="text-gray-500 mt-1 text-sm">{today}</p>
        </div>

        <div className="mb-8">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Reports</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {actions.map((a) => (
              <Link
                key={a.to}
                to={a.to}
                className="flex flex-col bg-white border border-gray-200 rounded-xl p-5 transition-all hover:shadow-md hover:border-indigo-200"
              >
                <p className="font-semibold text-gray-900 text-sm leading-tight">{a.label}</p>
                <p className="text-xs text-gray-500 mt-1">{a.sub}</p>
                {a.primary && (
                  <span className="mt-3 inline-flex w-fit text-xs font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                    Fill new report
                  </span>
                )}
              </Link>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-bold text-gray-900 text-sm">Recent Breakdown Analysis</h2>
              <Link to="/hsm/breakdown-analysis/history" className="text-xs font-semibold text-indigo-700 hover:opacity-80">
                View all →
              </Link>
            </div>
            {loading ? (
              <div className="p-10 flex justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
              </div>
            ) : baRecent.length === 0 ? (
              <div className="p-8 text-center text-gray-400 text-sm">No reports yet.</div>
            ) : (
              <div className="divide-y divide-gray-100">
                {baRecent.map((log) => (
                  <Link
                    key={log.id}
                    to={`/hsm/breakdown-analysis/${log.id}`}
                    className="flex items-center justify-between px-5 py-3.5 hover:bg-indigo-50/50 transition-colors"
                  >
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">{log.machine_name}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{formatDate(log.report_date)}</p>
                    </div>
                    <p className="text-xs font-semibold text-indigo-700">{formatDowntime(log.total_downtime_minutes)}</p>
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-bold text-gray-900 text-sm">Recent Roll Change</h2>
              <Link to="/hsm/roll-change-activity/history" className="text-xs font-semibold text-indigo-700 hover:opacity-80">
                View all →
              </Link>
            </div>
            {loading ? (
              <div className="p-10 flex justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
              </div>
            ) : rcRecent.length === 0 ? (
              <div className="p-8 text-center text-gray-400 text-sm">No reports yet.</div>
            ) : (
              <div className="divide-y divide-gray-100">
                {rcRecent.map((log) => (
                  <Link
                    key={log.id}
                    to={`/hsm/roll-change-activity/${log.id}`}
                    className="flex items-center justify-between px-5 py-3.5 hover:bg-indigo-50/50 transition-colors"
                  >
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">{log.area}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {formatDate(log.report_date)} · Shift {log.shift}
                      </p>
                    </div>
                    <p className="text-xs font-semibold text-indigo-700">
                      {log.equipment_count != null ? `${log.equipment_count} eq.` : '—'}
                    </p>
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-bold text-gray-900 text-sm">Recent Delay Reports</h2>
              <Link to="/hsm/delay-report/history" className="text-xs font-semibold text-indigo-700 hover:opacity-80">
                View all →
              </Link>
            </div>
            {loading ? (
              <div className="p-10 flex justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
              </div>
            ) : delayRecent.length === 0 ? (
              <div className="p-8 text-center text-gray-400 text-sm">No reports yet.</div>
            ) : (
              <div className="divide-y divide-gray-100">
                {delayRecent.map((log) => (
                  <Link
                    key={log.id}
                    to={`/hsm/delay-report/${log.id}`}
                    className="flex items-center justify-between px-5 py-3.5 hover:bg-indigo-50/50 transition-colors"
                  >
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">
                        Shift {log.shift}{log.agency ? ` · ${log.agency}` : ''}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">{formatDate(log.report_date)}</p>
                    </div>
                    <p className="text-xs font-semibold text-indigo-700">{formatDowntime(log.total_minutes)}</p>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
