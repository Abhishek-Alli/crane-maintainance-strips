import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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

const isAdminUser = (() => {
  try {
    const u = JSON.parse(localStorage.getItem('user'));
    return u?.role === 'ADMIN' || u?.user_type === 'ADMIN';
  } catch {
    return false;
  }
})();

export default function BreakdownAnalysisHistory() {
  const navigate = useNavigate();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingAll, setDeletingAll] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = {};
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;
      const res = await hsmAPI.getBreakdownAnalysisLogs(params);
      setLogs(res?.data || []);
    } catch {
      toast.error('Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchLogs(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDeleteAll = async () => {
    if (!window.confirm('Delete ALL Breakdown Analysis history?\n\nThis permanently removes every breakdown analysis report from the database and cannot be undone.')) {
      return;
    }
    if (!window.confirm('Final confirmation: delete the entire Breakdown Analysis sheet history?')) {
      return;
    }
    setDeletingAll(true);
    try {
      const res = await hsmAPI.clearAllBreakdownAnalysis();
      toast.success(res?.message || 'All breakdown analysis reports deleted');
      setLogs([]);
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
            <h1 className="text-2xl font-bold text-gray-900">Breakdown Analysis History</h1>
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
              to="/hsm/breakdown-analysis/new"
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
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">To Date</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
            <button
              type="button"
              onClick={fetchLogs}
              className="px-4 py-2 bg-gray-800 text-white rounded-lg text-sm font-medium hover:bg-gray-900"
            >
              Search
            </button>
            <button
              type="button"
              onClick={() => { setDateFrom(''); setDateTo(''); setTimeout(fetchLogs, 0); }}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50"
            >
              Clear
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-12 text-center">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 mx-auto" />
            </div>
          ) : logs.length === 0 ? (
            <div className="p-12 text-center text-gray-400 text-sm">No breakdown analysis reports found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">#</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Date</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Machine</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Department</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Type</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Downtime</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">By</th>
                    <th className="px-5 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {logs.map((log, i) => (
                    <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3 text-gray-500">{i + 1}</td>
                      <td className="px-5 py-3 font-semibold text-gray-900">{formatDate(log.report_date)}</td>
                      <td className="px-5 py-3 text-gray-800">{log.machine_name}</td>
                      <td className="px-5 py-3 text-gray-600">{log.department || '—'}</td>
                      <td className="px-5 py-3">
                        {log.breakdown_type ? (
                          <span className="bg-indigo-100 text-indigo-800 text-xs font-semibold px-2 py-1 rounded-full">
                            {log.breakdown_type}
                          </span>
                        ) : '—'}
                      </td>
                      <td className="px-5 py-3 text-gray-700 font-medium">{formatDowntime(log.total_downtime_minutes)}</td>
                      <td className="px-5 py-3 text-gray-600">{log.filled_by_name || '—'}</td>
                      <td className="px-5 py-3 text-right">
                        <Link
                          to={`/hsm/breakdown-analysis/${log.id}`}
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
          )}
        </div>
      </div>
    </div>
  );
}
