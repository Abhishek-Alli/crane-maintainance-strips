import React from 'react';
import { Link } from 'react-router-dom';
import { Flame, Factory, Plug, Cog } from 'lucide-react';
import CardIcon from './CardIcon';

const ITEMS = [
  { to: '/sms/furnace-side', label: 'FURNACE SIDE', sub: 'Stand By · Bundle Press · Motor Panel · Poker · Transformer', icon: Flame },
  { to: '/sms/main-pcc-room', label: 'MAIN PCC ROOM', sub: 'Furnace Pollution · DG · LT Transformer', icon: Factory },
  { to: '/sms/fc-ccm-pump-house', label: 'FC AND CCM PUMP HOUSE', sub: 'Pump House Motor Panel', icon: Plug },
  { to: '/sms/billet-slab-caster', label: 'BILLET AND SLAB CASTER', sub: 'CCM Motor', icon: Cog },
];

export default function Electrical() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-2xl font-bold text-gray-900">ELECTRICAL</h1>
        <Link to="/sms/dashboard" className="text-sm font-semibold text-amber-700 hover:opacity-80">
          ← Dashboard
        </Link>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {ITEMS.map((it) => (
          <Link
            key={it.label}
            to={it.to}
            className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 hover:border-amber-400 hover:shadow transition"
          >
            <CardIcon icon={it.icon} />
            <p className="font-semibold text-gray-900">{it.label}</p>
            <p className="text-xs text-gray-500 mt-1">{it.sub}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
