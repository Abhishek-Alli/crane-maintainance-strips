import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

const API_URL = process.env.REACT_APP_API_URL || (window.location.hostname === 'localhost' ? 'http://localhost:5001/api' : '/api');

const Login = ({ onLoginSuccess }) => {
  const [formData, setFormData] = useState({
    username: '',
    password: ''
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

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (!formData.username || !formData.password) {
      toast.error('Please fill in all fields');
      return;
    }

    setLoading(true);

    try {
      const response = await axios.post(`${API_URL}/auth/login`, {
        username: formData.username.trim(),
        password: formData.password
      });

      if (response.data.success) {
        // 1. Store the JWT token for API requests
        localStorage.setItem('token', response.data.data.token);

        // 2. Store user details for the UI
        const userData = {
          ...response.data.data.user,
          is_authenticated: true
        };
        localStorage.setItem('user', JSON.stringify(userData));

        // 3. Trigger the success callback to update App.js state
        if (onLoginSuccess) {
          onLoginSuccess(userData);
        }

        toast.success(`Welcome, ${formData.username}!`);

        // 4. Redirect to the main Dashboard
        navigate('/');
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

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl p-8 border border-blue-100">
        {/* Company Logo & Name */}
        <div className="text-center mb-6">
          {/* SRJ Logo */}
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-blue-800 to-blue-500 flex items-center justify-center shadow-lg">
            <span className="text-2xl font-black text-white tracking-tight">SRJ</span>
          </div>

          {/* Company Name */}
          <h1 className="text-lg font-bold text-blue-900 tracking-wide">
            SRJ STRIPS AND PIPES PVT LTD
          </h1>
          <div className="w-24 h-1 bg-gradient-to-r from-blue-600 to-blue-400 mx-auto mt-2 rounded-full"></div>
        </div>

        {/* System Title */}
        <div className="text-center mb-8">
          <h2 className="text-2xl font-extrabold text-gray-900">
            Crane Maintenance System
          </h2>
          <p className="text-gray-500 mt-1">Inspection Portal</p>
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
            disabled={loading}
            className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg shadow-lg text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Signing in...
              </>
            ) : (
              'Sign In'
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
