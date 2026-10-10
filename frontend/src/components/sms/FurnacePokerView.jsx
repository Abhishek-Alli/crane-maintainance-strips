import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { smsAPI } from '../../services/api';
import { isWithinEditWindow, editWindowLabel } from '../../utils/editWindow';
import { formatDate } from './eotCraneConfig';
import { FPK_CHECKS, FPK_MOTORS, isBadValue, formatCurrents } from './furnacePokerConfig';
import { PageLoader, DeleteConfirm } from './checkFormParts';

export default function FurnacePokerView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [log, setLog] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    smsAPI.getFurnacePokerById(id)
      .then((res) => setLog(res?.data || res))
      .catch(() => {
        toast.error('Failed to load checklist');
        navigate('/sms/furnace-poker/history');
      })
      .finally(() => setLoading(false));
  }, [id, navigate]);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await smsAPI.deleteFurnacePoker(id);
      toast.success('Checklist deleted');
      navigate('/sms/furnace-poker/history');
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Failed to delete');
      setConfirmDelete(false);
    } finally {
      setDeleting(false);
    }
  };

  if (loading) return <PageLoader />;
  if (!log) return null;

  const canModify = log.can_modify ?? isWithinEditWindow(log.created_at);
  const checks = log.checks || {};
  const info = [
    ['Furnace', log.furnace || '—'],
    ['Crucible', log.crucible || '—'],
    ['Recorded By', log.recorded_by || '—'],
    ['Filled By', log.filled_by_name || '—'],
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="max-w-4xl mx-auto">
        <button type="button" onClick={() => navigate('/sms/furnace-poker/history')} className="text-sm text-gray-500 hover:text-gray-700 mb-1">
          ← Back to History
        </button>

        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Furnace Poker Check</h1>
            <p className="text-sm text-gray-500 mt-1">{formatDate(log.report_date)}</p>
            <p className="text-xs text-gray-400 mt-1">Edit window: {editWindowLabel(log.created_at)}</p>
          </div>
          {canModify && (
            <div className="flex gap-2">
              <button type="button" onClick={() => navigate(`/sms/furnace-poker/${id}/edit`)} className="px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-semibold hover:bg-amber-700">
                Edit
              </button>
              <button type="button" onClick={() => setConfirmDelete(true)} className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700">
                Delete
              </button>
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 mb-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {info.map(([k, v]) => (
            <div key={k} className="bg-gray-50 rounded-lg px-3 py-2 border border-gray-100">
              <p className="text-[11px] font-semibold text-gray-500 uppercase">{k}</p>
              <p className="text-sm text-gray-900 mt-0.5">{v}</p>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden mb-5">
          <div className="px-5 py-3 border-b border-amber-100 bg-amber-50/40">
            <h2 className="text-sm font-bold text-amber-800 uppercase tracking-wide">Checklist</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  {['#', 'Check Point', 'Status', 'Remark'].map((h) => (
                    <th key={h} className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {FPK_CHECKS.map((c, i) => {
                  const row = checks[c.key] || {};
                  const bad = isBadValue(c, row.value);
                  return (
                    <tr key={c.key} className={bad ? 'bg-red-50/60' : ''}>
                      <td className="px-4 py-2.5 text-gray-500">{i + 1}</td>
                      <td className="px-4 py-2.5 text-gray-900 font-semibold">{c.label}</td>
                      <td className="px-4 py-2.5">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded whitespace-nowrap ${
                          bad ? 'bg-red-100 text-red-800' : row.value ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-500'
                        }`}
                        >
                          {row.value || '—'}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-gray-600">{row.remark || '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden mb-5">
          <div className="px-5 py-3 border-b border-amber-100 bg-amber-50/40">
            <h2 className="text-sm font-bold text-amber-800 uppercase tracking-wide">Motor Currents (R / Y / B)</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <tbody className="divide-y divide-gray-100">
                {FPK_MOTORS.map((m) => (
                  <tr key={m.key}>
                    <td className="px-4 py-2.5 text-gray-900 font-semibold">{m.label}</td>
                    <td className="px-4 py-2.5 text-gray-700 whitespace-nowrap">{formatCurrents(log.currents, m.key)}</td>
                  </tr>
                ))}
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
        <DeleteConfirm deleting={deleting} onCancel={() => setConfirmDelete(false)} onConfirm={handleDelete} />
      )}
    </div>
  );
}
