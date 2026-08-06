import React, { useState, useEffect } from 'react';
import { userAPI } from './services/api';
// import { Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';


// Crane Maintenance Components
// import Dashboard from './components/Dashboard';
import InspectionForm from './components/InspectionForm';
import Login from './components/Login';
import CreateUser from './components/CreateUser';
import MaintenanceCalendarPage from './components/MaintenanceCalendarPage';
import ReportGenerator from './components/ReportGenerator';
import TelegramSettings from './components/TelegramSettings';

// Admin Components
import AdminLayout from './components/admin/AdminLayout';
import AdminDashboard from './components/admin/AdminDashboard';
import AdminModules from './components/admin/AdminModules';
import AdminConfig from './components/admin/AdminConfig';
import AdminDownloadReports from './components/admin/AdminDownloadReports';

// HBM Components
import HbmDashboard from './components/hbm/HbmDashboard';
import HbmMachines from './components/hbm/HbmMachines';
import HbmChecksheet from './components/hbm/HbmChecksheet';
import DcMotorForm from './components/hbm/DcMotorForm';
import DcMotorHistory from './components/hbm/DcMotorHistory';
import DcMotorView from './components/hbm/DcMotorView';
import RollingStandForm from './components/hbm/RollingStandForm';
import RollingStandHistory from './components/hbm/RollingStandHistory';
import RollingStandView from './components/hbm/RollingStandView';
import MillMechForm from './components/hbm/MillMechForm';
import MillMechHistory from './components/hbm/MillMechHistory';
import MillMechView from './components/hbm/MillMechView';
import CoolingBedForm from './components/hbm/CoolingBedForm';
import CoolingBedHistory from './components/hbm/CoolingBedHistory';
import CoolingBedView from './components/hbm/CoolingBedView';
import PumpHouseForm from './components/hbm/PumpHouseForm';
import PumpHouseHistory from './components/hbm/PumpHouseHistory';
import PumpHouseView from './components/hbm/PumpHouseView';
import DownloadChecksheet from './components/hbm/DownloadChecksheet';
import BarBundleAreaForm from './components/hbm/BarBundleAreaForm';
import BarBundleAreaHistory from './components/hbm/BarBundleAreaHistory';
import BarBundleAreaView from './components/hbm/BarBundleAreaView';
import BeforeRollingForm from './components/hbm/BeforeRollingForm';
import BeforeRollingHistory from './components/hbm/BeforeRollingHistory';
import BeforeRollingView from './components/hbm/BeforeRollingView';
import PumpParamForm from './components/hbm/PumpParamForm';
import PumpParamHistory from './components/hbm/PumpParamHistory';
import PumpParamView from './components/hbm/PumpParamView';
import WaterParamForm from './components/hbm/WaterParamForm';
import WaterParamHistory from './components/hbm/WaterParamHistory';
import WaterParamView from './components/hbm/WaterParamView';
import PhMaintForm from './components/hbm/PhMaintForm';
import PhMaintHistory from './components/hbm/PhMaintHistory';
import PhMaintView from './components/hbm/PhMaintView';
import TransformerForm from './components/hbm/TransformerForm';
import TransformerHistory from './components/hbm/TransformerHistory';
import TransformerView from './components/hbm/TransformerView';
import OilLevelForm from './components/hbm/OilLevelForm';
import OilLevelHistory from './components/hbm/OilLevelHistory';
import OilLevelView from './components/hbm/OilLevelView';
import DcMotorAirflowForm from './components/hbm/DcMotorAirflowForm';
import DcMotorAirflowHistory from './components/hbm/DcMotorAirflowHistory';
import DcMotorAirflowView from './components/hbm/DcMotorAirflowView';
import RoughingGbTempForm from './components/hbm/RoughingGbTempForm';
import RoughingGbTempHistory from './components/hbm/RoughingGbTempHistory';
import RoughingGbTempView from './components/hbm/RoughingGbTempView';
import BreakdownReportForm from './components/hbm/BreakdownReportForm';
import BreakdownReportHistory from './components/hbm/BreakdownReportHistory';
import BreakdownReportView from './components/hbm/BreakdownReportView';
import SheetViewer from './components/hbm/SheetViewer';
import HbmMonthlyInsights from './components/hbm/HbmMonthlyInsights';
import HbmMonthlyRegister from './components/hbm/HbmMonthlyRegister';

// PTM Components
import PtmDashboard from './components/ptm/PtmDashboard';
import PtmChecksheetHistory from './components/ptm/PtmChecksheetHistory';
import PtmBreakdownForm from './components/ptm/PtmBreakdownForm';
import PtmMonthlyRegister from './components/ptm/PtmMonthlyRegister';
import PtmAdminConfig from './components/ptm/PtmAdminConfig';

// HSM Components
import HsmDashboard from './components/hsm/HsmDashboard';
// import FabricationReport from "./components/fabrication/FabricationReport";
import Dashboard from "./components/Dashboard";







