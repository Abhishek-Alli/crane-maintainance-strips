import React from 'react';
import { STATUS_COLORS, DEPARTMENT_COLORS } from '../../utils/maintenanceSchedule';

const StatusBadge = ({ status }) => {
  const colors = STATUS_COLORS[status] || STATUS_COLORS.PENDING;

  return (
    <span className={`px-2 py-1 text-xs font-medium rounded-full ${colors.bg} ${colors.text}`}>
      {status}
    </span>
  );
};

const CraneStatusList = ({ cranes, department, window: windowInfo, onCraneClick }) => {
  if (!cranes || cranes.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-4">
        <h3 className="text-lg font-semibold text-gray-800 mb-2">
          {department} Cranes
        </h3>
        <p className="text-gray-500 text-sm">No cranes found for this department.</p>
      </div>
    );
  }

  const color = DEPARTMENT_COLORS[department];

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className={`px-4 py-3 ${color.bg} ${color.border} border-b`}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className={`text-lg font-semibold ${color.text}`}>
              {department} Cranes
            </h3>
            {windowInfo && (
              <p className={`text-sm ${color.text} opacity-75`}>
                Window: {windowInfo.startDate} to {windowInfo.endDate}
              </p>
            )}
          </div>
          <div className={`text-right ${color.text}`}>
            <span className="text-2xl font-bold">{cranes.length}</span>
            <p className="text-xs">Total Cranes</p>
          </div>
        </div>
      </div>

      <div className="max-h-96 overflow-y-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50 sticky top-0">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                Crane
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                Shed
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                Status
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                Completed
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {cranes.map((crane) => (
              <tr
                key={crane.crane_id}
                className="hover:bg-gray-50 cursor-pointer transition-colors"
                onClick={() => onCraneClick && onCraneClick(crane)}
              >
                <td className="px-4 py-3 text-sm font-medium text-gray-900">
                  {crane.crane_number}
                </td>
                <td className="px-4 py-3 text-sm text-gray-500">
                  {crane.shed_name}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={crane.status} />
                  {crane.completed_in_reschedule && (
                    <span className="ml-1 text-xs text-purple-600">(R)</span>
                  )}
                  {crane.manually_marked && (
                    <span className="ml-1 text-xs text-gray-400">(M)</span>
                  )}
                </td>
                <td className="px-4 py-3 text-sm text-gray-500">
                  {crane.completed_date || '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default CraneStatusList;
