import React from 'react';
import CalendarDay from './CalendarDay';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const CalendarGrid = ({ weeks, selectedDay, onDayClick }) => {
  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      {/* Weekday headers */}
      <div className="grid grid-cols-7 bg-gray-100">
        {WEEKDAYS.map(day => (
          <div
            key={day}
            className="h-10 flex items-center justify-center text-sm font-medium text-gray-600 border-b border-gray-200"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar days */}
      <div className="grid grid-cols-7">
        {weeks.map((week, weekIndex) =>
          week.map((dayData, dayIndex) => (
            <CalendarDay
              key={`${weekIndex}-${dayIndex}`}
              dayData={dayData}
              onClick={onDayClick}
              isSelected={selectedDay && dayData.day === selectedDay}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default CalendarGrid;
