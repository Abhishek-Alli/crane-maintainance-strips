import React, { useState } from 'react';
import { STATUS_COLORS, DEPARTMENT_COLORS } from '../../utils/maintenanceSchedule';

const StatusBadge = ({ status }) => {
  const colors = STATUS_COLORS[status] || STATUS_COLORS.PENDING;
  return (
    <span className={`px-2 py-1 text-xs font-medium rounded-full ${colors.bg} ${colors.text}`}>
      {status}
    </span>
  );
};

const STATUS_OPTIONS = ['COMPLETED', 'MISSED', 'PENDING', 'RESCHEDULED'];

const CraneStatusList = ({ cranes, department, window: windowInfo, onCraneClick, onMarkStatus }) => {
  const [markingId, setMarkingId] = useState(null);
  const [noteInputs, setNoteInputs] = useState({});

  if (!cranes || cranes.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-4">
        <h3 className="text-lg font-semibold text-gray-800 mb-2">{department} Cranes</h3>
        <p className="text-gray-500 text-sm">No cranes found for this department.</p>
      </div>
    );
  }

  const color = DEPARTMENT_COLORS[department];

  const handleMark = async (crane, status) => {
    if (!onMarkStatus) return;
    const note = noteInputs[crane.crane_id] || '';
    setMarkingId(crane.crane_id);
    try {
      await onMarkStatus(crane, status, note);
    } finally {
      setMarkingId(null);
      setNoteInputs(prev => ({ ...prev, [crane.crane_id]: '' }));
    }
  };

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className={`px-4 py-3 ${color.bg} ${color.border} border-b`}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className={`text-lg font-semibold ${color.text}`}>{department} Cranes</h3>
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

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Crane</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Shed</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Completed</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Notes</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {cranes.map((crane) => (
              <tr key={crane.crane_id} className="hover:bg-gray-50 transition-colors">
                <td
                  className="px-4 py-3 text-sm font-medium text-gray-900 cursor-pointer"
                  onClick={() => onCraneClick && onCraneClick(crane)}
                >
                  {crane.crane_number}
                </td>
                <td className="px-4 py-3 text-sm text-gray-500">{crane.shed_name}</td>
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
                <td className="px-4 py-3">
                  <input
                    type="text"
                    placeholder="Optional note"
                    value={noteInputs[crane.crane_id] || ''}
                    onChange={e =>
                      setNoteInputs(prev => ({ ...prev, [crane.crane_id]: e.target.value }))
                    }
                    className="text-xs border border-gray-300 rounded px-2 py-1 w-32 focus:outline-none focus:ring-1 focus:ring-blue-400"
                  />
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-1 flex-wrap">
                    {STATUS_OPTIONS.filter(s => s !== crane.status).map(s => {
                      const btnColors = {
                        COMPLETED:   'bg-green-100 text-green-700 hover:bg-green-200',
                        MISSED:      'bg-red-100 text-red-700 hover:bg-red-200',
                        PENDING:     'bg-yellow-100 text-yellow-700 hover:bg-yellow-200',
                        RESCHEDULED: 'bg-purple-100 text-purple-700 hover:bg-purple-200',
                      };
                      return (
                        <button
                          key={s}
                          disabled={markingId === crane.crane_id}
                          onClick={() => handleMark(crane, s)}
                          className={`text-xs px-2 py-1 rounded font-medium transition-colors ${btnColors[s]} disabled:opacity-50`}
                        >
                          {markingId === crane.crane_id ? '...' : s}
                        </button>
                      );
                    })}
                  </div>
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
