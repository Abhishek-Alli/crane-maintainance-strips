import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { hbmAPI } from '../../services/api';

const HbmMachines = () => {
  const [machines, setMachines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingMachine, setEditingMachine] = useState(null);
  const [formData, setFormData] = useState({
    machine_name: '',
    machine_code: '',
    location: '',
    department: '',
    machine_type: '',
    manufacturer: '',
    model: '',
    serial_number: '',
    installation_date: ''
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchMachines();
  }, []);

  const fetchMachines = async () => {
    try {
      const res = await hbmAPI.getMachines();
      setMachines(res.data);
    } catch (error) {
      console.error('Fetch machines error:', error);
      toast.error('Failed to load machines');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      machine_name: '',
      machine_code: '',
      location: '',
      department: '',
      machine_type: '',
      manufacturer: '',
      model: '',
      serial_number: '',
      installation_date: ''
    });
    setEditingMachine(null);
    setShowForm(false);
  };

  const handleEdit = (machine) => {
    setEditingMachine(machine);
    setFormData({
      machine_name: machine.machine_name || '',
      machine_code: machine.machine_code || '',
      location: machine.location || '',
      department: machine.department || '',
      machine_type: machine.machine_type || '',
      manufacturer: machine.manufacturer || '',
      model: machine.model || '',
      serial_number: machine.serial_number || '',
      installation_date: machine.installation_date ? machine.installation_date.split('T')[0] : ''
    });
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.machine_name || !formData.machine_code) {
      toast.error('Machine name and code are required');
      return;
    }

    setSubmitting(true);

    try {
      if (editingMachine) {
        const res = await hbmAPI.updateMachine(editingMachine.id, formData);
        setMachines(prev => prev.map(m => m.id === editingMachine.id ? res.data : m));
        toast.success('Machine updated');
      } else {
        const res = await hbmAPI.createMachine(formData);
        setMachines(prev => [...prev, res.data]);
        toast.success('Machine created');
      }
      resetForm();
    } catch (error) {
      console.error('Submit error:', error);
      toast.error(error.message || 'Failed to save machine');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (machine) => {
    if (!window.confirm(`Delete machine "${machine.machine_name}"?`)) return;

    try {
      await hbmAPI.deleteMachine(machine.id);
      setMachines(prev => prev.filter(m => m.id !== machine.id));
      toast.success('Machine deleted');
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to delete machine');
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">HBM Machines</h1>
            <p className="text-gray-500 mt-1">{machines.length} machine{machines.length !== 1 ? 's' : ''} registered</p>
          </div>
          <button
            onClick={() => { resetForm(); setShowForm(true); }}
            className="flex items-center space-x-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span className="hidden sm:inline">Add Machine</span>
          </button>
        </div>

        {/* Add/Edit Form */}
        {showForm && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">
              {editingMachine ? 'Edit Machine' : 'Add New Machine'}
            </h2>
            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Machine Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="machine_name"
                    value={formData.machine_name}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    placeholder="e.g., Hydraulic Press #1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Machine Code <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="machine_code"
                    value={formData.machine_code}
                    onChange={handleChange}
                    required
                    disabled={!!editingMachine}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent disabled:bg-gray-100"
                    placeholder="e.g., HP-001"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                  <input
                    type="text"
                    name="location"
                    value={formData.location}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    placeholder="e.g., Building A, Floor 2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                  <input
                    type="text"
                    name="department"
                    value={formData.department}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    placeholder="e.g., Production"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Machine Type</label>
                  <input
                    type="text"
                    name="machine_type"
                    value={formData.machine_type}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    placeholder="e.g., Hydraulic Press"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Manufacturer</label>
                  <input
                    type="text"
                    name="manufacturer"
                    value={formData.manufacturer}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Model</label>
                  <input
                    type="text"
                    name="model"
                    value={formData.model}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Serial Number</label>
                  <input
                    type="text"
                    name="serial_number"
                    value={formData.serial_number}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Installation Date</label>
                  <input
                    type="date"
                    name="installation_date"
                    value={formData.installation_date}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div className="flex items-center space-x-3 mt-6">
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : (editingMachine ? 'Update Machine' : 'Add Machine')}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Machines List */}
        {machines.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <p className="text-gray-500 text-lg mb-2">No machines registered yet</p>
            <p className="text-gray-400 text-sm">Click "Add Machine" to get started</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {machines.map(machine => (
              <div
                key={machine.id}
                className={`bg-white rounded-xl shadow-sm border p-5 hover:shadow-md transition-shadow ${
                  machine.is_active ? 'border-gray-200' : 'border-red-200 bg-red-50'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-bold text-gray-900">{machine.machine_name}</h3>
                    <p className="text-sm text-emerald-600 font-mono">{machine.machine_code}</p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                    machine.is_active
                      ? 'bg-green-100 text-green-700'
                      : 'bg-red-100 text-red-700'
                  }`}>
                    {machine.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>

                <div className="space-y-1 text-sm text-gray-500 mb-4">
                  {machine.location && (
                    <p className="flex items-center space-x-2">
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <span>{machine.location}</span>
                    </p>
                  )}
                  {machine.department && (
                    <p className="flex items-center space-x-2">
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                      <span>{machine.department}</span>
                    </p>
                  )}
                  {machine.machine_type && (
                    <p className="text-xs text-gray-400">Type: {machine.machine_type}</p>
                  )}
                </div>

                <div className="flex items-center space-x-2 pt-3 border-t border-gray-100">
                  <button
                    onClick={() => handleEdit(machine)}
                    className="flex-1 text-sm px-3 py-2 text-emerald-600 bg-emerald-50 rounded-lg hover:bg-emerald-100 transition-colors font-medium"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(machine)}
                    className="text-sm px-3 py-2 text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors font-medium"
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
  );
};

export default HbmMachines;
