import React from 'react';
import { Link } from 'react-router-dom';
import CardIcon from './CardIcon';
import { Plug } from 'lucide-react';

const ITEMS = [
  { to: '/sms/pump-house-motor/new', label: 'PUMP HOUSE MOTOR PANEL', sub: 'Motor current · drive · panel check', icon: Plug },
  { to: '/sms/pump-house-motor/history', label: 'PUMP HOUSE MOTOR PANEL History', sub: 'Past pump house motor checks' },
];

export default function FcCcmPumpHouse() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-2xl font-bold text-gray-900">FC AND CCM PUMP HOUSE</h1>
        <Link to="/sms/electrical" className="text-sm font-semibold text-amber-700 hover:opacity-80">
          ← Electrical
        </Link>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {ITEMS.map((it) => (
          <Link
            key={it.label}
            to={it.to}
            className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 hover:border-amber-400 hover:shadow transition"
          >
            <CardIcon icon={it.icon} label={it.label} />
            <p className="font-semibold text-gray-900">{it.label}</p>
            <p className="text-xs text-gray-500 mt-1">{it.sub}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
