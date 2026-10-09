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

export const optionBtnCls = (selected, bad) =>
  `px-3 py-1.5 rounded-lg text-xs font-semibold border ${
    selected
      ? bad
        ? 'bg-red-600 text-white border-red-600'
        : 'bg-emerald-600 text-white border-emerald-600'
      : 'bg-white text-gray-700 border-gray-300 hover:border-amber-300'
  }`;

/** Remark that opens from a toggle, stays open once it has text, and is forced open when `forceOpen` is set */
export const RemarkToggle = ({ value, open, forceOpen, onToggle, onChange }) => (
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
                className={optionBtnCls(selected, isBad(check, opt))}
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
        onToggle={onToggleRemark}
        onChange={(v) => onChange({ remark: v })}
      />
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
