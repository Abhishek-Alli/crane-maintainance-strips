import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { hsmAPI } from '../../services/api';

const formatDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const TABS = [
  { key: 'breakdown', label: 'Breakdown' },
  { key: 'rollchange', label: 'Roll Change' },
  { key: 'delay', label: 'Delay' },
  { key: 'fm', label: 'FM Daily' },
  { key: 'induction', label: 'Induction' },
  { key: 'dc', label: 'DC Daily' },
  { key: 'rm', label: 'RM Daily' },
];

export default function HsmHistory() {
  const [activeTab, setActiveTab] = useState('breakdown');
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    setData([]);
    const fetchers = {
      breakdown: () => hsmAPI.getBreakdownAnalysisLogs({ limit: 50 }),
      rollchange: () => hsmAPI.getRollChangeActivityLogs({ limit: 50 }),
      delay: () => hsmAPI.getDelayReportLogs({ limit: 50 }),
      fm: () => hsmAPI.getFmDailyChecklistLogs({ limit: 50 }),
      induction: () => hsmAPI.getInductionDailyChecklistLogs({ limit: 50 }),
      dc: () => hsmAPI.getDcDailyChecklistLogs({ limit: 50 }),
      rm: () => hsmAPI.getRmDailyChecklistLogs({ limit: 50 }),
    };
    fetchers[activeTab]()
      .then(res => setData(res?.data || []))
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, [activeTab]);

  const viewPath = {
    breakdown: (id) => `/hsm/breakdown-analysis/${id}`,
    rollchange: (id) => `/hsm/roll-change-activity/${id}`,
    delay: (id) => `/hsm/delay-report/${id}`,
    fm: (id) => `/hsm/fm-daily-checklist/${id}`,
    induction: (id) => `/hsm/induction-daily-checklist/${id}`,
    dc: (id) => `/hsm/dc-daily-checklist/${id}`,
    rm: (id) => `/hsm/rm-daily-checklist/${id}`,
  };

  const getLabel = (item) => {
    if (activeTab === 'breakdown') return item.machine_name || '—';
    if (activeTab === 'rollchange') return item.area || '—';
    if (activeTab === 'delay') return `Shift ${item.shift}${item.agency ? ` · ${item.agency}` : ''}`;
    if (activeTab === 'fm') return `Shift ${item.shift}${item.shift_engineer ? ` · ${item.shift_engineer}` : ''}`;
    if (activeTab === 'induction') return `Shift ${item.shift}${item.shift_incharge ? ` · ${item.shift_incharge}` : ''}`;
    if (activeTab === 'dc') return `Shift ${item.shift}${item.shift_incharge ? ` · ${item.shift_incharge}` : ''}`;
    if (activeTab === 'rm') return `Shift ${item.shift}${item.shift_incharge ? ` · ${item.shift_incharge}` : ''}`;
    return '—';
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="bg-indigo-700 text-white px-4 py-4">
        <h1 className="text-lg font-bold">HSM History</h1>
        <p className="text-indigo-200 text-xs mt-0.5">View & download filled reports</p>
      </div>

      {/* Tab bar */}
      <div className="bg-white border-b border-gray-200 overflow-x-auto flex">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-shrink-0 px-4 py-3 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap ${
              activeTab === tab.key
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-gray-500'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="p-4">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
          </div>
        ) : data.length === 0 ? (
          <div className="text-center py-16 text-gray-400 text-sm">No records found.</div>
        ) : (
          <div className="space-y-2">
            {data.map(item => (
              <Link
                key={item.id}
                to={viewPath[activeTab](item.id)}
                className="flex items-center justify-between bg-white rounded-xl border border-gray-200 px-4 py-3 shadow-sm hover:border-indigo-300 transition-colors"
              >
                <div>
                  <p className="font-semibold text-gray-900 text-sm">{getLabel(item)}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{formatDate(item.report_date || item.check_date)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-indigo-600 font-semibold">View →</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
