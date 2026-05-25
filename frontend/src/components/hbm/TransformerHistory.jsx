import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { hbmAPI } from '../../services/api';


const TransformerHistory = () => {
  const isAdmin = (() => { try { const u = JSON.parse(localStorage.getItem('user')); return u?.role === 'ADMIN' || u?.user_type === 'ADMIN'; } catch { return false; } })();
  const [logs, setLogs]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ date_from: '', date_to: '' });

  useEffect(() => { fetchLogs(); }, []); // eslint-disable-line

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filters.date_from) params.date_from = filters.date_from;
      if (filters.date_to)   params.date_to   = filters.date_to;
      const res = await hbmAPI.getTransformerLogs(params);
      setLogs(Array.isArray(res) ? res : (res?.data ?? []));
    } catch {
      toast.error('Failed to load Transformer logs');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this entry? This cannot be undone.')) return;
    try {
      await hbmAPI.deleteLog('transformer', id);
      toast.success('Entry deleted');
      setLogs(prev => prev.filter(l => l.id !== id));
    } catch { toast.error('Failed to delete entry'); }
  };

  const formatDate = (d) =>
    d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Link to="/hbm/dashboard"
              className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Transformer Checksheet History</h1>
              <p className="text-sm text-gray-500">{logs.length} records</p>
            </div>
          </div>
          <Link to="/hbm/transformer/new"
            className="flex items-center gap-2 px-4 py-2 bg-blue-700 text-white rounded-lg font-semibold text-sm hover:bg-blue-800 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Entry
          </Link>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-5 flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">From Date</label>
            <input type="date" value={filters.date_from}
              onChange={e => setFilters(p => ({ ...p, date_from: e.target.value }))}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">To Date</label>
            <input type="date" value={filters.date_to}
              onChange={e => setFilters(p => ({ ...p, date_to: e.target.value }))}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
          </div>
          <button onClick={fetchLogs}
            className="px-4 py-2 bg-blue-700 text-white rounded-lg text-sm font-semibold hover:bg-blue-800 transition-colors">Filter</button>
          <button onClick={() => { setFilters({ date_from: '', date_to: '' }); setTimeout(fetchLogs, 0); }}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-300 transition-colors">Clear</button>
        </div>

        {/* List */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-700"></div>
          </div>
        ) : logs.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-16 text-center">
            <p className="text-gray-400 text-lg">No Transformer logs found</p>
            <Link to="/hbm/transformer/new" className="mt-4 inline-block text-blue-700 font-semibold hover:underline">
              Submit first checksheet
            </Link>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-5 py-3 font-semibold text-gray-600">Date</th>
                  <th className="text-left px-5 py-3 font-semibold text-gray-600">Filled By</th>
                  <th className="text-left px-5 py-3 font-semibold text-gray-600">Submitted</th>
                  <th className="text-left px-5 py-3 font-semibold text-gray-600"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {logs.map(log => (
                  <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3 font-semibold text-gray-900">{formatDate(log.log_date)}</td>
                    <td className="px-5 py-3 text-gray-600">{log.filled_by_name}</td>
                    <td className="px-5 py-3 text-gray-500 text-xs">
                      {new Date(log.created_at).toLocaleString('en-IN')}
                    </td>
                    <td className="px-5 py-3 flex items-center gap-3">
                      <Link to={`/hbm/transformer/${log.id}`}
                        className="text-blue-700 font-semibold text-xs hover:underline">View</Link>
                      {isAdmin() && (
                        <button onClick={() => handleDelete(log.id)}
                          className="text-red-500 hover:text-red-700 text-xs font-semibold">Delete</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      </div>
    </div>
  );
};

export default TransformerHistory;
