import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { ptmAPI } from '../../services/api';

const fmt = (d) => d ? new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', weekday: 'short' }) : '-';

function LogDetailModal({ logId, onClose }) {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    ptmAPI.getLogById(logId)
      .then(res => setDetail(res.data || res))
      .catch(() => toast.error('Failed to load'))
      .finally(() => setLoading(false));
  }, [logId]);

  // Group entries by section
  const sections = {};
  (detail?.entries || []).forEach(e => {
    const sec = e.section_name || 'General';
    if (!sections[sec]) sections[sec] = [];
    sections[sec].push(e);
  });

  const notOkCount = (detail?.entries || []).filter(e => e.status === 'NOT_OK').length;
  const okCount = (detail?.entries || []).filter(e => e.status === 'OK').length;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 overflow-y-auto py-6 px-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl relative">
        {/* Header */}
        <div className="sticky top-0 bg-white rounded-t-2xl border-b border-gray-200 px-6 py-4 flex items-start justify-between z-10">
          <div>
            <h2 className="text-lg font-bold text-gray-900">{detail?.template_name || 'Checksheet'}</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {detail ? fmt(detail.log_date) : '—'}
              {detail?.shift ? ` · Shift ${detail.shift}` : ''}
              {detail?.filled_by_name ? ` · ${detail.filled_by_name}` : ''}
            </p>
            {detail && (
              <div className="flex gap-2 mt-2">
                <span className="text-xs bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-medium">{okCount} OK</span>
                {notOkCount > 0 && <span className="text-xs bg-red-100 text-red-800 px-2 py-0.5 rounded-full font-medium">{notOkCount} NOT OK</span>}
              </div>
            )}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none font-bold mt-1">×</button>
        </div>

        {/* Body */}
        <div className="px-6 py-5">
          {loading ? (
            <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>
          ) : !detail ? (
            <p className="text-center text-gray-400 py-10">Failed to load</p>
          ) : (
            <>
              {detail.remark && (
                <div className="mb-4 bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-2 text-sm text-yellow-800 italic">
                  Remark: "{detail.remark}"
                </div>
              )}

              {Object.entries(sections).map(([section, entries]) => (
                <div key={section} className="mb-5">
                  <h3 className="text-sm font-bold text-gray-700 mb-2 pb-1 border-b border-gray-100">{section}</h3>
                  <div className="space-y-2">
                    {entries.map(entry => (
                      <div key={entry.id} className={`rounded-xl border p-3 ${entry.status === 'NOT_OK' ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-100'}`}>
                        <div className="flex items-start justify-between gap-3">
                          <span className="text-sm font-medium text-gray-800">{entry.item_name}</span>
                          <div className="flex gap-2 items-center shrink-0">
                            {entry.value_text && <span className="text-sm font-semibold text-gray-700">{entry.value_text}</span>}
                            {entry.status && (
                              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${entry.status === 'OK' ? 'bg-emerald-200 text-emerald-800' : 'bg-red-200 text-red-800'}`}>
                                {entry.status}
                              </span>
                            )}
                          </div>
                        </div>
                        {(entry.remark || entry.action_taken) && (
                          <div className="mt-2 space-y-1 text-xs">
                            {entry.remark && <div className="text-red-700"><span className="font-semibold">Remark:</span> {entry.remark}</div>}
                            {entry.action_taken && <div className="text-blue-700"><span className="font-semibold">Action:</span> {entry.action_taken}</div>}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {(detail?.entries || []).length === 0 && (
                <p className="text-center text-gray-400 py-8">No entries found</p>
              )}
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

export default function PtmChecksheetHistory() {
  const navigate = useNavigate();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [singleDate, setSingleDate] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [modalLogId, setModalLogId] = useState(null);

  const fetchLogs = async (from, to) => {
    setLoading(true);
    try {
      const res = await ptmAPI.getLogs({ date_from: from || undefined, date_to: to || undefined, limit: 200 });
      setLogs(res.data || res.logs || []);
    } catch {
      toast.error('Failed to load logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchLogs(); }, []);

  const handleSingleDate = (date) => {
    setSingleDate(date);
    setDateFrom('');
    setDateTo('');
    fetchLogs(date, date);
  };

  const handleRangeFilter = () => {
    setSingleDate('');
    fetchLogs(dateFrom, dateTo);
  };

  const handleClear = () => {
    setSingleDate('');
    setDateFrom('');
    setDateTo('');
    fetchLogs();
  };

  const typeColor = (type) => {
    if (type === 'dc-motor') return 'bg-blue-100 text-blue-700';
    if (type === 'mechanical') return 'bg-emerald-100 text-emerald-700';
    return 'bg-purple-100 text-purple-700';
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <div className="mb-6">
        <button type="button" onClick={() => navigate('/ptm/dashboard')}
          className="text-sm text-gray-500 hover:text-gray-700 mb-2 flex items-center gap-1">
          ← Back to Dashboard
        </button>
        <h1 className="text-2xl font-bold text-blue-800">PTM Checksheet History</h1>
        <p className="text-gray-500 text-sm mt-1">{logs.length} records found</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 mb-5 space-y-3">
        {/* Single date — quick view */}
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Quick — View a specific date</label>
          <div className="flex gap-2">
            <input type="date" value={singleDate} onChange={e => handleSingleDate(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
            {singleDate && (
              <span className="text-xs self-center text-blue-600 font-medium">Showing: {fmt(singleDate)}</span>
            )}
          </div>
        </div>

        <div className="border-t border-gray-100 pt-3">
          <label className="block text-xs font-semibold text-gray-600 mb-1">Or filter by date range</label>
          <div className="flex flex-wrap gap-2 items-center">
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
              placeholder="From"
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
            <span className="text-gray-400 text-sm">to</span>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
              placeholder="To"
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
            <button onClick={handleRangeFilter} className="bg-blue-600 text-white px-4 py-1.5 rounded-lg text-sm hover:bg-blue-700 font-medium">Filter</button>
            <button onClick={handleClear} className="border border-gray-300 text-gray-600 px-4 py-1.5 rounded-lg text-sm hover:bg-gray-50">Clear</button>
          </div>
        </div>
      </div>

      {/* Log list */}
      {loading ? (
        <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>
      ) : logs.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <div className="text-4xl mb-3">📋</div>
          <p className="font-medium">No checksheets found</p>
          {singleDate && <p className="text-sm mt-1">No records for {fmt(singleDate)}</p>}
        </div>
      ) : (
        <div className="space-y-2">
          {logs.map(log => (
            <div key={log.id}
              className="bg-white rounded-xl border border-gray-200 hover:border-blue-300 transition-all shadow-sm cursor-pointer"
              onClick={() => setModalLogId(log.id)}>
              <div className="px-4 py-3 flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-gray-800">{log.template_name}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${typeColor(log.template_type)}`}>
                      {log.template_type}
                    </span>
                    {parseInt(log.not_ok_count) > 0 && (
                      <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">
                        {log.not_ok_count} NOT OK
                      </span>
                    )}
                  </div>
                  <div className="flex gap-3 mt-1 text-xs text-gray-500 flex-wrap">
                    <span>{fmt(log.log_date)}</span>
                    {log.shift && <span>Shift {log.shift}</span>}
                    {log.filled_by_name && <span>by {log.filled_by_name}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-blue-600 font-medium hover:underline">View →</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Full detail modal */}
      {modalLogId && <LogDetailModal logId={modalLogId} onClose={() => setModalLogId(null)} />}
    </div>
  );
}
