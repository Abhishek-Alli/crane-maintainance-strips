import React, { useState, useEffect } from 'react';
import DatePicker from 'react-datepicker';
import { toast } from 'react-toastify';
import { configAPI, craneAPI, reportAPI } from '../services/api';
import 'react-datepicker/dist/react-datepicker.css';

const ReportGenerator = () => {
  const [reportType, setReportType] = useState('monthly');

  // Date selections
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [weekStart, setWeekStart] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [fromDate, setFromDate] = useState(null);
  const [toDate, setToDate] = useState(new Date());

  // Filters
  const [departments, setDepartments] = useState([]);
  const [sheds, setSheds] = useState([]);
  const [cranes, setCranes] = useState([]);
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [selectedShed, setSelectedShed] = useState('');
  const [selectedCrane, setSelectedCrane] = useState('');
  const [alertsOnly, setAlertsOnly] = useState(false);

  // Preview
  const [previewData, setPreviewData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => { loadDepartments(); }, []);

  useEffect(() => {
    if (selectedDepartment) {
      loadSheds(selectedDepartment);
      setSelectedShed('');
      setSelectedCrane('');
    } else {
      setSheds([]);
      setCranes([]);
    }
  }, [selectedDepartment]);

  useEffect(() => {
    if (selectedShed) {
      loadCranes(selectedShed);
      setSelectedCrane('');
    } else {
      setCranes([]);
    }
  }, [selectedShed]);

  const loadDepartments = async () => {
    try {
      const res = await configAPI.getDepartments();
      setDepartments(res.data || []);
    } catch (e) { console.error(e); }
  };

  const loadSheds = async (deptId) => {
    try {
      const res = await configAPI.getSheds({ department_id: deptId });
      setSheds(res.data || []);
    } catch (e) { console.error(e); }
  };

  const loadCranes = async (shedId) => {
    try {
      const res = await craneAPI.getByShed(shedId);
      setCranes(res.data || []);
    } catch (e) { console.error(e); }
  };

  const buildReportParams = () => {
    const params = {
      report_type: reportType,
      include_alerts_only: alertsOnly
    };

    switch (reportType) {
      case 'daily':
        params.date = selectedDate.toISOString().split('T')[0];
        break;
      case 'weekly':
        if (weekStart) params.week_start = weekStart.toISOString().split('T')[0];
        break;
      case 'monthly':
        params.month = selectedMonth;
        params.year = selectedYear;
        break;
      case 'yearly':
        params.year = selectedYear;
        break;
      case 'custom':
        if (fromDate) params.from_date = fromDate.toISOString().split('T')[0];
        if (toDate) params.to_date = toDate.toISOString().split('T')[0];
        break;
      default: break;
    }

    if (selectedDepartment) params.department_id = selectedDepartment;
    if (selectedShed) params.shed_id = selectedShed;
    if (selectedCrane) params.crane_id = selectedCrane;

    return params;
  };

  const loadPreview = async () => {
    setLoading(true);
    try {
      const params = buildReportParams();
      const response = await reportAPI.getPreview(params);

      if (response.success) {
        setPreviewData(response.data);
        if (!response.data.inspections?.length) {
          toast.info('No inspection data found for the selected period');
        }
      } else {
        toast.error(response.message || 'Failed to load preview');
      }
    } catch (error) {
      console.error(error);
      toast.error(error.message || 'Failed to load report preview');
    } finally {
      setLoading(false);
    }
  };

  const handleExportExcel = async () => {
    setLoading(true);
    try {
      const data = buildReportParams();
      const response = await reportAPI.exportExcel(data);
      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      downloadBlob(blob, `Maintenance_Report_${reportType}_${new Date().toISOString().split('T')[0]}.xlsx`);
      toast.success('Excel report downloaded');
    } catch (error) {
      console.error(error);
      toast.error('Failed to export Excel');
    } finally {
      setLoading(false);
    }
  };

  const handleExportPDF = async () => {
    setLoading(true);
    try {
      const data = buildReportParams();
      const response = await reportAPI.exportPDF(data);
      const blob = new Blob([response.data], { type: 'application/pdf' });
      downloadBlob(blob, `Maintenance_Report_${reportType}_${new Date().toISOString().split('T')[0]}.pdf`);
      toast.success('PDF report downloaded');
    } catch (error) {
      console.error(error);
      toast.error('Failed to export PDF');
    } finally {
      setLoading(false);
    }
  };

  const downloadBlob = (blob, filename) => {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-IN') : '-';

  const reportTypes = [
    { key: 'daily', label: 'Daily' },
    { key: 'weekly', label: 'Weekly' },
    { key: 'monthly', label: 'Monthly' },
    { key: 'yearly', label: 'Yearly' },
    { key: 'custom', label: 'Custom' }
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-4 pb-24">
      <div className="max-w-4xl mx-auto space-y-4">

        {/* Header */}
        <div className="bg-white p-4 rounded-lg shadow">
          <h1 className="text-xl font-bold text-gray-900">Maintenance Reports</h1>
          <p className="text-sm text-gray-500 mt-1">Generate and export inspection reports</p>
        </div>

        {/* Report Config */}
        <div className="bg-white p-4 rounded-lg shadow space-y-4">

          {/* Report Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Report Type</label>
            <div className="flex gap-2 flex-wrap">
              {reportTypes.map(t => (
                <button
                  key={t.key}
                  onClick={() => { setReportType(t.key); setPreviewData(null); }}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    reportType === t.key
                      ? 'bg-blue-600 text-white shadow'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Date Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Date Selection</label>

            {reportType === 'daily' && (
              <DatePicker
                selected={selectedDate}
                onChange={setSelectedDate}
                dateFormat="dd/MM/yyyy"
                maxDate={new Date()}
                className="w-full p-2 border rounded-lg"
                placeholderText="Select date"
              />
            )}

            {reportType === 'weekly' && (
              <div>
                <DatePicker
                  selected={weekStart}
                  onChange={setWeekStart}
                  dateFormat="dd/MM/yyyy"
                  maxDate={new Date()}
                  className="w-full p-2 border rounded-lg"
                  placeholderText="Select week start date"
                />
                {weekStart && (
                  <p className="mt-1 text-xs text-gray-500">
                    Week: {formatDate(weekStart)} to {formatDate(new Date(new Date(weekStart).setDate(weekStart.getDate() + 6)))}
                  </p>
                )}
              </div>
            )}

            {reportType === 'monthly' && (
              <div className="grid grid-cols-2 gap-3">
                <select
                  value={selectedMonth}
                  onChange={e => setSelectedMonth(parseInt(e.target.value))}
                  className="p-2 border rounded-lg"
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                    <option key={m} value={m}>
                      {new Date(2000, m - 1).toLocaleString('default', { month: 'long' })}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  value={selectedYear}
                  onChange={e => setSelectedYear(parseInt(e.target.value))}
                  className="p-2 border rounded-lg"
                  min="2020" max={new Date().getFullYear()}
                />
              </div>
            )}

            {reportType === 'yearly' && (
              <input
                type="number"
                value={selectedYear}
                onChange={e => setSelectedYear(parseInt(e.target.value))}
                className="w-full p-2 border rounded-lg"
                min="2020" max={new Date().getFullYear()}
              />
            )}

            {reportType === 'custom' && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">From</label>
                  <DatePicker
                    selected={fromDate}
                    onChange={setFromDate}
                    dateFormat="dd/MM/yyyy"
                    maxDate={toDate || new Date()}
                    className="w-full p-2 border rounded-lg"
                    placeholderText="From date"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">To</label>
                  <DatePicker
                    selected={toDate}
                    onChange={setToDate}
                    dateFormat="dd/MM/yyyy"
                    minDate={fromDate}
                    maxDate={new Date()}
                    className="w-full p-2 border rounded-lg"
                    placeholderText="To date"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Filters */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Filters (Optional)</label>
            <div className="grid grid-cols-3 gap-3">
              <select
                value={selectedDepartment}
                onChange={e => setSelectedDepartment(e.target.value)}
                className="p-2 border rounded-lg text-sm"
              >
                <option value="">All Departments</option>
                {departments.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
              <select
                value={selectedShed}
                onChange={e => setSelectedShed(e.target.value)}
                className="p-2 border rounded-lg text-sm"
                disabled={!selectedDepartment}
              >
                <option value="">All Sheds</option>
                {sheds.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
              <select
                value={selectedCrane}
                onChange={e => setSelectedCrane(e.target.value)}
                className="p-2 border rounded-lg text-sm"
                disabled={!selectedShed}
              >
                <option value="">All Cranes</option>
                {cranes.map(c => (
                  <option key={c.id} value={c.id}>{c.crane_number}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Alerts Only */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={alertsOnly}
              onChange={e => setAlertsOnly(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded"
            />
            <span className="text-sm text-gray-700">Only show inspections with alerts</span>
          </label>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-3 border-t">
            <button
              onClick={loadPreview}
              disabled={loading}
              className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 font-medium text-sm transition-colors"
            >
              {loading ? 'Loading...' : 'Preview'}
            </button>
            <button
              onClick={handleExportExcel}
              disabled={loading}
              className="flex-1 px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 font-medium text-sm transition-colors"
            >
              Export Excel
            </button>
            <button
              onClick={handleExportPDF}
              disabled={loading}
              className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-400 font-medium text-sm transition-colors"
            >
              Export PDF
            </button>
          </div>
        </div>

        {/* Preview Section */}
        {previewData && (
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-lg font-bold mb-3 text-gray-800">Report Preview</h3>

            {!previewData.inspections?.length ? (
              <div className="text-center py-8 text-gray-500">
                <p className="text-lg font-medium">No Data Found</p>
                <p className="text-sm mt-1">Try adjusting the date range or filters.</p>
              </div>
            ) : (
              <>
                {/* Statistics */}
                <div className="grid grid-cols-5 gap-3 mb-4">
                  <div className="bg-blue-50 p-3 rounded-lg text-center">
                    <p className="text-xs text-gray-600">Total</p>
                    <p className="text-xl font-bold text-blue-600">
                      {previewData.statistics.total_inspections}
                    </p>
                  </div>
                  <div className="bg-orange-50 p-3 rounded-lg text-center">
                    <p className="text-xs text-gray-600">Alerts</p>
                    <p className="text-xl font-bold text-orange-600">
                      {previewData.statistics.inspections_with_alerts}
                    </p>
                  </div>
                  <div className="bg-green-50 p-3 rounded-lg text-center">
                    <p className="text-xs text-gray-600">OK</p>
                    <p className="text-xl font-bold text-green-600">
                      {previewData.statistics.ok_count}
                    </p>
                  </div>
                  <div className="bg-red-50 p-3 rounded-lg text-center">
                    <p className="text-xs text-gray-600">Not OK</p>
                    <p className="text-xl font-bold text-red-600">
                      {previewData.statistics.maintenance_required_count}
                    </p>
                  </div>
                  <div className="bg-purple-50 p-3 rounded-lg text-center">
                    <p className="text-xs text-gray-600">Cranes</p>
                    <p className="text-xl font-bold text-purple-600">
                      {previewData.statistics.unique_cranes}
                    </p>
                  </div>
                </div>

                {/* Data Table */}
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Department</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Crane</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Shed</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Alerts</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Recorded By</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {previewData.inspections.map((insp, idx) => (
                        <tr key={idx} className={insp.has_alerts ? 'bg-red-50' : ''}>
                          <td className="px-3 py-2">{formatDate(insp.inspection_date)}</td>
                          <td className="px-3 py-2">{insp.department}</td>
                          <td className="px-3 py-2">{insp.crane_number}</td>
                          <td className="px-3 py-2">{insp.shed}</td>
                          <td className="px-3 py-2">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                              insp.has_alerts
                                ? 'bg-red-100 text-red-800'
                                : 'bg-green-100 text-green-800'
                            }`}>
                              {insp.has_alerts ? 'NOT OK' : 'OK'}
                            </span>
                          </td>
                          <td className="px-3 py-2">{insp.has_alerts ? 'Yes' : 'No'}</td>
                          <td className="px-3 py-2">{insp.recorded_by || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ReportGenerator;
