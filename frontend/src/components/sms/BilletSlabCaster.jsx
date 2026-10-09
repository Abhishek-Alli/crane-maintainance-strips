import React from 'react';
import { Link } from 'react-router-dom';
import CardIcon from './CardIcon';
import { Cog } from 'lucide-react';

const ITEMS = [
  { to: '/sms/ccm-motor/new', label: 'CCM MOTOR', sub: 'Motor current · drive · starter check', icon: Cog },
  { to: '/sms/ccm-motor/history', label: 'CCM MOTOR History', sub: 'Past CCM motor checks' },
];

export default function BilletSlabCaster() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-2xl font-bold text-gray-900">BILLET AND SLAB CASTER</h1>
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
