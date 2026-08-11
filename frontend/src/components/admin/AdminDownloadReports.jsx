import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { modulesAPI } from '../../services/api';

const REPORT_LINKS_BY_PREFIX = {
  '/hbm': [
    { to: '/hbm/download', label: 'Download Checksheets', desc: 'Export HBM checksheet data' },
    { to: '/hbm/monthly-register', label: 'Monthly Register', desc: 'Month-wise register view' },
    { to: '/hbm/monthly-insights', label: 'Monthly Insights', desc: 'Issues and trends summary' },
  ],
  '/ptm': [
    { to: '/ptm/monthly-register', label: 'Monthly Register', desc: 'PTM month-wise register' },
    { to: '/ptm/checksheet/history', label: 'Checksheet History', desc: 'Browse and review PTM logs' },
  ],
  '/hsm': [
    { to: '/hsm/breakdown-analysis/history', label: 'Breakdown Analysis History', desc: 'Browse RCA / 5-Why reports' },
    { to: '/hsm/breakdown-analysis/new', label: 'New Breakdown Analysis', desc: 'Fill a new Breakdown Analysis Report' },
  ],
  '/sms': [
    { to: '/sms/breakdown-analysis/history', label: 'Breakdown Analysis History', desc: 'Browse RCA / 5-Why reports' },
    { to: '/sms/breakdown-analysis/new', label: 'New Breakdown Analysis', desc: 'Fill a new Breakdown Analysis Report' },
  ],
};

export default function AdminDownloadReports() {
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    modulesAPI.getAll()
      .then(res => setModules((res.modules || []).filter(m => m.is_active)))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-4xl">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Download Reports</h2>
        <p className="text-gray-500 text-sm mt-1">Export monthly registers, insights, and checksheet downloads by module</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600" />
        </div>
      ) : (
        <div className="space-y-5">
          {modules.map(m => {
            const prefix = (m.route_prefix || '').replace(/\/$/, '') || '';
            const links = REPORT_LINKS_BY_PREFIX[prefix] || [
              { to: `${prefix}/dashboard`, label: `${m.name} Dashboard`, desc: 'Open module — reports follow when checksheets are added' },
            ];
            return (
              <div key={m.id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-5 py-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-gray-900 text-sm">{m.name}</h3>
                    <p className="text-xs text-gray-400 font-mono">{m.code}</p>
                  </div>
                  <Link
                    to={prefix === '/' || !prefix ? '/' : `${prefix}/dashboard`}
                    className="text-xs font-semibold text-violet-600 hover:text-violet-800"
                  >
                    Open module →
                  </Link>
                </div>
                <div className="divide-y divide-gray-100">
                  {links.map(link => (
                    <Link
                      key={link.to}
                      to={link.to}
                      className="flex items-center justify-between px-5 py-3 hover:bg-violet-50 transition-colors"
                    >
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{link.label}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{link.desc}</p>
                      </div>
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}

          {modules.length === 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-10 text-center text-sm text-gray-500">
              No active modules. Create a module first.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
