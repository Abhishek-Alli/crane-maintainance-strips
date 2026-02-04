import React from 'react';
import { DEPARTMENT_COLORS } from '../../utils/maintenanceSchedule';

const ProgressBar = ({ completed, total, color }) => {
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div className="w-full">
      <div className="flex justify-between text-xs text-gray-600 mb-1">
        <span>{completed} / {total} cranes</span>
        <span>{percentage}%</span>
      </div>
      <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className="h-full transition-all duration-300"
          style={{
            width: `${percentage}%`,
            backgroundColor: color.hex
          }}
        />
      </div>
    </div>
  );
};

const DepartmentProgress = ({ summaries, currentDepartment }) => {
  const departments = ['HSM', 'HBM', 'PTM'];

  if (!summaries || Object.keys(summaries).length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-4">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Department Progress</h3>
        <p className="text-gray-500 text-sm">No data available for this month.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">Department Progress</h3>

      <div className="space-y-4">
        {departments.map(dept => {
          const data = summaries[dept] || { total: 0, completed: 0, pending: 0, missed: 0, rescheduled: 0 };
          const color = DEPARTMENT_COLORS[dept];
          const isActive = currentDepartment === dept;

          return (
            <div
              key={dept}
              className={`p-3 rounded-lg ${isActive ? color.bg + ' ' + color.border + ' border-2' : 'bg-gray-50'}`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: color.hex }}
                  />
                  <span className={`font-medium ${isActive ? color.text : 'text-gray-700'}`}>
                    {dept}
                  </span>
                  {isActive && (
                    <span className={`text-xs px-2 py-0.5 rounded-full ${color.bg} ${color.text} border ${color.border}`}>
                      Active
                    </span>
                  )}
                </div>
              </div>

              <ProgressBar
                completed={data.completed + data.rescheduled}
                total={data.total}
                color={color}
              />

              <div className="flex gap-4 mt-2 text-xs">
                <span className="text-green-600">
                  Completed: {data.completed}
                </span>
                <span className="text-yellow-600">
                  Pending: {data.pending}
                </span>
                <span className="text-red-600">
                  Missed: {data.missed}
                </span>
                {data.rescheduled > 0 && (
                  <span className="text-purple-600">
                    Rescheduled: {data.rescheduled}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default DepartmentProgress;
