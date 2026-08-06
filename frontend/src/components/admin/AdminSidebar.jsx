import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import AdminClock from './AdminClock';

const COLOR_TEXT = {
  blue: 'text-blue-400', emerald: 'text-emerald-400', indigo: 'text-indigo-400',
  purple: 'text-purple-400', orange: 'text-orange-400', red: 'text-red-400', slate: 'text-slate-400',
};

const CHECKSHEET_ICON = 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2';

/** Admin ops tools only — matches product IA */
const OPS_LINKS = [
  {
    to: '/admin/modules',
    label: 'Create Module',
    icon: 'M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z',
  },
  {
    to: '/admin/users',
    label: 'User Management',
    icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z',
  },
  {
    to: '/admin/share-access',
    label: 'Share Sheets Access',
    icon: 'M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z',
  },
  {
    to: '/admin/download-reports',
    label: 'Download Reports',
    icon: 'M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4',
  },
  {
    to: '/admin/telegram',
    label: 'Telegram Notifications',
    icon: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9',
  },
];

const isActivePath = (pathname, to) => {
  if (to === '/admin/users') return pathname === '/admin/users' || pathname === '/create-user';
  if (to === '/admin/share-access') return pathname === '/admin/share-access' || pathname === '/admin/config';
  if (to === '/admin/telegram') return pathname === '/admin/telegram' || pathname === '/telegram-settings';
  return pathname === to || pathname.startsWith(to + '/');
};

const NavLink = ({ to, label, icon, active, onClick, color }) => (
  <Link
    to={to}
    onClick={onClick}
    className={`flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
      active ? 'bg-violet-600 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
    }`}
  >
    <svg className={`w-5 h-5 flex-shrink-0 ${!active && color ? color : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={icon} />
    </svg>
    <span>{label}</span>
  </Link>
);

const SidebarContent = ({ pathname, onLinkClick, moduleLinks }) => (
  <>
    <Link to="/admin/dashboard" onClick={onLinkClick} className="flex items-center gap-3 px-2 mb-8">
      <img src="/srj-logo.png" alt="SRJ Logo" className="w-9 h-9 rounded-lg bg-white p-0.5 object-contain" />
      <div>
        <p className="text-white font-extrabold text-sm leading-tight">SRJ STEEL</p>
        <p className="text-slate-400 text-xs leading-tight">Admin Panel</p>
      </div>
    </Link>

    <nav className="flex-1 overflow-y-auto space-y-6">
      <div>
        <p className="px-3 mb-2 text-xs font-semibold text-slate-500 uppercase tracking-widest">Admin Tools</p>
        <div className="space-y-1">
          <NavLink
            to="/admin/dashboard"
            label="Dashboard"
            icon="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
            active={pathname === '/admin/dashboard'}
            onClick={onLinkClick}
          />
          {OPS_LINKS.map(l => (
            <NavLink
              key={l.to}
              {...l}
              active={isActivePath(pathname, l.to)}
              onClick={onLinkClick}
            />
          ))}
        </div>
      </div>

      <div>
        <p className="px-3 mb-2 text-xs font-semibold text-slate-500 uppercase tracking-widest">Modules</p>
        <p className="px-3 mb-2 text-[11px] text-slate-500 leading-snug">Open any module to view and fill checksheets</p>
        <div className="space-y-1">
          {moduleLinks.map(l => (
            <NavLink
              key={l.to}
              {...l}
              active={pathname === l.to || pathname.startsWith((l.routePrefix || '') + '/')}
              onClick={onLinkClick}
            />
          ))}
        </div>
      </div>
    </nav>

    <div className="mt-6">
      <AdminClock />
    </div>
  </>
);

const AdminSidebar = ({ pathname, mobileOpen, onCloseMobile }) => {
  const [moduleLinks, setModuleLinks] = useState([
    { to: '/', label: 'Crane Maintenance', color: 'text-blue-400', icon: CHECKSHEET_ICON, routePrefix: '' },
    { to: '/hbm/dashboard', label: 'HBM Checksheets', color: 'text-emerald-400', icon: CHECKSHEET_ICON, routePrefix: '/hbm' },
    { to: '/hsm/dashboard', label: 'HSM Checksheets', color: 'text-indigo-400', icon: CHECKSHEET_ICON, routePrefix: '/hsm' },
    { to: '/ptm/dashboard', label: 'PTM Checksheets', color: 'text-blue-400', icon: CHECKSHEET_ICON, routePrefix: '/ptm' },
  ]);

  useEffect(() => {
    axios.get('/api/modules').then(r => {
      const mods = (r.data.modules || []).filter(m => m.is_active);
      if (mods.length === 0) return;
      setModuleLinks(mods.map(m => {
        const prefix = (m.route_prefix || '').replace(/\/$/, '') || '/';
        const to = prefix === '/' ? '/' : `${prefix}/dashboard`;
        return {
          to,
          label: m.name,
          color: COLOR_TEXT[m.color] || 'text-blue-400',
          icon: CHECKSHEET_ICON,
          routePrefix: prefix === '/' ? '' : prefix,
        };
      }));
    }).catch(() => {});
  }, []);

  return (
    <>
      <aside className="hidden md:flex md:fixed md:inset-y-0 md:left-0 md:w-64 md:flex-col bg-slate-900 px-4 py-6 z-30">
        <SidebarContent pathname={pathname} moduleLinks={moduleLinks} />
      </aside>

      {mobileOpen && (
        <>
          <div className="md:hidden fixed inset-0 bg-black/50 z-40" onClick={onCloseMobile} />
          <aside className="md:hidden fixed inset-y-0 left-0 z-50 w-64 flex flex-col bg-slate-900 px-4 py-6">
            <SidebarContent pathname={pathname} onLinkClick={onCloseMobile} moduleLinks={moduleLinks} />
          </aside>
        </>
      )}
    </>
  );
};

export default AdminSidebar;
