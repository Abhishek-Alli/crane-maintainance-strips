import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { hsmAPI } from '../../services/api';

const formatDate = (d) => {
  if (!d) return '—';
  const s = String(d).slice(0, 10);
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) {
    const dt = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    return dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  }
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const formatDuration = (mins) => {
  if (mins == null) return '—';
  const m = parseInt(mins, 10);
  if (Number.isNaN(m)) return String(mins);
  const h = Math.floor(m / 60);
  const rem = m % 60;
  if (h <= 0) return `${rem} min`;
  return `${h}h ${rem}m`;
};

const formatTime = (t) => {
  if (!t) return '—';
  const s = String(t);
  const m = s.match(/^(\d{1,2}):(\d{2})/);
  return m ? `${m[1].padStart(2, '0')}:${m[2]}` : s.slice(0, 5);
};

const isAdminUser = (() => {
  try {
    const u = JSON.parse(localStorage.getItem('user'));
    return u?.role === 'ADMIN' || u?.user_type === 'ADMIN';
  } catch {
    return false;
  }
})();

export default function DelayReportHistory() {
  const navigate = useNavigate();
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [deletingAll, setDeletingAll] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const fetchLogs = async (from = dateFrom, to = dateTo) => {
    setLoading(true);
    try {
      const params = {};
      if (from) params.date_from = from;
      if (to) params.date_to = to;
      const res = await hsmAPI.getDelayReportLogs(params);
      setLogs(res?.data || []);
      setTotal(res?.total ?? (res?.data || []).length);
    } catch {
      toast.error('Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchLogs('', ''); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDeleteAll = async () => {
    if (!window.confirm('Delete ALL Delay Report history?\n\nThis permanently removes every delay report from the database and cannot be undone.')) {
      return;
    }
    if (!window.confirm('Final confirmation: delete the entire Delay Report sheet history?')) {
      return;
    }
    setDeletingAll(true);
    try {
      const res = await hsmAPI.clearAllDelayReports();
      toast.success(res?.message || 'All delay reports deleted');
      setLogs([]);
      setTotal(0);
    } catch {
      toast.error('Failed to delete all history');
    } finally {
      setDeletingAll(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
          <div>
            <button
              type="button"
              onClick={() => navigate('/hsm/dashboard')}
              className="text-sm text-gray-500 hover:text-gray-700 mb-1 flex items-center gap-1"
            >
              ← Back to Dashboard
            </button>
            <h1 className="text-2xl font-bold text-gray-900">Delay Report History</h1>
          </div>
          <div className="flex flex-wrap gap-2">
            {isAdminUser && (
              <button
                type="button"
                onClick={handleDeleteAll}
                disabled={deletingAll}
                className="inline-flex items-center gap-1 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deletingAll ? 'Deleting…' : 'Delete All History'}
              </button>
            )}
            <Link
              to="/hsm/delay-report/new"
              className="inline-flex items-center gap-1 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700"
            >
              + New Report
            </Link>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-3 items-end">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">From Date</label>
              <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">To Date</label>
              <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
            </div>
            <button type="button" onClick={() => fetchLogs(dateFrom, dateTo)} className="px-4 py-2 bg-gray-800 text-white rounded-lg text-sm font-medium hover:bg-gray-900">Search</button>
            <button
              type="button"
              onClick={() => {
                setDateFrom('');
                setDateTo('');
                fetchLogs('', '');
              }}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50"
            >
              Clear
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-10 flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
            </div>
          ) : logs.length === 0 ? (
            <div className="p-10 text-center text-gray-400 text-sm">No reports found.</div>
          ) : (
            <>
              <div className="px-5 py-2.5 border-b border-gray-100 text-xs text-gray-500">
                Showing {logs.length}{total > logs.length ? ` of ${total}` : ''} report{total === 1 ? '' : 's'}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">#</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">Date</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">Shift</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">Start</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">End</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">Duration</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">Agency</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Reason</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">By</th>
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {logs.map((log, i) => (
                      <tr key={log.id} className="hover:bg-indigo-50/40 transition-colors">
                        <td className="px-4 py-3 text-gray-500">{i + 1}</td>
                        <td className="px-4 py-3 font-semibold text-gray-900 whitespace-nowrap">{formatDate(log.report_date)}</td>
                        <td className="px-4 py-3">
                          <span className="bg-indigo-100 text-indigo-800 text-xs font-semibold px-2 py-0.5 rounded">
                            {log.shift || '—'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{formatTime(log.start_time)}</td>
                        <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{formatTime(log.end_time)}</td>
                        <td className="px-4 py-3 font-medium text-indigo-700 whitespace-nowrap">{formatDuration(log.total_minutes)}</td>
                        <td className="px-4 py-3 text-gray-700 max-w-[140px] truncate" title={log.agency || ''}>{log.agency || '—'}</td>
                        <td className="px-4 py-3 text-gray-600 max-w-[220px] truncate" title={log.reason || ''}>
                          {log.reason ? String(log.reason) : '—'}
                        </td>
                        <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{log.filled_by_name || '—'}</td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          <Link
                            to={`/hsm/delay-report/${log.id}`}
                            className="text-xs text-indigo-700 hover:text-indigo-900 font-semibold"
                          >
                            View →
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
