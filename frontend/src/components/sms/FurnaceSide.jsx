import React from 'react';
import { Link } from 'react-router-dom';
import CardIcon from './CardIcon';

// `to` is set only for boxes that are built; the rest stay "Coming soon"
const ITEMS = [
  { label: 'FURNACE STAND BY', to: '/sms/furnace-stand-by/new', sub: 'Sensors · hydraulic limit · RTD' },
  { label: 'FURNACE STAND BY History', to: '/sms/furnace-stand-by/history', sub: 'Past furnace stand by checks' },
  { label: 'BUNDLE PRESS', to: '/sms/bundle-press/new', sub: 'Motors · starters · solonoid coils · proximity sensors' },
  { label: 'BUNDLE PRESS History', to: '/sms/bundle-press/history', sub: 'Past bundle press checks' },
  { label: 'FURNACE MOTOR PANEL', to: '/sms/furnace-motor-panel/new', sub: 'Motor current · drive · starter · panel check' },
  { label: 'FURNACE MOTOR PANEL History', to: '/sms/furnace-motor-panel/history', sub: 'Past furnace motor panel checks' },
  { label: 'FURNACE POKER', to: '/sms/furnace-poker/new', sub: 'Panel · proximity · remote · motor currents' },
  { label: 'FURNACE POKER History', to: '/sms/furnace-poker/history', sub: 'Past furnace poker checks' },
  { label: 'FURNACE TRANSFORMER', to: '/sms/furnace-transformer/new', sub: 'Oil level · OTI/WTI · silica gel · oil pump' },
  { label: 'FURNACE TRANSFORMER History', to: '/sms/furnace-transformer/history', sub: 'Past furnace transformer checks' },
];

const cardCls = 'bg-white rounded-xl border border-gray-200 shadow-sm p-5';

export default function FurnaceSide() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-2xl font-bold text-gray-900">FURNACE SIDE</h1>
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
