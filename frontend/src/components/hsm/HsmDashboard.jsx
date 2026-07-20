import React from 'react';

const HsmDashboard = () => {
  const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">HSM Dashboard</h1>
          <p className="text-gray-500 mt-1 text-sm">{today}</p>
        </div>

        {/* Empty state — checksheets get added here one at a time */}
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <span className="text-4xl mb-3 block">🛠</span>
          <p className="font-semibold text-gray-700">No HSM checksheets yet</p>
          <p className="text-sm text-gray-500 mt-1">Checksheets for this module will appear here as they're added.</p>
        </div>

      </div>
    </div>
  );
};

export default HsmDashboard;
