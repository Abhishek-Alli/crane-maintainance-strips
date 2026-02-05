import React, { useState, useEffect, useCallback } from 'react';
import { configAPI, craneAPI, inspectionAPI } from '../services/api';
import { toast } from 'react-toastify';
import { format } from 'date-fns';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

const Dashboard = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Filter states
  const [departments, setDepartments] = useState([]);
  const [sheds, setSheds] = useState([]);
  const [cranes, setCranes] = useState([]);
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [selectedShed, setSelectedShed] = useState('');
  const [selectedCrane, setSelectedCrane] = useState('');

  // Data states
  // eslint-disable-next-line no-unused-vars
  const [allCranes, setAllCranes] = useState([]);
  const [craneMaintenanceData, setCraneMaintenanceData] = useState([]);
  const [selectedCraneHistory, setSelectedCraneHistory] = useState([]);
  const [issuesList, setIssuesList] = useState([]);

  // Stats
  const [stats, setStats] = useState({
    total_cranes: 0,
    inspected_this_month: 0,
    remaining_this_month: 0,
    total_issues: 0,
    overdue: 0
  });

  // Get user from localStorage
  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

  // Load departments on mount
  useEffect(() => {
    loadDepartments();
  }, []);

  // Load sheds when department changes
  useEffect(() => {
    if (selectedDepartment) {
      loadSheds(selectedDepartment);
      setSelectedShed('');
      setSelectedCrane('');
    } else {
      setSheds([]);
      setCranes([]);
    }
  }, [selectedDepartment]);

  // Load cranes when shed changes
  useEffect(() => {
    if (selectedShed) {
      loadCranes(selectedShed);
      setSelectedCrane('');
    } else {
      setCranes([]);
    }
  }, [selectedShed]);

  // Load crane history when crane is selected
  useEffect(() => {
    if (selectedCrane) {
      loadCraneHistory(selectedCrane);
    } else {
      setSelectedCraneHistory([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCrane]);

  // Load all data based on filters
  const loadDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      // Build query params
      const params = new URLSearchParams();
      if (selectedDepartment) params.append('department_id', selectedDepartment);
      if (selectedShed) params.append('shed_id', selectedShed);

      // Fetch all cranes with maintenance info
      const response = await fetch(
        `${API_URL}/cranes?${params.toString()}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        const cranesData = data.data || [];
        setAllCranes(cranesData);

        // Process crane maintenance data
        const maintenanceData = cranesData.map(crane => ({
          id: crane.id,
          crane_number: crane.crane_number,
          shed_name: crane.shed_name,
          department_name: crane.department_name,
          current_status: crane.current_status || 'UNKNOWN',
          last_inspection_date: crane.last_inspection_date,
          next_maintenance_date: crane.next_maintenance_date,
          maintenance_frequency: crane.maintenance_frequency,
          total_inspections: crane.total_inspections || 0,
          has_issues: crane.current_status === 'MAINTENANCE_REQUIRED'
        }));

        setCraneMaintenanceData(maintenanceData);

        // Calculate stats
        const today = new Date();
        const currentMonth = today.getMonth();
        const currentYear = today.getFullYear();

        const inspectedThisMonth = cranesData.filter(c => {
          if (!c.last_inspection_date) return false;
          const inspDate = new Date(c.last_inspection_date);
          return inspDate.getMonth() === currentMonth && inspDate.getFullYear() === currentYear;
        }).length;

        const overdue = cranesData.filter(c => {
          if (!c.next_maintenance_date) return false;
          return new Date(c.next_maintenance_date) < today;
        }).length;

        const withIssues = cranesData.filter(c => c.current_status === 'MAINTENANCE_REQUIRED').length;

        setStats({
          total_cranes: cranesData.length,
          inspected_this_month: inspectedThisMonth,
          remaining_this_month: cranesData.length - inspectedThisMonth,
          total_issues: withIssues,
          overdue: overdue
        });
      }

      // Load issues (NOT OK items with remarks)
      await loadIssues();

    } catch (error) {
      console.error('Dashboard load error:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, [selectedDepartment, selectedShed]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const loadDepartments = async () => {
    try {
      const res = await configAPI.getDepartments();
      setDepartments(res.data || []);
    } catch (error) {
      console.error('Failed to load departments:', error);
    }
  };

  const loadSheds = async (departmentId) => {
    try {
      const res = await configAPI.getSheds({ department_id: departmentId });
      setSheds(res.data || []);
    } catch (error) {
      console.error('Failed to load sheds:', error);
    }
  };

  const loadCranes = async (shedId) => {
    try {
      const res = await craneAPI.getByShed(shedId);
      setCranes(res.data || []);
    } catch (error) {
      console.error('Failed to load cranes:', error);
    }
  };

  const loadCraneHistory = async (craneId) => {
    try {
      const crane = cranes.find(c => c.id === parseInt(craneId));
      if (!crane) return;

      // Get inspection history from audit trail
      const res = await inspectionAPI.getAll({ crane_id: craneId, limit: 50 });
      const history = (res.data || []).filter(i => i.crane_id === parseInt(craneId));
      setSelectedCraneHistory(history);
    } catch (error) {
      // Silently handle - history will just be empty if no data yet
      console.log('Crane history not available yet');
      setSelectedCraneHistory([]);
    }
  };

  const loadIssues = async () => {
    try {
      // Get recent inspections with issues from audit trail
      const res = await inspectionAPI.getAll({ limit: 100 });
      const inspections = res.data || [];

      // Filter inspections with issues (has_alerts = true or crane_status = MAINTENANCE_REQUIRED)
      const issues = inspections
        .filter(i => i.has_alerts || i.crane_status === 'MAINTENANCE_REQUIRED')
        .map(i => ({
          id: i.id,
          crane_number: i.crane_number,
          shed_name: i.shed_name,
          inspection_date: i.inspection_date,
          alert_count: i.alert_count || 0,
          remarks: i.remarks,
          crane_status: i.crane_status
        }));

      setIssuesList(issues.slice(0, 20)); // Show top 20 issues
    } catch (error) {
      // Silently handle - issues list will just be empty if table doesn't exist yet
      console.log('Issues data not available yet');
      setIssuesList([]);
    }
  };

  const handleExportExcel = async (craneNumber, formName, date) => {
    try {
      const response = await inspectionAPI.exportExcel(craneNumber, formName, date);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `inspection_${craneNumber}_${date}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Excel file downloaded');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export Excel');
    }
  };

  const handleExportPDF = async (craneNumber, formName, date) => {
    try {
      const response = await inspectionAPI.exportPDF(craneNumber, formName, date);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `inspection_${craneNumber}_${date}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('PDF file downloaded');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export PDF');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'OK': return 'bg-green-100 text-green-800';
      case 'MAINTENANCE_REQUIRED': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getDaysUntilMaintenance = (nextDate) => {
    if (!nextDate) return null;
    const today = new Date();
    const next = new Date(nextDate);
    const diff = Math.ceil((next - today) / (1000 * 60 * 60 * 24));
    return diff;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <div className="text-xl text-gray-600">Loading dashboard...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* User Info */}
      {user && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-lg font-bold text-blue-900">Welcome, {user.username}</p>
              <p className="text-sm text-blue-600">{user.role}</p>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">Filter by Location</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
            <select
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              className="w-full p-2 border rounded-lg"
            >
              <option value="">All Departments</option>
              {departments.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Shed</label>
            <select
              value={selectedShed}
              onChange={(e) => setSelectedShed(e.target.value)}
              className="w-full p-2 border rounded-lg"
              disabled={!selectedDepartment}
            >
              <option value="">All Sheds</option>
              {sheds.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Crane</label>
            <select
              value={selectedCrane}
              onChange={(e) => setSelectedCrane(e.target.value)}
              className="w-full p-2 border rounded-lg"
              disabled={!selectedShed}
            >
              <option value="">All Cranes</option>
              {cranes.map(c => (
                <option key={c.id} value={c.id}>{c.crane_number}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm font-medium text-gray-500">Total Cranes</div>
          <div className="mt-1 text-2xl font-bold text-gray-900">{stats.total_cranes}</div>
        </div>

        <div className="bg-green-50 p-4 rounded-lg shadow">
          <div className="text-sm font-medium text-green-700">Inspected This Month</div>
          <div className="mt-1 text-2xl font-bold text-green-600">{stats.inspected_this_month}</div>
        </div>

        <div className="bg-yellow-50 p-4 rounded-lg shadow">
          <div className="text-sm font-medium text-yellow-700">Remaining This Month</div>
          <div className="mt-1 text-2xl font-bold text-yellow-600">{stats.remaining_this_month}</div>
        </div>

        <div className="bg-red-50 p-4 rounded-lg shadow">
          <div className="text-sm font-medium text-red-700">With Issues</div>
          <div className="mt-1 text-2xl font-bold text-red-600">{stats.total_issues}</div>
        </div>

        <div className="bg-orange-50 p-4 rounded-lg shadow">
          <div className="text-sm font-medium text-orange-700">Overdue</div>
          <div className="mt-1 text-2xl font-bold text-orange-600">{stats.overdue}</div>
        </div>
      </div>

      {/* Selected Crane History */}
      {selectedCrane && (
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200 bg-blue-50">
            <h2 className="text-xl font-bold text-blue-800">
              Crane History: {cranes.find(c => c.id === parseInt(selectedCrane))?.crane_number}
            </h2>
            <p className="text-sm text-blue-600">Complete maintenance history for selected crane</p>
          </div>
          <div className="overflow-x-auto">
            {selectedCraneHistory.length > 0 ? (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Form</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Recorded By</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Alerts</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Remarks</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Export</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {selectedCraneHistory.map((record, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {record.inspection_date ? format(new Date(record.inspection_date), 'dd-MM-yyyy') : '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">{record.form_name || '-'}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{record.recorded_by || '-'}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(record.crane_status)}`}>
                          {record.crane_status || 'N/A'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {record.alert_count > 0 ? (
                          <span className="text-red-600 font-bold">{record.alert_count}</span>
                        ) : (
                          <span className="text-green-600">0</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 max-w-xs truncate" title={record.remarks}>
                        {record.remarks || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm space-x-2">
                        <button
                          onClick={() => handleExportExcel(record.crane_number, record.form_name, record.inspection_date)}
                          className="text-green-600 hover:text-green-800 font-medium"
                        >
                          Excel
                        </button>
                        <button
                          onClick={() => handleExportPDF(record.crane_number, record.form_name, record.inspection_date)}
                          className="text-red-600 hover:text-red-800 font-medium"
                        >
                          PDF
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="p-8 text-center text-gray-500">
                No inspection history found for this crane
              </div>
            )}
          </div>
        </div>
      )}

      {/* Crane Maintenance Overview */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-800">Crane-wise Maintenance Status</h2>
          <p className="text-sm text-gray-600">Overview of all cranes with last and next maintenance dates</p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Crane No</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Shed</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Frequency</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Maintenance</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Next Maintenance</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Days Until</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Inspections</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {craneMaintenanceData.map((crane) => {
                const daysUntil = getDaysUntilMaintenance(crane.next_maintenance_date);
                return (
                  <tr key={crane.id} className={`hover:bg-gray-50 ${crane.has_issues ? 'bg-red-50' : ''}`}>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{crane.crane_number}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{crane.shed_name}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{crane.maintenance_frequency || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {crane.last_inspection_date ? format(new Date(crane.last_inspection_date), 'dd-MM-yyyy') : 'Never'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {crane.next_maintenance_date ? format(new Date(crane.next_maintenance_date), 'dd-MM-yyyy') : '-'}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {daysUntil !== null ? (
                        <span className={`font-bold ${daysUntil < 0 ? 'text-red-600' : daysUntil <= 7 ? 'text-yellow-600' : 'text-green-600'}`}>
                          {daysUntil < 0 ? `${Math.abs(daysUntil)} days overdue` : daysUntil === 0 ? 'Today' : `${daysUntil} days`}
                        </span>
                      ) : '-'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(crane.current_status)}`}>
                        {crane.current_status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 text-center">{crane.total_inspections}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Issues / Problems List */}
      {issuesList.length > 0 && (
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200 bg-red-50">
            <h2 className="text-xl font-bold text-red-800">Issues & Problems</h2>
            <p className="text-sm text-red-600">Cranes with NOT OK items requiring attention</p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Crane No</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Shed</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Alert Count</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Remarks</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {issuesList.map((issue, idx) => (
                  <tr key={idx} className="hover:bg-red-50">
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {issue.inspection_date ? format(new Date(issue.inspection_date), 'dd-MM-yyyy') : '-'}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{issue.crane_number}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{issue.shed_name}</td>
                    <td className="px-4 py-3 text-sm">
                      <span className="text-red-600 font-bold">{issue.alert_count}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(issue.crane_status)}`}>
                        {issue.crane_status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-red-700 font-medium max-w-md">
                      {issue.remarks || 'No remarks'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
