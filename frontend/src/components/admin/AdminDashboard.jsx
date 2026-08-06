import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { modulesAPI } from '../../services/api';

const TOOLS = [
  {
    to: '/admin/modules',
    title: 'Create Module',
    desc: 'Add HBM, HSM, PTM, SMS and more — shell is provisioned automatically',
    accent: 'border-blue-200 hover:border-blue-400 hover:bg-blue-50',
    iconBg: 'bg-blue-100 text-blue-700',
    icon: 'M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z',
  },
  {
    to: '/admin/users',
    title: 'User Management',
    desc: 'Create users, change module, password, or delete',
    accent: 'border-violet-200 hover:border-violet-400 hover:bg-violet-50',
    iconBg: 'bg-violet-100 text-violet-700',
    icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z',
  },
  {
    to: '/admin/share-access',
    title: 'Share Sheets Access',
    desc: 'Manage which checksheets can be shared per module',
    accent: 'border-emerald-200 hover:border-emerald-400 hover:bg-emerald-50',
    iconBg: 'bg-emerald-100 text-emerald-700',
    icon: 'M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z',
  },
  {
    to: '/admin/download-reports',
    title: 'Download Reports',
    desc: 'Monthly register, insights, and checksheet exports',
    accent: 'border-orange-200 hover:border-orange-400 hover:bg-orange-50',
    iconBg: 'bg-orange-100 text-orange-700',
    icon: 'M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4',
  },
  {
    to: '/admin/telegram',
    title: 'Telegram Notifications',
    desc: 'Recipients and which checksheets send alerts',
    accent: 'border-sky-200 hover:border-sky-400 hover:bg-sky-50',
    iconBg: 'bg-sky-100 text-sky-700',
    icon: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9',
  },
];

const AdminDashboard = () => {
  const [modules, setModules] = useState([]);
  const today = new Date().toLocaleDateString('en-IN', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
  });

  useEffect(() => {
    modulesAPI.getAll()
      .then(res => setModules((res.modules || []).filter(m => m.is_active)))
      .catch(() => {});
  }, []);

  return (
    <div className="max-w-5xl">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900">Admin Dashboard</h2>
        <p className="text-gray-500 mt-1 text-sm">{today}</p>
        <p className="text-gray-600 mt-3 text-sm max-w-2xl">
          Manage modules, users, sheet access, reports, and Telegram. Open any module below to fill checksheets — Admin has full access.
        </p>
      </div>

      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Admin tools</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-10">
        {TOOLS.map(t => (
          <Link
            key={t.to}
            to={t.to}
            className={`flex flex-col bg-white border rounded-xl p-4 transition-all hover:shadow-md ${t.accent}`}
          >
            <span className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${t.iconBg}`}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={t.icon} />
              </svg>
            </span>
            <p className="font-semibold text-gray-900 text-sm">{t.title}</p>
            <p className="text-xs text-gray-500 mt-1 leading-relaxed">{t.desc}</p>
          </Link>
        ))}
      </div>

      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Modules — open &amp; fill</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {modules.map(m => {
          const prefix = (m.route_prefix || '').replace(/\/$/, '') || '';
          const to = !prefix || prefix === '/' ? '/' : `${prefix}/dashboard`;
          return (
            <Link
              key={m.id}
              to={to}
              className="flex items-center justify-between bg-white border border-gray-200 rounded-xl p-4 hover:border-violet-300 hover:bg-violet-50 hover:shadow-md transition-all"
            >
              <div>
                <p className="font-semibold text-gray-900 text-sm">{m.name}</p>
                <p className="text-xs text-gray-400 mt-0.5 font-mono">{m.code}</p>
              </div>
              <span className="text-xs font-semibold text-violet-600">Open →</span>
            </Link>
          );
        })}
        {modules.length === 0 && (
          <div className="sm:col-span-2 lg:col-span-3 bg-white border border-dashed border-gray-300 rounded-xl p-8 text-center text-sm text-gray-500">
            No modules yet.{' '}
            <Link to="/admin/modules" className="text-violet-600 font-semibold hover:underline">Create Module</Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
