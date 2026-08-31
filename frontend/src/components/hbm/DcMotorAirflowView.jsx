import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { hbmAPI } from '../../services/api';
import ResendTelegramButton from './ResendTelegramButton';

const STAND_ORDER = [
  'C-1', 'C-2', 'CCS-1', 'C-3', 'C-4', 'CCS-2',
  'C-5', 'C-6', 'C-7', 'C-8', 'C-9', 'C-10',
  'C-11', 'C-12', 'C-13', 'C-14',
  'PRE PINCH', 'POST PINCH', 'CONST. SHEAR',
  'TB-1', 'TB-2', 'RAKE-1', 'RAKE-2',
];

const StatusChip = ({ status }) => {
  if (!status) return <span className="text-gray-400">—</span>;
  return (
    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
      status === 'OK' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
    }`}>
      {status === 'NOT_OK' ? 'NOT OK' : 'OK'}
    </span>
  );
};

const Val = ({ v, unit }) =>
  v != null ? <>{v}{unit && <span className="text-gray-400 text-xs ml-0.5">{unit}</span>}</> : <span className="text-gray-400">—</span>;

const DcMotorAirflowView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [log, setLog] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchLog(); }, []); // eslint-disable-line

  const fetchLog = async () => {
    try {
      const res = await hbmAPI.getDcMotorAirflowLogById(id);
      setLog(res.data);
    } catch {
      toast.error('Failed to load DC Motor Airflow log');
      navigate('/hbm/dc-motor-airflow/history');
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

  const sorted = [...(log.entries || [])].sort(
    (a, b) => STAND_ORDER.indexOf(a.stand_name) - STAND_ORDER.indexOf(b.stand_name)
  );

  const notOkCount = sorted.filter(e =>
    e.kpa_status === 'NOT_OK' || e.air_flow_condition === 'NOT_OK' ||
    e.dc_motor_temp_status === 'NOT_OK' || e.de_bearing_temp_status === 'NOT_OK' ||
    e.nde_bearing_temp_status === 'NOT_OK' || e.blower_motor_temp_status === 'NOT_OK' ||
    e.motor_center_vib_status === 'NOT_OK' || e.encoder_side_vib_status === 'NOT_OK' ||
    e.blower_vib_status === 'NOT_OK'
  ).length;

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">

        {/* Page Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <button onClick={() => navigate('/hbm/dc-motor-airflow/history')}
              className="p-2 hover:bg-gray-200 rounded-lg transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <h1 className="text-xl font-bold text-gray-900">DC Motor Airflow Report #{log.id}</h1>
              <p className="text-sm text-gray-500">Air Flow, Temperature &amp; Vibration</p>
            </div>
          </div>
          <ResendTelegramButton type="dc-motor-airflow" id={log.id} />
          {canEdit && (
            <button
              onClick={() => navigate('/hbm/dc-motor-airflow/new', { state: { editData: log, editId: log.id } })}
              className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold rounded-lg transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Edit
            </button>
          )}
          
        </div>

        {/* Summary */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-5 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <p className="text-xs text-gray-400 uppercase font-semibold">Date</p>
            <p className="font-bold text-gray-900 mt-1">
              {new Date(log.log_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-400 uppercase font-semibold">Shift Engineer</p>
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
        {log.mill_status === 'OFF' ? (
          <div className="rounded-xl border p-4 mb-5 bg-gray-100 border-gray-300">
            <p className="text-xs font-semibold text-gray-500 uppercase">Overall Status</p>
            <p className="text-xl font-bold mt-1 text-gray-700">Mill OFF — no readings taken</p>
          </div>
        ) : (
          <div className={`rounded-xl border p-4 mb-5 ${notOkCount > 0 ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
            <p className="text-xs font-semibold text-gray-500 uppercase">Overall Status</p>
            <p className={`text-xl font-bold mt-1 ${notOkCount > 0 ? 'text-red-700' : 'text-green-700'}`}>
              {notOkCount > 0 ? `${notOkCount} Stand${notOkCount > 1 ? 's' : ''} with NOT OK readings` : 'All Readings OK'}
            </p>
          </div>
        )}

        {/* Stand Table */}
        {log.mill_status !== 'OFF' && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-5">
          <div className="overflow-x-auto">
            <table className="w-full text-xs min-w-[1100px]">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 sticky left-0 bg-gray-50">Stand</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">DC Motor KW</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Blower KW</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">KPA</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Air Flow</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Motor Temp (°C)</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">DE Bearing (°C)</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">NDE Bearing (°C)</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Blower Temp (°C)</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Motor Vib (MM/S)</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Encoder Vib (MM/S)</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Blower Vib (MM/S)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sorted.map(entry => {
                  const rowNotOk = entry.kpa_status === 'NOT_OK' || entry.air_flow_condition === 'NOT_OK' ||
                    entry.dc_motor_temp_status === 'NOT_OK' || entry.de_bearing_temp_status === 'NOT_OK' ||
                    entry.nde_bearing_temp_status === 'NOT_OK' || entry.blower_motor_temp_status === 'NOT_OK' ||
                    entry.motor_center_vib_status === 'NOT_OK' || entry.encoder_side_vib_status === 'NOT_OK' ||
                    entry.blower_vib_status === 'NOT_OK';
                  return (
                    <tr key={entry.id} className={rowNotOk ? 'bg-red-50' : 'hover:bg-gray-50'}>
                      <td className={`px-4 py-3 font-bold text-gray-900 sticky left-0 ${rowNotOk ? 'bg-red-50' : 'bg-white'}`}>
                        {entry.stand_name}
                      </td>
                      <td className="px-4 py-3 text-gray-700"><Val v={entry.dc_motor_kw} unit="KW" /></td>
                      <td className="px-4 py-3 text-gray-700"><Val v={entry.blower_kw_rating} unit="KW" /></td>
                      <td className="px-4 py-3">
                        {entry.running_kpa != null ? (
                          <div className="flex items-center gap-1">
                            <span className="text-gray-700">{entry.running_kpa}</span>
                            <StatusChip status={entry.kpa_status} />
                          </div>
                        ) : <span className="text-gray-400">—</span>}
                      </td>
                      <td className="px-4 py-3"><StatusChip status={entry.air_flow_condition} /></td>
                      <td className="px-4 py-3">
                        {entry.dc_motor_temp != null ? (
                          <div className="flex items-center gap-1">
                            <span className="text-gray-700">{entry.dc_motor_temp}</span>
                            <StatusChip status={entry.dc_motor_temp_status} />
                          </div>
                        ) : <span className="text-gray-400">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        {entry.de_bearing_temp != null ? (
                          <div className="flex items-center gap-1">
                            <span className="text-gray-700">{entry.de_bearing_temp}</span>
                            <StatusChip status={entry.de_bearing_temp_status} />
                          </div>
                        ) : <span className="text-gray-400">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        {entry.nde_bearing_temp != null ? (
                          <div className="flex items-center gap-1">
                            <span className="text-gray-700">{entry.nde_bearing_temp}</span>
                            <StatusChip status={entry.nde_bearing_temp_status} />
                          </div>
                        ) : <span className="text-gray-400">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        {entry.blower_motor_temp != null ? (
                          <div className="flex items-center gap-1">
                            <span className="text-gray-700">{entry.blower_motor_temp}</span>
                            <StatusChip status={entry.blower_motor_temp_status} />
                          </div>
                        ) : <span className="text-gray-400">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        {entry.motor_center_vib != null ? (
                          <div className="flex items-center gap-1">
                            <span className="text-gray-700">{entry.motor_center_vib}</span>
                            <StatusChip status={entry.motor_center_vib_status} />
                          </div>
                        ) : <span className="text-gray-400">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        {entry.encoder_side_vib != null ? (
                          <div className="flex items-center gap-1">
                            <span className="text-gray-700">{entry.encoder_side_vib}</span>
                            <StatusChip status={entry.encoder_side_vib_status} />
                          </div>
                        ) : <span className="text-gray-400">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        {entry.blower_vib != null ? (
                          <div className="flex items-center gap-1">
                            <span className="text-gray-700">{entry.blower_vib}</span>
                            <StatusChip status={entry.blower_vib_status} />
                          </div>
                        ) : <span className="text-gray-400">—</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
        )}

        {/* Remark */}
        {log.remark && (
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-xs font-semibold text-gray-500 uppercase mb-2">
              {log.mill_status === 'OFF' ? 'Reason Mill is OFF' : 'Remark'}
            </p>
            <p className="text-sm text-gray-800">{log.remark}</p>
          </div>
        )}

      </div>
    </div>
  );
};

export default DcMotorAirflowView;
