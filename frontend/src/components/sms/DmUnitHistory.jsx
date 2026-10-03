import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { smsAPI } from '../../services/api';
import { formatDate } from './eotCraneConfig';
import { DM_UNIT_CRUCIBLES } from './dmUnitConfig';

const filterCls =
  'px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400';

const EMPTY_FILTERS = { date_from: '', date_to: '', crucible: '' };

export default function DmUnitHistory() {
  const navigate = useNavigate();
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState(EMPTY_FILTERS);

  const fetchLogs = async (f = filters) => {
    setLoading(true);
    try {
      const params = Object.fromEntries(Object.entries(f).filter(([, v]) => v));
      const res = await smsAPI.getDmUnitLogs(params);
      setLogs(res?.data || []);
      setTotal(res?.total ?? (res?.data || []).length);
    } catch {
      toast.error('Failed to load checklists');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchLogs(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const clearFilters = () => {
    setFilters(EMPTY_FILTERS);
    fetchLogs(EMPTY_FILTERS);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
          <div>
            <button
              type="button"
              onClick={() => navigate('/sms/dashboard')}
              className="text-sm text-gray-500 hover:text-gray-700 mb-1"
            >
              ← Back to Dashboard
            </button>
            <h1 className="text-2xl font-bold text-gray-900">DM Unit History</h1>
          </div>
          <Link
            to="/sms/dm-unit/new"
            className="inline-flex items-center gap-1 px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-semibold hover:bg-amber-700"
          >
            + New Checklist
          </Link>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 mb-6">
          <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3 sm:items-end">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">From Date</label>
              <input type="date" value={filters.date_from} onChange={(e) => setFilters({ ...filters, date_from: e.target.value })} className={`${filterCls} w-full`} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">To Date</label>
              <input type="date" value={filters.date_to} onChange={(e) => setFilters({ ...filters, date_to: e.target.value })} className={`${filterCls} w-full`} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Crucible</label>
              <select
                value={filters.crucible}
                onChange={(e) => setFilters({ ...filters, crucible: e.target.value })}
                className={`${filterCls} w-full`}
              >
                <option value="">All crucibles</option>
                {DM_UNIT_CRUCIBLES.map((n) => <option key={n} value={n}>Crucible {n}</option>)}
              </select>
            </div>
            <button type="button" onClick={() => fetchLogs()} className="px-4 py-2 bg-gray-800 text-white rounded-lg text-sm font-medium hover:bg-gray-900">Search</button>
            <button
              type="button"
              onClick={clearFilters}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50"
            >
              Clear
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-10 flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600" />
            </div>
          ) : logs.length === 0 ? (
            <div className="p-10 text-center text-gray-400 text-sm">No checklists found.</div>
          ) : (
            <>
              <div className="px-5 py-2.5 border-b border-gray-100 text-xs text-gray-500">
                Showing {logs.length}{total > logs.length ? ` of ${total}` : ''} checklist{total === 1 ? '' : 's'}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">#</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Date</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Furnace</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Crucible</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Coil</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Recorded By</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Alerts</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">By</th>
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {logs.map((log, i) => (
                      <tr key={log.id} className="hover:bg-amber-50/40 transition-colors">
                        <td className="px-4 py-3 text-gray-500">{i + 1}</td>
                        <td className="px-4 py-3 font-semibold text-gray-900 whitespace-nowrap">{formatDate(log.report_date)}</td>
                        <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{log.furnace || '—'}</td>
                        <td className="px-4 py-3 text-gray-700">{log.crucible || '—'}</td>
                        <td className="px-4 py-3 text-gray-700">{log.coil || '—'}</td>
                        <td className="px-4 py-3 text-gray-700">{log.recorded_by || '—'}</td>
                        <td className="px-4 py-3">
                          <span className={`text-xs font-semibold ${log.alert_count ? 'text-red-600' : 'text-emerald-600'}`}>
                            {log.alert_count ?? 0}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-600">{log.filled_by_name || '—'}</td>
                        <td className="px-4 py-3 text-right">
                          <Link
                            to={`/sms/dm-unit/${log.id}`}
                            className="text-xs text-amber-700 hover:text-amber-900 font-semibold"
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
