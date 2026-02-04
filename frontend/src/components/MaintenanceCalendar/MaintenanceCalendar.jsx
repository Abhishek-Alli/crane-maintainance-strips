import React, { useState, useMemo, useCallback } from 'react';
import CalendarHeader from './CalendarHeader';
import CalendarGrid from './CalendarGrid';
import DepartmentLegend from './DepartmentLegend';
import { generateCalendarGrid, resolveDepartmentByDate, DEPARTMENT_COLORS } from '../../utils/maintenanceSchedule';

const MaintenanceCalendar = ({ onDaySelect, selectedDate }) => {
  const [viewDate, setViewDate] = useState(() => {
    if (selectedDate) {
      return new Date(selectedDate);
    }
    return new Date();
  });

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const monthName = viewDate.toLocaleString('default', { month: 'long' });

  // Generate calendar grid data
  const weeks = useMemo(() => {
    return generateCalendarGrid(year, month);
  }, [year, month]);

  // Get selected day number
  const selectedDay = selectedDate
    ? new Date(selectedDate).getMonth() === month && new Date(selectedDate).getFullYear() === year
      ? new Date(selectedDate).getDate()
      : null
    : null;

  const handlePrevMonth = useCallback(() => {
    setViewDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  }, []);

  const handleNextMonth = useCallback(() => {
    setViewDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  }, []);

  const handleToday = useCallback(() => {
    setViewDate(new Date());
    if (onDaySelect) {
      onDaySelect(new Date());
    }
  }, [onDaySelect]);

  const handleDayClick = useCallback((dayData) => {
    if (dayData.date && onDaySelect) {
      onDaySelect(dayData.date);
    }
  }, [onDaySelect]);

  // Get current active department
  const today = new Date();
  const activeDepartment = resolveDepartmentByDate(today);
  const activeColor = DEPARTMENT_COLORS[activeDepartment];

  return (
    <div className="bg-white rounded-lg shadow p-4">
      {/* Current Window Banner */}
      <div className={`mb-4 p-3 rounded-lg ${activeColor.bg} ${activeColor.border} border`}>
        <div className="flex items-center justify-between">
          <div>
            <p className={`text-xs font-medium ${activeColor.text} uppercase`}>Current Window</p>
            <p className={`text-lg font-bold ${activeColor.text}`}>
              {activeDepartment === 'RESCHEDULE' ? 'Reschedule Period' : `${activeDepartment} Department`}
            </p>
          </div>
          <div className={`text-right ${activeColor.text}`}>
            <p className="text-sm">Day {today.getDate()}</p>
            <p className="text-xs">{today.toLocaleDateString()}</p>
          </div>
        </div>
      </div>

      <CalendarHeader
        year={year}
        month={month}
        monthName={monthName}
        onPrevMonth={handlePrevMonth}
        onNextMonth={handleNextMonth}
        onToday={handleToday}
      />

      <DepartmentLegend />

      <CalendarGrid
        weeks={weeks}
        selectedDay={selectedDay}
        onDayClick={handleDayClick}
      />
    </div>
  );
};

export default MaintenanceCalendar;
