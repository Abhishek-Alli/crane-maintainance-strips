import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { ptmAPI } from '../../services/api';

const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

export default function PtmDashboard() {
  const [recentBreakdowns, setRecentBreakdowns] = useState([]);
  const [recentLogs, setRecentLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.allSettled([
      ptmAPI.getBreakdownLogs({ limit: 5 }),
      ptmAPI.getLogs({ limit: 5 }),
    ]).then(([bdRes, lgRes]) => {
      if (bdRes.status === 'fulfilled') setRecentBreakdowns(bdRes.value?.data || bdRes.value?.logs || []);
      if (lgRes.status === 'fulfilled') setRecentLogs(lgRes.value?.data || lgRes.value?.logs || []);
    }).catch(() => toast.error('Failed to load dashboard'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
    </div>
  );

  const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });

  const quickActions = [
    { to: '/ptm/breakdown/new',      label: 'Breakdown Report',   sub: '24-hour breakdown sheet', color: 'red',    icon: '🔴' },
    { to: '/ptm/checksheet/history', label: 'View History',       sub: 'Past checksheet logs',    color: 'emerald',icon: '📅' },
    { to: '/ptm/monthly-register',   label: 'Monthly Register',   sub: 'Monthly summary view',    color: 'orange', icon: '📊' },
  ];

  const hoverMap = {
    red:     'hover:border-red-300 hover:bg-red-50',
    emerald: 'hover:border-emerald-300 hover:bg-emerald-50',
    orange:  'hover:border-orange-300 hover:bg-orange-50',
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">PTM Dashboard</h1>
          <p className="text-gray-500 mt-1 text-sm">{today}</p>
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Quick Actions</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {quickActions.map((a, i) => (
              <Link key={i} to={a.to}
                className={`flex flex-col bg-white border border-gray-200 rounded-xl p-4 transition-all hover:shadow-md ${hoverMap[a.color]}`}>
                <span className="text-2xl mb-2">{a.icon}</span>
                <p className="font-semibold text-gray-900 text-sm leading-tight">{a.label}</p>
                <p className="text-xs text-gray-500 mt-1">{a.sub}</p>
              </Link>
            ))}
          </div>
        </div>

        {/* Recent Logs */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Recent Checksheets */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
            <div className="px-5 py-4 border-b border-gray-100">
              <h2 className="font-bold text-gray-900">Recent Checksheets</h2>
            </div>
            {recentLogs.length === 0 ? (
              <div className="p-8 text-center text-gray-400 text-sm">No checksheets filled yet</div>
            ) : (
              <div className="divide-y divide-gray-100">
                {recentLogs.map(log => (
                  <div key={log.id} className="flex items-center justify-between px-5 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-gray-900 text-sm">{log.template_name || 'PTM Checksheet'}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {formatDate(log.log_date)}
                        {log.shift && ` · ${log.shift}`}
                        {log.filled_by_name && ` · ${log.filled_by_name}`}
                      </p>
                    </div>
                    <div className="ml-3 shrink-0">
                      {parseInt(log.not_ok_count) > 0 ? (
                        <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full font-semibold">{log.not_ok_count} NOT OK</span>
                      ) : (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-semibold">All OK</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Breakdown Reports */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-bold text-gray-900">Recent Breakdown Reports</h2>
              <Link to="/ptm/breakdown/new" className="text-xs text-red-600 font-medium hover:underline">+ New</Link>
            </div>
            {recentBreakdowns.length === 0 ? (
              <div className="p-8 text-center text-gray-400 text-sm">No breakdown reports yet</div>
            ) : (
              <div className="divide-y divide-gray-100">
                {recentBreakdowns.map(log => (
                  <div key={log.id} className="flex items-center justify-between px-5 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-gray-900 text-sm">Breakdown Report</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {formatDate(log.log_date)}
                        {log.filled_by_name && ` · ${log.filled_by_name}`}
                      </p>
                    </div>
                    <div className="ml-3 shrink-0">
                      {log.total_breakdown_minutes > 0 ? (
                        <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-full font-semibold">{log.total_breakdown_minutes} min</span>
                      ) : (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-semibold">No BD</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
