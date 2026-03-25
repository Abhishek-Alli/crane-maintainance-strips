import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { hbmAPI } from '../../services/api';

const HbmDashboard = () => {
  const [stats, setStats] = useState(null);
  const [recentChecksheets, setRecentChecksheets] = useState([]);
  const [recentDcMotor, setRecentDcMotor] = useState([]);
  const [recentRollingStand, setRecentRollingStand] = useState([]);
  const [recentMillMech, setRecentMillMech] = useState([]);
  const [recentCoolingBed, setRecentCoolingBed] = useState([]);
  const [recentPumpHouse, setRecentPumpHouse] = useState([]);
  const [loading, setLoading] = useState(true);


  useEffect(() => { fetchDashboardData(); }, []);

  const fetchDashboardData = async () => {
    try {
      const [statsRes, recentRes, dcRes, rsRes, mmRes, cbRes, phRes] = await Promise.allSettled([
        hbmAPI.getDashboardStats(),
        hbmAPI.getRecentChecksheets(8),
        hbmAPI.getDcMotorLogs({ limit: 5 }),
        hbmAPI.getRollingStandLogs({ limit: 5 }),
        hbmAPI.getMillMechLogs({ limit: 5 }),
        hbmAPI.getCoolingBedLogs({ limit: 5 }),
        hbmAPI.getPumpHouseLogs({ limit: 5 }),
      ]);

      if (statsRes.status === 'fulfilled')   setStats(statsRes.value.data);
      if (recentRes.status === 'fulfilled')  setRecentChecksheets(recentRes.value.data);
      if (dcRes.status === 'fulfilled')      setRecentDcMotor(dcRes.value.data);
      if (rsRes.status === 'fulfilled')      setRecentRollingStand(rsRes.value.data);
      if (mmRes.status === 'fulfilled')      setRecentMillMech(mmRes.value.data);
      if (cbRes.status === 'fulfilled')      setRecentCoolingBed(cbRes.value.data);
      if (phRes.status === 'fulfilled')      setRecentPumpHouse(phRes.value.data);
    } catch (error) {
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (timeStr) => {
    if (!timeStr) return '—';
    const [h, m] = timeStr.split(':');
    const hour = parseInt(h);
    return `${hour % 12 || 12}:${m} ${hour >= 12 ? 'PM' : 'AM'}`;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const statusBadge = (status) => {
    const styles = {
      OK: 'bg-green-100 text-green-800',
      ATTENTION_REQUIRED: 'bg-yellow-100 text-yellow-800',
      CRITICAL: 'bg-red-100 text-red-800'
    };
    return (
      <span className={`text-xs px-2 py-1 rounded-full font-semibold ${styles[status] || 'bg-gray-100 text-gray-700'}`}>
        {status?.replace(/_/g, ' ')}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">HBM Dashboard</h1>
          <p className="text-gray-500 mt-1 text-sm">{today}</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
          {[
            { label: 'Active Machines', value: stats?.active_machines ?? 0, sub: `of ${stats?.total_machines ?? 0} total`, color: 'emerald' },
            { label: 'Sheets Today', value: (stats?.today_checksheets ?? 0) + (stats?.dc_motor_today ?? 0), color: 'blue' },
            { label: 'DC Motor Today', value: stats?.dc_motor_today ?? 0, color: 'indigo' },
            { label: 'Issues (7 days)', value: stats?.weekly_issues ?? 0, color: stats?.weekly_issues > 0 ? 'red' : 'green' },
            { label: 'Action Pending', value: stats?.action_pending ?? 0, color: stats?.action_pending > 0 ? 'orange' : 'green' },
            { label: 'Templates', value: stats?.active_templates ?? 0, color: 'purple' },
          ].map((card, i) => {
            const colorMap = {
              emerald: 'bg-emerald-50 border-emerald-200 text-emerald-700',
              blue: 'bg-blue-50 border-blue-200 text-blue-700',
              indigo: 'bg-indigo-50 border-indigo-200 text-indigo-700',
              red: 'bg-red-50 border-red-200 text-red-700',
              green: 'bg-green-50 border-green-200 text-green-700',
              orange: 'bg-orange-50 border-orange-200 text-orange-700',
              purple: 'bg-purple-50 border-purple-200 text-purple-700',
            };
            return (
              <div key={i} className={`border rounded-xl p-4 ${colorMap[card.color]}`}>
                <p className="text-xs font-medium text-gray-500 leading-tight">{card.label}</p>
                <p className={`text-3xl font-bold mt-1`}>{card.value}</p>
                {card.sub && <p className="text-xs text-gray-400 mt-1">{card.sub}</p>}
              </div>
            );
          })}
        </div>

        {/* Quick Actions */}
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Quick Actions</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {[
              { to: '/hbm/dc-motor/new', label: 'DC Motor Maintenance', sub: 'Daily checksheet', color: 'indigo', icon: '⚡' },
              { to: '/hbm/rolling-stand/new', label: 'Rolling Stand', sub: 'Daily checksheet', color: 'teal', icon: '⚙' },
              { to: '/hbm/mill-mech/new', label: 'Mill Mechanical', sub: 'Daily checksheet', color: 'orange', icon: '🔩' },
              { to: '/hbm/cooling-bed/new', label: 'Cooling Bed', sub: 'Daily checksheet', color: 'cyan', icon: '❄' },
              { to: '/hbm/pumphouse/new', label: 'Pumphouse Checksheet', sub: 'Daily checksheet', color: 'blue', icon: '💧' },
              { to: '/hbm/pumphouse/history', label: 'Pumphouse History', sub: 'View past records', color: 'gray', icon: '📅' },
              { to: '/hbm/checksheets/new', label: 'New Checksheet', sub: 'Template-based sheet', color: 'emerald', icon: '📋' },
              { to: '/hbm/machines', label: 'Manage Machines', sub: 'Add / Edit machines', color: 'gray', icon: '🔧' },
              { to: '/hbm/dc-motor/history', label: 'DC Motor History', sub: 'View past records', color: 'gray', icon: '📅' },
              { to: '/hbm/rolling-stand/history', label: 'Rolling Stand History', sub: 'View past records', color: 'gray', icon: '📅' },
            ].map((action, i) => {
              const borderMap = {
                indigo: 'hover:border-indigo-300 hover:bg-indigo-50',
                teal: 'hover:border-teal-300 hover:bg-teal-50',
                orange: 'hover:border-orange-300 hover:bg-orange-50',
                cyan: 'hover:border-cyan-300 hover:bg-cyan-50',
                blue: 'hover:border-blue-300 hover:bg-blue-50',
                emerald: 'hover:border-emerald-300 hover:bg-emerald-50',
                gray: 'hover:border-gray-300 hover:bg-gray-50',
              };
              return (
                <Link key={i} to={action.to}
                  className={`flex flex-col bg-white border border-gray-200 rounded-xl p-4 transition-all hover:shadow-md ${borderMap[action.color]}`}>
                  <span className="text-2xl mb-2">{action.icon}</span>
                  <p className="font-semibold text-gray-900 text-sm leading-tight">{action.label}</p>
                  <p className="text-xs text-gray-500 mt-1">{action.sub}</p>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Recent Submissions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">

          {/* Template Checksheets */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-bold text-gray-900">Recent Checksheets</h2>
              <Link to="/hbm/checksheets/new" className="text-xs text-emerald-600 font-medium hover:underline">+ New</Link>
            </div>
            {recentChecksheets.length === 0 ? (
              <div className="p-8 text-center text-gray-400 text-sm">No checksheets yet</div>
            ) : (
              <div className="divide-y divide-gray-100">
                {recentChecksheets.map(cs => (
                  <Link key={cs.id} to={`/hbm/checksheets/${cs.id}`}
                    className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-gray-900 text-sm truncate">{cs.machine_name}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {formatDate(cs.checksheet_date)}
                        {cs.checksheet_time && ` · ${formatTime(cs.checksheet_time)}`}
                        {` · ${cs.shift}`}
                        {cs.filled_by && ` · ${cs.filled_by}`}
                      </p>
                    </div>
                    <div className="ml-3 flex-shrink-0">
                      {statusBadge(cs.status)}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* DC Motor Logs */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-bold text-gray-900">DC Motor Logs</h2>
              <Link to="/hbm/dc-motor/new" className="text-xs text-indigo-600 font-medium hover:underline">+ New</Link>
            </div>
            {recentDcMotor.length === 0 ? (
              <div className="p-8 text-center text-gray-400 text-sm">No DC motor logs yet</div>
            ) : (
              <div className="divide-y divide-gray-100">
                {recentDcMotor.map(log => (
                  <Link key={log.id} to={`/hbm/dc-motor/${log.id}`}
                    className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-gray-900 text-sm">DC Motor Maintenance</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {formatDate(log.log_date)} · {formatTime(log.log_time)} · {log.shift}
                        {log.filled_by_name && ` · ${log.filled_by_name}`}
                      </p>
                    </div>
                    <div className="ml-3 flex-shrink-0">
                      {parseInt(log.not_ok_count) > 0 ? (
                        <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full font-semibold">
                          {log.not_ok_count} NOT OK
                        </span>
                      ) : (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-semibold">OK</span>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Mill Mechanical Logs */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-bold text-gray-900">Mill Mechanical Logs</h2>
              <Link to="/hbm/mill-mech/new" className="text-xs text-orange-600 font-medium hover:underline">+ New</Link>
            </div>
            {recentMillMech.length === 0 ? (
              <div className="p-8 text-center text-gray-400 text-sm">No Mill Mechanical logs yet</div>
            ) : (
              <div className="divide-y divide-gray-100">
                {recentMillMech.map(log => (
                  <Link key={log.id} to={`/hbm/mill-mech/${log.id}`}
                    className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-gray-900 text-sm">Mill Mechanical</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {formatDate(log.log_date)} · {formatTime(log.log_time)} · {log.shift}
                        {log.filled_by_name && ` · ${log.filled_by_name}`}
                      </p>
                    </div>
                    <div className="ml-3 flex-shrink-0">
                      {parseInt(log.not_ok_count) > 0 ? (
                        <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full font-semibold">
                          {log.not_ok_count} NOT OK
                        </span>
                      ) : (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-semibold">OK</span>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Cooling Bed Logs */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-bold text-gray-900">Cooling Bed Logs</h2>
              <Link to="/hbm/cooling-bed/new" className="text-xs text-cyan-600 font-medium hover:underline">+ New</Link>
            </div>
            {recentCoolingBed.length === 0 ? (
              <div className="p-8 text-center text-gray-400 text-sm">No Cooling Bed logs yet</div>
            ) : (
              <div className="divide-y divide-gray-100">
                {recentCoolingBed.map(log => (
                  <Link key={log.id} to={`/hbm/cooling-bed/${log.id}`}
                    className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-gray-900 text-sm">Cooling Bed</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {formatDate(log.log_date)} · {formatTime(log.log_time)} · {log.shift}
                        {log.filled_by_name && ` · ${log.filled_by_name}`}
                      </p>
                    </div>
                    <div className="ml-3 flex-shrink-0">
                      {parseInt(log.not_ok_count) > 0 ? (
                        <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full font-semibold">
                          {log.not_ok_count} NOT OK
                        </span>
                      ) : (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-semibold">OK</span>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Rolling Stand Logs */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-bold text-gray-900">Rolling Stand Logs</h2>
              <Link to="/hbm/rolling-stand/new" className="text-xs text-teal-600 font-medium hover:underline">+ New</Link>
            </div>
            {recentRollingStand.length === 0 ? (
              <div className="p-8 text-center text-gray-400 text-sm">No Rolling Stand logs yet</div>
            ) : (
              <div className="divide-y divide-gray-100">
                {recentRollingStand.map(log => (
                  <Link key={log.id} to={`/hbm/rolling-stand/${log.id}`}
                    className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-gray-900 text-sm">Rolling Stand</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {formatDate(log.log_date)} · {formatTime(log.log_time)} · {log.shift}
                        {log.filled_by_name && ` · ${log.filled_by_name}`}
                      </p>
                    </div>
                    <div className="ml-3 flex-shrink-0">
                      {parseInt(log.not_ok_count) > 0 ? (
                        <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full font-semibold">
                          {log.not_ok_count} NOT OK
                        </span>
                      ) : (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-semibold">OK</span>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Pumphouse Logs */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-bold text-gray-900">Pumphouse Logs</h2>
              <Link to="/hbm/pumphouse/new" className="text-xs text-blue-600 font-medium hover:underline">+ New</Link>
            </div>
            {recentPumpHouse.length === 0 ? (
              <div className="p-8 text-center text-gray-400 text-sm">No Pumphouse logs yet</div>
            ) : (
              <div className="divide-y divide-gray-100">
                {recentPumpHouse.map(log => (
                  <Link key={log.id} to={`/hbm/pumphouse/${log.id}`}
                    className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-gray-900 text-sm">Pumphouse</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {formatDate(log.log_date)}
                        {log.checked_by && ` · ${log.checked_by}`}
                        {log.filled_by_name && ` · ${log.filled_by_name}`}
                      </p>
                    </div>
                    <div className="ml-3 flex-shrink-0">
                      {parseInt(log.not_ok_count) > 0 ? (
                        <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full font-semibold">
                          {log.not_ok_count} NOT OK
                        </span>
                      ) : (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-semibold">OK</span>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};

export default HbmDashboard;
