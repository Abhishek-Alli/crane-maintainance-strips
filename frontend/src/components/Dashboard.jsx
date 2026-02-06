import React, { useState, useEffect, useCallback } from 'react';
import { configAPI, craneAPI, inspectionAPI } from '../services/api';
import { toast } from 'react-toastify';
import { format, startOfWeek, startOfMonth } from 'date-fns';

const API_URL = process.env.REACT_APP_API_URL || (window.location.hostname === 'localhost' ? 'http://localhost:5001/api' : '/api');

// Sub-component: Inspection detail panel (sections → items with OK/NOT_OK)
const InspectionDetailPanel = ({ details }) => {
  if (!details) {
    return (
      <div className="text-center py-4">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
        <p className="text-sm text-gray-500 mt-1">Loading details...</p>
      </div>
    );
  }

  if (!details.sections || details.sections.length === 0) {
    return <p className="text-sm text-gray-500 py-2">No inspection items recorded.</p>;
  }

  return (
    <div className="space-y-3">
      {details.sections.map((section) => (
        <div key={section.section_id} className="bg-white rounded-lg p-3 shadow-sm">
          <h4 className="font-semibold text-sm text-gray-800 mb-2 border-b pb-1">
            {section.section_name}
          </h4>
          <div className="space-y-1">
            {section.items.map((item, idx) => (
              <div key={idx} className="flex items-start justify-between text-sm py-1">
                <span className="text-gray-700 flex-1">{item.item_name}</span>
                <div className="flex items-center ml-4 shrink-0">
                  <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
                    item.selected_value === 'NOT_OK'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-green-100 text-green-800'
                  }`}>
                    {item.selected_value || '-'}
                  </span>
                  {item.remarks && (
                    <span className="ml-2 text-xs text-gray-500 italic max-w-[150px] truncate" title={item.remarks}>
                      ({item.remarks})
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

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

  // Recent Inspections states
  const [activeTab, setActiveTab] = useState('today');
  const [recentInspections, setRecentInspections] = useState([]);
  const [expandedInspectionId, setExpandedInspectionId] = useState(null);
  const [inspectionDetails, setInspectionDetails] = useState({});
  const [recentLoading, setRecentLoading] = useState(false);

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

  // Date range helper for tabs
  const getDateRange = (tab) => {
    const now = new Date();
    const todayStr = format(now, 'yyyy-MM-dd');
    switch (tab) {
      case 'today':
        return { start_date: todayStr, end_date: todayStr };
      case 'week':
        return {
          start_date: format(startOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd'),
          end_date: todayStr
        };
      case 'month':
        return {
          start_date: format(startOfMonth(now), 'yyyy-MM-dd'),
          end_date: todayStr
        };
      default:
        return { start_date: todayStr, end_date: todayStr };
    }
  };

  // Load recent inspections for active tab
  const loadRecentInspections = useCallback(async (tab) => {
    setRecentLoading(true);
    try {
      const { start_date, end_date } = getDateRange(tab);
      const params = { start_date, end_date, limit: 200 };
      if (selectedDepartment) params.department_id = selectedDepartment;
      if (selectedShed) params.shed_id = selectedShed;

      const res = await inspectionAPI.getAll(params);
      setRecentInspections(res.data || []);
    } catch (error) {
      console.error('Failed to load recent inspections:', error);
      setRecentInspections([]);
    } finally {
      setRecentLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDepartment, selectedShed]);

  // Reload when tab or filters change
  useEffect(() => {
    loadRecentInspections(activeTab);
  }, [activeTab, loadRecentInspections]);

  // Toggle expand inspection detail
  const toggleInspectionExpand = async (inspectionId) => {
    if (expandedInspectionId === inspectionId) {
      setExpandedInspectionId(null);
      return;
    }
    setExpandedInspectionId(inspectionId);

    if (inspectionDetails[inspectionId]) return;

    try {
      const res = await inspectionAPI.getById(inspectionId);
      setInspectionDetails(prev => ({
        ...prev,
        [inspectionId]: res.data
      }));
    } catch (error) {
      console.error('Failed to load inspection details:', error);
      toast.error('Failed to load inspection details');
    }
  };

  // Load all data based on filters
  const loadDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      const headers = { 'Authorization': `Bearer ${localStorage.getItem('token')}` };

      // Fetch cranes list and dashboard stats in parallel
      const [cranesRes, statsRes] = await Promise.all([
        fetch(`${API_URL}/cranes`, { headers }),
        fetch(`${API_URL}/cranes/dashboard/stats`, { headers })
      ]);

      // Process cranes for the maintenance table
      if (cranesRes.ok) {
        const data = await cranesRes.json();
        const cranesData = data.data || [];
        setAllCranes(cranesData);
        setCraneMaintenanceData(cranesData.map(crane => ({
          id: crane.id,
          crane_number: crane.crane_number,
          shed_name: crane.shed_name,
          maintenance_frequency: crane.maintenance_frequency,
        })));
      }

      // Process stats from dedicated endpoint
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        const s = statsData.data || {};
        setStats({
          total_cranes: s.total_cranes || 0,
          inspected_this_month: s.inspected_this_month || 0,
          remaining_this_month: s.remaining_this_month || 0,
          total_issues: s.with_issues || 0,
          overdue: s.overdue || 0
        });
      }

    } catch (error) {
      console.error('Dashboard load error:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, []);

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

      const res = await inspectionAPI.getAll({ crane_id: craneId, limit: 50 });
      const history = (res.data || []).filter(i => i.crane_id === parseInt(craneId));
      setSelectedCraneHistory(history);
    } catch (error) {
      console.log('Crane history not available yet');
      setSelectedCraneHistory([]);
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

      {/* Crane List Overview */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-800">All Cranes</h2>
          <p className="text-sm text-gray-600">List of all active cranes</p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Crane No</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Shed</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Frequency</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {craneMaintenanceData.map((crane) => (
                <tr key={crane.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{crane.crane_number}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{crane.shed_name}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{crane.maintenance_frequency || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Inspections with Tabs */}
      <div className="bg-white rounded-lg shadow">
        {/* Header with Tabs */}
        <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-800 mb-3">Recent Inspections</h2>
          <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
            {[
              { key: 'today', label: 'Today' },
              { key: 'week', label: 'This Week' },
              { key: 'month', label: 'This Month' }
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => { setActiveTab(tab.key); setExpandedInspectionId(null); }}
                className={`flex-1 py-2 px-3 text-sm font-medium rounded-md transition-colors ${
                  activeTab === tab.key
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-200'
                }`}
              >
                {tab.label}
                {!recentLoading && activeTab === tab.key && recentInspections.length > 0 && (
                  <span className="ml-1.5 bg-white bg-opacity-30 text-xs px-1.5 py-0.5 rounded-full">
                    {recentInspections.length}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        {recentLoading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
            <p className="text-gray-500">Loading inspections...</p>
          </div>
        ) : recentInspections.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No inspections found for {activeTab === 'today' ? 'today' : activeTab === 'week' ? 'this week' : 'this month'}
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Crane No</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Dept</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Shed</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Recorded By</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {recentInspections.map((insp) => (
                    <React.Fragment key={insp.id}>
                      <tr
                        className="hover:bg-blue-50 cursor-pointer transition-colors"
                        onClick={() => toggleInspectionExpand(insp.id)}
                      >
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {insp.inspection_date ? format(new Date(insp.inspection_date), 'dd-MM-yyyy') : '-'}
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-blue-600">
                          <span className="flex items-center">
                            <span className={`mr-2 text-xs transition-transform ${expandedInspectionId === insp.id ? 'rotate-90' : ''}`}>&#9654;</span>
                            {insp.crane_number}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">{insp.department}</td>
                        <td className="px-4 py-3 text-sm text-gray-500">{insp.shed}</td>
                        <td className="px-4 py-3 text-sm text-gray-500">{insp.recorded_by || '-'}</td>
                        <td className="px-4 py-3">
                          {insp.has_alerts ? (
                            <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                              Issues Found
                            </span>
                          ) : (
                            <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                              All OK
                            </span>
                          )}
                        </td>
                      </tr>
                      {/* Expanded Detail Row */}
                      {expandedInspectionId === insp.id && (
                        <tr>
                          <td colSpan="6" className="px-4 py-4 bg-blue-50 border-l-4 border-blue-500">
                            <InspectionDetailPanel details={inspectionDetails[insp.id]} />
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden space-y-3 p-4">
              {recentInspections.map((insp) => (
                <div key={insp.id} className="border rounded-lg overflow-hidden shadow-sm">
                  <div
                    className="p-4 bg-white active:bg-gray-50"
                    onClick={() => toggleInspectionExpand(insp.id)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-blue-700">{insp.crane_number}</span>
                      {insp.has_alerts ? (
                        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                          Issues
                        </span>
                      ) : (
                        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                          OK
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-gray-600 space-y-1">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Date</span>
                        <span>{insp.inspection_date ? format(new Date(insp.inspection_date), 'dd-MM-yyyy') : '-'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Dept / Shed</span>
                        <span>{insp.department} / {insp.shed}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">By</span>
                        <span>{insp.recorded_by || '-'}</span>
                      </div>
                    </div>
                    <div className="mt-2 text-xs text-gray-400 flex items-center">
                      <span className={`mr-1 transition-transform inline-block ${expandedInspectionId === insp.id ? 'rotate-90' : ''}`}>&#9654;</span>
                      Tap to {expandedInspectionId === insp.id ? 'collapse' : 'view details'}
                    </div>
                  </div>
                  {expandedInspectionId === insp.id && (
                    <div className="border-t bg-blue-50 p-4">
                      <InspectionDetailPanel details={inspectionDetails[insp.id]} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
