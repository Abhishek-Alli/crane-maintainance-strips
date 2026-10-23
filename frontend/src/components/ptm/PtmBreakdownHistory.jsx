import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { ptmAPI } from '../../services/api';

const fmtDate = (d) => {
  if (!d) return '-';
  const date = new Date(d);
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', weekday: 'short' });
};

const fmtMinutes = (min) => {
  const total = parseInt(min) || 0;
  const h = Math.floor(total / 60);
  const m = total % 60;
  return h === 0 ? `${m}m` : `${h}h ${m}m`;
};

const fmtDateTime = (ts) => {
  if (!ts) return '-';
  return new Date(ts).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
};

export default function PtmBreakdownHistory() {
  const navigate = useNavigate();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState({ date_from: '', date_to: '', mill_id: '' });
  const [mills, setMills] = useState([]);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 20, ...filters };
      Object.keys(params).forEach(k => !params[k] && delete params[k]);
      const res = await ptmAPI.getBreakdownLogs(params);
      setLogs(res.logs || []);
      setTotalPages(res.totalPages || 1);
    } catch {
      toast.error('Failed to load breakdown logs');
    } finally {
      setLoading(false);
    }
  }, [page, filters]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  useEffect(() => {
    ptmAPI.getMills().then(r => setMills(r.mills || [])).catch(() => {});
  }, []);

  const handleFilter = (e) => {
    setFilters(f => ({ ...f, [e.target.name]: e.target.value }));
    setPage(1);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Breakdown History</h1>
          <p className="text-sm text-gray-500">PTM Breakdown Logs</p>
        </div>
        <button
          onClick={() => navigate('/ptm/breakdown/new')}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 shadow"
        >
          + New Entry
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4 bg-white rounded-xl p-3 border border-gray-200 shadow-sm">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-500 font-medium">From Date</label>
          <input type="date" name="date_from" value={filters.date_from} onChange={handleFilter}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-500 font-medium">To Date</label>
          <input type="date" name="date_to" value={filters.date_to} onChange={handleFilter}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-500 font-medium">Mill</label>
          <select name="mill_id" value={filters.mill_id} onChange={handleFilter}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300">
            <option value="">All Mills</option>
            {mills.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </div>
        <div className="flex items-end">
          <button onClick={() => { setFilters({ date_from: '', date_to: '', mill_id: '' }); setPage(1); }}
            className="px-3 py-1.5 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">
            Clear
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400">Loading...</div>
        ) : logs.length === 0 ? (
          <div className="p-8 text-center text-gray-400">No breakdown logs found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Date</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Shift</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Mills</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Total Down</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Submitted By</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Submitted At</th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-600">Action</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log, i) => (
                  <tr key={log.id} className={`border-b border-gray-100 hover:bg-blue-50 transition-colors ${i % 2 === 0 ? '' : 'bg-gray-50/30'}`}>
                    <td className="px-4 py-3 font-medium text-gray-800">{fmtDate(log.log_date)}</td>
                    <td className="px-4 py-3 text-gray-600">{log.shift || '-'}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {log.mills ? log.mills.join(', ') : (log.mill_name || '-')}
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-semibold text-red-600">{fmtMinutes(log.total_breakdown_minutes)}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{log.filled_by || '-'}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{fmtDateTime(log.created_at)}</td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => navigate(`/ptm/breakdown/${log.id}`)}
                          className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium"
                        >
                          View
                        </button>
                        {log.can_modify && (
                          <button
                            onClick={() => navigate(`/ptm/breakdown/${log.id}/edit`)}
                            className="px-3 py-1 text-xs bg-amber-100 text-amber-700 rounded-lg hover:bg-amber-200 font-medium border border-amber-200"
                          >
                            Edit
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-4">
          <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
            className="px-4 py-2 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40">
            ← Prev
          </button>
          <span className="text-sm text-gray-600">Page {page} of {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}
            className="px-4 py-2 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40">
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
