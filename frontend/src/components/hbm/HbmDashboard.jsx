import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Zap,
  Cog,
  Wrench,
  Snowflake,
  Droplets,
  Package,
  RefreshCw,
  BarChart3,
  FlaskConical,
  Settings2,
  Cable,
  Fuel,
  Thermometer,
  Gauge,
  AlertTriangle,
  Table2,
} from 'lucide-react';

const ICON_WRAP = {
  indigo:  'bg-indigo-50 text-indigo-600',
  teal:    'bg-teal-50 text-teal-600',
  orange:  'bg-orange-50 text-orange-600',
  cyan:    'bg-cyan-50 text-cyan-600',
  blue:    'bg-blue-50 text-blue-600',
  emerald: 'bg-emerald-50 text-emerald-600',
  gray:    'bg-gray-100 text-gray-600',
  purple:  'bg-purple-50 text-purple-600',
  sky:     'bg-sky-50 text-sky-600',
  amber:   'bg-amber-50 text-amber-600',
  rose:    'bg-rose-50 text-rose-600',
  yellow:  'bg-yellow-50 text-yellow-700',
  violet:  'bg-violet-50 text-violet-600',
  pink:    'bg-pink-50 text-pink-600',
  red:     'bg-red-50 text-red-600',
};

function SheetIcon({ icon: Icon, color }) {
  return (
    <span
      className={`mb-3 inline-flex h-11 w-11 items-center justify-center rounded-xl ${ICON_WRAP[color] || ICON_WRAP.gray}`}
    >
      <Icon className="h-5 w-5" strokeWidth={1.75} aria-hidden />
    </span>
  );
}

