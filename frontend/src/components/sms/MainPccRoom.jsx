import React from 'react';
import { Link } from 'react-router-dom';
import CardIcon from './CardIcon';

// `to` is set only for boxes that are built; the rest stay "Coming soon"
const ITEMS = [
  { label: 'FURNACE POLLUTION', to: '/sms/furnace-pollution/new', sub: 'Panel · drives · motor currents' },
  { label: 'FURNACE POLLUTION History', to: '/sms/furnace-pollution/history', sub: 'Past furnace pollution checks' },
  { label: 'FURNACE POLLUTION - SCHEDULED', to: '/sms/furnace-pollution-pm/new', sub: 'Hood · RAV · Vibrator Motor · Solonoid Coil' },
  { label: 'FURNACE POLLUTION - SCHEDULED History', to: '/sms/furnace-pollution-pm/history', sub: 'Past scheduled PM checks' },
  { label: 'PCC ROOM - SCHEDULED' },
  { label: 'COMPRESSOR - SCHEDULED', to: '/sms/compressor-pm/new', sub: 'Coolent and filter · motor current' },
  { label: 'COMPRESSOR - SCHEDULED History', to: '/sms/compressor-pm/history', sub: 'Past scheduled PM checks' },
  { label: 'DG', to: '/sms/dg/new', sub: 'Diesel refill · air cleaning · running hours' },
  { label: 'DG History', to: '/sms/dg/history', sub: 'Past DG checks' },
  { label: 'LT TRANSFORMER', to: '/sms/lt-transformer/new', sub: 'Oil level · OTI/WTI · silica gel · OLTC' },
  { label: 'LT TRANSFORMER History', to: '/sms/lt-transformer/history', sub: 'Past LT transformer checks' },
];

const cardCls = 'bg-white rounded-xl border border-gray-200 shadow-sm p-5';

export default function MainPccRoom() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-2xl font-bold text-gray-900">MAIN PCC ROOM</h1>
        <Link to="/sms/electrical" className="text-sm font-semibold text-amber-700 hover:opacity-80">
          ← Electrical
        </Link>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {ITEMS.map((it) => {
          const body = (
            <>
              <CardIcon label={it.label} />
              <p className="font-semibold text-gray-900">{it.label}</p>
              <p className="text-xs text-gray-500 mt-1">{it.sub || 'Coming soon'}</p>
            </>
          );
          return it.to ? (
            <Link key={it.label} to={it.to} className={`${cardCls} hover:border-amber-400 hover:shadow transition`}>
              {body}
            </Link>
          ) : (
            <div key={it.label} className={cardCls}>{body}</div>
          );
        })}
      </div>
    </div>
  );
}
