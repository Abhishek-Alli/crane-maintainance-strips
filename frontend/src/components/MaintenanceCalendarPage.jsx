import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { maintenanceScheduleAPI } from '../services/api';
import {
  MaintenanceCalendar,
  DepartmentProgress,
  CraneStatusList,
  ReschedulePanel
} from './MaintenanceCalendar';
import {
  resolveDepartmentByDate,
  isReschedulePeriod,
  DEPARTMENT_COLORS
} from '../utils/maintenanceSchedule';

const MaintenanceCalendarPage = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [calendarData, setCalendarData] = useState(null);
  const [selectedDepartment, setSelectedDepartment] = useState(null);
  const [departmentCranes, setDepartmentCranes] = useState([]);
  const [missedCranes, setMissedCranes] = useState([]);
  const [rescheduleWindow, setRescheduleWindow] = useState(null);

  // Get user from localStorage
  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

  // Load calendar data
  const loadCalendarData = useCallback(async () => {
    setLoading(true);
    try {
      const year = selectedDate.getFullYear();
      const month = selectedDate.getMonth() + 1;

      // Initialize tracking for this month (non-blocking, errors are OK)
      try {
        await maintenanceScheduleAPI.initializeMonth(year, month);
      } catch (initError) {
        // Initialization may fail if already done or race condition - that's OK
        console.log('Month initialization skipped or already done');
      }

      // Fetch calendar data
      const response = await maintenanceScheduleAPI.getCalendar(year, month);

      if (response.success) {
        setCalendarData(response.data);
      }

      // If in reschedule period, fetch missed cranes
      if (isReschedulePeriod(new Date())) {
        const rescheduleResponse = await maintenanceScheduleAPI.getRescheduleCranes(year, month);
        if (rescheduleResponse.success) {
          setMissedCranes(rescheduleResponse.data.missed_cranes || []);
          setRescheduleWindow(rescheduleResponse.data.reschedule_window);
        }
      }
    } catch (error) {
      console.error('Error loading calendar data:', error);
      toast.error('Failed to load calendar data');
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    loadCalendarData();
  }, [loadCalendarData]);

  // Load department cranes when department is selected
  const loadDepartmentCranes = useCallback(async (departmentCode) => {
    if (!departmentCode || departmentCode === 'RESCHEDULE') {
      setDepartmentCranes([]);
      return;
    }

    try {
      const year = selectedDate.getFullYear();
      const month = selectedDate.getMonth() + 1;

      const response = await maintenanceScheduleAPI.getDepartmentStatus(
        departmentCode,
        year,
        month
      );

      if (response.success) {
        setDepartmentCranes(response.data.cranes || []);
      }
    } catch (error) {
      console.error('Error loading department cranes:', error);
      toast.error('Failed to load department cranes');
    }
  }, [selectedDate]);

  // Handle day selection
  const handleDaySelect = useCallback((date) => {
    setSelectedDate(date);
    const department = resolveDepartmentByDate(date);
    setSelectedDepartment(department);
    loadDepartmentCranes(department);
  }, [loadDepartmentCranes]);

  // Handle navigation to inspection form
  const handleNavigateToInspection = useCallback((crane) => {
    navigate('/inspection', {
      state: {
        preselectedCrane: crane.crane_id,
        fromReschedule: true
      }
    });
  }, [navigate]);

  // Handle crane click
  const handleCraneClick = useCallback((crane) => {
    // Could open a detail modal or navigate to crane details
    console.log('Crane clicked:', crane);
  }, []);

  // Refresh data
  const handleRefresh = useCallback(() => {
    loadCalendarData();
    if (selectedDepartment) {
      loadDepartmentCranes(selectedDepartment);
    }
  }, [loadCalendarData, loadDepartmentCranes, selectedDepartment]);

  // Update expired statuses
  const handleUpdateExpired = useCallback(async () => {
    try {
      await maintenanceScheduleAPI.updateExpiredStatuses();
      toast.success('Statuses updated');
      handleRefresh();
    } catch (error) {
      console.error('Error updating statuses:', error);
      toast.error('Failed to update statuses');
    }
  }, [handleRefresh]);

  if (loading && !calendarData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <div className="text-xl text-gray-600">Loading calendar...</div>
        </div>
      </div>
    );
  }

  const currentDepartment = resolveDepartmentByDate(new Date());
  const showReschedulePanel = isReschedulePeriod(new Date()) || missedCranes.length > 0;

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Maintenance Schedule Calendar</h1>
          <p className="text-gray-600 text-sm mt-1">
            View and track crane maintenance across all departments
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleUpdateExpired}
            className="px-3 py-2 text-sm bg-yellow-100 text-yellow-800 rounded-lg hover:bg-yellow-200 transition-colors"
            title="Update missed statuses"
          >
            Update Statuses
          </button>
          <button
            onClick={handleRefresh}
            className="px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* User Department Info */}
      {user && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-600 font-semibold">Your Department</p>
              <p className="text-lg font-bold text-blue-900">{user.department_name}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-blue-600">Logged in as</p>
              <p className="text-lg font-bold text-blue-900">
                {user.username} ({user.role})
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar - Takes up 2 columns */}
        <div className="lg:col-span-2">
          <MaintenanceCalendar
            onDaySelect={handleDaySelect}
            selectedDate={selectedDate}
          />
        </div>

        {/* Department Progress - Takes up 1 column */}
        <div>
          <DepartmentProgress
            summaries={calendarData?.summaries || {}}
            currentDepartment={currentDepartment}
          />
        </div>
      </div>

      {/* Selected Department Cranes */}
      {selectedDepartment && selectedDepartment !== 'RESCHEDULE' && (
        <CraneStatusList
          cranes={departmentCranes}
          department={selectedDepartment}
          window={calendarData?.departmentWindows?.[selectedDepartment]}
          onCraneClick={handleCraneClick}
        />
      )}

      {/* Reschedule Panel */}
      {showReschedulePanel && (
        <ReschedulePanel
          missedCranes={missedCranes}
          rescheduleWindow={rescheduleWindow}
          onCraneClick={handleCraneClick}
          onNavigateToInspection={handleNavigateToInspection}
        />
      )}

      {/* Department Window Details */}
      {calendarData?.departmentWindows && (
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            Monthly Maintenance Windows
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(calendarData.departmentWindows).map(([dept, window]) => {
              const color = DEPARTMENT_COLORS[dept];
              const isActive = currentDepartment === dept;

              return (
                <div
                  key={dept}
                  className={`p-3 rounded-lg border-2 ${
                    isActive
                      ? `${color.bg} ${color.border}`
                      : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: color.hex }}
                    />
                    <span className={`font-medium ${isActive ? color.text : 'text-gray-700'}`}>
                      {dept}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">
                    Days {window.startDay} - {window.endDay}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {window.startDate} to {window.endDate}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default MaintenanceCalendarPage;
