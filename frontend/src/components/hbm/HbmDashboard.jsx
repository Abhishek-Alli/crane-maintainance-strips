import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { hbmAPI } from '../../services/api';

const HbmDashboard = ({ allowedSheets }) => {
  const canAccess = (key) => !allowedSheets || allowedSheets.includes(key);
  const [recentDcMotor, setRecentDcMotor] = useState([]);
  const [recentRollingStand, setRecentRollingStand] = useState([]);
  const [recentMillMech, setRecentMillMech] = useState([]);
  const [recentCoolingBed, setRecentCoolingBed] = useState([]);
  const [recentPumpHouse, setRecentPumpHouse] = useState([]);
  const [recentBarBundle, setRecentBarBundle] = useState([]);
  const [recentBeforeRolling, setRecentBeforeRolling] = useState([]);
  const [recentPumpParam, setRecentPumpParam] = useState([]);
  const [recentWaterParam, setRecentWaterParam] = useState([]);
  const [recentPhMaint, setRecentPhMaint]       = useState([]);
  const [recentTransformer, setRecentTransformer] = useState([]);
  const [recentOilLevel, setRecentOilLevel]             = useState([]);
  const [recentDcMotorAirflow, setRecentDcMotorAirflow] = useState([]);
  const [loading, setLoading] = useState(true);


  useEffect(() => { fetchDashboardData(); }, []);

  const fetchDashboardData = async () => {
    try {
      const toArr = (v) => Array.isArray(v) ? v : (v?.data ?? []);

      const [dcRes, rsRes, mmRes, cbRes, phRes, bbRes, brRes, ppRes, wpRes, pmRes, trRes, olRes, afRes] = await Promise.allSettled([
        hbmAPI.getDcMotorLogs({ limit: 5 }),
        hbmAPI.getRollingStandLogs({ limit: 5 }),
        hbmAPI.getMillMechLogs({ limit: 5 }),
        hbmAPI.getCoolingBedLogs({ limit: 5 }),
        hbmAPI.getPumpHouseLogs({ limit: 5 }),
        hbmAPI.getBarBundleLogs({ limit: 5 }),
        hbmAPI.getBeforeRollingLogs({ limit: 5 }),
        hbmAPI.getPumpParamLogs({ limit: 5 }),
        hbmAPI.getWaterParamLogs({ limit: 5 }),
        hbmAPI.getPhMaintLogs({ limit: 5 }),
        hbmAPI.getTransformerLogs({ limit: 5 }),
        hbmAPI.getOilLevelLogs({ limit: 5 }),
        hbmAPI.getDcMotorAirflowLogs({ limit: 5 }),
      ]);

      if (dcRes.status === 'fulfilled')  setRecentDcMotor(toArr(dcRes.value));
      if (rsRes.status === 'fulfilled')  setRecentRollingStand(toArr(rsRes.value));
      if (mmRes.status === 'fulfilled')  setRecentMillMech(toArr(mmRes.value));
      if (cbRes.status === 'fulfilled')  setRecentCoolingBed(toArr(cbRes.value));
      if (phRes.status === 'fulfilled')  setRecentPumpHouse(toArr(phRes.value));
      if (bbRes.status === 'fulfilled')  setRecentBarBundle(toArr(bbRes.value));
      if (brRes.status === 'fulfilled')  setRecentBeforeRolling(toArr(brRes.value));
      if (ppRes.status === 'fulfilled')  setRecentPumpParam(toArr(ppRes.value));
      if (wpRes.status === 'fulfilled')  setRecentWaterParam(toArr(wpRes.value));
      if (pmRes.status === 'fulfilled')  setRecentPhMaint(toArr(pmRes.value));
      if (trRes.status === 'fulfilled')  setRecentTransformer(toArr(trRes.value));
      if (olRes.status === 'fulfilled')  setRecentOilLevel(toArr(olRes.value));
      if (afRes.status === 'fulfilled')  setRecentDcMotorAirflow(toArr(afRes.value));
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

        {/* Quick Actions */}
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Quick Actions</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {[
              { key: 'dc-motor',       to: '/hbm/dc-motor/new',       label: 'DC Motor Maintenance', sub: 'Daily checksheet',       color: 'indigo', icon: '⚡' },
              { key: 'rolling-stand',  to: '/hbm/rolling-stand/new',  label: 'Rolling Stand',         sub: 'Daily checksheet',       color: 'teal',   icon: '⚙' },
              { key: 'mill-mech',      to: '/hbm/mill-mech/new',      label: 'Mill Mechanical',       sub: 'Daily checksheet',       color: 'orange', icon: '🔩' },
              { key: 'cooling-bed',    to: '/hbm/cooling-bed/new',    label: 'Cooling Bed',           sub: 'Daily checksheet',       color: 'cyan',   icon: '❄' },
              { key: 'pumphouse',      to: '/hbm/pumphouse/new',      label: 'Pumphouse Checksheet',  sub: 'Daily checksheet',       color: 'blue',   icon: '💧' },
              { key: 'bar-bundle',     to: '/hbm/bar-bundle/new',     label: 'Bar Bundle Area',       sub: 'Daily checksheet',       color: 'purple', icon: '📦' },
              { key: 'before-rolling', to: '/hbm/before-rolling/new', label: 'Before Rolling',        sub: 'Pre-rolling checksheet', color: 'gray',   icon: '🔄' },
              { key: 'pump-param',     to: '/hbm/pump-param/new',     label: 'Pump Parameter Report', sub: 'Daily pump readings',    color: 'emerald', icon: '📊' },
              { key: 'water-param',    to: '/hbm/water-param/new',    label: 'Water Parameters',      sub: 'Water quality readings', color: 'sky',     icon: '🧪' },
              { key: 'ph-maint',       to: '/hbm/ph-maint/new',       label: 'PH Maintenance',        sub: 'Maintenance work sheet', color: 'amber',   icon: '🔧' },
              { key: 'transformer',    to: '/hbm/transformer/new',    label: 'HBM Transformer',       sub: 'Visual inspection',      color: 'rose',    icon: '⚡' },
              { key: 'oil-level',        to: '/hbm/oil-level/new',        label: 'Daily Oil Level',             sub: 'Tank levels & readings',    color: 'yellow',  icon: '🛢' },
              { key: 'dc-motor-airflow', to: '/hbm/dc-motor-airflow/new', label: 'DC Motor Airflow Report',     sub: 'Temp & vibration readings', color: 'violet',  icon: '🌡' },
            ].filter(action => canAccess(action.key)).map((action, i) => {
              const borderMap = {
                indigo: 'hover:border-indigo-300 hover:bg-indigo-50',
                teal: 'hover:border-teal-300 hover:bg-teal-50',
                orange: 'hover:border-orange-300 hover:bg-orange-50',
                cyan: 'hover:border-cyan-300 hover:bg-cyan-50',
                blue: 'hover:border-blue-300 hover:bg-blue-50',
                emerald: 'hover:border-emerald-300 hover:bg-emerald-50',
                gray: 'hover:border-gray-300 hover:bg-gray-50',
                purple: 'hover:border-purple-300 hover:bg-purple-50',
                sky: 'hover:border-sky-300 hover:bg-sky-50',
                amber: 'hover:border-amber-300 hover:bg-amber-50',
                rose:   'hover:border-rose-300 hover:bg-rose-50',
                yellow: 'hover:border-yellow-300 hover:bg-yellow-50',
                violet: 'hover:border-violet-300 hover:bg-violet-50',
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

          {/* DC Motor Logs */}
          {canAccess('dc-motor') && (
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
          )}

          {canAccess('mill-mech') && (
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
                      <p className="text-xs text-gray-500 mt-0.5">{formatDate(log.log_date)} · {formatTime(log.log_time)} · {log.shift}{log.filled_by_name && ` · ${log.filled_by_name}`}</p>
                    </div>
                    <div className="ml-3 flex-shrink-0">
                      {parseInt(log.not_ok_count) > 0 ? <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full font-semibold">{log.not_ok_count} NOT OK</span> : <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-semibold">OK</span>}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
          )}

          {canAccess('cooling-bed') && (
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
                      <p className="text-xs text-gray-500 mt-0.5">{formatDate(log.log_date)} · {formatTime(log.log_time)} · {log.shift}{log.filled_by_name && ` · ${log.filled_by_name}`}</p>
                    </div>
                    <div className="ml-3 flex-shrink-0">
                      {parseInt(log.not_ok_count) > 0 ? <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full font-semibold">{log.not_ok_count} NOT OK</span> : <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-semibold">OK</span>}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
          )}

          {canAccess('rolling-stand') && (
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
                      <p className="text-xs text-gray-500 mt-0.5">{formatDate(log.log_date)} · {formatTime(log.log_time)} · {log.shift}{log.filled_by_name && ` · ${log.filled_by_name}`}</p>
                    </div>
                    <div className="ml-3 flex-shrink-0">
                      {parseInt(log.not_ok_count) > 0 ? <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full font-semibold">{log.not_ok_count} NOT OK</span> : <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-semibold">OK</span>}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
          )}

          {canAccess('pumphouse') && (
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
                      <p className="text-xs text-gray-500 mt-0.5">{formatDate(log.log_date)}{log.checked_by && ` · ${log.checked_by}`}{log.filled_by_name && ` · ${log.filled_by_name}`}</p>
                    </div>
                    <div className="ml-3 flex-shrink-0">
                      {parseInt(log.not_ok_count) > 0 ? <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full font-semibold">{log.not_ok_count} NOT OK</span> : <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-semibold">OK</span>}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
          )}

          {canAccess('bar-bundle') && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-bold text-gray-900">Bar Bundle Area Logs</h2>
              <Link to="/hbm/bar-bundle/new" className="text-xs text-purple-600 font-medium hover:underline">+ New</Link>
            </div>
            {recentBarBundle.length === 0 ? (
              <div className="p-8 text-center text-gray-400 text-sm">No Bar Bundle Area logs yet</div>
            ) : (
              <div className="divide-y divide-gray-100">
                {recentBarBundle.map(log => (
                  <Link key={log.id} to={`/hbm/bar-bundle/${log.id}`}
                    className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-gray-900 text-sm">Bar Bundle Area</p>
                      <p className="text-xs text-gray-500 mt-0.5">{formatDate(log.log_date)}{log.checked_by && ` · ${log.checked_by}`}{log.filled_by_name && ` · ${log.filled_by_name}`}</p>
                    </div>
                    <div className="ml-3 flex-shrink-0">
                      {parseInt(log.not_ok_count) > 0 ? <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full font-semibold">{log.not_ok_count} NOT OK</span> : <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-semibold">OK</span>}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
          )}

          {canAccess('before-rolling') && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-bold text-gray-900">Before Rolling Logs</h2>
              <Link to="/hbm/before-rolling/new" className="text-xs text-blue-700 font-medium hover:underline">+ New</Link>
            </div>
            {recentBeforeRolling.length === 0 ? (
              <div className="p-8 text-center text-gray-400 text-sm">No Before Rolling logs yet</div>
            ) : (
              <div className="divide-y divide-gray-100">
                {recentBeforeRolling.map(log => (
                  <Link key={log.id} to={`/hbm/before-rolling/${log.id}`}
                    className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-gray-900 text-sm">Before Rolling</p>
                      <p className="text-xs text-gray-500 mt-0.5">{formatDate(log.log_date)}{log.checked_by && ` · ${log.checked_by}`}{log.filled_by_name && ` · ${log.filled_by_name}`}</p>
                    </div>
                    <div className="ml-3 flex-shrink-0">
                      {parseInt(log.not_ok_count) > 0 ? <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full font-semibold">{log.not_ok_count} NOT OK</span> : <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-semibold">OK</span>}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
          )}

          {canAccess('pump-param') && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-bold text-gray-900">Pump Parameter Logs</h2>
              <Link to="/hbm/pump-param/new" className="text-xs text-emerald-600 font-medium hover:underline">+ New</Link>
            </div>
            {recentPumpParam.length === 0 ? (
              <div className="p-8 text-center text-gray-400 text-sm">No Pump Parameter logs yet</div>
            ) : (
              <div className="divide-y divide-gray-100">
                {recentPumpParam.map(log => (
                  <Link key={log.id} to={`/hbm/pump-param/${log.id}`}
                    className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-gray-900 text-sm">Pump Parameter Report</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {formatDate(log.log_date)}
                        {log.size_value && ` · ${log.size_value}`}
                        {log.filled_by_name && ` · ${log.filled_by_name}`}
                      </p>
                    </div>
                    <div className="ml-3 flex-shrink-0">
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-semibold">
                        {log.total_entries} pumps
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
          )}

          {canAccess('ph-maint') && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-bold text-gray-900">PH Maintenance Logs</h2>
              <Link to="/hbm/ph-maint/new" className="text-xs text-amber-600 font-medium hover:underline">+ New</Link>
            </div>
            {(recentPhMaint || []).length === 0 ? (
              <div className="p-8 text-center text-gray-400 text-sm">No Maintenance logs yet</div>
            ) : (
              <div className="divide-y divide-gray-100">
                {(recentPhMaint || []).map(log => (
                  <Link key={log.id} to={`/hbm/ph-maint/${log.id}`}
                    className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-gray-900 text-sm">PH Maintenance Work Sheet</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {new Date(log.log_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        {log.filled_by_name && ` · ${log.filled_by_name}`}
                      </p>
                    </div>
                    <div className="ml-3 flex-shrink-0">
                      <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full font-semibold">
                        {log.total_items} item{log.total_items !== '1' ? 's' : ''}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
          )}

          {canAccess('water-param') && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-bold text-gray-900">Water Parameter Logs</h2>
              <Link to="/hbm/water-param/new" className="text-xs text-sky-600 font-medium hover:underline">+ New</Link>
            </div>
            {(recentWaterParam || []).length === 0 ? (
              <div className="p-8 text-center text-gray-400 text-sm">No Water Parameter logs yet</div>
            ) : (
              <div className="divide-y divide-gray-100">
                {(recentWaterParam || []).map(log => (
                  <Link key={log.id} to={`/hbm/water-param/${log.id}`}
                    className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-gray-900 text-sm">Water Parameters</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {formatDate(log.log_date)}
                        {log.filled_by_name && ` · ${log.filled_by_name}`}
                      </p>
                    </div>
                    <div className="ml-3 flex-shrink-0">
                      <span className="text-xs bg-sky-100 text-sky-700 px-2 py-1 rounded-full font-semibold">
                        {log.total_entries} sources
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
          )}

          {canAccess('transformer') && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-bold text-gray-900">Transformer Logs</h2>
              <Link to="/hbm/transformer/new" className="text-xs text-rose-600 font-medium hover:underline">+ New</Link>
            </div>
            {(recentTransformer || []).length === 0 ? (
              <div className="p-8 text-center text-gray-400 text-sm">No Transformer logs yet</div>
            ) : (
              <div className="divide-y divide-gray-100">
                {(recentTransformer || []).map(log => (
                  <Link key={log.id} to={`/hbm/transformer/${log.id}`}
                    className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-gray-900 text-sm">HBM Transformer</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {formatDate(log.log_date)}
                        {log.filled_by_name && ` · ${log.filled_by_name}`}
                      </p>
                    </div>
                    <div className="ml-3 flex-shrink-0">
                      <span className="text-xs bg-rose-100 text-rose-700 px-2 py-1 rounded-full font-semibold">View</span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
          )}

          {canAccess('oil-level') && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-bold text-gray-900">Daily Oil Level Logs</h2>
              <Link to="/hbm/oil-level/new" className="text-xs text-yellow-600 font-medium hover:underline">+ New</Link>
            </div>
            {recentOilLevel.length === 0 ? (
              <div className="p-8 text-center text-gray-400 text-sm">No Oil Level logs yet</div>
            ) : (
              <div className="divide-y divide-gray-100">
                {recentOilLevel.map(log => (
                  <Link key={log.id} to={`/hbm/oil-level/${log.id}`}
                    className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-gray-900 text-sm">Daily Oil Level</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {formatDate(log.log_date)}
                        {log.filled_by_name && ` · ${log.filled_by_name}`}
                      </p>
                    </div>
                    <div className="ml-3 flex-shrink-0">
                      {log.not_ok_count > 0 ? (
                        <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full font-semibold">{log.not_ok_count} NOT OK</span>
                      ) : (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-semibold">All OK</span>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
          )}

          {canAccess('dc-motor-airflow') && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-bold text-gray-900">DC Motor Airflow Logs</h2>
              <Link to="/hbm/dc-motor-airflow/new" className="text-xs text-violet-600 font-medium hover:underline">+ New</Link>
            </div>
            {recentDcMotorAirflow.length === 0 ? (
              <div className="p-8 text-center text-gray-400 text-sm">No DC Motor Airflow logs yet</div>
            ) : (
              <div className="divide-y divide-gray-100">
                {recentDcMotorAirflow.map(log => (
                  <Link key={log.id} to={`/hbm/dc-motor-airflow/${log.id}`}
                    className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-gray-900 text-sm">DC Motor Airflow Report</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {formatDate(log.log_date)}
                        {log.filled_by_name && ` · ${log.filled_by_name}`}
                      </p>
                    </div>
                    <div className="ml-3 flex-shrink-0">
                      {log.not_ok_count > 0 ? (
                        <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full font-semibold">{log.not_ok_count} NOT OK</span>
                      ) : (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-semibold">All OK</span>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default HbmDashboard;
