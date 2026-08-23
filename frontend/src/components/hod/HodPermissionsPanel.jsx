import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { userAPI } from '../../services/api';

// Must match hodController.js HOD_SHEETS
const HOD_MODULES = [
  {
    code: 'HSM_CHECKSHEETS',
    label: 'HSM Checksheets',
    color: 'indigo',
    sheets: [
      { key: 'fm-daily-checklist',   label: 'FM Daily Check List' },
      { key: 'delay-report',         label: 'Delay Report' },
      { key: 'breakdown-analysis',   label: 'Breakdown Analysis' },
      { key: 'roll-change-activity', label: 'Roll Change Activity' },
    ],
  },
  {
    code: 'HBM_CHECKSHEETS',
    label: 'HBM Checksheets',
    color: 'emerald',
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
      { key: 'roughing-gb-temp', label: 'Roughing Stand & GB Bearing Temp' },
      { key: 'breakdown',        label: 'HBM Breakdown Report' },
    ],
  },
  {
    code: 'SMS_CHECKSHEETS',
    label: 'SMS Checksheets',
    color: 'amber',
    sheets: [
      { key: 'breakdown-analysis', label: 'Breakdown Analysis Report' },
    ],
  },
  {
    code: 'PTM_CHECKSHEETS',
    label: 'PTM Checksheets',
    color: 'blue',
    sheets: [
      { key: 'checksheet', label: 'PTM Checksheet' },
      { key: 'breakdown',  label: 'PTM Breakdown Report' },
    ],
  },
];

const COLOR = {
  indigo:  { header: 'bg-indigo-50 border-indigo-200 text-indigo-800',  check: 'accent-indigo-600',  on: 'bg-indigo-50 border-indigo-300 text-indigo-800',  toggle: 'text-indigo-600' },
  emerald: { header: 'bg-emerald-50 border-emerald-200 text-emerald-800', check: 'accent-emerald-600', on: 'bg-emerald-50 border-emerald-300 text-emerald-800', toggle: 'text-emerald-600' },
  amber:   { header: 'bg-amber-50 border-amber-200 text-amber-800',    check: 'accent-amber-600',   on: 'bg-amber-50 border-amber-300 text-amber-800',    toggle: 'text-amber-600' },
  blue:    { header: 'bg-blue-50 border-blue-200 text-blue-800',       check: 'accent-blue-600',    on: 'bg-blue-50 border-blue-300 text-blue-800',       toggle: 'text-blue-600' },
};

