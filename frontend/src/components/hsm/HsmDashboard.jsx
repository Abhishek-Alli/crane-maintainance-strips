import React from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  RefreshCw,
  Clock,
  ClipboardCheck,
  Zap,
  Grid,
  Settings,
  BarChart3,
} from 'lucide-react';

const ICON_WRAP = {
  red:    'bg-red-50 text-red-600',
  orange: 'bg-orange-50 text-orange-600',
  yellow: 'bg-yellow-50 text-yellow-700',
  green:  'bg-green-50 text-green-600',
  blue:   'bg-blue-50 text-blue-600',
  purple: 'bg-purple-50 text-purple-600',
  indigo: 'bg-indigo-50 text-indigo-600',
  teal:   'bg-teal-50 text-teal-600',
};

const BORDER_MAP = {
  red:    'border-red-100 hover:border-red-300',
  orange: 'border-orange-100 hover:border-orange-300',
  yellow: 'border-yellow-100 hover:border-yellow-300',
  green:  'border-green-100 hover:border-green-300',
  blue:   'border-blue-100 hover:border-blue-300',
  purple: 'border-purple-100 hover:border-purple-300',
  indigo: 'border-indigo-100 hover:border-indigo-300',
  teal:   'border-teal-100 hover:border-teal-300',
};

function SheetIcon({ icon: Icon, color }) {
  return (
    <span className={`mb-3 inline-flex h-11 w-11 items-center justify-center rounded-xl ${ICON_WRAP[color] || 'bg-gray-100 text-gray-600'}`}>
      <Icon className="h-5 w-5" strokeWidth={1.75} aria-hidden />
    </span>
  );
}

function HsmCard({ sheet }) {
  const border = BORDER_MAP[sheet.color] || 'border-gray-200 hover:border-gray-300';

  // Insights / special card — single link
  if (!sheet.history) {
    return (
      <Link
        to={sheet.to}
        className={`flex flex-col bg-white border rounded-xl p-4 transition-all hover:shadow-md ${border}`}
      >
        <SheetIcon icon={sheet.icon} color={sheet.color} />
        <p className="font-semibold text-gray-900 text-sm leading-tight">{sheet.label}</p>
        <p className="text-xs text-gray-500 mt-1">{sheet.sub}</p>
      </Link>
    );
  }

  return (
    <div className={`flex flex-col bg-white border rounded-xl p-4 shadow-sm ${border}`}>
      <SheetIcon icon={sheet.icon} color={sheet.color} />
      <p className="font-semibold text-gray-900 text-sm leading-tight">{sheet.label}</p>
      <p className="text-xs text-gray-500 mt-1 mb-3">{sheet.sub}</p>
      <div className="mt-auto grid grid-cols-2 gap-1.5">
        <Link
          to={sheet.to}
          className="flex-1 text-center text-[11px] font-semibold px-1.5 py-1.5 rounded-lg border transition-colors bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700"
        >
          Fill
        </Link>
        <Link
          to={sheet.history}
          className="flex-1 text-center text-[11px] font-semibold px-1.5 py-1.5 rounded-lg border transition-colors bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
        >
          History
        </Link>
      </div>
    </div>
  );
}

export default function HsmDashboard({ allowedSheets }) {
  const isAdminUser = (() => {
    try {
      const u = JSON.parse(localStorage.getItem('user'));
      return u?.role === 'ADMIN' || u?.user_type === 'ADMIN';
    } catch {
      return false;
    }
  })();

  const canAccess = (key) => !allowedSheets || allowedSheets.includes(key);

  const today = new Date().toLocaleDateString('en-IN', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
  });

  const allSheets = [
    {
      key: 'breakdown-analysis',
      to: '/hsm/breakdown-analysis/new',
      history: '/hsm/breakdown-analysis/history',
      label: 'Breakdown Analysis Report',
      sub: 'RCA · 5-Why · Corrective & Preventive Actions',
      icon: AlertTriangle,
      color: 'red',
    },
    {
      key: 'roll-change-activity',
      to: '/hsm/roll-change-activity/new',
      history: '/hsm/roll-change-activity/history',
      label: 'Roll Change Activity',
      sub: 'Area equipment · Manpower · Remarks',
      icon: RefreshCw,
      color: 'orange',
    },
    {
      key: 'delay-report',
      to: '/hsm/delay-report/new',
      history: '/hsm/delay-report/history',
      label: 'Delay Report',
      sub: 'HOTOUT · Miss Roll · Total downtime',
      icon: Clock,
      color: 'yellow',
    },
    {
      key: 'fm-daily-checklist',
      to: '/hsm/fm-daily-checklist/new',
      history: '/hsm/fm-daily-checklist/history',
      label: 'FM Daily Check List',
      sub: 'Guide gap · Pressures · Clamps',
      icon: ClipboardCheck,
      color: 'green',
    },
    {
      key: 'induction-daily-checklist',
      to: '/hsm/induction-daily-checklist/new',
      history: '/hsm/induction-daily-checklist/history',
      label: 'Induction Daily Check List',
      sub: 'Guide gap · Rollers · Heaters',
      icon: Zap,
      color: 'blue',
    },
    {
      key: 'dc-daily-checklist',
      to: '/hsm/dc-daily-checklist/new',
      history: '/hsm/dc-daily-checklist/history',
      label: 'DC Daily Check List',
      sub: 'Guide gap · Mandrel · WR gap',
      icon: Grid,
      color: 'purple',
    },
    {
      key: 'rm-daily-checklist',
      to: '/hsm/rm-daily-checklist/new',
      history: '/hsm/rm-daily-checklist/history',
      label: 'RM Daily Check List',
      sub: 'Guide gap · Clamps · Descaling',
      icon: Settings,
      color: 'indigo',
    },
    ...(isAdminUser
      ? [{
          key: null,
          to: '/hsm/insights',
          history: null,
          label: 'Insights',
          sub: 'Custom analysis · Compare reports',
          icon: BarChart3,
          color: 'teal',
        }]
      : []),
  ];

  const sheets = allSheets.filter(s => s.key === null || canAccess(s.key));

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">HSM Dashboard</h1>
          <p className="text-gray-500 mt-1 text-sm">{today}</p>
        </div>

        <div className="mb-6">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Checksheets</h2>
          <p className="text-xs text-gray-500 mb-3">Fill · View history</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {sheets.map(s => (
              <HsmCard key={s.key || s.to} sheet={s} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
