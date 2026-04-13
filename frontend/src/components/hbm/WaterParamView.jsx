import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { hbmAPI } from '../../services/api';


const StatusBadge = ({ status }) => {
  if (!status) return <span className="text-gray-400 text-xs">—</span>;
  return status === 'OK'
    ? <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold">OK</span>
    : <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-semibold">NOT OK</span>;
};

const WaterParamView = () => {
  const { id } = useParams();
  const [log, setLog]           = useState(null);
  const [loading, setLoading]   = useState(true);
  const [downloading, setDownloading] = useState(false);

  const handleDownloadPDF = async () => {
    setDownloading(true);
    try {
      const res = await hbmAPI.downloadWaterParamPDF(id);
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `hbm_water_param_${id}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Failed to download PDF');
    } finally {
      setDownloading(false);
    }
  };

  useEffect(() => {
    hbmAPI.getWaterParamLogById(id)
      .then(res => setLog(res.data))
      .catch(() => toast.error('Failed to load Water Parameter log'))
      .finally(() => setLoading(false));
  }, [id]);

  const formatDate = (d) =>
    d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' }) : '—';

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!log) {
    return (
      <div className="p-8 text-center text-gray-400">Log not found.</div>
    );
  }

  const entries = log.entries || [];
  const notOkCount = entries.reduce((acc, e) => {
    ['tds_status', 'hardness_status', 'ph_status', 'temp_status'].forEach(k => {
      if (e[k] === 'NOT_OK') acc++;
    });
    return acc;
  }, 0);

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Link to="/hbm/water-param/history"
            className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-gray-900">Pump House Water Parameters</h1>
            <p className="text-sm text-gray-500">{formatDate(log.log_date)}</p>
          </div>
          {notOkCount > 0
            ? <span className="text-sm bg-red-100 text-red-700 px-3 py-1 rounded-full font-semibold">{notOkCount} NOT OK</span>
            : <span className="text-sm bg-green-100 text-green-700 px-3 py-1 rounded-full font-semibold">All OK</span>
          }
          <button
            onClick={handleDownloadPDF}
            disabled={downloading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
            {downloading ? (
              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            )}
            PDF
          </button>
        </div>

        {/* Log Info */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-5 grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide">Date</p>
            <p className="font-semibold text-gray-900 mt-0.5">{formatDate(log.log_date)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide">Filled By</p>
            <p className="font-semibold text-gray-900 mt-0.5">{log.filled_by_name}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide">Submitted</p>
            <p className="font-semibold text-gray-900 mt-0.5">
              {new Date(log.created_at).toLocaleString('en-IN')}
            </p>
          </div>
          {log.remark && (
            <div className="col-span-2 sm:col-span-3">
              <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide">Remark</p>
              <p className="text-gray-800 mt-0.5">{log.remark}</p>
            </div>
          )}
        </div>

        {/* Entries Table */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
            <h2 className="font-bold text-gray-800 text-sm">Water Source Readings</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-blue-50 border-b border-blue-100">
                  <th className="text-left px-4 py-2.5 font-semibold text-gray-700 min-w-[140px]">Source</th>
                  <th className="text-center px-3 py-2.5 font-semibold text-gray-600 text-xs">Status</th>
                  <th className="text-center px-3 py-2.5 font-semibold text-gray-600 text-xs">TDS</th>
                  <th className="text-center px-3 py-2.5 font-semibold text-gray-600 text-xs">Hardness</th>
                  <th className="text-center px-3 py-2.5 font-semibold text-gray-600 text-xs">PH</th>
                  <th className="text-center px-3 py-2.5 font-semibold text-gray-600 text-xs">Temp (°C)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {entries.map((e, idx) => {
                  const isOff = e.source_status === 'OFF';
                  return (
                    <tr key={idx} className={isOff ? 'bg-gray-50' : 'hover:bg-gray-50'}>
                      <td className="px-4 py-3 font-semibold text-gray-900">{e.water_source}</td>
                      <td className="px-3 py-3 text-center">
                        {e.source_status
                          ? <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                              isOff ? 'bg-gray-100 text-gray-500' : 'bg-green-100 text-green-700'
                            }`}>{e.source_status}</span>
                          : <span className="text-gray-400 text-xs">—</span>
                        }
                      </td>
                      <td className="px-3 py-3 text-center">
                        {isOff ? <span className="text-gray-400 text-xs">—</span> : (
                          <div>
                            <p className="font-medium text-gray-900">{e.tds ?? '—'}</p>
                            <StatusBadge status={e.tds_status} />
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-3 text-center">
                        {isOff ? <span className="text-gray-400 text-xs">—</span> : (
                          <div>
                            <p className="font-medium text-gray-900">{e.hardness ?? '—'}</p>
                            <StatusBadge status={e.hardness_status} />
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-3 text-center">
                        {isOff ? <span className="text-gray-400 text-xs">—</span> : (
                          <div>
                            <p className="font-medium text-gray-900">{e.ph ?? '—'}</p>
                            <StatusBadge status={e.ph_status} />
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-3 text-center">
                        {isOff ? <span className="text-gray-400 text-xs">—</span> : (
                          <div>
                            <p className="font-medium text-gray-900">{e.temperature ?? '—'}</p>
                            <StatusBadge status={e.temp_status} />
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
};

export default WaterParamView;
