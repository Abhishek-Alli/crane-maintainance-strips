import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

// Same colour language as the HBM dashboard cards
const COLORS = {
  indigo: { wrap: 'bg-indigo-50 text-indigo-600', border: 'border-indigo-100 hover:border-indigo-300' },
  teal: { wrap: 'bg-teal-50 text-teal-600', border: 'border-teal-100 hover:border-teal-300' },
  orange: { wrap: 'bg-orange-50 text-orange-600', border: 'border-orange-100 hover:border-orange-300' },
  cyan: { wrap: 'bg-cyan-50 text-cyan-600', border: 'border-cyan-100 hover:border-cyan-300' },
  blue: { wrap: 'bg-blue-50 text-blue-600', border: 'border-blue-100 hover:border-blue-300' },
  emerald: { wrap: 'bg-emerald-50 text-emerald-600', border: 'border-emerald-100 hover:border-emerald-300' },
  purple: { wrap: 'bg-purple-50 text-purple-600', border: 'border-purple-100 hover:border-purple-300' },
  amber: { wrap: 'bg-amber-50 text-amber-600', border: 'border-amber-100 hover:border-amber-300' },
  rose: { wrap: 'bg-rose-50 text-rose-600', border: 'border-rose-100 hover:border-rose-300' },
  violet: { wrap: 'bg-violet-50 text-violet-600', border: 'border-violet-100 hover:border-violet-300' },
  gray: { wrap: 'bg-gray-100 text-gray-600', border: 'border-gray-200 hover:border-gray-300' },
};

function SheetIcon({ icon: Icon, color }) {
  return (
    <span className={`mb-3 inline-flex h-11 w-11 items-center justify-center rounded-xl ${COLORS[color]?.wrap || COLORS.gray.wrap}`}>
      <Icon className="h-5 w-5" strokeWidth={1.75} aria-hidden />
    </span>
  );
}

const btnBase = 'flex h-8 w-full items-center justify-center overflow-hidden text-[11px] font-semibold px-1 rounded-lg border transition-colors';
const menuItem = 'block px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50';

/**
 * Props: label, sub, icon, color,
 *  - fill / history  → sheet card with Fill · View ▾ · Download ▾
 *  - to              → plain link card (groups, calendar)
 *  - neither         → "Coming soon" card
 *  - sheet           → key in smsDownloadConfig; enables Single date / Monthly downloads
 */
export default function SmsSheetCard({ label, sub, icon, color = 'gray', fill, history, to, sheet }) {
  const [open, setOpen] = useState(null); // 'view' | 'download' | null
  const ref = useRef(null);
  const c = COLORS[color] || COLORS.gray;

  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(null); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  const head = (
    <>
      <SheetIcon icon={icon} color={color} />
      <p className="font-semibold text-gray-900 text-sm leading-tight">{label}</p>
    </>
  );

  if (to) {
    return (
      <Link to={to} className={`flex flex-col bg-white border rounded-xl p-4 transition-all hover:shadow-md ${c.border}`}>
        {head}
        <p className="text-xs text-gray-500 mt-1">{sub}</p>
      </Link>
    );
  }

  if (!fill) {
    return (
      <div className="flex flex-col bg-white border border-gray-200 rounded-xl p-4 opacity-80">
        {head}
        <p className="text-xs text-gray-400 mt-1">Coming soon</p>
      </div>
    );
  }

  return (
    <div className={`flex flex-col bg-white border rounded-xl p-4 shadow-sm ${c.border}`}>
      {head}
      <p className="text-xs text-gray-500 mt-1 mb-3">{sub}</p>
      <div className="mt-auto grid grid-cols-3 gap-1.5" ref={ref}>
        <Link to={fill} className={`${btnBase} bg-amber-600 text-white border-amber-600 hover:bg-amber-700`}>
          Fill
        </Link>

        <div className="relative">
          <button type="button" onClick={() => setOpen((m) => (m === 'view' ? null : 'view'))} className={`${btnBase} bg-white text-amber-700 border-amber-300 hover:bg-amber-50`}>
            View ▾
          </button>
          {open === 'view' && (
            <div className="absolute left-0 bottom-full mb-1 w-44 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-20">
              <Link to={history} onClick={() => setOpen(null)} className={menuItem}>History</Link>
            </div>
          )}
        </div>

        <div className="relative">
          <button type="button" onClick={() => setOpen((m) => (m === 'download' ? null : 'download'))} className={`${btnBase} bg-white text-amber-700 border-amber-300 hover:bg-amber-50`}>
            Download ▾
          </button>
          {open === 'download' && (
            <div className="absolute right-0 bottom-full mb-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-20">
              <Link to={`/sms/download?type=${sheet}&mode=single`} onClick={() => setOpen(null)} className={menuItem}>
                Single date download
              </Link>
              <Link to={`/sms/download?type=${sheet}&mode=monthly`} onClick={() => setOpen(null)} className={menuItem}>
                Monthly report
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/** Page shell used by the Electrical / Mechanical sections */
export function SmsSheetPage({ title, back, backTo, children }) {
  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
        <Link to={backTo} className="text-sm font-semibold text-amber-700 hover:opacity-80">← {back}</Link>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">{children}</div>
    </div>
  );
}
