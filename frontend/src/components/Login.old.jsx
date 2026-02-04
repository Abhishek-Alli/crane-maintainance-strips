import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

const Login = ({ onLoginSuccess }) => {
  const [formData, setFormData] = useState({ username: '', password: '' });
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Destructure username and password from formData
    const { username, password } = formData;
    
    console.log("Attempting login for:", username);

    try {
      // Sending data to backend port 5001
      const response = await axios.post('http://localhost:5001/api/auth/login', {
        username,
        password
      });
      
      if (response.data.success) {
        // 1. Store the JWT token for API requests
        localStorage.setItem('token', response.data.data.token);
        
        // 2. Store user details for the UI (Role, Name, etc.)
        localStorage.setItem('user', JSON.stringify(response.data.data.user));
        
        // 3. Trigger the success callback to update App.js state
        if (onLoginSuccess) {
          onLoginSuccess(response.data.data.user);
        }

        toast.success(`Welcome back, ${response.data.data.user.full_name || username}!`);
        
        // 4. Redirect to the main Dashboard
        navigate('/');
      }
    } catch (error) {
      console.error("Login Error:", error.response?.data);
      toast.error(error.response?.data?.message || 'Login failed. Check credentials.');
    }
  };

  return (
    <div className="flex items-center justify-center py-12">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-extrabold text-gray-900">Operator Portal</h2>
          <p className="text-gray-500 mt-2">SRJ STRIPS & PIPES Maintenance</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700">Username</label>
            <input
              type="text"
              required
              className="mt-1 block w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter your username"
              value={formData.username}
              onChange={(e) => setFormData({...formData, username: e.target.value})}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700">Password</label>
            <input
              type="password"
              required
              className="mt-1 block w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              placeholder="••••••••"
              value={formData.password}
              onChange={(e) => setFormData({...formData, password: e.target.value})}
            />
          </div>

          <button
            type="submit"
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all"
          >
            Sign In
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;