import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { hbmAPI } from '../../services/api';

const BREAKDOWN_TYPES = [
  'Mill Breakdown', 'Mechanical Breakdown', 'Electrical Breakdown',
  'RHF Breakdown', 'Mill Maintenance', '132 KV Breakdown',
  'RHF Low Temperature', 'Cold, CCM Chilli & Piping Breakdown',
  'CCM Heat Over', 'Other', 'Contractor Mistake',
];

const TYPE_COLORS = {
  'Mill Breakdown':       'bg-red-500',
  'Mechanical Breakdown': 'bg-orange-500',
  'Electrical Breakdown': 'bg-yellow-500',
  'RHF Breakdown':        'bg-purple-500',
  'Mill Maintenance':     'bg-blue-500',
  '132 KV Breakdown':     'bg-pink-500',
  'RHF Low Temperature':  'bg-cyan-500',
  'Cold, CCM Chilli & Piping Breakdown': 'bg-teal-500',
  'CCM Heat Over':        'bg-amber-500',
  'Other':                'bg-gray-400',
  'Contractor Mistake':   'bg-rose-400',
};

const BreakdownReportHistory = () => {
  const navigate = useNavigate();

  // History state
  const [logs, setLogs]         = useState([]);
  const [loading, setLoading]   = useState(true);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo]     = useState('');

  // Stats state
  const [activeTab, setActiveTab]     = useState('history'); // 'history' | 'analysis'
  const [statsLoading, setStatsLoading] = useState(false);
  const [reasons, setReasons]         = useState([]);
  const [types, setTypes]             = useState([]);
  const [filterType, setFilterType]   = useState('');
  const [statsFrom, setStatsFrom]     = useState('');
  const [statsTo, setStatsTo]         = useState('');

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo)   params.date_to   = dateTo;
      const res = await hbmAPI.getBreakdownLogs(params);
      setLogs(Array.isArray(res) ? res : (res?.data ?? []));
    } catch {
      toast.error('Failed to load breakdown reports');
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo]);

  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const params = {};
      if (statsFrom)  params.date_from = statsFrom;
      if (statsTo)    params.date_to   = statsTo;
      if (filterType) params.breakdown_type = filterType;
      const res = await hbmAPI.getBreakdownReasonStats(params);
      setReasons(res.reasons || []);
      setTypes(res.types || []);
    } catch {
      toast.error('Failed to load reason stats');
    } finally {
      setStatsLoading(false);
    }
  }, [statsFrom, statsTo, filterType]);

  useEffect(() => { fetchLogs(); }, []); // eslint-disable-line

  useEffect(() => {
    if (activeTab === 'analysis') fetchStats();
  }, [activeTab]); // eslint-disable-line

  const formatDate = (d) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const maxOccurrences = reasons.length > 0 ? Math.max(...reasons.map(r => parseInt(r.occurrences))) : 1;
  const maxMinutes     = types.length > 0   ? Math.max(...types.map(t => parseInt(t.total_minutes))) : 1;

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
          <div>
            <button onClick={() => navigate('/hbm/dashboard')}
              className="text-sm text-gray-500 hover:text-gray-700 mb-1 flex items-center gap-1">
              ← Back to Dashboard
            </button>
            <h1 className="text-2xl font-bold text-gray-900">HBM Breakdown Report</h1>
          </div>
          <Link to="/hbm/breakdown/new"
            className="inline-flex items-center gap-1 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700">
            + New Report
          </Link>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-5 bg-white border border-gray-200 rounded-xl p-1 w-fit shadow-sm">
          <button
            onClick={() => setActiveTab('history')}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition-colors ${activeTab === 'history' ? 'bg-red-600 text-white shadow' : 'text-gray-600 hover:bg-gray-100'}`}>
            History
          </button>
          <button
            onClick={() => setActiveTab('analysis')}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition-colors ${activeTab === 'analysis' ? 'bg-red-600 text-white shadow' : 'text-gray-600 hover:bg-gray-100'}`}>
            Reason Analysis
          </button>
        </div>

        {/* ── HISTORY TAB ── */}
        {activeTab === 'history' && (
          <>
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 mb-5">
              <div className="flex flex-col sm:flex-row gap-3 items-end">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">From Date</label>
                  <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">To Date</label>
                  <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
                </div>
                <button onClick={fetchLogs}
                  className="px-4 py-2 bg-gray-800 text-white rounded-lg text-sm font-medium hover:bg-gray-900">
                  Search
                </button>
                <button onClick={() => { setDateFrom(''); setDateTo(''); setTimeout(fetchLogs, 0); }}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50">
                  Clear
                </button>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              {loading ? (
                <div className="p-12 text-center">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-red-600 mx-auto"></div>
                </div>
              ) : logs.length === 0 ? (
                <div className="p-12 text-center text-gray-400 text-sm">No breakdown reports found.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">#</th>
                        <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Date</th>
                        <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Size</th>
                        <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Submitted By</th>
                        <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Submitted At</th>
                        <th className="px-5 py-3"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {logs.map((log, i) => (
                        <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-5 py-3 text-gray-500">{i + 1}</td>
                          <td className="px-5 py-3 font-semibold text-gray-900">{formatDate(log.log_date)}</td>
                          <td className="px-5 py-3">
                            <span className="bg-red-100 text-red-700 text-xs font-semibold px-2 py-1 rounded-full">
                              {log.size}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-gray-700">{log.filled_by_name || '—'}</td>
                          <td className="px-5 py-3 text-gray-500 text-xs">
                            {new Date(log.created_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td className="px-5 py-3 text-right">
                            <Link to={`/hbm/breakdown/${log.id}`}
                              className="text-xs text-blue-600 hover:text-blue-800 font-semibold">
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
          </>
        )}

        {/* ── ANALYSIS TAB ── */}
        {activeTab === 'analysis' && (
          <>
            {/* Filters */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 mb-5">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Filter Analysis</p>
              <div className="flex flex-col sm:flex-row gap-3 items-end flex-wrap">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">From Date</label>
                  <input type="date" value={statsFrom} onChange={e => setStatsFrom(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">To Date</label>
                  <input type="date" value={statsTo} onChange={e => setStatsTo(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Breakdown Type</label>
                  <select value={filterType} onChange={e => setFilterType(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-400">
                    <option value="">All Types</option>
                    {BREAKDOWN_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <button onClick={fetchStats}
                  className="px-4 py-2 bg-gray-800 text-white rounded-lg text-sm font-medium hover:bg-gray-900">
                  Apply
                </button>
                <button onClick={() => { setStatsFrom(''); setStatsTo(''); setFilterType(''); setTimeout(fetchStats, 0); }}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50">
                  Clear
                </button>
              </div>
            </div>

            {statsLoading ? (
              <div className="p-12 text-center">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-red-600 mx-auto"></div>
              </div>
            ) : (
              <div className="space-y-5">

                {/* Breakdown Type — Time Summary */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                  <h2 className="text-base font-bold text-gray-900 mb-1">Downtime by Breakdown Type</h2>
                  <p className="text-xs text-gray-500 mb-4">Total minutes lost per category</p>
                  {types.length === 0 ? (
                    <p className="text-sm text-gray-400 py-6 text-center">No data for selected filters.</p>
                  ) : (
                    <div className="space-y-3">
                      {types.map((t) => {
                        const pct = Math.round((parseInt(t.total_minutes) / maxMinutes) * 100);
                        const colorClass = TYPE_COLORS[t.breakdown_type] || 'bg-gray-400';
                        return (
                          <div key={t.breakdown_type}>
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-sm font-medium text-gray-700 truncate max-w-[55%]">{t.breakdown_type}</span>
                              <div className="flex items-center gap-3 text-right shrink-0">
                                <span className="text-xs text-gray-500">{t.occurrences}× entries</span>
                                <span className="text-sm font-bold text-gray-900">{t.total_minutes} min</span>
                              </div>
                            </div>
                            <div className="w-full bg-gray-100 rounded-full h-2">
                              <div className={`${colorClass} h-2 rounded-full transition-all`} style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Top Repeated Reasons */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                  <h2 className="text-base font-bold text-gray-900 mb-1">Most Repeated Reasons</h2>
                  <p className="text-xs text-gray-500 mb-4">Ranked by how many times each reason was recorded</p>
                  {reasons.length === 0 ? (
                    <p className="text-sm text-gray-400 py-6 text-center">No reason data for selected filters.</p>
                  ) : (
                    <div className="space-y-3">
                      {reasons.map((r, idx) => {
                        const pct = Math.round((parseInt(r.occurrences) / maxOccurrences) * 100);
                        const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}.`;
                        return (
                          <div key={r.reason}>
                            <div className="flex justify-between items-start mb-1 gap-2">
                              <div className="flex items-start gap-2 min-w-0">
                                <span className="text-sm shrink-0 mt-0.5">{medal}</span>
                                <span className="text-sm font-medium text-gray-800 leading-snug">{r.reason}</span>
                              </div>
                              <div className="flex items-center gap-3 text-right shrink-0">
                                <span className="text-xs text-gray-500">{r.total_minutes} min</span>
                                <span className="text-sm font-bold text-red-600 whitespace-nowrap">{r.occurrences}×</span>
                              </div>
                            </div>
                            <div className="w-full bg-gray-100 rounded-full h-2">
                              <div className="bg-red-500 h-2 rounded-full transition-all" style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

              </div>
            )}
          </>
        )}

      </div>
    </div>
  );
};

export default BreakdownReportHistory;
