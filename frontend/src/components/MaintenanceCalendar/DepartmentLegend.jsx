import React from 'react';
import { DEPARTMENT_COLORS } from '../../utils/maintenanceSchedule';

const DepartmentLegend = () => {
  const departments = [
    { code: 'HSM', label: 'HSM (Days 1-5)' },
    { code: 'HBM', label: 'HBM (Days 6-12)' },
    { code: 'PTM', label: 'PTM (Days 13-23)' },
    { code: 'RESCHEDULE', label: 'Reschedule (Days 24+)' }
  ];

  return (
    <div className="flex flex-wrap gap-4 mb-4 p-3 bg-gray-50 rounded-lg">
      {departments.map(dept => (
        <div key={dept.code} className="flex items-center gap-2">
          <div
            className={`w-4 h-4 rounded ${DEPARTMENT_COLORS[dept.code].bg} ${DEPARTMENT_COLORS[dept.code].border} border`}
          />
          <span className="text-sm text-gray-700">{dept.label}</span>
        </div>
      ))}
    </div>
  );
};

export default DepartmentLegend;
