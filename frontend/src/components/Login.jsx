import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

const API_URL = process.env.REACT_APP_API_URL || (window.location.hostname === 'localhost' ? 'http://localhost:5001/api' : '/api');

const USER_TYPES = [
  {
    value: 'CRANE_MAINTENANCE',
    label: 'Crane Maintenance',
    description: 'Crane inspection & maintenance',
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
      </svg>
    ),
    color: 'blue'
  },
  {
    value: 'HBM_CHECKSHEETS',
    label: 'HBM Checksheets',
    description: 'Machine checksheet inspections',
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
      </svg>
    ),
    color: 'emerald'
  },
  {
    value: 'ADMIN',
    label: 'Admin',
    description: 'Admin login',
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
      </svg>
    ),
    color: 'black'
  },
];

const Login = ({ onLoginSuccess }) => {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    userType: ''
  });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const selectUserType = (type) => {
    setFormData(prev => ({ ...prev, userType: type }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.userType) {
      toast.error('Please select a module to login');
      return;
    }

    if (!formData.username || !formData.password) {
      toast.error('Please fill in all fields');
      return;
    }

    setLoading(true);

    try {
      const response = await axios.post(`${API_URL}/auth/login`, {
        username: formData.username.trim(),
        password: formData.password,
        userType: formData.userType
      });

      if (response.data.success) {
        localStorage.setItem('token', response.data.data.token);

        const userData = {
          ...response.data.data.user,
          is_authenticated: true
        };
        localStorage.setItem('user', JSON.stringify(userData));

        if (onLoginSuccess) {
          onLoginSuccess(userData);
        }

        toast.success(`Welcome, ${formData.username}!`);

        // Redirect based on user type
        const loginType = userData.loginType || userData.user_type;
        if (loginType === 'HBM_CHECKSHEETS') {
          navigate('/hbm/dashboard');
        } else {
          navigate('/');
        }
      }
    } catch (error) {
      console.error('Login error:', error.response?.data);
      toast.error(
        error.response?.data?.message || 'Login failed. Please check your credentials.'
      );
    } finally {
      setLoading(false);
    }
  };

  const selectedType = USER_TYPES.find(t => t.value === formData.userType);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl p-8 border border-blue-100">
        {/* Company Logo & Name */}
        <div className="text-center mb-6">
          <img
            src="/srj-logo.png"
            alt="SRJ Logo"
            className="w-24 h-24 mx-auto mb-4 object-contain"
          />
          <h1 className="text-lg font-bold text-blue-900 tracking-wide">
            SRJ STRIPS AND PIPES PVT LTD
          </h1>
          <div className="w-24 h-1 bg-gradient-to-r from-blue-600 to-blue-400 mx-auto mt-2 rounded-full"></div>
        </div>

        {/* System Title */}
        <div className="text-center mb-6">
          <h2 className="text-2xl font-extrabold text-gray-900">
            Maintenance Portal
          </h2>
          <p className="text-gray-500 mt-1">Select module & sign in</p>
        </div>

        {/* Module Selector */}
        <div className="mb-6">
          <label className="block text-sm font-semibold text-gray-700 mb-3">
            Select Module
          </label>
          <div className="grid grid-cols-2 gap-3">
            {USER_TYPES.map(type => (
              <button
                key={type.value}
                type="button"
                onClick={() => selectUserType(type.value)}
                className={`relative flex flex-col items-center p-4 rounded-xl border-2 transition-all duration-200 ${
                  formData.userType === type.value
                    ? type.color === 'blue'
                      ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                      : 'border-emerald-500 bg-emerald-50 ring-2 ring-emerald-200'
                    : 'border-gray-200 bg-gray-50 hover:border-gray-300 hover:bg-gray-100'
                }`}
              >
                <div className={`mb-2 ${
                  formData.userType === type.value
                    ? type.color === 'blue' ? 'text-blue-600' : 'text-emerald-600'
                    : 'text-gray-400'
                }`}>
                  {type.icon}
                </div>
                <span className={`text-sm font-bold ${
                  formData.userType === type.value ? 'text-gray-900' : 'text-gray-600'
                }`}>
                  {type.label}
                </span>
                <span className="text-xs text-gray-400 mt-1 text-center">
                  {type.description}
                </span>
                {formData.userType === type.value && (
                  <div className={`absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center ${
                    type.color === 'blue' ? 'bg-blue-500' : 'bg-emerald-500'
                  }`}>
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Username */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Username
            </label>
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleChange}
              placeholder="Enter your username"
              required
              className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors font-medium text-gray-900 placeholder-gray-400"
            />
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Password
            </label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Enter your password"
              required
              className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors font-medium text-gray-900 placeholder-gray-400"
            />
          </div>

          {/* Login Button */}
          <button
            type="submit"
            disabled={loading || !formData.userType}
            className={`w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg shadow-lg text-sm font-bold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
              selectedType?.color === 'emerald'
                ? 'bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-500'
                : 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'
            } focus:outline-none focus:ring-2 focus:ring-offset-2`}
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Signing in...
              </>
            ) : (
              <>
                Sign In
                {selectedType && (
                  <span className="ml-2 text-xs opacity-75">
                    ({selectedType.label})
                  </span>
                )}
              </>
            )}
          </button>
        </form>

        {/* Footer */}
        <div className="mt-6 pt-4 border-t border-gray-200">
          <p className="text-xs text-gray-400 text-center">
            Powered by SRJ Strips and Pipes Pvt Ltd
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