function SheetActionCard({ action }) {
  const [openMenu, setOpenMenu] = useState(null); // 'view' | 'download' | null
  const menuRef = useRef(null);

  useEffect(() => {
    if (!openMenu) return undefined;
    const close = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setOpenMenu(null);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [openMenu]);

  const borderMap = {
    indigo: 'border-indigo-100 hover:border-indigo-300',
    teal: 'border-teal-100 hover:border-teal-300',
    orange: 'border-orange-100 hover:border-orange-300',
    cyan: 'border-cyan-100 hover:border-cyan-300',
    blue: 'border-blue-100 hover:border-blue-300',
    emerald: 'border-emerald-100 hover:border-emerald-300',
    gray: 'border-gray-200 hover:border-gray-300',
    purple: 'border-purple-100 hover:border-purple-300',
    sky: 'border-sky-100 hover:border-sky-300',
    amber: 'border-amber-100 hover:border-amber-300',
    rose: 'border-rose-100 hover:border-rose-300',
    yellow: 'border-yellow-100 hover:border-yellow-300',
    violet: 'border-violet-100 hover:border-violet-300',
    pink: 'border-pink-100 hover:border-pink-300',
    red: 'border-red-100 hover:border-red-300',
  };

  const btnBase = 'flex-1 text-center text-[11px] font-semibold px-1.5 py-1.5 rounded-lg border transition-colors';

  // Sheet Viewer / special cards — single link only
  if (!action.key || action.adminOnly) {
    return (
      <Link
        to={action.to}
        className={`flex flex-col bg-white border rounded-xl p-4 transition-all hover:shadow-md ${borderMap[action.color] || 'border-gray-200'}`}
      >
        <SheetIcon icon={action.icon} color={action.color} />
        <p className="font-semibold text-gray-900 text-sm leading-tight">{action.label}</p>
        <p className="text-xs text-gray-500 mt-1">{action.sub}</p>
      </Link>
    );
  }

  return (
    <div className={`flex flex-col bg-white border rounded-xl p-4 shadow-sm ${borderMap[action.color] || 'border-gray-200'}`}>
      <SheetIcon icon={action.icon} color={action.color} />
      <p className="font-semibold text-gray-900 text-sm leading-tight">{action.label}</p>
      <p className="text-xs text-gray-500 mt-1 mb-3">{action.sub}</p>

      <div className="mt-auto grid grid-cols-3 gap-1.5" ref={menuRef}>
        <Link
          to={action.fill}
          className={`${btnBase} bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700`}
        >
          Fill
        </Link>

        <div className="relative">
          <button
            type="button"
            onClick={() => setOpenMenu(m => (m === 'view' ? null : 'view'))}
            className={`w-full ${btnBase} bg-white text-gray-700 border-gray-300 hover:bg-gray-50`}
          >
            View ▾
          </button>
          {openMenu === 'view' && (
            <div className="absolute left-0 bottom-full mb-1 w-44 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-20">
              <Link
                to={action.view}
                onClick={() => setOpenMenu(null)}
                className="block px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
              >
                History
              </Link>
              <Link
                to={action.viewInsights}
                onClick={() => setOpenMenu(null)}
                className="block px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
              >
                Monthly insights
              </Link>
            </div>
          )}
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={() => setOpenMenu(m => (m === 'download' ? null : 'download'))}
            className={`w-full ${btnBase} bg-white text-blue-700 border-blue-200 hover:bg-blue-50`}
          >
            Download ▾
          </button>
          {openMenu === 'download' && (
            <div className="absolute right-0 bottom-full mb-1 w-44 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-20">
              <Link
                to={action.downloadSingle}
                onClick={() => setOpenMenu(null)}
                className="block px-3 py-2 text-xs font-medium text-gray-700 hover:bg-blue-50"
              >
                Single date download
              </Link>
              <Link
                to={action.downloadMonthly}
                onClick={() => setOpenMenu(null)}
                className="block px-3 py-2 text-xs font-medium text-gray-700 hover:bg-blue-50"
              >
                Monthly report
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const SHEETS = [
  { key: 'dc-motor',         label: 'DC Motor Maintenance',   sub: 'Daily checksheet',        color: 'indigo',  icon: Zap },
  { key: 'rolling-stand',    label: 'Rolling Stand',           sub: 'Daily checksheet',        color: 'teal',    icon: Cog },
  { key: 'mill-mech',        label: 'Mill Mechanical',         sub: 'Daily checksheet',        color: 'orange',  icon: Wrench },
  { key: 'cooling-bed',      label: 'Cooling Bed',             sub: 'Daily checksheet',        color: 'cyan',    icon: Snowflake },
  { key: 'pumphouse',        label: 'Pumphouse Checksheet',    sub: 'Daily checksheet',        color: 'blue',    icon: Droplets },
  { key: 'bar-bundle',       label: 'Bar Bundle Area',         sub: 'Daily checksheet',        color: 'purple',  icon: Package },
  { key: 'before-rolling',   label: 'Before Rolling',          sub: 'Pre-rolling checksheet',  color: 'gray',    icon: RefreshCw },
  { key: 'pump-param',       label: 'Pump Parameter Report',   sub: 'Daily pump readings',     color: 'emerald', icon: BarChart3 },
  { key: 'water-param',      label: 'Water Parameters',        sub: 'Water quality readings',  color: 'sky',     icon: FlaskConical },
  { key: 'ph-maint',         label: 'PH Maintenance',          sub: 'Maintenance work sheet',  color: 'amber',   icon: Settings2 },
  { key: 'transformer',      label: 'HBM Transformer',         sub: 'Visual inspection',       color: 'rose',    icon: Cable },
  { key: 'oil-level',        label: 'Daily Oil Level',         sub: 'Tank levels & readings',  color: 'yellow',  icon: Fuel },
  { key: 'dc-motor-airflow', label: 'DC Motor Airflow Report', sub: 'Temp & vibration',        color: 'violet',  icon: Thermometer },
  { key: 'roughing-gb-temp', label: 'Roughing GB Temp',        sub: 'Bearing temp analysis',   color: 'pink',    icon: Gauge },
  { key: 'breakdown',        label: 'HBM Breakdown Report',    sub: '24-hour breakdown sheet', color: 'red',     icon: AlertTriangle },
  { key: null, adminOnly: true, to: '/hbm/sheet-viewer', label: 'Sheet Viewer', sub: 'View any sheet as table', color: 'emerald', icon: Table2 },
];

const HbmDashboard = ({ allowedSheets }) => {
  const canAccess = (key) => !allowedSheets || allowedSheets.includes(key);
  const today = new Date().toLocaleDateString('en-IN', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
  });

  const sheets = SHEETS
    .map(s => (s.key ? {
      ...s,
      fill: `/hbm/${s.key}/new`,
      view: `/hbm/${s.key}/history`,
      viewInsights: `/hbm/monthly-insights?type=${encodeURIComponent(s.key)}`,
      downloadSingle: `/hbm/download?type=${encodeURIComponent(s.key)}`,
      downloadMonthly: `/hbm/monthly-register?type=${encodeURIComponent(s.key)}`,
    } : s))
    .filter(action =>
      (!action.adminOnly && (action.key === null || canAccess(action.key)))
      || (action.adminOnly && !allowedSheets)
    );

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">HBM Dashboard</h1>
          <p className="text-gray-500 mt-1 text-sm">{today}</p>
        </div>

        <div className="mb-6">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Checksheets</h2>
          <p className="text-xs text-gray-500 mb-3">
            Fill · View (history / monthly insights) · Download (single date / monthly report)
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {sheets.map(action => (
              <SheetActionCard key={action.key || action.to} action={action} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default HbmDashboard;
