import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { hsmAPI } from '../../services/api';
import { isWithinEditWindow, editWindowLabel } from '../../utils/editWindow';
import {
  FM_CHECK_ITEMS,
  FM_GUIDE_CENTERLINE_KEYS,
  statusDisplay,
} from './fmDailyConfig';

const formatDate = (d) =>
  d
    ? new Date(d).toLocaleDateString('en-IN', {
        weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
      })
    : '—';

export default function FmDailyChecklistView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [log, setLog] = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    hsmAPI.getFmDailyChecklistById(id)
      .then((res) => setLog(res?.data || res))
      .catch(() => {
        toast.error('Failed to load checklist');
        navigate('/hsm/fm-daily-checklist/history');
      })
      .finally(() => setLoading(false));
  }, [id, navigate]);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const res = await hsmAPI.downloadFmDailyChecklistPDF(id);
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `hsm_fm_daily_checklist_${id}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      toast.error('Failed to download PDF');
    } finally {
      setDownloading(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await hsmAPI.deleteFmDailyChecklist(id);
      toast.success('Checklist deleted');
      navigate('/hsm/fm-daily-checklist/history');
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
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" />
      </div>
    );
  }
  if (!log) return null;

  const canModify = log.can_modify ?? isWithinEditWindow(log.created_at);
  const items = log.checklist_items || {};
  const guide = log.guide_centerline || {};

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="max-w-4xl mx-auto">
        <button
          type="button"
          onClick={() => navigate('/hsm/fm-daily-checklist/history')}
          className="text-sm text-gray-500 hover:text-gray-700 mb-1"
        >
          ← Back to History
        </button>

        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">FM Daily Check List</h1>
            <p className="text-sm text-gray-500 mt-1">
              {formatDate(log.report_date)} · Shift {log.shift}
              {log.shift_engineer ? ` · ${log.shift_engineer}` : ''}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              By {log.filled_by_name || '—'} · Edit window: {editWindowLabel(log.created_at)}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleDownload}
              disabled={downloading}
              className="px-4 py-2 bg-gray-800 text-white rounded-lg text-sm font-semibold hover:bg-gray-900 disabled:opacity-50"
            >
              {downloading ? 'Preparing…' : 'Download PDF'}
            </button>
            {canModify && (
              <>
                <button
                  type="button"
                  onClick={() => navigate(`/hsm/fm-daily-checklist/${id}/edit`)}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700"
                >
                  Delete
                </button>
              </>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 mb-5">
          <h2 className="text-sm font-bold text-indigo-800 uppercase tracking-wide mb-4 border-b border-indigo-100 pb-2">
            All guide centerline should be check
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {FM_GUIDE_CENTERLINE_KEYS.map(({ key, label }) => (
              <div key={key} className="bg-gray-50 rounded-lg px-3 py-2 border border-gray-100">
                <p className="text-[11px] font-semibold text-gray-500 uppercase">{label}</p>
                <p className="text-sm text-gray-900 mt-0.5">{guide[key] || '—'}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden mb-5">
          <div className="px-5 py-3 border-b border-gray-100">
            <h2 className="text-sm font-bold text-indigo-800 uppercase tracking-wide">Checklist</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase">#</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase">Item</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase">Status</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase">Remark</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {FM_CHECK_ITEMS.map(({ key, label }, i) => {
                  const row = items[key] || {};
                  const st = row.status;
                  return (
                    <tr key={key} className="odd:bg-indigo-50/30">
                      <td className="px-4 py-2.5 text-gray-500">{i + 1}</td>
                      <td className="px-4 py-2.5 text-gray-900">{label}</td>
                      <td className="px-4 py-2.5">
                        <span
                          className={`text-xs font-semibold px-2 py-0.5 rounded ${
                            st === 'OK'
                              ? 'bg-emerald-100 text-emerald-800'
                              : st === 'NOT_OK'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-gray-100 text-gray-500'
                          }`}
                        >
                          {statusDisplay(st)}
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

        {log.note && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 mb-5">
            <h2 className="text-sm font-bold text-indigo-800 uppercase tracking-wide mb-2">Note</h2>
            <p className="text-sm text-gray-900 whitespace-pre-wrap">{log.note}</p>
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
