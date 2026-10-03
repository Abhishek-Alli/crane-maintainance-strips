import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import ModuleDashboard from '../shared/ModuleDashboard';
import { smsAPI } from '../../services/api';
import {
  SCHEDULE_STATUS_STYLE,
  craneLabel,
  findCrane,
  formatDate,
  scheduleStatus,
  todayISO,
} from './eotCraneConfig';

const EOT_ACTIONS = [
  {
    to: '/sms/eot-crane-maintenance/new',
    label: 'EOT Crane Maintenance',
    sub: 'Mechanical · LT · CT · Main Hoist',
    primary: true,
    icon: '🏗️',
  },
  {
    to: '/sms/eot-crane-maintenance/calendar',
    label: 'EOT Crane Schedule',
    sub: 'Calendar · plan cranes by date',
    icon: '📅',
  },
  {
    to: '/sms/eot-crane-maintenance/history',
    label: 'EOT Crane Maintenance History',
    sub: 'Past crane checklists',
    icon: '📋',
  },
  {
    to: '/sms/crucible-maintenance/new',
    label: 'Crucible Maintenance',
    sub: 'Furnace · Coating · Coil In / Coil Out',
    primary: true,
    icon: '🔥',
  },
  {
    to: '/sms/crucible-maintenance/history',
    label: 'Crucible Maintenance History',
    sub: 'Past crucible checklists',
    icon: '📋',
  },
  {
    to: '/sms/poker-maintenance/new',
    label: 'Hyd Poker Maintenance',
    sub: 'Furnace · Hydraulic Poker',
    primary: true,
    icon: '🛠️',
  },
  {
    to: '/sms/poker-maintenance/history',
    label: 'Hyd Poker Maintenance History',
    sub: 'Past poker checklists',
    icon: '📋',
  },
  {
    to: '/sms/pump-house/new',
    label: 'Pump House — Mechanical',
    sub: 'Furnace and CCM · Area · Pump',
    primary: true,
    icon: '💧',
  },
  {
    to: '/sms/pump-house/history',
    label: 'Pump House History',
    sub: 'Past pump house checklists',
    icon: '📋',
  },
  {
    to: '/sms/patching/new',
    label: 'Patching',
    sub: 'Furnace · Lining · Air Pressure',
    primary: true,
    icon: '🧱',
  },
  {
    to: '/sms/patching/history',
    label: 'Patching History',
    sub: 'Past patching checklists',
    icon: '📋',
  },
  {
    to: '/sms/scrap-trolly/new',
    label: 'Scrap Transfer Trolly',
    sub: 'Furnace · Gear Box · Hydraulic Power Pack',
    primary: true,
    icon: '🛒',
  },
  {
    to: '/sms/scrap-trolly/history',
    label: 'Scrap Transfer Trolly History',
    sub: 'Past trolly checklists',
    icon: '📋',
  },
  {
    to: '/sms/ladle-car/new',
    label: 'Ladle Car — Mechanical',
    sub: 'Furnace · Gear Box 1 & 2 · Wheel',
    primary: true,
    icon: '🚃',
  },
  {
    to: '/sms/ladle-car/history',
    label: 'Ladle Car History',
    sub: 'Past ladle car checklists',
    icon: '📋',
  },
  {
    to: '/sms/pollution/new',
    label: 'Pollution — Daily Check Sheet',
    sub: 'Pollution Mechanical · Hoods · ID Fans · Dampers',
    primary: true,
    icon: '🏭',
  },
  {
    to: '/sms/pollution/history',
    label: 'Pollution History',
    sub: 'Past pollution check sheets',
    icon: '📋',
  },
  {
    to: '/sms/dm-unit/new',
    label: 'DM Unit Check List',
    sub: 'Furnace · DM Water · Heat Exchanger',
    primary: true,
    icon: '🚰',
  },
  {
    to: '/sms/dm-unit/history',
    label: 'DM Unit History',
    sub: 'Past DM unit checklists',
    icon: '📋',
  },
];

const Spinner = () => (
  <div className="p-10 flex justify-center">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600" />
  </div>
);

function TodaySchedule() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const today = todayISO();
    smsAPI.getEotSchedules({ date_from: today, date_to: today })
      .then((res) => setList(res?.data || []))
      .catch(() => setList([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
        <h2 className="font-bold text-gray-900">Today's EOT Crane Schedule</h2>
        <Link to="/sms/eot-crane-maintenance/calendar" className="text-xs font-semibold text-amber-700 hover:opacity-80">
          Calendar →
        </Link>
      </div>
      {loading ? <Spinner /> : list.length === 0 ? (
        <div className="p-10 text-center text-gray-400 text-sm">No cranes scheduled for today.</div>
      ) : (
        <div className="divide-y divide-gray-100">
          {list.map((s) => {
            const status = scheduleStatus(s);
            const st = SCHEDULE_STATUS_STYLE[status];
            return (
              <Link
                key={s.id}
                to={status === 'done' ? `/sms/eot-crane-maintenance/${s.log_id}` : `/sms/eot-crane-maintenance/new?schedule=${s.id}`}
                className="flex items-center justify-between px-5 py-3.5 transition-colors hover:bg-amber-50/50"
              >
                <div>
                  <p className="font-semibold text-gray-900 text-sm">
                    {s.shed_name} · {craneLabel(s.crane_number, findCrane(s.shed_name, s.crane_number)?.capacity)}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">Schedule #{s.id}</p>
                </div>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded border ${st.chip}`}>
                  {status === 'done' ? 'Done' : 'Fill now →'}
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

function RecentEotCrane() {
  const [recent, setRecent] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    smsAPI.getEotCraneLogs({ limit: 5 })
      .then((res) => setRecent(res?.data || []))
      .catch(() => setRecent([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
        <h2 className="font-bold text-gray-900">Recent EOT Crane Maintenance</h2>
        <Link to="/sms/eot-crane-maintenance/history" className="text-xs font-semibold text-amber-700 hover:opacity-80">
          View all →
        </Link>
      </div>
      {loading ? <Spinner /> : recent.length === 0 ? (
        <div className="p-10 text-center text-gray-400 text-sm">No checklists yet. Fill your first EOT Crane Maintenance checklist.</div>
      ) : (
        <div className="divide-y divide-gray-100">
          {recent.map((log) => (
            <Link
              key={log.id}
              to={`/sms/eot-crane-maintenance/${log.id}`}
              className="flex items-center justify-between px-5 py-3.5 transition-colors hover:bg-amber-50/50"
            >
              <div>
                <p className="font-semibold text-gray-900 text-sm">
                  {log.shed_name} · {craneLabel(log.crane_number, log.crane_capacity)}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {formatDate(log.report_date)}{log.recorded_by ? ` · ${log.recorded_by}` : ''}
                </p>
              </div>
              <p className={`text-xs font-semibold ${log.alert_count ? 'text-red-600' : 'text-emerald-600'}`}>
                {log.alert_count ? `${log.alert_count} alert${log.alert_count === 1 ? '' : 's'}` : 'All OK'}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default function SmsDashboard() {
  return (
    <ModuleDashboard module="sms" extraActions={EOT_ACTIONS}>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mt-5">
        <TodaySchedule />
        <RecentEotCrane />
      </div>
    </ModuleDashboard>
  );
}
