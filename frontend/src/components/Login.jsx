import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

const API_URL = process.env.REACT_APP_API_URL || (window.location.hostname === 'localhost' ? 'http://localhost:5001/api' : '/api');

const MODULE_OPTIONS = [
  { value: 'CRANE_MAINTENANCE', label: 'Crane Maintenance', color: 'blue' },
  { value: 'HBM_CHECKSHEETS',   label: 'HBM Checksheets',  color: 'emerald' },
  { value: 'ADMIN',             label: 'Admin',             color: 'slate' },
];

const Login = ({ onLoginSuccess }) => {
  const [formData, setFormData] = useState({ username: '', password: '', userType: '' });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.userType) { toast.error('Please select a module to login'); return; }
    if (!formData.username || !formData.password) { toast.error('Please fill in all fields'); return; }

    setLoading(true);
    try {
      const response = await axios.post(`${API_URL}/auth/login`, {
        username: formData.username.trim(),
        password: formData.password,
        userType: formData.userType,
      });

      if (response.data.success) {
        localStorage.setItem('token', response.data.data.token);
        const userData = { ...response.data.data.user, is_authenticated: true };
        localStorage.setItem('user', JSON.stringify(userData));
        if (onLoginSuccess) onLoginSuccess(userData);
        toast.success(`Welcome, ${formData.username}!`);
        const loginType = userData.loginType || userData.user_type;
        navigate(loginType === 'HBM_CHECKSHEETS' ? '/hbm/dashboard' : '/');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const selected = MODULE_OPTIONS.find(m => m.value === formData.userType);
  const btnColor = selected?.color === 'emerald'
    ? 'bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-500'
    : selected?.color === 'slate'
    ? 'bg-slate-700 hover:bg-slate-800 focus:ring-slate-500'
    : 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500';

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 px-4 py-6">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-blue-100 overflow-hidden">

        {/* Header band */}
        <div className="bg-gradient-to-r from-blue-700 to-blue-500 px-6 pt-8 pb-6 text-center">
          <div className="w-36 h-36 mx-auto mb-3 bg-white rounded-2xl shadow-xl overflow-hidden flex items-center justify-center">
            <img
              src="/srj-logo.png"
              alt="SRJ Logo"
              className="w-full h-full object-contain"
              style={{ transform: 'scale(1.45)', transformOrigin: 'center' }}
            />
          </div>
          <h1 className="text-base font-extrabold text-white tracking-wide leading-tight">
            SRJ STRIPS AND PIPES PVT LTD
          </h1>
          <p className="text-blue-200 text-xs mt-1 font-medium">Maintenance Portal</p>
        </div>

        {/* Form */}
        <div className="px-6 py-6">
          <p className="text-sm font-semibold text-gray-500 text-center mb-5">Sign in to continue</p>

          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Module dropdown */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
                Module
              </label>
              <div className="relative">
                <select
                  name="userType"
                  value={formData.userType}
                  onChange={handleChange}
                  required
                  className="w-full appearance-none px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg text-sm font-semibold text-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors pr-10"
                >
                  <option value="">— Select Module —</option>
                  {MODULE_OPTIONS.map(m => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
                {/* chevron */}
                <svg className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
                  fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>

            {/* Username */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
                Username
              </label>
              <input
                type="text"
                name="username"
                value={formData.username}
                onChange={handleChange}
                placeholder="Enter your username"
                required
                className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors font-medium text-gray-900 placeholder-gray-400"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Enter your password"
                  required
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors font-medium text-gray-900 placeholder-gray-400 pr-12"
                />
                <button type="button" onClick={() => setShowPassword(p => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || !formData.userType}
              className={`w-full flex justify-center items-center py-3 px-4 rounded-lg shadow text-sm font-bold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 mt-2 ${btnColor}`}
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Signing in...
                </>
              ) : (
                `Sign In${selected ? ` — ${selected.label}` : ''}`
              )}
            </button>
          </form>

          <p className="text-xs text-gray-400 text-center mt-5">
            © SRJ Strips and Pipes Pvt Ltd
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
