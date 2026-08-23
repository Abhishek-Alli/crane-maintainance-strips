import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { hodAPI } from '../../services/api';

const ALL_MODULES = [
  {
    code: 'HSM_CHECKSHEETS', label: 'HSM', color: 'indigo',
    sheets: [
      { key: 'fm-daily-checklist',   label: 'FM Daily Check List' },
      { key: 'delay-report',         label: 'Delay Report' },
      { key: 'breakdown-analysis',   label: 'Breakdown Analysis' },
      { key: 'roll-change-activity', label: 'Roll Change Activity' },
    ],
  },
  {
    code: 'HBM_CHECKSHEETS', label: 'HBM', color: 'emerald',
    sheets: [
      { key: 'dc-motor',         label: 'DC Motor' },
      { key: 'rolling-stand',    label: 'Rolling Stand' },
      { key: 'mill-mech',        label: 'Mill Mechanical' },
      { key: 'cooling-bed',      label: 'Cooling Bed' },
      { key: 'pumphouse',        label: 'Pumphouse' },
      { key: 'bar-bundle',       label: 'Bar Bundle Area' },
      { key: 'before-rolling',   label: 'Before Rolling' },
      { key: 'pump-param',       label: 'Pump Parameter Report' },
      { key: 'water-param',      label: 'Water Parameters' },
      { key: 'ph-maint',         label: 'PH Maintenance' },
      { key: 'transformer',      label: 'HBM Transformer' },
      { key: 'oil-level',        label: 'Daily Oil Level' },
      { key: 'dc-motor-airflow', label: 'DC Motor Airflow Report' },
      { key: 'roughing-gb-temp', label: 'Roughing Stand & GB Temp' },
      { key: 'breakdown',        label: 'HBM Breakdown Report' },
    ],
  },
  {
    code: 'SMS_CHECKSHEETS', label: 'SMS', color: 'amber',
    sheets: [{ key: 'breakdown-analysis', label: 'Breakdown Analysis' }],
  },
  {
    code: 'PTM_CHECKSHEETS', label: 'PTM', color: 'blue',
    sheets: [
      { key: 'checksheet', label: 'PTM Checksheet' },
      { key: 'breakdown',  label: 'PTM Breakdown Report' },
    ],
  },
];

