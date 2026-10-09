import React from 'react';
import { Link } from 'react-router-dom';
import { Cog, CalendarDays, Flame, Wrench, Droplets, BrickWall, ShoppingCart, Train, Factory, Waves } from 'lucide-react';
import CardIcon from './CardIcon';
import { MECHANICAL_ACTIONS, TodaySchedule, RecentEotCrane } from './SmsDashboard';

// Professional line icons, keyed by the emoji the dashboard config still carries
const ICONS = {
  '🏗️': Cog, '📅': CalendarDays, '🔥': Flame, '🛠️': Wrench, '💧': Droplets,
  '🧱': BrickWall, '🛒': ShoppingCart, '🚃': Train, '🏭': Factory, '🚰': Waves,
};

export default function SmsMechanical() {
  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">MECHANICAL</h1>
          <Link to="/sms/dashboard" className="text-sm font-semibold text-amber-700 hover:opacity-80">
            ← Dashboard
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
          {MECHANICAL_ACTIONS.map((a) => (
            <Link
              key={a.to}
              to={a.to}
              className="flex flex-col bg-white border border-gray-200 rounded-xl p-5 transition-all hover:shadow-md hover:border-amber-300 hover:bg-amber-50"
            >
              <CardIcon icon={ICONS[a.icon]} label={a.label} />
              <p className="font-semibold text-gray-900 text-sm leading-tight">{a.label}</p>
              <p className="text-xs text-gray-500 mt-1">{a.sub}</p>
              {a.primary && (
                <span className="mt-3 inline-flex w-fit text-xs font-semibold text-amber-800 bg-amber-100 px-2 py-0.5 rounded">
                  Fill new report
                </span>
              )}
            </Link>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <TodaySchedule />
          <RecentEotCrane />
        </div>
      </div>
    </div>
  );
}
