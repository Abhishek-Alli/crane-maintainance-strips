import React from 'react';

export const inputCls =
  'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400';

export const Field = ({ label, required, children }) => (
  <div>
    <label className="block text-xs font-semibold text-gray-600 mb-1">
      {label}{required ? ' *' : ''}
    </label>
    {children}
  </div>
);

export const loggedInUsername = () => {
  try {
    return JSON.parse(localStorage.getItem('user'))?.username || '';
  } catch {
    return '';
  }
};

/** Options that are literally a colour (e.g. silica gel) are shown in that colour */
const COLOR_OPTION_CLS = {
  BLUE: { selected: 'bg-blue-600 text-white border-blue-600', idle: 'bg-white text-blue-700 border-blue-300 hover:border-blue-500' },
  ORANGE: { selected: 'bg-orange-500 text-white border-orange-500', idle: 'bg-white text-orange-600 border-orange-300 hover:border-orange-500' },
  PINK: { selected: 'bg-pink-500 text-white border-pink-500', idle: 'bg-white text-pink-600 border-pink-300 hover:border-pink-500' },
};

export const optionBtnCls = (selected, bad, colorOption) => {
  const color = COLOR_OPTION_CLS[colorOption];
  return `px-3 py-1.5 rounded-lg text-xs font-semibold border ${
    color
      ? (selected ? color.selected : color.idle)
      : selected
        ? bad
          ? 'bg-red-600 text-white border-red-600'
          : 'bg-emerald-600 text-white border-emerald-600'
        : 'bg-white text-gray-700 border-gray-300 hover:border-amber-300'
  }`;
};

/** OTI temperature above this needs a remark and is highlighted red */
export const OTI_LIMIT = 90;
/** WTI uses the same limit as OTI */
export const WTI_LIMIT = OTI_LIMIT;

/** Remark that opens from a toggle, stays open once it has text, and is forced open when `forceOpen` is set */
export const RemarkToggle = ({ value, open, forceOpen, required, onToggle, onChange }) => (
  <>
    {!forceOpen && (
      <button type="button" onClick={onToggle} className="text-xs font-semibold text-gray-500 hover:text-amber-700">
        Remark {open || value ? '▴' : '▾'}
      </button>
    )}
    {(forceOpen || open || value) && (
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className={inputCls}
        placeholder={forceOpen ? 'Remark / Action' : 'Remark (optional)'}
      />
    )}
  </>
);

/** One check row: label + clickable options (click the selected one to clear) + remark */
export const CheckRow = ({ check, row, isBad, open, onToggleRemark, onChange }) => {
  const bad = isBad(check, row.value);
  return (
    <div className={`rounded-lg p-3 border space-y-2 ${bad ? 'border-red-200 bg-red-50/50' : 'border-gray-100 bg-gray-50'}`}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <p className="text-sm font-semibold text-gray-800">{check.label}</p>
        <div className="flex flex-wrap gap-2 sm:justify-end">
          {check.options.map((opt) => {
            const selected = row.value === opt;
            return (
              <button
                key={opt}
                type="button"
                onClick={() => onChange({ value: selected ? '' : opt })}
                className={optionBtnCls(selected, isBad(check, opt), check.colored ? opt : undefined)}
              >
                {opt}
              </button>
            );
          })}
        </div>
      </div>
      <RemarkToggle
        value={row.remark}
        open={open}
        forceOpen={bad}
        required={bad && check.requireRemark}
        onToggle={onToggleRemark}
        onChange={(v) => onChange({ remark: v })}
      />
    </div>
  );
};

/** Temperature row; with `limit` set, a value above it turns the row red and makes the remark required */
export const TempRow = ({ label, value, remark, open, limit, onToggle, onValue, onRemark }) => {
  const high = limit !== undefined && limit !== null && value !== '' && Number(value) > limit;
  return (
    <div className={`rounded-lg p-3 border space-y-2 ${high ? 'border-red-200 bg-red-50/50' : 'border-gray-100 bg-gray-50'}`}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <p className="text-sm font-semibold text-gray-800">{label}</p>
        <input
          type="number"
          step="any"
          inputMode="decimal"
          value={value}
          onChange={(e) => onValue(e.target.value)}
          className={`w-40 px-3 py-1.5 border rounded-lg text-sm font-semibold focus:outline-none focus:ring-2 ${
            high ? 'border-red-300 text-red-700 focus:ring-red-400' : 'border-gray-300 focus:ring-amber-400'
          }`}
        />
      </div>
      <RemarkToggle value={remark} open={open} forceOpen={high} required={high} onToggle={onToggle} onChange={onRemark} />
    </div>
  );
};

export const PageLoader = () => (
  <div className="min-h-screen bg-gray-50 flex items-center justify-center">
    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-amber-600" />
  </div>
);

export const DeleteConfirm = ({ deleting, onCancel, onConfirm }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
    <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
      <h3 className="text-lg font-bold text-gray-900 mb-2">Delete checklist?</h3>
      <p className="text-sm text-gray-600 mb-4">This cannot be undone.</p>
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="px-4 py-2 border border-gray-300 rounded-lg text-sm">Cancel</button>
        <button type="button" disabled={deleting} onClick={onConfirm} className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-semibold disabled:opacity-50">
          {deleting ? 'Deleting…' : 'Delete'}
        </button>
      </div>
    </div>
  </div>
);
