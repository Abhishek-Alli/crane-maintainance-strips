import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { hbmAPI } from '../../services/api';
import ResendTelegramButton from './ResendTelegramButton';

const SECTION_META = {
  'SECTION-1': { label: 'Section 1 — Shear Machine',             color: 'bg-emerald-600', remarkKey: 'sec1_remark', resultKey: 'sec1_result', checkedKey: 'sec1_checked_by' },
  'SECTION-2': { label: 'Section 2 — Pinch Roll & Tail Breaker', color: 'bg-blue-600',    remarkKey: 'sec2_remark', resultKey: 'sec2_result', checkedKey: 'sec2_checked_by' },
  'SECTION-3': { label: 'Section 3 — Looper',                    color: 'bg-purple-600',  remarkKey: 'sec3_remark', resultKey: 'sec3_result', checkedKey: 'sec3_checked_by' },
  'SECTION-4': { label: 'Section 4 — Quenching Box',             color: 'bg-orange-600',  remarkKey: 'sec4_remark', resultKey: 'sec4_result', checkedKey: 'sec4_checked_by' },
  'SECTION-5': { label: 'Section 5 — Shifter',                   color: 'bg-rose-600',    remarkKey: 'sec5_remark', resultKey: 'sec5_result', checkedKey: 'sec5_checked_by' },
};

