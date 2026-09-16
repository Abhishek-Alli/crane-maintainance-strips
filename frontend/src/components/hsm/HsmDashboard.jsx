import React from 'react';
import { Link } from 'react-router-dom';

export default function HsmDashboard({ allowedSheets }) {
  const isAdminUser = (() => {
    try {
      const u = JSON.parse(localStorage.getItem('user'));
      return u?.role === 'ADMIN' || u?.user_type === 'ADMIN';
    } catch {
      return false;
    }
  })();

  const canAccess = (key) => !allowedSheets || allowedSheets.includes(key);

  const today = new Date().toLocaleDateString('en-IN', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
  });

  const allReports = [
    {
      key: 'breakdown-analysis',
      to: '/hsm/breakdown-analysis/new',
      label: 'Breakdown Analysis Report',
      sub: 'RCA · 5-Why · Corrective & Preventive Actions',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
        </svg>
      ),
      color: 'text-red-600 bg-red-50',
    },
    {
      key: 'roll-change-activity',
      to: '/hsm/roll-change-activity/new',
      label: 'Roll Change Activity',
      sub: 'Area equipment · Manpower · Remarks',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      ),
      color: 'text-orange-600 bg-orange-50',
    },
    {
      key: 'delay-report',
      to: '/hsm/delay-report/new',
      label: 'Delay Report',
      sub: 'HOTOUT · Miss Roll · Total downtime',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      color: 'text-yellow-600 bg-yellow-50',
    },
    {
      key: 'fm-daily-checklist',
      to: '/hsm/fm-daily-checklist/new',
      label: 'FM Daily Check List',
      sub: 'Guide gap · Pressures · Clamps',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
      ),
      color: 'text-green-600 bg-green-50',
    },
    {
      key: 'induction-daily-checklist',
      to: '/hsm/induction-daily-checklist/new',
      label: 'Induction Daily Check List',
      sub: 'Guide gap · Rollers · Heaters',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
      color: 'text-blue-600 bg-blue-50',
    },
    {
      key: 'dc-daily-checklist',
      to: '/hsm/dc-daily-checklist/new',
      label: 'DC Daily Check List',
      sub: 'Guide gap · Mandrel · WR gap',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18" />
        </svg>
      ),
      color: 'text-purple-600 bg-purple-50',
    },
    {
      key: 'rm-daily-checklist',
      to: '/hsm/rm-daily-checklist/new',
      label: 'RM Daily Check List',
      sub: 'Guide gap · Clamps · Descaling',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
      color: 'text-indigo-600 bg-indigo-50',
    },
    ...(isAdminUser
      ? [{
          key: null,
          to: '/hsm/insights',
          label: 'Insights',
          sub: 'Custom analysis · Compare reports',
          icon: (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          ),
          color: 'text-teal-600 bg-teal-50',
        }]
      : []),
  ];

  const reports = allReports.filter(r => r.key === null || canAccess(r.key));

  return (
    <div className="min-h-screen bg-gray-50 pb-24 sm:pb-6">
      {/* Header */}
      <div className="bg-indigo-700 text-white px-4 py-5">
        <h1 className="text-xl font-bold">HSM Checksheets</h1>
        <p className="text-indigo-200 text-xs mt-0.5">{today}</p>
      </div>

      {/* Fill new report cards */}
      <div className="p-4">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Select a report to fill</p>
        <div className="space-y-3">
          {reports.map((r) => (
            <Link
              key={r.to}
              to={r.to}
              className="flex items-center gap-4 bg-white rounded-xl border border-gray-200 px-4 py-4 shadow-sm hover:border-indigo-300 hover:shadow-md transition-all active:scale-98"
            >
              <div className={`flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center ${r.color}`}>
                {r.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 text-sm leading-tight">{r.label}</p>
                <p className="text-xs text-gray-500 mt-0.5 truncate">{r.sub}</p>
              </div>
              <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
