import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { hbmAPI } from '../../services/api';
import ResendTelegramButton from './ResendTelegramButton';

const TANK_ORDER = [
  'Roughing Lub Tank',
  'Mill Lub Tank',
  'Air Oil Tank',
  'Mill Hydraulic Tank',
  'Twin Channel Tank-1',
  'Twin Channel Tank-2',
  'Twin Channel Tank-3',
];

const OilLevelView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [log, setLog] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchLog(); }, []); // eslint-disable-line

  const fetchLog = async () => {
    try {
      const res = await hbmAPI.getOilLevelLogById(id);
      setLog(res.data);
    } catch {
      toast.error('Failed to load Oil Level log');
      navigate('/hbm/oil-level/history');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }
  if (!log) return null;

  const canEdit = log.created_at && (Date.now() - new Date(log.created_at).getTime()) < 24 * 60 * 60 * 1000;

  const sortedEntries = [...(log.entries || [])].sort(
    (a, b) => TANK_ORDER.indexOf(a.tank_name) - TANK_ORDER.indexOf(b.tank_name)
  );

  const notOkCount = sortedEntries.filter(e => e.oil_status === 'NOT_OK').length;

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="max-w-4xl mx-auto">

        {/* Page Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <button onClick={() => navigate('/hbm/oil-level/history')}
              className="p-2 hover:bg-gray-200 rounded-lg transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Daily Oil Level Sheet #{log.id}</h1>
              <p className="text-sm text-gray-500">Tank oil levels, pressure &amp; temperature</p>
            </div>
          </div>
          <ResendTelegramButton type="oil-level" id={log.id} />
          {canEdit && (
            <button
              onClick={() => navigate('/hbm/oil-level/new', { state: { editData: log, editId: log.id } })}
              className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold rounded-lg transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Edit
            </button>
          )}
          
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
            <p className="text-xs text-gray-400 uppercase font-semibold">Shift Eng</p>
            <p className="font-bold text-gray-900 mt-1">{log.shift_eng || '—'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 uppercase font-semibold">Reading Taken By</p>
            <p className="font-bold text-gray-900 mt-1">{log.reading_by || '—'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 uppercase font-semibold">Filled By</p>
            <p className="font-bold text-gray-900 mt-1">{log.filled_by_name}</p>
          </div>
        </div>

        {/* Status Banner */}
        <div className={`rounded-xl border p-4 mb-5 ${notOkCount > 0 ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
          <p className="text-xs font-semibold text-gray-500 uppercase">Overall Oil Level Status</p>
          <p className={`text-xl font-bold mt-1 ${notOkCount > 0 ? 'text-red-700' : 'text-green-700'}`}>
            {notOkCount > 0 ? `${notOkCount} Tank${notOkCount > 1 ? 's' : ''} Below Threshold` : 'All Tanks OK'}
          </p>
        </div>

        {/* Tank Table */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-5">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[520px]">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-5 py-3 font-semibold text-gray-600">Tank</th>
                  <th className="text-left px-5 py-3 font-semibold text-gray-600">Oil Level</th>
                  <th className="text-left px-5 py-3 font-semibold text-gray-600">Status</th>
                  <th className="text-left px-5 py-3 font-semibold text-gray-600">Pressure (Kg/Cm²)</th>
                  <th className="text-left px-5 py-3 font-semibold text-gray-600">Temperature</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sortedEntries.map(entry => (
                  <tr key={entry.id} className="hover:bg-gray-50">
                    <td className="px-5 py-3 font-semibold text-gray-900">{entry.tank_name}</td>
                    <td className="px-5 py-3 text-gray-700">{entry.oil_level ?? '—'}</td>
                    <td className="px-5 py-3">
                      {entry.oil_status ? (
                        <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                          entry.oil_status === 'OK'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                        }`}>{entry.oil_status === 'OK' ? 'OK' : 'NOT OK'}</span>
                      ) : <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-5 py-3 text-gray-700">{entry.pressure ?? '—'}</td>
                    <td className="px-5 py-3 text-gray-700">{entry.temperature ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Remark */}
        {log.remark && (
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Remark</p>
            <p className="text-sm text-gray-800">{log.remark}</p>
          </div>
        )}

      </div>
    </div>
  );
};

export default OilLevelView;