export default function HodPermissionsPanel({ userId, onClose }) {
  // scope: null = all allowed, {} = nothing allowed, { MODULE: null | [keys] }
  const [scope, setScope] = useState(undefined);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    userAPI.getHodPermissions(userId)
      .then(res => setScope(res.data?.data?.allowed_scope ?? null))
      .catch(() => toast.error('Failed to load HOD permissions'));
  }, [userId]);

  if (scope === undefined) {
    return (
      <div className="mt-3 pt-3 border-t border-gray-200 flex justify-center py-4">
        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-red-600" />
      </div>
    );
  }

  // ── helpers ────────────────────────────────────────────────────────────────

  // Is a specific sheet allowed?
  const isSheetAllowed = (moduleCode, sheetKey) => {
    if (scope === null) return true; // all allowed
    const modVal = scope[moduleCode];
    if (modVal === undefined) return false; // module not in scope at all
    if (modVal === null) return true;       // entire module allowed
    return Array.isArray(modVal) && modVal.includes(sheetKey);
  };

  // Is the entire module allowed (all sheets checked)?
  const isModuleAllowed = (mod) => {
    if (scope === null) return true;
    const modVal = scope[mod.code];
    if (modVal === null) return true;
    if (!Array.isArray(modVal)) return false;
    return mod.sheets.every(s => modVal.includes(s.key));
  };

  // Is the module partially allowed?
  const isModulePartial = (mod) => {
    if (scope === null) return false;
    const modVal = scope[mod.code];
    if (!Array.isArray(modVal)) return false;
    return modVal.length > 0 && !mod.sheets.every(s => modVal.includes(s.key));
  };

  // Toggle a single sheet
  const toggleSheet = (moduleCode, sheetKey, allSheets) => {
    setScope(prev => {
      const base = prev === null
        ? Object.fromEntries(HOD_MODULES.map(m => [m.code, null]))
        : { ...prev };

      const modVal = base[moduleCode];
      const currentArr = modVal === null
        ? allSheets.map(s => s.key)
        : (Array.isArray(modVal) ? [...modVal] : []);

      const idx = currentArr.indexOf(sheetKey);
      if (idx >= 0) currentArr.splice(idx, 1);
      else currentArr.push(sheetKey);

      base[moduleCode] = currentArr.length === allSheets.length ? null : currentArr;

      // If no module has any sheets, scope becomes {} (nothing)
      const anyAllowed = Object.values(base).some(v => v === null || (Array.isArray(v) && v.length > 0));
      return anyAllowed ? base : {};
    });
  };

  // Toggle entire module on/off
  const toggleModule = (mod) => {
    setScope(prev => {
      const base = prev === null
        ? Object.fromEntries(HOD_MODULES.map(m => [m.code, null]))
        : { ...prev };

      const isOn = isModuleAllowed(mod) || isModulePartial(mod);
      if (isOn) {
        delete base[mod.code]; // remove module entirely
      } else {
        base[mod.code] = null; // allow all sheets in module
      }

      const anyAllowed = Object.values(base).some(v => v === null || (Array.isArray(v) && v.length > 0));
      return anyAllowed ? base : {};
    });
  };

  // Select all / deselect all
  const toggleAll = () => {
    setScope(scope === null ? {} : null);
  };

  const allAllowed = scope === null;
  const noneAllowed = scope !== null && Object.keys(scope).length === 0;

  // ── save ──────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (noneAllowed) {
      toast.warn('Select at least one sheet for this HOD user');
      return;
    }
    setSaving(true);
    try {
      await userAPI.updateHodPermissions(userId, { allowed_scope: scope });
      toast.success('HOD permissions saved');
      onClose();
    } catch {
      toast.error('Failed to save HOD permissions');
    } finally {
      setSaving(false);
    }
  };

  // ── render ────────────────────────────────────────────────────────────────

  return (
    <div className="mt-3 pt-3 border-t border-gray-200 space-y-3">

      {/* Header row */}
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">HOD Module & Sheet Access</p>
        <button
          type="button"
          onClick={toggleAll}
          className="text-xs text-red-600 hover:underline font-semibold"
        >
          {allAllowed ? 'Deselect All' : 'Select All'}
        </button>
      </div>

      {noneAllowed && (
        <p className="text-xs text-red-500 font-medium">No sheets selected — user will see nothing.</p>
      )}

      {/* One card per module */}
      {HOD_MODULES.map(mod => {
        const c = COLOR[mod.color] || COLOR.indigo;
        const modOn = isModuleAllowed(mod);
        const modPartial = isModulePartial(mod);

        return (
          <div key={mod.code} className="border border-gray-200 rounded-lg overflow-hidden">
            {/* Module header — click to toggle entire module */}
            <div className={`flex items-center justify-between px-3 py-2 border-b ${c.header}`}>
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={modOn}
                  ref={el => { if (el) el.indeterminate = modPartial && !modOn; }}
                  onChange={() => toggleModule(mod)}
                  className={`w-3.5 h-3.5 ${c.check}`}
                />
                <span className="text-xs font-bold uppercase tracking-wide">{mod.label}</span>
              </label>
              <button
                type="button"
                onClick={() => toggleModule(mod)}
                className={`text-[10px] font-semibold ${c.toggle} hover:underline`}
              >
                {modOn ? 'Remove All' : modPartial ? 'Select All' : 'Add All'}
              </button>
            </div>

            {/* Sheet checkboxes */}
            <div className="p-2 grid grid-cols-2 gap-1 bg-white">
              {mod.sheets.map(({ key, label }) => {
                const isOn = isSheetAllowed(mod.code, key);
                return (
                  <label
                    key={key}
                    className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg border cursor-pointer text-xs font-medium transition-colors select-none ${
                      isOn
                        ? c.on
                        : 'bg-white border-gray-200 text-gray-400'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isOn}
                      onChange={() => toggleSheet(mod.code, key, mod.sheets)}
                      className={`w-3 h-3 ${c.check}`}
                    />
                    {label}
                  </label>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || noneAllowed}
          className="flex-1 py-1.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors"
        >
          {saving ? 'Saving…' : 'Save HOD Permissions'}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-lg transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
