import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

const CreateUser = ({ user }) => {
  const token = localStorage.getItem('token');
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [createdUsers, setCreatedUsers] = useState([]);

  const [formData, setFormData] = useState({
    username: '',
    password: '',
    role: 'OPERATOR',
    department_ids: [],
    is_active: true
  });

  // Fetch departments on mount
  useEffect(() => {
    const fetchDepartments = async () => {
      setLoading(true);
      try {
        const response = await axios.get(`${API_URL}/config/departments`);
        if (response.data.success) {
          setDepartments(response.data.data);
        }
      } catch (error) {
        console.error('Failed to fetch departments:', error);
        toast.error('Failed to load departments');
      } finally {
        setLoading(false);
      }
    };

    fetchDepartments();
  }, []);

  // Fetch all users
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await axios.get(`${API_URL}/users`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (response.data.success) {
          setCreatedUsers(response.data.data);
        }
      } catch (error) {
        console.error('Failed to fetch users:', error);
      }
    };

    if (token) {
      fetchUsers();
    }
  }, [token]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleDepartmentChange = (deptId) => {
    const id = parseInt(deptId);
    setFormData(prev => ({
      ...prev,
      department_ids: prev.department_ids.includes(id)
        ? prev.department_ids.filter(d => d !== id)
        : [...prev.department_ids, id]
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (!formData.username || !formData.password) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (formData.department_ids.length === 0) {
      toast.error('Please select at least one department');
      return;
    }

    if (formData.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setSubmitting(true);

    try {
      const response = await axios.post(
        `${API_URL}/users/create`,
        {
          username: formData.username.trim(),
          password: formData.password,
          role: formData.role,
          department_ids: formData.department_ids,
          is_active: formData.is_active
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (response.data.success) {
        toast.success(`User "${formData.username}" created successfully!`);

        // Add to local list
        setCreatedUsers(prev => [...prev, response.data.data]);

        // Reset form
        setFormData({
          username: '',
          password: '',
          role: 'OPERATOR',
          department_ids: [],
          is_active: true
        });
      }
    } catch (error) {
      console.error('Create user error:', error.response?.data);
      toast.error(
        error.response?.data?.message || 'Failed to create user'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteUser = async (userId, username) => {
    if (!window.confirm(`Are you sure you want to delete user "${username}"?`)) {
      return;
    }

    try {
      const response = await axios.delete(
        `${API_URL}/users/${userId}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (response.data.success) {
        toast.success('User deleted successfully');
        setCreatedUsers(prev => prev.filter(u => u.id !== userId));
      }
    } catch (error) {
      console.error('Delete user error:', error.response?.data);
      toast.error('Failed to delete user');
    }
  };

  // Check if user is admin
  if (user?.role !== 'ADMIN') {
    return (
      <div className="min-h-screen bg-gray-100 p-4 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-md p-8 max-w-md">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Access Denied</h2>
          <p className="text-gray-600">
            You do not have permission to access this page. Only System Administrators can create users.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4 sm:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
          <p className="text-gray-600 mt-2">Create and manage system users</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Create User Form */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Create New User</h2>

            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Username */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Username <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="username"
                    value={formData.username}
                    onChange={handleChange}
                    placeholder="e.g., operator_a1"
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* Password */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Password <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Min 6 characters"
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">Min 6 characters (plain text)</p>
                </div>

                {/* Departments (Multi-select) */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Departments <span className="text-red-500">*</span>
                  </label>
                  <div className="space-y-2 max-h-40 overflow-y-auto border border-gray-300 rounded-lg p-3">
                    {departments.map(dept => (
                      <label key={dept.id} className="flex items-center cursor-pointer hover:bg-gray-50 p-1 rounded">
                        <input
                          type="checkbox"
                          checked={formData.department_ids.includes(dept.id)}
                          onChange={() => handleDepartmentChange(dept.id)}
                          className="w-4 h-4 text-blue-600 rounded"
                        />
                        <span className="ml-3 text-gray-700">{dept.name}</span>
                      </label>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Select departments this user can access</p>
                </div>

                {/* Role */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Role <span className="text-red-500">*</span>
                  </label>
                  <div className="space-y-2">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="role"
                        value="OPERATOR"
                        checked={formData.role === 'OPERATOR'}
                        onChange={handleChange}
                        className="w-4 h-4"
                      />
                      <span className="ml-3 text-gray-700">
                        Operator <span className="text-xs text-gray-500">(Can perform inspections)</span>
                      </span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="role"
                        value="ADMIN"
                        checked={formData.role === 'ADMIN'}
                        onChange={handleChange}
                        className="w-4 h-4"
                      />
                      <span className="ml-3 text-gray-700">
                        Admin <span className="text-xs text-gray-500">(Full access + user management)</span>
                      </span>
                    </label>
                  </div>
                </div>

                {/* Active Status */}
                <div>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      name="is_active"
                      checked={formData.is_active}
                      onChange={handleChange}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <span className="ml-3 text-sm font-medium text-gray-700">Active</span>
                  </label>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-2 px-4 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? 'Creating...' : 'Create User'}
                </button>
              </form>
            )}
          </div>

          {/* Users List */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              Users ({createdUsers.length})
            </h2>

            {createdUsers.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>No users created yet</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {createdUsers.map(u => (
                  <div
                    key={u.id}
                    className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900">{u.username}</p>
                        <div className="flex flex-wrap gap-2 mt-1">
                          <span className={`text-xs px-2 py-1 rounded ${
                            u.role === 'ADMIN'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                            {u.role}
                          </span>
                          <span className={`text-xs px-2 py-1 rounded ${
                            u.is_active
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {u.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {u.departments && u.departments.map(dept => (
                            <span key={dept.id} className="text-xs px-2 py-1 bg-purple-100 text-purple-800 rounded">
                              {dept.name}
                            </span>
                          ))}
                        </div>
                        {u.last_login && (
                          <p className="text-xs text-gray-500 mt-2">
                            Last login: {new Date(u.last_login).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => handleDeleteUser(u.id, u.username)}
                        className="ml-4 px-3 py-1 text-xs text-red-600 hover:bg-red-50 rounded transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateUser;