const MillMechView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [log, setLog] = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => { fetchLog(); }, []); // eslint-disable-line

  const handleDownloadPDF = async () => {
    setDownloading(true);
    try {
      const res = await hbmAPI.downloadPDF('mill-mech', id);
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `hbm_mill_mech_${id}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Failed to download PDF');
    } finally {
      setDownloading(false);
    }
  };

  const fetchLog = async () => {
    try {
      const res = await hbmAPI.getMillMechLogById(id);
      setLog(res.data);
    } catch {
      toast.error('Failed to load Mill Mechanical log');
      navigate('/hbm/mill-mech/history');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (t) => {
    if (!t) return '—';
    const [h, m] = t.split(':');
    const hour = parseInt(h);
    return `${hour % 12 || 12}:${m} ${hour >= 12 ? 'PM' : 'AM'}`;
  };

  const resultBadge = (result) => {
    if (!result) return null;
    return (
      <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
        result === 'OK' ? 'bg-green-100 text-green-700'
        : result === 'OFF' ? 'bg-gray-100 text-gray-600'
        : 'bg-red-100 text-red-700'
      }`}>{result === 'OK' ? 'OK' : result === 'OFF' ? 'OFF' : 'NOT OK'}</span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  if (!log) return null;

  // Group: section → block → items[]
  const grouped = {};
  log.items?.forEach(item => {
    if (!grouped[item.section_name]) grouped[item.section_name] = {};
    if (!grouped[item.section_name][item.block_name]) grouped[item.section_name][item.block_name] = [];
    grouped[item.section_name][item.block_name].push(item);
  });

  const notOkItems = log.items?.filter(i => i.status === 'NOT_OK') || [];

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="max-w-5xl mx-auto">

        {/* Page Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <button onClick={() => navigate('/hbm/mill-mech/history')}
              className="p-2 hover:bg-gray-200 rounded-lg transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Mill Mechanical Log #{log.id}</h1>
              <p className="text-sm text-gray-500">Mill Mechanical Checksheet</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ResendTelegramButton type="mill-mech" id={log.id} />
            <button onClick={handleDownloadPDF} disabled={downloading}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
              </svg>
              {downloading ? 'Downloading…' : 'Download PDF'}
            </button>
          </div>
        </div>

        {/* Summary Card */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-5 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <p className="text-xs text-gray-400 uppercase font-semibold">Date</p>
            <p className="font-bold text-gray-900 mt-1">
              {new Date(log.log_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-400 uppercase font-semibold">Time & Shift</p>
            <p className="font-bold text-gray-900 mt-1">{formatTime(log.log_time)}</p>
            <p className="text-xs text-gray-500">{log.shift} Shift</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 uppercase font-semibold">Filled By</p>
            <p className="font-bold text-gray-900 mt-1">{log.filled_by_name}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 uppercase font-semibold">Total Checks</p>
            <p className="font-bold text-gray-900 mt-1">{log.items?.length || 0}</p>
          </div>
        </div>

        {/* Status Summary */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          <div className={`rounded-xl border p-4 ${notOkItems.length > 0 ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
            <p className="text-xs font-semibold text-gray-500 uppercase">Overall Status</p>
            <p className={`text-2xl font-bold mt-1 ${notOkItems.length > 0 ? 'text-red-700' : 'text-green-700'}`}>
              {notOkItems.length > 0 ? `${notOkItems.length} NOT OK` : 'All OK'}
            </p>
          </div>
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
            <p className="text-xs font-semibold text-gray-500 uppercase">Sections</p>
            <p className="text-2xl font-bold text-gray-800 mt-1">5</p>
            <p className="text-xs text-gray-500">Shear · Pinch · Looper · Quench · Shifter</p>
          </div>
        </div>

        {/* NOT OK Summary */}
        {notOkItems.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-5 mb-5">
            <h3 className="font-bold text-red-800 mb-3">NOT OK Items — Issues Found</h3>
            <div className="space-y-3">
              {notOkItems.map(item => (
                <div key={item.id} className="bg-white rounded-lg border border-red-200 p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">{item.item_name}</p>
                      <p className="text-xs text-gray-500">{item.section_name} › {item.block_name}</p>
                    </div>
                    <span className="text-xs font-bold bg-red-100 text-red-700 px-2 py-1 rounded">NOT OK</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                    <div className="bg-red-50 rounded px-3 py-2">
                      <p className="text-xs font-semibold text-red-600">Remark</p>
                      <p className="text-sm text-gray-800 mt-0.5">{item.remark || '—'}</p>
                    </div>
                    <div className="bg-orange-50 rounded px-3 py-2">
                      <p className="text-xs font-semibold text-orange-600">Action Taken</p>
                      <p className="text-sm text-gray-800 mt-0.5">{item.action_taken || '—'}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Sections Detail */}
        {Object.entries(SECTION_META).map(([secKey, meta]) => {
          const blocks = grouped[secKey];
          if (!blocks || Object.keys(blocks).length === 0) return null;
          const remark  = log[meta.remarkKey];
          const result  = log[meta.resultKey];
          const checked = log[meta.checkedKey];
          return (
            <div key={secKey} className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-4">
              <div className={`px-5 py-3 ${meta.color}`}>
                <h3 className="font-bold text-white text-sm">{meta.label}</h3>
              </div>
              {Object.entries(blocks).map(([block, items]) => (
                <div key={block}>
                  <div className="px-5 py-2 bg-gray-100 border-b border-gray-200">
                    <h4 className="text-sm font-bold text-gray-700">{block}</h4>
                  </div>
                  {items.map(item => (
                    <div key={item.id}
                      className={`px-5 py-3 border-b border-gray-100 last:border-0 ${item.status === 'NOT_OK' ? 'bg-red-50' : ''}`}>
                      <div className="flex items-center justify-between">
                        <p className={`text-sm font-medium ${item.status === 'NOT_OK' ? 'text-red-800' : 'text-gray-800'}`}>
                          {item.item_name}
                        </p>
                        <span className={`text-sm font-bold px-3 py-1 rounded-lg ${
                          item.status === 'OK' ? 'bg-green-100 text-green-700'
                          : item.status === 'OFF' ? 'bg-gray-100 text-gray-600'
                          : 'bg-red-100 text-red-700'
                        }`}>{item.status === 'OK' ? 'OK' : item.status === 'OFF' ? 'OFF' : 'NOT OK'}</span>
                      </div>
                      {item.status === 'NOT_OK' && (
                        <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {item.remark && (
                            <p className="text-xs bg-red-100 text-red-700 rounded px-2 py-1">
                              <span className="font-semibold">Remark:</span> {item.remark}
                            </p>
                          )}
                          {item.action_taken && (
                            <p className="text-xs bg-orange-100 text-orange-700 rounded px-2 py-1">
                              <span className="font-semibold">Action:</span> {item.action_taken}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ))}
              {/* Section footer */}
              {(remark || result || checked) && (
                <div className="bg-gray-50 border-t border-gray-200 px-5 py-3 flex flex-wrap gap-4 text-sm">
                  {remark  && <div><span className="font-semibold text-gray-500 text-xs uppercase">Remark:</span> <span className="text-gray-800 ml-1">{remark}</span></div>}
                  {result  && <div><span className="font-semibold text-gray-500 text-xs uppercase">Result:</span> <span className="ml-1">{resultBadge(result)}</span></div>}
                  {checked && <div><span className="font-semibold text-gray-500 text-xs uppercase">Checked By:</span> <span className="text-gray-800 ml-1">{checked}</span></div>}
                </div>
              )}
            </div>
          );
        })}

      </div>
    </div>
  );
};

export default MillMechView;
