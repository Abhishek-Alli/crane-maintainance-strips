import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { hodAPI } from '../../services/api';

const SHEET_MODULE = {
  'fm-daily-checklist':   'HSM_CHECKSHEETS',
  'delay-report':         'HSM_CHECKSHEETS',
  'breakdown-analysis':   'HSM_CHECKSHEETS',
  'roll-change-activity': 'HSM_CHECKSHEETS',
  'dc-motor':             'HBM_CHECKSHEETS',
  'rolling-stand':        'HBM_CHECKSHEETS',
  'mill-mech':            'HBM_CHECKSHEETS',
  'cooling-bed':          'HBM_CHECKSHEETS',
  'pumphouse':            'HBM_CHECKSHEETS',
  'bar-bundle':           'HBM_CHECKSHEETS',
  'before-rolling':       'HBM_CHECKSHEETS',
  'pump-param':           'HBM_CHECKSHEETS',
  'water-param':          'HBM_CHECKSHEETS',
  'ph-maint':             'HBM_CHECKSHEETS',
  'transformer':          'HBM_CHECKSHEETS',
  'oil-level':            'HBM_CHECKSHEETS',
  'dc-motor-airflow':     'HBM_CHECKSHEETS',
  'roughing-gb-temp':     'HBM_CHECKSHEETS',
  'breakdown':            'HBM_CHECKSHEETS',
  'checksheet':           'PTM_CHECKSHEETS',
};

// Per-sheet column definitions — falls back to generic columns for unknown sheets
const SHEET_COLS = {
  'fm-daily-checklist':   (row) => [
    { label: 'Date',           value: row.report_date    ? new Date(row.report_date).toLocaleDateString('en-IN') : '—' },
    { label: 'Shift',          value: row.shift          || '—' },
    { label: 'Shift Engineer', value: row.shift_engineer || '—' },
    { label: 'Filled By',      value: row.filled_by_name || '—' },
  ],
  'delay-report':         (row) => [
    { label: 'Date',      value: row.report_date    ? new Date(row.report_date).toLocaleDateString('en-IN') : '—' },
    { label: 'Shift',     value: row.shift          || '—' },
    { label: 'Filled By', value: row.filled_by_name || '—' },
  ],
  'breakdown-analysis':   (row) => [
    { label: 'Date',      value: row.breakdown_date ? new Date(row.breakdown_date).toLocaleDateString('en-IN') : '—' },
    { label: 'Shift',     value: row.shift          || '—' },
    { label: 'Filled By', value: row.filled_by_name || '—' },
  ],
  'roll-change-activity': (row) => [
    { label: 'Date',      value: row.activity_date  ? new Date(row.activity_date).toLocaleDateString('en-IN') : '—' },
    { label: 'Shift',     value: row.shift          || '—' },
    { label: 'Filled By', value: row.filled_by_name || '—' },
  ],
};

// Generic column extractor for HBM/SMS/PTM sheets — shows date + filled_by when available
function genericCols(row) {
  const dateVal = row.log_date || row.report_date || row.check_date || row.created_at;
  return [
    { label: 'Date',      value: dateVal ? new Date(dateVal).toLocaleDateString('en-IN') : '—' },
    { label: 'Filled By', value: row.filled_by_name || row.created_by_name || '—' },
  ];
}

function getConfig(sheetKey) {
  return {
    label: sheetKey.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
    fetchLogs: (p) => hodAPI.getLogs(sheetKey, p),
    cols: SHEET_COLS[sheetKey] || genericCols,
  };
}

export default function HodSheetList() {
  const { sheetKey } = useParams();
  const navigate = useNavigate();
  const config = getConfig(sheetKey);

  const [logs, setLogs] = useState([]);
  const [signoffs, setSignoffs] = useState({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // 'all' | 'pending' | 'seen'

  useEffect(() => {
    Promise.all([
      hodAPI.getLogs(sheetKey, { limit: 500 }),
      hodAPI.getSignoffs({ sheet: sheetKey, module: SHEET_MODULE[sheetKey] }),
    ])
      .then(([logsRes, signoffsRes]) => {
        const logs     = logsRes?.data     || logsRes     || [];
        const signoffs = signoffsRes?.data || signoffsRes || [];
        setLogs(Array.isArray(logs) ? logs : []);
        const map = {};
        (Array.isArray(signoffs) ? signoffs : []).forEach(s => { map[s.record_id] = s; });
        setSignoffs(map);
      })
      .catch(() => toast.error('Failed to load data'))
      .finally(() => setLoading(false));
  }, [sheetKey]);



  const filtered = logs.filter(row => {
    if (filter === 'pending') return !signoffs[row.id];
    if (filter === 'seen')    return !!signoffs[row.id];
    return true;
  });

  const pendingCount = logs.filter(r => !signoffs[r.id]).length;
  const seenCount    = logs.filter(r => !!signoffs[r.id]).length;

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="max-w-5xl mx-auto">
        <button
          onClick={() => navigate('/hod/dashboard')}
          className="text-sm text-gray-500 hover:text-gray-700 mb-3"
        >
          ← HOD Dashboard
        </button>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
          <div>
            <h1 className="text-xl font-bold text-gray-900">{config.label}</h1>
            <p className="text-xs text-gray-500 mt-0.5">HOD Review — read-only view</p>
          </div>
          {/* Filter tabs */}
          <div className="flex gap-1">
            {[
              { key: 'all',     label: `All (${logs.length})` },
              { key: 'pending', label: `Pending (${pendingCount})` },
              { key: 'seen',    label: `Seen (${seenCount})` },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  filter === tab.key
                    ? 'bg-red-600 text-white'
                    : 'bg-white border border-gray-200 text-gray-600 hover:border-red-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-10 text-center text-gray-500 text-sm">
            No records found.
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    {config.cols({}).map(col => (
                      <th key={col.label} className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase">
                        {col.label}
                      </th>
                    ))}
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase">HOD Status</th>
                    <th className="px-4 py-2.5" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.map(row => {
                    const seen = signoffs[row.id];
                    return (
                      <tr key={row.id} className={`hover:bg-gray-50 ${seen ? '' : 'bg-red-50/30'}`}>
                        {config.cols(row).map(col => (
                          <td key={col.label} className="px-4 py-2.5 text-gray-700">{col.value}</td>
                        ))}
                        <td className="px-4 py-2.5">
                          {seen ? (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              Seen
                            </span>
                          ) : (
                            <span className="inline-block text-xs font-semibold text-orange-700 bg-orange-100 px-2 py-0.5 rounded-full">
                              Pending
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2.5">
                          <button
                            onClick={() => navigate(`/hod/sheets/${sheetKey}/${row.id}`)}
                            className="text-xs text-red-600 hover:text-red-800 font-semibold whitespace-nowrap"
                          >
                            View →
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
