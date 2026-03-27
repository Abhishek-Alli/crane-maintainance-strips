import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { hbmAPI } from '../../services/api';

const CHECKSHEET_TYPES = [
  { value: 'dc-motor', label: 'DC Motor', fetchLogs: (p) => hbmAPI.getDcMotorLogs(p) },
  { value: 'rolling-stand', label: 'Rolling Stand', fetchLogs: (p) => hbmAPI.getRollingStandLogs(p) },
  { value: 'mill-mech', label: 'Mill Mechanical', fetchLogs: (p) => hbmAPI.getMillMechLogs(p) },
  { value: 'cooling-bed', label: 'Cooling Bed', fetchLogs: (p) => hbmAPI.getCoolingBedLogs(p) },
  { value: 'pumphouse', label: 'Pumphouse', fetchLogs: (p) => hbmAPI.getPumpHouseLogs(p) },
  { value: 'bar-bundle', label: 'Bar Bundle Area', fetchLogs: (p) => hbmAPI.getBarBundleLogs(p) },
  { value: 'before-rolling', label: 'Before Rolling', fetchLogs: (p) => hbmAPI.getBeforeRollingLogs(p) },
];

function getDatesInRange(from, to) {
  const dates = [];
  const cur = new Date(from + 'T00:00:00');
  const end = new Date(to + 'T00:00:00');
  while (cur <= end) {
    dates.push(cur.toISOString().split('T')[0]);
    cur.setDate(cur.getDate() + 1);
  }
  return dates;
}

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
}

export default function DownloadChecksheet() {
  const today = new Date().toLocaleDateString('en-CA');
  const [selectedType, setSelectedType] = useState('dc-motor');
  const [fromDate, setFromDate] = useState(today);
  const [toDate, setToDate] = useState(today);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [downloading, setDownloading] = useState(null);

  const typeConfig = CHECKSHEET_TYPES.find((t) => t.value === selectedType);

  const handleSearch = async () => {
    if (!fromDate || !toDate) { setError('Please select both dates.'); return; }
    if (fromDate > toDate) { setError('From date cannot be after To date.'); return; }
    setError('');
    setLoading(true);
    setResults(null);
    try {
      const data = await typeConfig.fetchLogs({ date_from: fromDate, date_to: toDate, limit: 500 });
      const logs = Array.isArray(data) ? data : (data?.logs || data?.data || []);

      // Build a map: date -> array of logs
      const logMap = {};
      logs.forEach((log) => {
        const d = log.log_date ? log.log_date.split('T')[0] : null;
        if (!d) return;
        if (!logMap[d]) logMap[d] = [];
        logMap[d].push(log);
      });

      const allDates = getDatesInRange(fromDate, toDate);
      setResults(allDates.map((date) => ({ date, logs: logMap[date] || [] })));
    } catch (err) {
      setError('Failed to fetch records. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (id, dateStr, shift) => {
    const key = `${id}`;
    setDownloading(key);
    try {
      const response = await hbmAPI.downloadPDF(selectedType, id);
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      const shiftPart = shift ? `-${shift}` : '';
      link.download = `${selectedType}-${dateStr}${shiftPart}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch {
      alert('Download failed. Please try again.');
    } finally {
      setDownloading(null);
    }
  };

  const filledCount = results ? results.filter((r) => r.logs.length > 0).length : 0;
  const notFilledCount = results ? results.filter((r) => r.logs.length === 0).length : 0;

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-1">
            <Link to="/hbm/dashboard" title="Back to Dashboard"
              className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <h1 className="text-2xl font-bold text-gray-800">Download Checksheets</h1>
          </div>
          <p className="text-gray-500 text-sm mt-1 ml-11">Select a checksheet type and date range to download PDFs</p>
        </div>

        {/* Filter Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 mb-6">
          <div className="space-y-4">
            {/* Checksheet Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Checksheet Type</label>
              <select
                value={selectedType}
                onChange={(e) => { setSelectedType(e.target.value); setResults(null); }}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
              >
                {CHECKSHEET_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>

            {/* Date Range */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">From Date</label>
                <input
                  type="date"
                  value={fromDate}
                  max={today}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">To Date</label>
                <input
                  type="date"
                  value={toDate}
                  max={today}
                  onChange={(e) => setToDate(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            {error && <p className="text-red-600 text-sm">{error}</p>}

            <button
              onClick={handleSearch}
              disabled={loading}
              className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Fetching...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  Search
                </>
              )}
            </button>
          </div>
        </div>

        {/* Summary */}
        {results && (
          <div className="flex gap-3 mb-4">
            <div className="flex-1 bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-emerald-700">{filledCount}</div>
              <div className="text-xs text-emerald-600 font-medium">Filled</div>
            </div>
            <div className="flex-1 bg-red-50 border border-red-200 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-red-600">{notFilledCount}</div>
              <div className="text-xs text-red-500 font-medium">Not Filled</div>
            </div>
            <div className="flex-1 bg-gray-50 border border-gray-200 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-gray-700">{results.length}</div>
              <div className="text-xs text-gray-500 font-medium">Total Days</div>
            </div>
          </div>
        )}

        {/* Results List */}
        {results && (
          <div className="space-y-2">
            {results.map(({ date, logs }) => (
              <div
                key={date}
                className={`bg-white rounded-xl border shadow-sm overflow-hidden ${logs.length === 0 ? 'border-red-200' : 'border-gray-200'}`}
              >
                {logs.length === 0 ? (
                  /* Not filled */
                  <div className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                        <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </div>
                      <div>
                        <p className="font-medium text-gray-800 text-sm">{formatDate(date)}</p>
                        <p className="text-xs text-red-500 font-medium">Checksheet not filled</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Filled - one or more shifts */
                  <div>
                    <div className="px-4 py-2 bg-emerald-50 border-b border-emerald-100 flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                        <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <p className="font-semibold text-gray-800 text-sm">{formatDate(date)}</p>
                      <span className="ml-auto text-xs text-emerald-600 font-medium">{logs.length} record{logs.length > 1 ? 's' : ''}</span>
                    </div>
                    {logs.map((log) => (
                      <div key={log.id} className="flex items-center justify-between px-4 py-2.5 border-b last:border-0 border-gray-100">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              {log.shift && (
                                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${log.shift === 'DAY' ? 'bg-yellow-100 text-yellow-700' : log.shift === 'NIGHT' ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-600'}`}>
                                  {log.shift}
                                </span>
                              )}
                              {log.log_time && (
                                <span className="text-xs text-gray-500">{log.log_time.slice(0, 5)}</span>
                              )}
                              {log.filled_by_name && (
                                <span className="text-xs text-gray-500 truncate">by {log.filled_by_name}</span>
                              )}
                              {log.not_ok_count > 0 && (
                                <span className="text-xs bg-red-100 text-red-600 font-medium px-2 py-0.5 rounded-full">{log.not_ok_count} issues</span>
                              )}
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => handleDownload(log.id, date, log.shift)}
                          disabled={downloading === `${log.id}`}
                          className="flex-shrink-0 flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ml-3"
                        >
                          {downloading === `${log.id}` ? (
                            <svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                            </svg>
                          ) : (
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                          )}
                          PDF
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