const MODULE_THEME = {
  indigo:  { badge: 'bg-indigo-100 text-indigo-700',  card: 'border-indigo-100 hover:border-indigo-300 hover:bg-indigo-50', icon: 'text-indigo-400', dot: 'bg-indigo-500' },
  emerald: { badge: 'bg-emerald-100 text-emerald-700', card: 'border-emerald-100 hover:border-emerald-300 hover:bg-emerald-50', icon: 'text-emerald-400', dot: 'bg-emerald-500' },
  amber:   { badge: 'bg-amber-100 text-amber-700',    card: 'border-amber-100 hover:border-amber-300 hover:bg-amber-50', icon: 'text-amber-400', dot: 'bg-amber-500' },
  blue:    { badge: 'bg-blue-100 text-blue-700',      card: 'border-blue-100 hover:border-blue-300 hover:bg-blue-50', icon: 'text-blue-400', dot: 'bg-blue-500' },
};

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export default function HodDashboard() {
  const [allowedSheets, setAllowedSheets] = useState(null);
  const [counts, setCounts] = useState({});   // { key: { total, pending, todayCount, todayUnseen, latestId } }
  const [loading, setLoading] = useState(true);
  const today = todayStr();

  // 1. Load allowed scope
  useEffect(() => {
    hodAPI.getMyScope()
      .then(r => {
        const data = r.data || r;
        let flat = [];
        if (data.is_admin || !data.modules || data.modules.length === 0) {
          flat = ALL_MODULES.flatMap(m => m.sheets.map(s => ({ ...s, moduleCode: m.code, moduleColor: m.color, moduleLabel: m.label })));
        } else {
          data.modules.forEach(m => {
            const meta = ALL_MODULES.find(am => am.code === m.module_code);
            if (!meta) return;
            m.sheets.forEach(s => {
              const sm = meta.sheets.find(ms => ms.key === s.key);
              flat.push({ key: s.key, label: sm?.label || s.label || s.key, moduleCode: m.module_code, moduleColor: meta.color, moduleLabel: meta.label });
            });
          });
        }
        setAllowedSheets(flat);
      })
      .catch((err) => { console.error('HOD scope error:', err?.response?.status, err?.response?.data || err?.message); setAllowedSheets([]); })
      .finally(() => setLoading(false));
  }, []);

  // 2. Fetch counts per sheet
  useEffect(() => {
    if (!allowedSheets || allowedSheets.length === 0) return;
    allowedSheets.forEach(async ({ key, moduleCode }) => {
      try {
        const [logsRes, signoffsRes] = await Promise.all([
          hodAPI.getLogs(key, { limit: 1000 }),
          hodAPI.getSignoffs({ sheet: key, module: moduleCode }),
        ]);
        const logs     = logsRes?.data     || logsRes     || [];
        const signoffs = signoffsRes?.data || signoffsRes || [];
        const logArr   = Array.isArray(logs)     ? logs     : [];
        const sigArr   = Array.isArray(signoffs) ? signoffs : [];

        const seenIds    = new Set(sigArr.map(s => String(s.record_id)));
        const todayLogs  = logArr.filter(r => {
          const d = r.log_date || r.report_date || r.check_date || r.breakdown_date || r.activity_date || '';
          return String(d).slice(0, 10) === today;
        });
        const todayUnseen = todayLogs.filter(r => !seenIds.has(String(r.id)));
        const latestId    = todayLogs.length > 0 ? todayLogs[0].id : null;

        setCounts(prev => ({
          ...prev,
          [key]: {
            total:       logArr.length,
            pending:     logArr.filter(r => !seenIds.has(String(r.id))).length,
            todayCount:  todayLogs.length,
            todayUnseen: todayUnseen.length,
            latestId,
          },
        }));
      } catch (_) {}
    });
  }, [allowedSheets, today]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-red-600" />
      </div>
    );
  }

  if (!allowedSheets || allowedSheets.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center text-gray-500 text-sm max-w-sm w-full">
          <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          No checksheets assigned to your HOD account.<br />Contact the administrator.
        </div>
      </div>
    );
  }

  const totalPending  = Object.values(counts).reduce((s, c) => s + (c?.pending || 0), 0);
  const totalToday    = Object.values(counts).reduce((s, c) => s + (c?.todayCount || 0), 0);
  const todayUnseen   = Object.values(counts).reduce((s, c) => s + (c?.todayUnseen || 0), 0);

  // Today's sheets — only those with at least 1 entry today
  const todaySheets = allowedSheets.filter(s => counts[s.key]?.todayCount > 0);

  // Group all sheets by module
  const byModule = {};
  allowedSheets.forEach(s => {
    if (!byModule[s.moduleCode]) byModule[s.moduleCode] = { label: s.moduleLabel, color: s.moduleColor, sheets: [] };
    byModule[s.moduleCode].sheets.push(s);
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── Top summary strip ── */}
      <div className="bg-red-700 px-4 pt-4 pb-6">
        <h1 className="text-white text-lg font-bold mb-3">HOD Review Dashboard</h1>
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: 'Today\'s Sheets', value: totalToday,   color: 'bg-white/20' },
            { label: 'Unseen Today',    value: todayUnseen,  color: todayUnseen > 0 ? 'bg-orange-400/80' : 'bg-white/20' },
            { label: 'Total Pending',   value: totalPending, color: totalPending > 0 ? 'bg-red-900/60' : 'bg-white/20' },
          ].map(({ label, value, color }) => (
            <div key={label} className={`${color} rounded-xl px-3 py-2.5 text-center`}>
              <p className="text-white text-xl font-bold leading-none">{value}</p>
              <p className="text-red-100 text-[10px] mt-1 leading-tight">{label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="px-4 -mt-2 pb-8 space-y-5">

        {/* ── TODAY'S CHECKSHEETS ── */}
        <section>
          <div className="flex items-center gap-2 mb-2 mt-4">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide">Today's Checksheets</h2>
            <span className="text-xs text-gray-400">{new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</span>
          </div>

          {todaySheets.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 px-4 py-6 text-center text-gray-400 text-sm">
              No checksheets filled today yet.
            </div>
          ) : (
            <div className="space-y-2">
              {todaySheets.map(sheet => {
                const c   = counts[sheet.key];
                const th  = MODULE_THEME[sheet.moduleColor] || MODULE_THEME.emerald;
                const unseen = c?.todayUnseen || 0;
                return (
                  <Link
                    key={sheet.key}
                    to={c?.latestId ? `/hod/sheets/${sheet.key}/${c.latestId}` : `/hod/sheets/${sheet.key}`}
                    className={`flex items-center justify-between bg-white border rounded-2xl px-4 py-3 transition-all active:scale-95 ${th.card}`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${unseen > 0 ? 'bg-orange-400' : 'bg-emerald-400'}`} />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{sheet.label}</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          <span className={`font-semibold px-1.5 py-0.5 rounded text-[10px] ${th.badge}`}>{sheet.moduleLabel}</span>
                          <span className="ml-1">{c?.todayCount} entr{c?.todayCount === 1 ? 'y' : 'ies'} today</span>
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                      {unseen > 0 ? (
                        <span className="bg-orange-100 text-orange-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                          {unseen} unseen
                        </span>
                      ) : (
                        <span className="bg-emerald-100 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                          ✓ Seen
                        </span>
                      )}
                      <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>

        {/* ── ALL SHEETS BY MODULE ── */}
        {Object.entries(byModule).map(([moduleCode, { label, color, sheets }]) => {
          const th = MODULE_THEME[color] || MODULE_THEME.emerald;
          const modPending = sheets.reduce((s, sh) => s + (counts[sh.key]?.pending || 0), 0);
          return (
            <section key={moduleCode}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide ${th.badge}`}>{label}</span>
                  <div className="h-px w-16 bg-gray-200" />
                </div>
                {modPending > 0 && (
                  <span className="text-[10px] text-orange-600 font-semibold">{modPending} pending</span>
                )}
              </div>

              <div className="space-y-1.5">
                {sheets.map(sheet => {
                  const c = counts[sheet.key];
                  const loaded = !!c;
                  const pending = c?.pending || 0;

                  return (
                    <Link
                      key={sheet.key}
                      to={`/hod/sheets/${sheet.key}`}
                      className={`flex items-center justify-between bg-white border rounded-xl px-4 py-3 transition-all active:scale-95 ${th.card}`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <svg className={`w-4 h-4 flex-shrink-0 ${th.icon}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                        <span className="text-sm font-medium text-gray-800 truncate">{sheet.label}</span>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                        {!loaded ? (
                          <span className="text-[10px] text-gray-300">—</span>
                        ) : pending > 0 ? (
                          <span className="bg-orange-100 text-orange-700 text-[10px] font-bold px-2 py-0.5 rounded-full">{pending}</span>
                        ) : (
                          <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                        <svg className="w-3.5 h-3.5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
