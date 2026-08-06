import React, { useState } from 'react';

const PAGE_TITLES = {
  '/admin/dashboard': 'Dashboard',
  '/admin/modules': 'Create Module',
  '/admin/users': 'User Management',
  '/create-user': 'User Management',
  '/admin/share-access': 'Share Sheets Access',
  '/admin/config': 'Share Sheets Access',
  '/admin/download-reports': 'Download Reports',
  '/admin/telegram': 'Telegram Notifications',
  '/telegram-settings': 'Telegram Notifications',
};

const AdminTopbar = ({ pathname, onToggleMobile, user, onLogout }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const title = PAGE_TITLES[pathname] || 'Admin Panel';

  return (
    <header className="sticky top-0 z-20 bg-white border-b border-gray-200 px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onToggleMobile}
          className="md:hidden p-2 rounded-lg hover:bg-gray-100 text-gray-600 flex-shrink-0"
          aria-label="Toggle menu"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <h1 className="text-lg font-bold text-gray-900 truncate">{title}</h1>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        <div className="relative">
          <button onClick={() => setMenuOpen(o => !o)} className="flex items-center gap-2 pl-2 pr-1 py-1 rounded-lg hover:bg-gray-100">
            <div className="w-8 h-8 rounded-full bg-violet-600 text-white flex items-center justify-center text-sm font-bold">
              {user?.username?.charAt(0)?.toUpperCase() || 'A'}
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-sm font-semibold text-gray-900 leading-tight">{user?.username || 'Admin'}</p>
              <p className="text-xs text-gray-400 leading-tight">Admin — all modules</p>
            </div>
          </button>

          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 mt-2 w-40 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-20">
                <button
                  onClick={onLogout}
                  className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 font-medium"
                >
                  Logout
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
};

export default AdminTopbar;
