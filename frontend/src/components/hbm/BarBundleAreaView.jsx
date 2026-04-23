import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { hbmAPI } from '../../services/api';
import ResendTelegramButton from './ResendTelegramButton';

const SECTION_META = {
  'SECTION-1': { label: 'Section 1 — Roller Conveyor Checksheet',       color: 'bg-indigo-600', resultKey: 'sec1_result' },
  'SECTION-2': { label: 'Section 2 — Kick-Off Mechanisms Checksheet',   color: 'bg-orange-600', resultKey: 'sec2_result' },
  'SECTION-3': { label: 'Section 3 — Chain Transfer Beds Checksheet',   color: 'bg-teal-600',   resultKey: 'sec3_result' },
  'SECTION-4': { label: 'Section 4 — Bending Machine Checksheet',       color: 'bg-rose-600',   resultKey: 'sec4_result' },
};

const BarBundleAreaView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [log, setLog] = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => { fetchLog(); }, []); // eslint-disable-line

  const fetchLog = async () => {
    try {
      const res = await hbmAPI.getBarBundleLogById(id);
      setLog(res.data);
    } catch {
      toast.error('Failed to load Bar Bundle Area log');
      navigate('/hbm/bar-bundle/history');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = async () => {
    setDownloading(true);
    try {
      const res = await hbmAPI.downloadPDF('bar-bundle', id);
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `hbm_bar_bundle_${id}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Failed to download PDF');
    } finally {
      setDownloading(false);
    }
  };

  const resultBadge = (result) => {
    if (!result) return null;
    return (
      <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
        result === 'OK' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
      }`}>{result === 'OK' ? 'OK' : 'NOT OK'}</span>
    );
  };

  const statusBadge = (status) => {
    if (status === 'OK')     return <span className="text-sm font-bold px-3 py-1 rounded-lg bg-green-100 text-green-700">OK</span>;
    if (status === 'NOT_OK') return <span className="text-sm font-bold px-3 py-1 rounded-lg bg-red-100 text-red-700">NOT OK</span>;
    if (status === 'OFF')    return <span className="text-sm font-bold px-3 py-1 rounded-lg bg-gray-100 text-gray-600">OFF</span>;
    return null;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!log) return null;

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
            <button onClick={() => navigate('/hbm/bar-bundle/history')}
              className="p-2 hover:bg-gray-200 rounded-lg transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Bar Bundle Area Log #{log.id}</h1>
              <p className="text-sm text-gray-500">Bar Bundle Area Checksheet</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ResendTelegramButton type="bar-bundle" id={log.id} />
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
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-5 grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div>
            <p className="text-xs text-gray-400 uppercase font-semibold">Date</p>
            <p className="font-bold text-gray-900 mt-1">
              {new Date(log.log_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-400 uppercase font-semibold">Checked By</p>
            <p className="font-bold text-gray-900 mt-1">{log.checked_by || '—'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 uppercase font-semibold">Filled By</p>
            <p className="font-bold text-gray-900 mt-1">{log.filled_by_name}</p>
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
            <p className="text-2xl font-bold text-gray-800 mt-1">4</p>
            <p className="text-xs text-gray-500">RC · Kick-Off · Chain Transfer · Bending</p>
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
                    <span className="text-xs font-bold bg-red-100 text-red-700 px-2 py-1 rounded ml-3 flex-shrink-0">NOT OK</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                    {item.remark && (
                      <div className="bg-red-50 rounded px-3 py-2">
                        <p className="text-xs font-semibold text-red-600">Remark</p>
                        <p className="text-sm text-gray-800 mt-0.5">{item.remark}</p>
                      </div>
                    )}
                    {item.action_taken && (
                      <div className="bg-orange-50 rounded px-3 py-2">
                        <p className="text-xs font-semibold text-orange-600">Action Taken</p>
                        <p className="text-sm text-gray-800 mt-0.5">{item.action_taken}</p>
                      </div>
                    )}
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
          const result = log[meta.resultKey];

          return (
            <div key={secKey} className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-4">
              <div className={`px-5 py-3 flex items-center justify-between ${meta.color}`}>
                <h3 className="font-bold text-white text-sm">{meta.label}</h3>
                {result && resultBadge(result)}
              </div>

              {Object.entries(blocks).map(([block, items]) => {
                const blockRemark = items[0]?.block_remark;
                return (
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
                          {statusBadge(item.status)}
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
                    {blockRemark && (
                      <div className="px-5 py-2 bg-yellow-50 border-t border-yellow-100">
                        <p className="text-xs text-yellow-800">
                          <span className="font-semibold uppercase">Remark:</span> {blockRemark}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}

              {result && (
                <div className="bg-gray-50 border-t border-gray-200 px-5 py-3 flex items-center gap-3">
                  <span className="text-xs font-semibold text-gray-500 uppercase">Result:</span>
                  {resultBadge(result)}
                </div>
              )}
            </div>
          );
        })}

      </div>
    </div>
  );
};

export default BarBundleAreaView;
