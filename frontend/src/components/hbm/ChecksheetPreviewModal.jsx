import React from 'react';

// Reusable preview section wrapper
export const PreviewSection = ({ title, color = 'bg-blue-700', children }) => (
  <div className="rounded-xl border border-gray-200 overflow-hidden">
    <div className={`px-4 py-2.5 ${color} text-white`}>
      <h3 className="font-bold text-sm">{title}</h3>
    </div>
    <div className="p-4">{children}</div>
  </div>
);

// Renders a simple 2-col key-value grid
export const PreviewGrid = ({ rows }) => (
  <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2">
    {rows.map(([label, value], i) => (
      <div key={i}>
        <p className="text-xs text-gray-500 font-medium">{label}</p>
        <p className="text-sm font-semibold text-gray-800 break-words">{value || '—'}</p>
      </div>
    ))}
  </div>
);

// Renders a status badge
export const StatusBadge = ({ value }) => {
  if (!value) return <span className="text-gray-400 text-xs">—</span>;
  const good = new Set(['OK', 'Checked', 'NO', 'ON']);
  const bad  = new Set(['NOT_OK', 'Not_Checked', 'YES']);
  const label = value === 'NOT_OK' ? 'NOT OK' : value === 'Not_Checked' ? 'Not Checked' : value;
  if (good.has(value)) return <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold">{label}</span>;
  if (bad.has(value))  return <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-semibold">{label}</span>;
  return <span className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full font-semibold">{label}</span>;
};

// Renders a table of status fields
export const PreviewStatusTable = ({ rows }) => (
  <div className="divide-y divide-gray-100 border border-gray-200 rounded-xl overflow-hidden">
    {rows.map(([label, value], i) => (
      <div key={i} className="flex items-center justify-between px-3 py-2">
        <span className="text-xs text-gray-600 font-medium">{label}</span>
        <StatusBadge value={value} />
      </div>
    ))}
  </div>
);

// Main modal shell
const ChecksheetPreviewModal = ({ isOpen, title, onEdit, onConfirm, submitting, children, confirmLabel }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onEdit} />
      <div className="relative bg-white w-full sm:max-w-3xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[92vh] sm:max-h-[88vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 shrink-0">
          <div>
            <h2 className="text-base font-bold text-gray-900">Preview Before Submit</h2>
            <p className="text-xs text-gray-500 mt-0.5">{title} — review all fields, then confirm</p>
          </div>
          <button onClick={onEdit} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scrollable content */}
        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">
          {children}
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-5 py-4 border-t border-gray-200 shrink-0 bg-white">
          <button
            onClick={onEdit}
            disabled={submitting}
            className="flex-1 py-2.5 border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            ← Edit
          </button>
          <button
            onClick={onConfirm}
            disabled={submitting}
            className="flex-1 py-2.5 bg-blue-700 text-white rounded-xl font-semibold hover:bg-blue-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                Submitting...
              </span>
            ) : (confirmLabel || 'Confirm & Submit')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChecksheetPreviewModal;
