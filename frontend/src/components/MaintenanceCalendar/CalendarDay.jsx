import React from 'react';

const CalendarDay = ({ dayData, onClick, isSelected }) => {
  if (!dayData.day) {
    return <div className="h-12 bg-gray-50" />;
  }

  const { day, department, color, isToday } = dayData;

  return (
    <button
      onClick={() => onClick && onClick(dayData)}
      className={`
        h-12 w-full flex items-center justify-center
        ${color.bg} ${color.border} border
        ${isToday ? 'ring-2 ring-offset-1 ring-blue-500' : ''}
        ${isSelected ? 'ring-2 ring-offset-1 ring-gray-800' : ''}
        hover:opacity-80 transition-opacity cursor-pointer
        focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-gray-600
      `}
      title={`${department} - Day ${day}`}
    >
      <span className={`text-sm font-medium ${color.text}`}>
        {day}
      </span>
    </button>
  );
};

export default CalendarDay;
