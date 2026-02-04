import React from 'react';
import { DEPARTMENT_COLORS, isReschedulePeriod } from '../../utils/maintenanceSchedule';

const ReschedulePanel = ({ missedCranes, rescheduleWindow, onCraneClick, onNavigateToInspection }) => {
  const isActive = isReschedulePeriod(new Date());
  const color = DEPARTMENT_COLORS.RESCHEDULE;

  if (!isActive && (!missedCranes || missedCranes.length === 0)) {
    return null;
  }

  return (
    <div className={`rounded-lg shadow overflow-hidden ${isActive ? 'ring-2 ring-purple-400' : ''}`}>
      <div className={`px-4 py-3 ${color.bg} ${color.border} border-b`}>
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h3 className={`text-lg font-semibold ${color.text}`}>
                Reschedule Period
              </h3>
              {isActive && (
                <span className="px-2 py-0.5 text-xs font-medium bg-purple-500 text-white rounded-full animate-pulse">
                  ACTIVE
                </span>
              )}
            </div>
            {rescheduleWindow && (
              <p className={`text-sm ${color.text} opacity-75`}>
                {rescheduleWindow.startDate} to {rescheduleWindow.endDate}
              </p>
            )}
          </div>
          <div className={`text-right ${color.text}`}>
            <span className="text-2xl font-bold">{missedCranes?.length || 0}</span>
            <p className="text-xs">Missed Cranes</p>
          </div>
        </div>
      </div>

      {missedCranes && missedCranes.length > 0 ? (
        <div className="bg-white">
          <div className="p-3 bg-yellow-50 border-b border-yellow-200">
            <p className="text-sm text-yellow-800">
              The following cranes missed their maintenance window and can be rescheduled during this period.
            </p>
          </div>

          <div className="max-h-64 overflow-y-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    Crane
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    Department
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    Shed
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    Original Window
                  </th>
                  {isActive && (
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Action
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {missedCranes.map((crane) => {
                  const deptColor = DEPARTMENT_COLORS[crane.department];

                  return (
                    <tr
                      key={crane.crane_id}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        {crane.crane_number}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${deptColor.bg} ${deptColor.text}`}>
                          {crane.department}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {crane.shed_name}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {crane.original_window?.start} - {crane.original_window?.end}
                      </td>
                      {isActive && (
                        <td className="px-4 py-3">
                          <button
                            onClick={() => onNavigateToInspection && onNavigateToInspection(crane)}
                            className="px-3 py-1 text-xs font-medium bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors"
                          >
                            Inspect Now
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white p-4">
          <p className="text-gray-500 text-sm text-center">
            No missed cranes. All maintenance is up to date.
          </p>
        </div>
      )}
    </div>
  );
};

export default ReschedulePanel;
