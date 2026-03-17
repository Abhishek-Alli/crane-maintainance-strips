import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { hbmAPI } from '../../services/api';

const MillMechHistory = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ date_from: '', date_to: '' });

  useEffect(() => { fetchLogs(); }, []); // eslint-disable-line

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filters.date_from) params.date_from = filters.date_from;
      if (filters.date_to)   params.date_to   = filters.date_to;
      const res = await hbmAPI.getMillMechLogs(params);
      setLogs(res.data);
    } catch {
      toast.error('Failed to load Mill Mechanical logs');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (d) =>
    d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

  const formatTime = (t) => {
    if (!t) return '—';
    const [h, m] = t.split(':');
    const hour = parseInt(h);
    return `${hour % 12 || 12}:${m} ${hour >= 12 ? 'PM' : 'AM'}`;
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Mill Mechanical History</h1>
            <p className="text-sm text-gray-500">{logs.length} records</p>
          </div>
          <Link to="/hbm/mill-mech/new"
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg font-semibold text-sm hover:bg-emerald-700 transition-colors">
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
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">To Date</label>
            <input type="date" value={filters.date_to}
              onChange={e => setFilters(p => ({ ...p, date_to: e.target.value }))}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent" />
          </div>
          <button onClick={fetchLogs}
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-semibold hover:bg-emerald-700 transition-colors">
            Filter
          </button>
          <button onClick={() => { setFilters({ date_from: '', date_to: '' }); setTimeout(fetchLogs, 0); }}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-300 transition-colors">
            Clear
          </button>
        </div>

        {/* List */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600"></div>
          </div>
        ) : logs.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-16 text-center">
            <p className="text-gray-400 text-lg">No Mill Mechanical logs found</p>
            <Link to="/hbm/mill-mech/new" className="mt-4 inline-block text-emerald-600 font-semibold hover:underline">
              Submit first checksheet
            </Link>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-5 py-3 font-semibold text-gray-600">Date</th>
                  <th className="text-left px-5 py-3 font-semibold text-gray-600">Time</th>
                  <th className="text-left px-5 py-3 font-semibold text-gray-600">Shift</th>
                  <th className="text-left px-5 py-3 font-semibold text-gray-600">Filled By</th>
                  <th className="text-left px-5 py-3 font-semibold text-gray-600">Items</th>
                  <th className="text-left px-5 py-3 font-semibold text-gray-600">Status</th>
                  <th className="text-left px-5 py-3 font-semibold text-gray-600"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {logs.map(log => (
                  <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3 font-semibold text-gray-900">{formatDate(log.log_date)}</td>
                    <td className="px-5 py-3 text-gray-600">{formatTime(log.log_time)}</td>
                    <td className="px-5 py-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                        log.shift === 'DAY' ? 'bg-yellow-100 text-yellow-800' : 'bg-blue-100 text-blue-800'
                      }`}>{log.shift}</span>
                    </td>
                    <td className="px-5 py-3 text-gray-600">{log.filled_by_name}</td>
                    <td className="px-5 py-3 text-gray-600">{log.total_items} items</td>
                    <td className="px-5 py-3">
                      {parseInt(log.not_ok_count) > 0 ? (
                        <span className="px-2 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700">
                          {log.not_ok_count} NOT OK
                        </span>
                      ) : (
                        <span className="px-2 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700">All OK</span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <Link to={`/hbm/mill-mech/${log.id}`}
                        className="text-emerald-600 font-semibold text-xs hover:underline">View</Link>
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

export default MillMechHistory;
