import React, { useEffect, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { smsAPI } from '../../services/api';
import { isWithinEditWindow, editWindowLabel } from '../../utils/editWindow';
import { formatDate } from './eotCraneConfig';
import { CASTER_SHEETS, isOverMax } from './casterMotorConfig';

export default function CasterMotorView() {
  const { sheet: sheetKey, id } = useParams();
  const sheet = CASTER_SHEETS[sheetKey];
  if (!sheet) return <Navigate to="/sms/electrical" replace />;
  return <CasterMotorViewInner key={`${sheetKey}-${id}`} sheetKey={sheetKey} sheet={sheet} id={id} />;
}

function CasterMotorViewInner({ sheetKey, sheet, id }) {
  const navigate = useNavigate();
  const base = `/sms/caster-motor/${sheetKey}`;
  const [log, setLog] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    smsAPI.getCasterMotorById(sheetKey, id)
      .then((res) => setLog(res?.data || res))
      .catch(() => {
        toast.error('Failed to load checklist');
        navigate(`${base}/history`);
      })
      .finally(() => setLoading(false));
  }, [sheetKey, id, navigate, base]);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await smsAPI.deleteCasterMotor(sheetKey, id);
      toast.success('Checklist deleted');
      navigate(`${base}/history`);
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Failed to delete');
      setConfirmDelete(false);
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-amber-600" />
      </div>
    );
  }
  if (!log) return null;

  const canModify = log.can_modify ?? isWithinEditWindow(log.created_at);
  const readings = log.readings || {};
  const overCount = sheet.motors.filter((m) => isOverMax(m, readings[m.key]?.value)).length;

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="max-w-4xl mx-auto">
        <button type="button" onClick={() => navigate(`${base}/history`)} className="text-sm text-gray-500 hover:text-gray-700 mb-1">
          ← Back to History
        </button>

        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{sheet.label}</h1>
            <p className="text-sm text-gray-500 mt-1">{formatDate(log.report_date)}</p>
            <p className="text-xs text-gray-400 mt-1">
              Recorded by {log.recorded_by || '—'} · Filled by {log.filled_by_name || '—'} · Edit window: {editWindowLabel(log.created_at)}
            </p>
          </div>
          {canModify && (
            <div className="flex gap-2">
              <button type="button" onClick={() => navigate(`${base}/${id}/edit`)} className="px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-semibold hover:bg-amber-700">Edit</button>
              <button type="button" onClick={() => setConfirmDelete(true)} className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700">Delete</button>
            </div>
          )}
        </div>

        {overCount > 0 && (
          <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-800">
            ⚠ {overCount} motor{overCount > 1 ? 's' : ''} above max current
          </div>
        )}

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden mb-5">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  {['#', 'Motor', 'HP', 'Max (A)', 'Current (A)', 'Remark'].map((h) => (
                    <th key={h} className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sheet.motors.map((m, i) => {
                  const r = readings[m.key] || {};
                  const over = isOverMax(m, r.value);
                  const has = r.value !== null && r.value !== undefined && r.value !== '';
                  return (
                    <tr key={m.key} className={over ? 'bg-red-50/70' : ''}>
                      <td className="px-4 py-2.5 text-gray-500">{i + 1}</td>
                      <td className="px-4 py-2.5 text-gray-900 font-semibold">{m.label}</td>
                      <td className="px-4 py-2.5 text-gray-600">{m.hp} HP</td>
                      <td className="px-4 py-2.5 text-gray-600">{m.max}</td>
                      <td className="px-4 py-2.5">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded whitespace-nowrap ${
                          over ? 'bg-red-100 text-red-800' : has ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-500'
                        }`}
                        >
                          {has ? `${over ? '▲ ' : ''}${Number(r.value)}` : '—'}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-gray-600">{r.remark || '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {log.remark && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <p className="text-[11px] font-semibold text-gray-500 uppercase">Remark</p>
            <p className="text-sm text-gray-900 mt-1 whitespace-pre-wrap">{log.remark}</p>
          </div>
        )}
      </div>

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Delete checklist?</h3>
            <p className="text-sm text-gray-600 mb-4">This cannot be undone.</p>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setConfirmDelete(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm">Cancel</button>
              <button type="button" disabled={deleting} onClick={handleDelete} className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-semibold disabled:opacity-50">
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
