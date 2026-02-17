import React, { useState, useEffect } from 'react';
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

// HBM Components
import HbmDashboard from './components/hbm/HbmDashboard';
import HbmMachines from './components/hbm/HbmMachines';
import HbmChecksheet from './components/hbm/HbmChecksheet';
import DcMotorForm from './components/hbm/DcMotorForm';
import PumpHouseForm from './components/pumphouse/PumpHouseForm';
// import FabricationReport from "./components/fabrication/FabricationReport";
// import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import FabricationReport from "./components/fabrication/FabricationReport";
import Dashboard from "./components/Dashboard";







function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
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
  const isAdminUser = user?.role === 'ADMIN' || user?.user_type === 'ADMIN';
  const isOnHBMRoute = location.pathname.startsWith('/hbm');

  // Don't show nav on login page
  const showNav = user && location.pathname !== '/login';

  // Determine default redirect after login restore
  const getDefaultRoute = () => {
    if (isHBMUser) return '/hbm/dashboard';
    return '/';
  };

  // Nav colors based on module
  const navBg = isOnHBMRoute ? 'bg-emerald-600' : 'bg-blue-600';
  const navHover = isOnHBMRoute ? 'hover:bg-emerald-500' : 'hover:bg-blue-500';
  const navActive = isOnHBMRoute ? 'bg-emerald-700' : 'bg-blue-700';
  const navBadgeBg = isOnHBMRoute ? 'bg-emerald-500' : 'bg-blue-500';
  const navBorderColor = isOnHBMRoute ? 'border-emerald-500' : 'border-blue-500';
  const navInfoBg = isOnHBMRoute ? 'bg-emerald-700' : 'bg-blue-700';
  const navInfoAvatarBg = isOnHBMRoute ? 'bg-emerald-400' : 'bg-blue-400';
  const navInfoSubText = isOnHBMRoute ? 'text-emerald-200' : 'text-blue-200';

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <ToastContainer position="top-right" autoClose={3000} />

      {/* Mobile-First Navigation */}
      {showNav && (
        <nav className={`${navBg} text-white shadow-lg sticky top-0 z-50`}>
          <div className="px-4 py-3">
            <div className="flex items-center justify-between">
              {/* Logo */}
              <Link to={isOnHBMRoute ? '/hbm/dashboard' : '/'} className="text-lg font-bold">
                {isOnHBMRoute ? 'HBM Checksheets' : 'Crane Maintenance'}
              </Link>

              {/* Mobile: User Avatar & Menu Toggle */}
              <div className="flex items-center space-x-2">
                {/* User Badge */}
                <div className={`text-xs ${navBadgeBg} px-2 py-1 rounded`}>
                  {isOnHBMRoute ? 'HBM' : (user?.role === 'ADMIN' ? 'Admin' : 'Operator')}
                </div>

                {/* Hamburger Menu Button */}
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
                        {user?.role} | {isOnHBMRoute ? 'HBM Module' : 'Crane Module'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Navigation Links */}
                <div className="space-y-1">
                  {isOnHBMRoute ? (
                    /* ========== HBM NAVIGATION ========== */
                    <>
                      <Link
                        to="/hbm/dashboard"
                        className={`flex items-center space-x-3 px-3 py-3 rounded-lg transition-colors ${location.pathname === '/hbm/dashboard' ? navActive + ' text-white' : navHover
                          }`}
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                        </svg>
                        <span className="font-medium">Dashboard</span>
                      </Link>

                      <Link
                        to="/hbm/machines"
                        className={`flex items-center space-x-3 px-3 py-3 rounded-lg transition-colors ${location.pathname === '/hbm/machines' ? navActive + ' text-white' : navHover
                          }`}
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span className="font-medium">Machines</span>
                      </Link>

                      <Link
                        to="/hbm/checksheets/new"
                        className={`flex items-center space-x-3 px-3 py-3 rounded-lg transition-colors ${location.pathname === '/hbm/checksheets/new' ? navActive + ' text-white' : navHover
                          }`}
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        <span className="font-medium">New Checksheet</span>
                      </Link>
                    </>
                  ) : (
                    /* ========== CRANE MAINTENANCE NAVIGATION ========== */
                    <>
                      <Link
                        to="/"
                        className={`flex items-center space-x-3 px-3 py-3 rounded-lg transition-colors ${location.pathname === '/' ? navActive + ' text-white' : navHover
                          }`}
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                        </svg>
                        <span className="font-medium">Dashboard</span>
                      </Link>

                      <Link
                        to="/new-inspection"
                        className={`flex items-center space-x-3 px-3 py-3 rounded-lg transition-colors ${location.pathname === '/new-inspection' ? navActive + ' text-white' : navHover
                          }`}
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                        </svg>
                        <span className="font-medium">New Inspection</span>
                      </Link>

                      <Link
                        to="/maintenance-calendar"
                        className={`flex items-center space-x-3 px-3 py-3 rounded-lg transition-colors ${location.pathname === '/maintenance-calendar' ? navActive + ' text-white' : navHover
                          }`}
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span className="font-medium">Maintenance Calendar</span>
                      </Link>

                      <Link
                        to="/reports"
                        className={`flex items-center space-x-3 px-3 py-3 rounded-lg transition-colors ${location.pathname === '/reports' ? navActive + ' text-white' : navHover
                          }`}
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <span className="font-medium">Reports</span>
                      </Link>

                      {user?.role === 'ADMIN' && (
                        <Link
                          to="/create-user"
                          className={`flex items-center space-x-3 px-3 py-3 rounded-lg transition-colors ${location.pathname === '/create-user' ? navActive + ' text-white' : navHover
                            }`}
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                          </svg>
                          <span className="font-medium">Create User</span>
                        </Link>
                      )}
                      {user?.role === 'ADMIN' && (
                        <Link
                          to="/fabrication"
                          className={`flex items-center space-x-3 px-3 py-3 rounded-lg transition-colors ${location.pathname === '/fabrication'
                              ? navActive + ' text-white'
                              : navHover
                            }`}
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6" />
                          </svg>
                          <span className="font-medium">Fabrication</span>
                        </Link>
                      )}

                      {user?.role === 'ADMIN' && (
                        <Link
                          to="/telegram-settings"
                          className={`flex items-center space-x-3 px-3 py-3 rounded-lg transition-colors ${location.pathname === '/telegram-settings' ? navActive + ' text-white' : navHover
                            }`}
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                          </svg>
                          <span className="font-medium">Telegram Alerts</span>
                        </Link>
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
            element={user ? <Dashboard /> : <Navigate to="/login" replace />}
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

          {/* Admin Only Routes */}
          <Route
            path="/create-user"
            element={
              user && (user.role === 'ADMIN' || user.user_type === 'ADMIN') ? (
                <CreateUser user={user} />
              ) : (
                <Navigate to="/" replace />
              )
            }
          />

          <Route
            path="/telegram-settings"
            element={
              user && user.role === 'ADMIN' ? (
                <TelegramSettings />
              ) : (
                <Navigate to="/" replace />
              )
            }
          />

          {/* ========== HBM ROUTES ========== */}

          <Route
            path="/hbm/dashboard"
            element={
              user && (isHBMUser || isAdminUser) ? (
                <HbmDashboard />
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

          <Route
            path="/hbm/dc-motor/new"
            element={
              user && (isHBMUser || isAdminUser) ? (
                <DcMotorForm />
              ) : user ? (
                <Navigate to="/" replace />
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />



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


          <Route
            path="/hbm/pumphouse/new"
            element={
              user && (isHBMUser || isAdminUser) ? (
                <PumpHouseForm />
              ) : user ? (
                <Navigate to="/" replace />
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
          <Route
            path="/fabrication"
            element={
              user ? (
                <FabricationReport />
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />


          {/* Catch all - redirect to appropriate home or login */}
          <Route path="*" element={<Navigate to={user ? getDefaultRoute() : '/login'} replace />} />
        </Routes>
      </main>

      {/* Footer - Only show on dashboard pages */}
      {showNav && (location.pathname === '/' || location.pathname === '/hbm/dashboard') && (
        <footer className="bg-gray-800 text-white py-4">
          <div className="px-4 text-center">
            <p className="text-xs text-gray-400">
              {isOnHBMRoute
                ? 'HBM Checksheet System | SRJ Strips and Pipes Pvt Ltd'
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
