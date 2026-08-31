import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { hbmAPI } from '../../services/api';
import ResendTelegramButton from './ResendTelegramButton';

const DcMotorView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [log, setLog] = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => { fetchLog(); }, []); // eslint-disable-line

  const fetchLog = async () => {
    try {
      const res = await hbmAPI.getDcMotorLogById(id);
      setLog(res.data);
    } catch {
      toast.error('Failed to load DC motor log');
      navigate('/hbm/dc-motor/history');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = async () => {
    setDownloading(true);
    try {
      const res = await hbmAPI.downloadPDF('dc-motor', id);
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `hbm_dc_motor_${id}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Failed to download PDF');
    } finally {
      setDownloading(false);
    }
  };

  const formatTime = (t) => {
    if (!t) return '—';
    const [h, m] = t.split(':');
    const hour = parseInt(h);
    return `${hour % 12 || 12}:${m} ${hour >= 12 ? 'PM' : 'AM'}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  if (!log) return null;

  const canEdit = log.created_at && (Date.now() - new Date(log.created_at).getTime()) < 24 * 60 * 60 * 1000;

  // Group items by block → section
  const grouped = {};
  log.items?.forEach(item => {
    if (!grouped[item.block_name]) grouped[item.block_name] = {};
    if (!grouped[item.block_name][item.section_name]) grouped[item.block_name][item.section_name] = [];
    grouped[item.block_name][item.section_name].push(item);
  });

  const notOkItems = log.items?.filter(i => i.status === 'NOT_OK') || [];

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <button onClick={() => navigate('/hbm/dc-motor/history')}
              className="p-2 hover:bg-gray-200 rounded-lg transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <h1 className="text-xl font-bold text-gray-900">DC Motor Log #{log.id}</h1>
              <p className="text-sm text-gray-500">DC Motor Maintenance Checksheet</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {canEdit && (
              <button
                onClick={() => navigate(`/hbm/dc-motor/new`, { state: { editData: log, editId: log.id } })}
                className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold rounded-lg transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Edit
              </button>
            )}
            <ResendTelegramButton type="dc-motor" id={log.id} />
            <button onClick={handleDownloadPDF} disabled={downloading}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
              </svg>
              {downloading ? 'Downloading…' : 'Download PDF'}
            </button>
          </div>
        </div>

        {/* Summary */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-5 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <p className="text-xs text-gray-400 uppercase font-semibold">Date</p>
            <p className="font-bold text-gray-900 mt-1">{new Date(log.log_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 uppercase font-semibold">Time & Shift</p>
            <p className="font-bold text-gray-900 mt-1">{formatTime(log.log_time)}</p>
            <p className="text-xs text-gray-500">{log.shift} Shift</p>
          </div>
          {(log.heat_start || log.heat_end) && (
            <div>
              <p className="text-xs text-gray-400 uppercase font-semibold">Heat Over Time</p>
              <p className="font-bold text-gray-900 mt-1">{formatTime(log.heat_start)} → {formatTime(log.heat_end)}</p>
            </div>
          )}
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
            <p className="text-xs font-semibold text-gray-500 uppercase">Total Checks</p>
            <p className="text-2xl font-bold text-gray-800 mt-1">{log.items?.length || 0}</p>
          </div>
        </div>

        {log.remarks && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl px-5 py-3 mb-5">
            <p className="text-xs text-blue-500 font-semibold uppercase">Remarks</p>
            <p className="text-sm text-blue-900 mt-1">{log.remarks}</p>
          </div>
        )}

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
                      <p className="text-xs text-gray-500">{item.block_name} › {item.section_name}</p>
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

        {/* All Blocks */}
        <div className="space-y-3">
          {Object.entries(grouped).map(([block, sections]) => (
            <div key={block} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-5 py-3 bg-emerald-600">
                <h3 className="font-bold text-white">{block}</h3>
              </div>
              {Object.entries(sections).map(([section, items]) => (
                <div key={section}>
                  <div className="px-5 py-2 bg-gray-100 border-b border-gray-200">
                    <h4 className="text-sm font-bold text-gray-700">{section}</h4>
                  </div>
                  {items.map(item => (
                    <div key={item.id} className={`px-5 py-3 border-b border-gray-100 last:border-0 ${item.status === 'NOT_OK' ? 'bg-red-50' : ''}`}>
                      <div className="flex items-center justify-between">
                        <p className={`text-sm font-medium ${item.status === 'NOT_OK' ? 'text-red-800' : 'text-gray-800'}`}>
                          {item.item_name}
                        </p>
                        <span className={`text-sm font-bold px-3 py-1 rounded-lg ${
                          item.status === 'OK' ? 'bg-green-100 text-green-700'
                          : item.status === 'OFF' ? 'bg-gray-100 text-gray-600'
                          : 'bg-red-100 text-red-700'}`}>
                          {item.status === 'OK' ? 'OK' : item.status === 'OFF' ? 'OFF' : 'NOT OK'}
                        </span>
                      </div>
                      {item.status === 'NOT_OK' && (
                        <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {item.remark && <p className="text-xs bg-red-100 text-red-700 rounded px-2 py-1"><span className="font-semibold">Remark:</span> {item.remark}</p>}
                          {item.action_taken && <p className="text-xs bg-orange-100 text-orange-700 rounded px-2 py-1"><span className="font-semibold">Action:</span> {item.action_taken}</p>}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          ))}
        </div>

      </div>
    </div>
  );
};

export default DcMotorView;