function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [hbmAllowedSheets, setHbmAllowedSheets] = useState(null); // null = all allowed
  const location = useLocation();

  // Close mobile menu when route changes
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location]);

  // Check for existing session on load
  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    const token = localStorage.getItem('token');

    if (savedUser && token) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (error) {
        console.error('Failed to parse saved user:', error);
        localStorage.removeItem('user');
        localStorage.removeItem('token');
      }
    }
    setLoading(false);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    window.location.href = '/login';
  };

  const handleLoginSuccess = (userData) => {
    setUser(userData);
  };

  // Fetch HBM permissions when an HBM user logs in
  useEffect(() => {
    if (!user) return;
    const loginType = user.loginType || user.user_type;
    if (loginType !== 'HBM_CHECKSHEETS') return;
    userAPI.getPermissions(user.id)
      .then(res => {
        setHbmAllowedSheets(res.data?.allowed_checksheets ?? null);
      })
      .catch(() => setHbmAllowedSheets(null));
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Determine which module the user is in
  const userLoginType = user?.loginType || user?.user_type || 'CRANE_MAINTENANCE';
  const isHBMUser = userLoginType === 'HBM_CHECKSHEETS';
  const isHSMUser = userLoginType === 'HSM_CHECKSHEETS';
  const isAdminUser = user?.role === 'ADMIN' || user?.user_type === 'ADMIN';
  const isOnHBMRoute = location.pathname.startsWith('/hbm');
  const isOnHSMRoute = location.pathname.startsWith('/hsm');
  const isOnPTMRoute = location.pathname.startsWith('/ptm');
  const isOnAdminRoute = ['/create-user', '/telegram-settings', '/fabrication', '/admin/'].some(r => location.pathname.startsWith(r));

  // Don't show nav on login page or admin routes (AdminLayout supplies its own top bar)
  const showNav = user && location.pathname !== '/login' && !isOnAdminRoute;

  // Determine default redirect after login restore
  const getDefaultRoute = () => {
    if (isAdminUser) return '/admin/dashboard';
    if (isHBMUser) return '/hbm/dashboard';
    if (isHSMUser) return '/hsm/dashboard';
    return '/';
  };

  // Returns true if current user can access a given HBM sheet key
  const canAccessSheet = (key) =>
    isAdminUser || hbmAllowedSheets === null || (Array.isArray(hbmAllowedSheets) && hbmAllowedSheets.includes(key));

  // Nav colors based on module
  const navBg        = isOnAdminRoute ? 'bg-slate-900'         : isOnHBMRoute ? 'bg-emerald-600'       : isOnHSMRoute ? 'bg-indigo-600'       : isOnPTMRoute ? 'bg-blue-700'       : 'bg-blue-600';
  const navHover     = isOnAdminRoute ? 'hover:bg-slate-700'   : isOnHBMRoute ? 'hover:bg-emerald-500'  : isOnHSMRoute ? 'hover:bg-indigo-500'  : isOnPTMRoute ? 'hover:bg-blue-600' : 'hover:bg-blue-500';
  const navActive    = isOnAdminRoute ? 'bg-slate-700'         : isOnHBMRoute ? 'bg-emerald-700'        : isOnHSMRoute ? 'bg-indigo-700'        : isOnPTMRoute ? 'bg-blue-800'       : 'bg-blue-700';
  const navBadgeBg   = isOnAdminRoute ? 'bg-violet-600'        : isOnHBMRoute ? 'bg-emerald-500'        : isOnHSMRoute ? 'bg-indigo-500'        : isOnPTMRoute ? 'bg-blue-600'       : 'bg-blue-500';
  const navBorderColor = isOnAdminRoute ? 'border-slate-700'   : isOnHBMRoute ? 'border-emerald-500'    : isOnHSMRoute ? 'border-indigo-500'    : isOnPTMRoute ? 'border-blue-600'   : 'border-blue-500';
  const navInfoBg    = isOnAdminRoute ? 'bg-slate-800'         : isOnHBMRoute ? 'bg-emerald-700'        : isOnHSMRoute ? 'bg-indigo-700'        : isOnPTMRoute ? 'bg-blue-800'       : 'bg-blue-700';
  const navInfoAvatarBg = isOnAdminRoute ? 'bg-violet-600'     : isOnHBMRoute ? 'bg-emerald-400'        : isOnHSMRoute ? 'bg-indigo-400'        : isOnPTMRoute ? 'bg-blue-500'       : 'bg-blue-400';
  const navInfoSubText = isOnAdminRoute ? 'text-slate-400'     : isOnHBMRoute ? 'text-emerald-200'      : isOnHSMRoute ? 'text-indigo-200'      : isOnPTMRoute ? 'text-blue-200'     : 'text-blue-200';

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <ToastContainer position="top-right" autoClose={3000} />

      {/* Mobile-First Navigation */}
      {showNav && (
        <nav className={`${navBg} text-white shadow-lg sticky top-0 z-50`}>
          <div className="px-4 py-3">
            <div className="flex items-center justify-between">
              {/* Logo */}
              <Link to={isOnAdminRoute ? '/create-user' : (isOnHBMRoute ? '/hbm/dashboard' : isOnHSMRoute ? '/hsm/dashboard' : isOnPTMRoute ? '/ptm/dashboard' : '/')} className="text-lg font-bold tracking-tight">
                {isOnAdminRoute ? (
                  <span className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    Admin Panel
                  </span>
                ) : isOnHBMRoute ? 'HBM Checksheets' : isOnHSMRoute ? 'HSM Checksheets' : isOnPTMRoute ? 'PTM Checksheets' : 'Crane Maintenance'}
              </Link>

              {/* Top-right controls */}
              <div className="flex items-center space-x-1">
                {/* Monthly Insights Icon (HBM + Admin only) */}
                {/* Maintenance Calendar icon — Crane route only */}
                {!isOnHBMRoute && !isOnHSMRoute && !isOnAdminRoute && !isOnPTMRoute && (
                  <Link
                    to="/maintenance-calendar"
                    title="Maintenance Calendar"
                    className={`p-2 rounded-lg ${navHover} ${location.pathname === '/maintenance-calendar' ? navActive : ''}`}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </Link>
                )}

                {/* New Inspection icon — Crane route only */}
                {!isOnHBMRoute && !isOnHSMRoute && !isOnAdminRoute && !isOnPTMRoute && (
                  <Link
                    to="/new-inspection"
                    title="New Inspection"
                    className={`p-2 rounded-lg ${navHover} ${location.pathname === '/new-inspection' ? navActive : ''}`}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                    </svg>
                  </Link>
                )}

                {/* Download / Reports icon — Crane route only */}
                {!isOnHBMRoute && !isOnHSMRoute && !isOnAdminRoute && !isOnPTMRoute && (
                  <Link
                    to="/reports"
                    title="Reports & Download"
                    className={`p-2 rounded-lg ${navHover} ${location.pathname === '/reports' ? navActive : ''}`}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                  </Link>
                )}

                {/* Admin Panel icon — HBM/HSM route, admin only */}
                {(isOnHBMRoute || isOnHSMRoute || isOnPTMRoute) && isAdminUser && (
                  <Link
                    to="/create-user"
                    title="Admin Panel"
                    className="p-2 rounded-lg text-violet-300 hover:text-white hover:bg-violet-700 transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </Link>
                )}

                {/* User Badge */}
                <div className={`text-xs ${navBadgeBg} px-2 py-1 rounded font-medium`}>
                  {isOnAdminRoute ? 'Admin' : (isOnHBMRoute ? 'HBM' : (isOnHSMRoute ? 'HSM' : (isOnPTMRoute ? 'PTM' : (user?.role === 'ADMIN' ? 'Admin' : 'Operator'))))}
                </div>

                {/* Logout Icon (always visible) */}
                <button
                  onClick={handleLogout}
                  title="Logout"
                  className="p-2 rounded-lg text-red-300 hover:text-white hover:bg-red-600 transition-colors focus:outline-none"
                  aria-label="Logout"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                </button>

                {/* Hamburger — Admin always, others on admin route */}
                {(isOnAdminRoute || isAdminUser) && (
                  <button
                    onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                    className={`p-2 rounded-lg ${navHover} focus:outline-none focus:ring-2 focus:ring-white/30`}
                    aria-label="Toggle menu"
                  >
                    {mobileMenuOpen ? (
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    ) : (
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                      </svg>
                    )}
                  </button>
                )}
              </div>
            </div>

            {/* Mobile Menu Dropdown */}
            {mobileMenuOpen && (
              <div className={`mt-3 pt-3 border-t ${navBorderColor}`}>
                {/* User Info */}
                <div className={`px-2 py-3 ${navInfoBg} rounded-lg mb-3`}>
                  <div className="flex items-center space-x-3">
                    <div className={`w-10 h-10 ${navInfoAvatarBg} rounded-full flex items-center justify-center text-lg font-bold`}>
                      {user?.username?.charAt(0)?.toUpperCase() || 'U'}
                    </div>
                    <div>
                      <p className="font-semibold">{user?.username || 'User'}</p>
                      <p className={`text-xs ${navInfoSubText}`}>
                        {user?.role} | {isOnAdminRoute ? 'Admin Panel' : (isOnHBMRoute ? 'HBM Module' : (isOnHSMRoute ? 'HSM Module' : (isOnPTMRoute ? 'PTM Module' : 'Crane Module')))}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Navigation Links */}
                <div className="space-y-1">
                  {isOnAdminRoute ? (
                    /* ========== ADMIN NAVIGATION ========== */
                    <>
                      <p className="px-3 pt-1 pb-1 text-xs font-semibold text-slate-400 uppercase tracking-widest">Management</p>

                      <Link
                        to="/create-user"
                        className={`flex items-center space-x-3 px-3 py-3 rounded-lg transition-colors ${location.pathname === '/create-user' ? 'bg-violet-700 text-white' : 'hover:bg-slate-700'}`}
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span className="font-medium">User Management</span>
                      </Link>

                      <Link
                        to="/telegram-settings"
                        className={`flex items-center space-x-3 px-3 py-3 rounded-lg transition-colors ${location.pathname === '/telegram-settings' ? 'bg-violet-700 text-white' : 'hover:bg-slate-700'}`}
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                        </svg>
                        <span className="font-medium">Telegram Alerts</span>
                      </Link>

                      <Link
                        to="/fabrication"
                        className={`flex items-center space-x-3 px-3 py-3 rounded-lg transition-colors ${location.pathname === '/fabrication' ? 'bg-violet-700 text-white' : 'hover:bg-slate-700'}`}
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <span className="font-medium">Fabrication</span>
                      </Link>

                      <div className="border-t border-slate-700 my-2" />
                      <p className="px-3 pb-1 text-xs font-semibold text-slate-400 uppercase tracking-widest">Switch Module</p>

                      <Link
                        to="/"
                        className="flex items-center space-x-3 px-3 py-3 rounded-lg transition-colors bg-blue-700 hover:bg-blue-600 text-white"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                        </svg>
                        <span className="font-medium">Crane Maintenance</span>
                      </Link>

                      <Link
                        to="/hbm/dashboard"
                        className="flex items-center space-x-3 px-3 py-3 rounded-lg transition-colors bg-emerald-700 hover:bg-emerald-600 text-white"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                        <span className="font-medium">HBM Checksheets</span>
                      </Link>

                      <Link
                        to="/hsm/dashboard"
                        className="flex items-center space-x-3 px-3 py-3 rounded-lg transition-colors bg-indigo-700 hover:bg-indigo-600 text-white"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                        <span className="font-medium">HSM Checksheets</span>
                      </Link>
                      <Link
                        to="/ptm/dashboard"
                        className="flex items-center space-x-3 px-3 py-3 rounded-lg transition-colors bg-blue-700 hover:bg-blue-600 text-white"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                        <span className="font-medium">PTM Checksheets</span>
                      </Link>
                    </>
                  ) : isOnHBMRoute ? (
                    /* ========== HBM NAVIGATION ========== */
                    <>
                      <Link
                        to="/hbm/dashboard"
                        className={`flex items-center space-x-3 px-3 py-3 rounded-lg transition-colors ${location.pathname === '/hbm/dashboard' ? navActive + ' text-white' : navHover}`}
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                        </svg>
                        <span className="font-medium">Dashboard</span>
                      </Link>

                      {isAdminUser && (
                        <>
                          <div className="border-t border-emerald-700 my-1" />
                          <Link
                            to="/admin/dashboard"
                            className="flex items-center space-x-3 px-3 py-3 rounded-lg transition-colors bg-slate-700 hover:bg-slate-600 text-white"
                          >
                            <svg className="w-5 h-5 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                            </svg>
                            <span className="font-medium">Admin Panel</span>
                          </Link>
                        </>
                      )}
                    </>
                  ) : isOnHSMRoute ? (
                    /* ========== HSM NAVIGATION ========== */
                    <>
                      <Link
                        to="/hsm/dashboard"
                        className={`flex items-center space-x-3 px-3 py-3 rounded-lg transition-colors ${location.pathname === '/hsm/dashboard' ? navActive + ' text-white' : navHover}`}
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                        </svg>
                        <span className="font-medium">Dashboard</span>
                      </Link>

                      {isAdminUser && (
                        <>
                          <div className="border-t border-indigo-700 my-1" />
                          <Link
                            to="/create-user"
                            className="flex items-center space-x-3 px-3 py-3 rounded-lg transition-colors bg-slate-700 hover:bg-slate-600 text-white"
                          >
                            <svg className="w-5 h-5 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                            </svg>
                            <span className="font-medium">Admin Panel</span>
                          </Link>
                        </>
                      )}
                    </>
                  ) : isOnPTMRoute ? (
                    /* ========== PTM NAVIGATION ========== */
                    <>
                      <Link to="/ptm/dashboard" className={`flex items-center space-x-3 px-3 py-3 rounded-lg transition-colors ${location.pathname === '/ptm/dashboard' ? navActive + ' text-white' : navHover}`}>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
                        <span className="font-medium">Dashboard</span>
                      </Link>
                      <Link to="/ptm/checksheet/history" className={`flex items-center space-x-3 px-3 py-3 rounded-lg transition-colors ${location.pathname === '/ptm/checksheet/history' ? navActive + ' text-white' : navHover}`}>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                        <span className="font-medium">History</span>
                      </Link>
                      <Link to="/ptm/breakdown/new" className={`flex items-center space-x-3 px-3 py-3 rounded-lg transition-colors ${location.pathname === '/ptm/breakdown/new' ? navActive + ' text-white' : navHover}`}>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M5.07 19H19a2 2 0 001.75-2.96l-7-12a2 2 0 00-3.5 0l-7 12A2 2 0 005.07 19z" /></svg>
                        <span className="font-medium">Breakdown Report</span>
                      </Link>
                      <Link to="/ptm/monthly-register" className={`flex items-center space-x-3 px-3 py-3 rounded-lg transition-colors ${location.pathname === '/ptm/monthly-register' ? navActive + ' text-white' : navHover}`}>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 6h18M3 14h18M3 18h18" /></svg>
                        <span className="font-medium">Monthly Register</span>
                      </Link>
                      {isAdminUser && (
                        <>
                          <Link to="/ptm/admin/config" className={`flex items-center space-x-3 px-3 py-3 rounded-lg transition-colors ${location.pathname === '/ptm/admin/config' ? navActive + ' text-white' : navHover}`}>
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" /></svg>
                            <span className="font-medium">Admin — Config</span>
                          </Link>
                          <div className="border-t border-blue-600 my-1" />
                          <Link to="/create-user" className="flex items-center space-x-3 px-3 py-3 rounded-lg transition-colors bg-slate-700 hover:bg-slate-600 text-white">
                            <svg className="w-5 h-5 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                            <span className="font-medium">Admin Panel</span>
                          </Link>
                        </>
                      )}
                    </>
                  ) : (
                    /* ========== CRANE MAINTENANCE NAVIGATION ========== */
                    <>
                      <Link
                        to="/"
                        className={`flex items-center space-x-3 px-3 py-3 rounded-lg transition-colors ${location.pathname === '/' ? navActive + ' text-white' : navHover}`}
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                        </svg>
                        <span className="font-medium">Dashboard</span>
                      </Link>

                      <Link
                        to="/new-inspection"
                        className={`flex items-center space-x-3 px-3 py-3 rounded-lg transition-colors ${location.pathname === '/new-inspection' ? navActive + ' text-white' : navHover}`}
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                        </svg>
                        <span className="font-medium">New Inspection</span>
                      </Link>

                      <Link
                        to="/maintenance-calendar"
                        className={`flex items-center space-x-3 px-3 py-3 rounded-lg transition-colors ${location.pathname === '/maintenance-calendar' ? navActive + ' text-white' : navHover}`}
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span className="font-medium">Maintenance Calendar</span>
                      </Link>

                      <Link
                        to="/reports"
                        className={`flex items-center space-x-3 px-3 py-3 rounded-lg transition-colors ${location.pathname === '/reports' ? navActive + ' text-white' : navHover}`}
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <span className="font-medium">Reports</span>
                      </Link>

                      {isAdminUser && (
                        <>
                          <div className="border-t border-blue-500 my-1" />
                          <p className="px-3 pb-1 text-xs font-semibold text-blue-200 uppercase tracking-widest">Switch Module</p>
                          <Link
                            to="/hbm/dashboard"
                            className="flex items-center space-x-3 px-3 py-3 rounded-lg transition-colors bg-emerald-700 hover:bg-emerald-600 text-white"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                            </svg>
                            <span className="font-medium">HBM Checksheets</span>
                          </Link>
                          <Link
                            to="/hsm/dashboard"
                            className="flex items-center space-x-3 px-3 py-3 rounded-lg transition-colors bg-indigo-700 hover:bg-indigo-600 text-white"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                            </svg>
                            <span className="font-medium">HSM Checksheets</span>
                          </Link>
                          <Link
                            to="/ptm/dashboard"
                            className="flex items-center space-x-3 px-3 py-3 rounded-lg transition-colors bg-blue-700 hover:bg-blue-600 text-white"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                            </svg>
                            <span className="font-medium">PTM Checksheets</span>
                          </Link>
                          <Link
                            to="/create-user"
                            className="flex items-center space-x-3 px-3 py-3 rounded-lg transition-colors bg-slate-700 hover:bg-slate-600 text-white"
                          >
                            <svg className="w-5 h-5 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                            </svg>
                            <span className="font-medium">Admin Panel</span>
                          </Link>
                        </>
                      )}
                    </>
                  )}
                </div>

                {/* Logout Button */}
                <div className={`mt-3 pt-3 border-t ${navBorderColor}`}>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-white text-red-600 rounded-lg font-semibold hover:bg-red-50 transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    <span>Logout</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </nav>
      )}

      {/* Main Content */}
      <main className="flex-grow">
        <Routes>
          {/* Public Route - Login */}
          <Route
            path="/login"
            element={
              !user ? (
                <Login onLoginSuccess={handleLoginSuccess} />
              ) : (
                <Navigate to={getDefaultRoute()} replace />
              )
            }
          />

          {/* ========== CRANE MAINTENANCE ROUTES ========== */}
          <Route
            path="/"
            element={
              !user ? <Navigate to="/login" replace />
              : <Dashboard />
            }
          />

          <Route
            path="/new-inspection"
            element={user ? <InspectionForm /> : <Navigate to="/login" replace />}
          />

          <Route
            path="/maintenance-calendar"
            element={user ? <MaintenanceCalendarPage /> : <Navigate to="/login" replace />}
          />

          <Route
            path="/reports"
            element={user ? <ReportGenerator /> : <Navigate to="/login" replace />}
          />

          {/* Admin Only Routes — sidebar shell layout */}
          <Route element={<AdminLayout user={user} onLogout={handleLogout} />}>
            <Route
              path="/admin/dashboard"
              element={user && isAdminUser ? <AdminDashboard /> : user ? <Navigate to="/" replace /> : <Navigate to="/login" replace />}
            />
            <Route
              path="/admin/modules"
              element={user && isAdminUser ? <AdminModules /> : user ? <Navigate to="/" replace /> : <Navigate to="/login" replace />}
            />
            <Route
              path="/admin/users"
              element={user && isAdminUser ? <CreateUser user={user} /> : user ? <Navigate to="/" replace /> : <Navigate to="/login" replace />}
            />
            <Route
              path="/admin/share-access"
              element={user && isAdminUser ? <AdminConfig /> : user ? <Navigate to="/" replace /> : <Navigate to="/login" replace />}
            />
            <Route
              path="/admin/download-reports"
              element={user && isAdminUser ? <AdminDownloadReports /> : user ? <Navigate to="/" replace /> : <Navigate to="/login" replace />}
            />
            <Route
              path="/admin/telegram"
              element={user && isAdminUser ? <TelegramSettings /> : user ? <Navigate to="/" replace /> : <Navigate to="/login" replace />}
            />
            {/* Legacy aliases → new Admin IA */}
            <Route path="/admin/config" element={<Navigate to="/admin/share-access" replace />} />
            <Route
              path="/create-user"
              element={user && isAdminUser ? <CreateUser user={user} /> : user ? <Navigate to="/" replace /> : <Navigate to="/login" replace />}
            />
            <Route
              path="/telegram-settings"
              element={user && isAdminUser ? <TelegramSettings /> : user ? <Navigate to="/" replace /> : <Navigate to="/login" replace />}
            />
            <Route path="/fabrication" element={<Navigate to="/admin/dashboard" replace />} />
          </Route>

          {/* ========== HBM ROUTES ========== */}

          <Route
            path="/hbm/dashboard"
            element={
              user && (isHBMUser || isAdminUser) ? (
                <HbmDashboard allowedSheets={isAdminUser ? null : hbmAllowedSheets} />
              ) : user ? (
                <Navigate to="/" replace />
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />


          <Route
            path="/hbm/machines"
            element={
              user && (isHBMUser || isAdminUser) ? (
                <HbmMachines />
              ) : user ? (
                <Navigate to="/" replace />
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />

          <Route path="/hbm/dc-motor/new" element={user ? (isHBMUser || isAdminUser) && canAccessSheet('dc-motor') ? <DcMotorForm /> : <Navigate to="/hbm/dashboard" replace /> : <Navigate to="/login" replace />} />
          <Route path="/hbm/dc-motor/history" element={user ? (isHBMUser || isAdminUser) && canAccessSheet('dc-motor') ? <DcMotorHistory /> : <Navigate to="/hbm/dashboard" replace /> : <Navigate to="/login" replace />} />
          <Route path="/hbm/dc-motor/:id" element={user ? (isHBMUser || isAdminUser) && canAccessSheet('dc-motor') ? <DcMotorView /> : <Navigate to="/hbm/dashboard" replace /> : <Navigate to="/login" replace />} />



          <Route
            path="/hbm/checksheets/:id"
            element={
              user && (isHBMUser || isAdminUser) ? (
                <HbmChecksheet />
              ) : user ? (
                <Navigate to="/" replace />
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />


          <Route path="/hbm/rolling-stand/new" element={user ? (isHBMUser || isAdminUser) && canAccessSheet('rolling-stand') ? <RollingStandForm /> : <Navigate to="/hbm/dashboard" replace /> : <Navigate to="/login" replace />} />
          <Route path="/hbm/rolling-stand/history" element={user ? (isHBMUser || isAdminUser) && canAccessSheet('rolling-stand') ? <RollingStandHistory /> : <Navigate to="/hbm/dashboard" replace /> : <Navigate to="/login" replace />} />
          <Route path="/hbm/rolling-stand/:id" element={user ? (isHBMUser || isAdminUser) && canAccessSheet('rolling-stand') ? <RollingStandView /> : <Navigate to="/hbm/dashboard" replace /> : <Navigate to="/login" replace />} />

          <Route path="/hbm/cooling-bed/new" element={user ? (isHBMUser || isAdminUser) && canAccessSheet('cooling-bed') ? <CoolingBedForm /> : <Navigate to="/hbm/dashboard" replace /> : <Navigate to="/login" replace />} />
          <Route path="/hbm/cooling-bed/history" element={user ? (isHBMUser || isAdminUser) && canAccessSheet('cooling-bed') ? <CoolingBedHistory /> : <Navigate to="/hbm/dashboard" replace /> : <Navigate to="/login" replace />} />
          <Route path="/hbm/cooling-bed/:id" element={user ? (isHBMUser || isAdminUser) && canAccessSheet('cooling-bed') ? <CoolingBedView /> : <Navigate to="/hbm/dashboard" replace /> : <Navigate to="/login" replace />} />

          <Route path="/hbm/mill-mech/new" element={user ? (isHBMUser || isAdminUser) && canAccessSheet('mill-mech') ? <MillMechForm /> : <Navigate to="/hbm/dashboard" replace /> : <Navigate to="/login" replace />} />
          <Route path="/hbm/mill-mech/history" element={user ? (isHBMUser || isAdminUser) && canAccessSheet('mill-mech') ? <MillMechHistory /> : <Navigate to="/hbm/dashboard" replace /> : <Navigate to="/login" replace />} />
          <Route path="/hbm/mill-mech/:id" element={user ? (isHBMUser || isAdminUser) && canAccessSheet('mill-mech') ? <MillMechView /> : <Navigate to="/hbm/dashboard" replace /> : <Navigate to="/login" replace />} />

          <Route path="/hbm/pumphouse/new" element={user ? (isHBMUser || isAdminUser) && canAccessSheet('pumphouse') ? <PumpHouseForm /> : <Navigate to="/hbm/dashboard" replace /> : <Navigate to="/login" replace />} />
          <Route path="/hbm/pumphouse/history" element={user ? (isHBMUser || isAdminUser) && canAccessSheet('pumphouse') ? <PumpHouseHistory /> : <Navigate to="/hbm/dashboard" replace /> : <Navigate to="/login" replace />} />
          <Route path="/hbm/pumphouse/:id" element={user ? (isHBMUser || isAdminUser) && canAccessSheet('pumphouse') ? <PumpHouseView /> : <Navigate to="/hbm/dashboard" replace /> : <Navigate to="/login" replace />} />

          <Route
            path="/hbm/download"
            element={
              user && (isHBMUser || isAdminUser) ? (
                <DownloadChecksheet allowedSheets={isAdminUser ? null : hbmAllowedSheets} />
              ) : user ? (
                <Navigate to="/" replace />
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />

          <Route path="/hbm/bar-bundle/new" element={user ? (isHBMUser || isAdminUser) && canAccessSheet('bar-bundle') ? <BarBundleAreaForm /> : <Navigate to="/hbm/dashboard" replace /> : <Navigate to="/login" replace />} />
          <Route path="/hbm/bar-bundle/history" element={user ? (isHBMUser || isAdminUser) && canAccessSheet('bar-bundle') ? <BarBundleAreaHistory /> : <Navigate to="/hbm/dashboard" replace /> : <Navigate to="/login" replace />} />
          <Route path="/hbm/bar-bundle/:id" element={user ? (isHBMUser || isAdminUser) && canAccessSheet('bar-bundle') ? <BarBundleAreaView /> : <Navigate to="/hbm/dashboard" replace /> : <Navigate to="/login" replace />} />

          <Route path="/hbm/before-rolling/new" element={user ? (isHBMUser || isAdminUser) && canAccessSheet('before-rolling') ? <BeforeRollingForm /> : <Navigate to="/hbm/dashboard" replace /> : <Navigate to="/login" replace />} />
          <Route path="/hbm/before-rolling/history" element={user ? (isHBMUser || isAdminUser) && canAccessSheet('before-rolling') ? <BeforeRollingHistory /> : <Navigate to="/hbm/dashboard" replace /> : <Navigate to="/login" replace />} />
          <Route path="/hbm/before-rolling/:id" element={user ? (isHBMUser || isAdminUser) && canAccessSheet('before-rolling') ? <BeforeRollingView /> : <Navigate to="/hbm/dashboard" replace /> : <Navigate to="/login" replace />} />

          <Route path="/hbm/pump-param/new" element={user ? (isHBMUser || isAdminUser) && canAccessSheet('pump-param') ? <PumpParamForm /> : <Navigate to="/hbm/dashboard" replace /> : <Navigate to="/login" replace />} />
          <Route path="/hbm/pump-param/history" element={user ? (isHBMUser || isAdminUser) && canAccessSheet('pump-param') ? <PumpParamHistory /> : <Navigate to="/hbm/dashboard" replace /> : <Navigate to="/login" replace />} />
          <Route path="/hbm/pump-param/:id" element={user ? (isHBMUser || isAdminUser) && canAccessSheet('pump-param') ? <PumpParamView /> : <Navigate to="/hbm/dashboard" replace /> : <Navigate to="/login" replace />} />

          <Route path="/hbm/water-param/new" element={user ? (isHBMUser || isAdminUser) && canAccessSheet('water-param') ? <WaterParamForm /> : <Navigate to="/hbm/dashboard" replace /> : <Navigate to="/login" replace />} />
          <Route path="/hbm/water-param/history" element={user ? (isHBMUser || isAdminUser) && canAccessSheet('water-param') ? <WaterParamHistory /> : <Navigate to="/hbm/dashboard" replace /> : <Navigate to="/login" replace />} />
          <Route path="/hbm/water-param/:id" element={user ? (isHBMUser || isAdminUser) && canAccessSheet('water-param') ? <WaterParamView /> : <Navigate to="/hbm/dashboard" replace /> : <Navigate to="/login" replace />} />

          <Route path="/hbm/ph-maint/new" element={user ? (isHBMUser || isAdminUser) && canAccessSheet('ph-maint') ? <PhMaintForm /> : <Navigate to="/hbm/dashboard" replace /> : <Navigate to="/login" replace />} />
          <Route path="/hbm/ph-maint/history" element={user ? (isHBMUser || isAdminUser) && canAccessSheet('ph-maint') ? <PhMaintHistory /> : <Navigate to="/hbm/dashboard" replace /> : <Navigate to="/login" replace />} />
          <Route path="/hbm/ph-maint/:id" element={user ? (isHBMUser || isAdminUser) && canAccessSheet('ph-maint') ? <PhMaintView /> : <Navigate to="/hbm/dashboard" replace /> : <Navigate to="/login" replace />} />

          <Route path="/hbm/transformer/new" element={user ? (isHBMUser || isAdminUser) && canAccessSheet('transformer') ? <TransformerForm /> : <Navigate to="/hbm/dashboard" replace /> : <Navigate to="/login" replace />} />
          <Route path="/hbm/transformer/history" element={user ? (isHBMUser || isAdminUser) && canAccessSheet('transformer') ? <TransformerHistory /> : <Navigate to="/hbm/dashboard" replace /> : <Navigate to="/login" replace />} />
          <Route path="/hbm/transformer/:id" element={user ? (isHBMUser || isAdminUser) && canAccessSheet('transformer') ? <TransformerView /> : <Navigate to="/hbm/dashboard" replace /> : <Navigate to="/login" replace />} />

          <Route path="/hbm/oil-level/new" element={user ? (isHBMUser || isAdminUser) && canAccessSheet('oil-level') ? <OilLevelForm /> : <Navigate to="/hbm/dashboard" replace /> : <Navigate to="/login" replace />} />
          <Route path="/hbm/oil-level/history" element={user ? (isHBMUser || isAdminUser) && canAccessSheet('oil-level') ? <OilLevelHistory /> : <Navigate to="/hbm/dashboard" replace /> : <Navigate to="/login" replace />} />
          <Route path="/hbm/oil-level/:id" element={user ? (isHBMUser || isAdminUser) && canAccessSheet('oil-level') ? <OilLevelView /> : <Navigate to="/hbm/dashboard" replace /> : <Navigate to="/login" replace />} />

          <Route path="/hbm/dc-motor-airflow/new" element={user ? (isHBMUser || isAdminUser) && canAccessSheet('dc-motor-airflow') ? <DcMotorAirflowForm /> : <Navigate to="/hbm/dashboard" replace /> : <Navigate to="/login" replace />} />
          <Route path="/hbm/dc-motor-airflow/history" element={user ? (isHBMUser || isAdminUser) && canAccessSheet('dc-motor-airflow') ? <DcMotorAirflowHistory /> : <Navigate to="/hbm/dashboard" replace /> : <Navigate to="/login" replace />} />
          <Route path="/hbm/dc-motor-airflow/:id" element={user ? (isHBMUser || isAdminUser) && canAccessSheet('dc-motor-airflow') ? <DcMotorAirflowView /> : <Navigate to="/hbm/dashboard" replace /> : <Navigate to="/login" replace />} />

          <Route path="/hbm/roughing-gb-temp/new" element={user ? (isHBMUser || isAdminUser) && canAccessSheet('roughing-gb-temp') ? <RoughingGbTempForm /> : <Navigate to="/hbm/dashboard" replace /> : <Navigate to="/login" replace />} />
          <Route path="/hbm/roughing-gb-temp/history" element={user ? (isHBMUser || isAdminUser) && canAccessSheet('roughing-gb-temp') ? <RoughingGbTempHistory /> : <Navigate to="/hbm/dashboard" replace /> : <Navigate to="/login" replace />} />
          <Route path="/hbm/roughing-gb-temp/:id" element={user ? (isHBMUser || isAdminUser) && canAccessSheet('roughing-gb-temp') ? <RoughingGbTempView /> : <Navigate to="/hbm/dashboard" replace /> : <Navigate to="/login" replace />} />

          <Route path="/hbm/breakdown/new" element={user ? (isHBMUser || isAdminUser) && canAccessSheet('breakdown') ? <BreakdownReportForm /> : <Navigate to="/hbm/dashboard" replace /> : <Navigate to="/login" replace />} />
          <Route path="/hbm/breakdown/history" element={user ? (isHBMUser || isAdminUser) && canAccessSheet('breakdown') ? <BreakdownReportHistory /> : <Navigate to="/hbm/dashboard" replace /> : <Navigate to="/login" replace />} />
          <Route path="/hbm/breakdown/:id" element={user ? (isHBMUser || isAdminUser) && canAccessSheet('breakdown') ? <BreakdownReportView /> : <Navigate to="/hbm/dashboard" replace /> : <Navigate to="/login" replace />} />
          <Route path="/hbm/sheet-viewer" element={user ? isAdminUser ? <SheetViewer /> : <Navigate to="/hbm/dashboard" replace /> : <Navigate to="/login" replace />} />
          <Route path="/hbm/monthly-insights" element={user ? (isHBMUser || isAdminUser) ? <HbmMonthlyInsights allowedSheets={isAdminUser ? null : hbmAllowedSheets} /> : <Navigate to="/hbm/dashboard" replace /> : <Navigate to="/login" replace />} />
          <Route path="/hbm/monthly-register" element={user ? (isHBMUser || isAdminUser) ? <HbmMonthlyRegister allowedSheets={isAdminUser ? null : hbmAllowedSheets} /> : <Navigate to="/hbm/dashboard" replace /> : <Navigate to="/login" replace />} />

          {/* ========== HSM ROUTES ========== */}

          <Route
            path="/hsm/dashboard"
            element={
              user && (isHSMUser || isAdminUser) ? (
                <HsmDashboard />
              ) : user ? (
                <Navigate to="/" replace />
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />

          {/* ========== PTM ROUTES ========== */}
          <Route
            path="/ptm/dashboard"
            element={user && isAdminUser ? <PtmDashboard /> : user ? <Navigate to="/" replace /> : <Navigate to="/login" replace />}
          />
          <Route
            path="/ptm/checksheet/history"
            element={user && isAdminUser ? <PtmChecksheetHistory /> : user ? <Navigate to="/" replace /> : <Navigate to="/login" replace />}
          />
          <Route
            path="/ptm/breakdown/new"
            element={user && isAdminUser ? <PtmBreakdownForm /> : user ? <Navigate to="/" replace /> : <Navigate to="/login" replace />}
          />
          <Route
            path="/ptm/monthly-register"
            element={user && isAdminUser ? <PtmMonthlyRegister /> : user ? <Navigate to="/" replace /> : <Navigate to="/login" replace />}
          />
          <Route
            path="/ptm/admin/config"
            element={user && isAdminUser ? <PtmAdminConfig /> : user ? <Navigate to="/" replace /> : <Navigate to="/login" replace />}
          />

          {/* Catch all - redirect to appropriate home or login */}
          <Route path="*" element={<Navigate to={user ? getDefaultRoute() : '/login'} replace />} />
        </Routes>
      </main>

      {/* Footer - Only show on dashboard pages */}
      {showNav && (location.pathname === '/' || location.pathname === '/hbm/dashboard' || location.pathname === '/hsm/dashboard' || location.pathname === '/ptm/dashboard') && (
        <footer className="bg-gray-800 text-white py-4">
          <div className="px-4 text-center">
            <p className="text-xs text-gray-400">
              {isOnHBMRoute
                ? 'HBM Checksheet System | SRJ Strips and Pipes Pvt Ltd'
                : isOnHSMRoute
                ? 'HSM Checksheet System | SRJ Strips and Pipes Pvt Ltd'
                : isOnPTMRoute
                ? 'PTM Checksheet System | SRJ Strips and Pipes Pvt Ltd'
                : 'Crane Maintenance System | Department-Based Access Control'
              }
            </p>
          </div>

        </footer>
      )}
    </div>
  );
}

export default App;
