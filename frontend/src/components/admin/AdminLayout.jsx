import React, { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import AdminSidebar from './AdminSidebar';
import AdminTopbar from './AdminTopbar';

const AdminLayout = ({ user, onLogout }) => {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminSidebar
        pathname={location.pathname}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />

      <div className="md:ml-64 flex flex-col min-h-screen">
        <AdminTopbar
          pathname={location.pathname}
          onToggleMobile={() => setMobileOpen(o => !o)}
          user={user}
          onLogout={onLogout}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-x-hidden">
          <Outlet />
        </main>

        <footer className="px-4 sm:px-6 py-4 text-center text-xs text-gray-400">
          © {new Date().getFullYear()} SRJ Steel Pvt. Ltd. All rights reserved.
        </footer>
      </div>
    </div>
  );
};

export default AdminLayout;
