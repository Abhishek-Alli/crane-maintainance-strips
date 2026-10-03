import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { smsAPI, resolveUploadUrl } from '../../services/api';
import { isWithinEditWindow, editWindowLabel } from '../../utils/editWindow';
import { formatDate } from './eotCraneConfig';
import { PUMP_HOUSE_POINTS, isAlert, hasValue, pointLabel } from './pumpHouseConfig';

export default function SmsPumpHouseView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [log, setLog] = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    smsAPI.getPumpHouseById(id)
      .then((res) => setLog(res?.data || res))
      .catch(() => {
        toast.error('Failed to load checklist');
        navigate('/sms/pump-house/history');
      })
      .finally(() => setLoading(false));
  }, [id, navigate]);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const res = await smsAPI.downloadPumpHousePDF(id);
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sms_pump_house_${id}.pdf`;
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
      await smsAPI.deletePumpHouse(id);
      toast.success('Checklist deleted');
      navigate('/sms/pump-house/history');
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
  const items = log.checklist_items || {};
  // Limit saved with the sheet, so old records keep the limit they were checked against
  const minPressure = log.min_header_pressure;
  const info = [
    ['Area', log.area || '—'],
    ['Pump No.', log.pump_number || '—'],
    ['Recorded By', log.recorded_by || '—'],
    ['Filled By', log.filled_by_name || '—'],
  ];
  const photosByItem = {};
  (log.images || []).forEach((img) => {
    (photosByItem[img.item_key] = photosByItem[img.item_key] || []).push(img);
  });

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="max-w-4xl mx-auto">
        <button
          type="button"
          onClick={() => navigate('/sms/pump-house/history')}
          className="text-sm text-gray-500 hover:text-gray-700 mb-1"
        >
          ← Back to History
        </button>

        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Pump House — Mechanical</h1>
            <p className="text-sm text-gray-500 mt-1">
              {formatDate(log.report_date)} · {log.area} · {log.pump_number}
            </p>
            <p className="text-xs text-gray-400 mt-1">Edit window: {editWindowLabel(log.created_at)}</p>
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
                  onClick={() => navigate(`/sms/pump-house/${id}/edit`)}
                  className="px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-semibold hover:bg-amber-700"
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

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 mb-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {info.map(([k, v]) => (
            <div key={k} className="bg-gray-50 rounded-lg px-3 py-2 border border-gray-100">
              <p className="text-[11px] font-semibold text-gray-500 uppercase">{k}</p>
              <p className="text-sm text-gray-900 mt-0.5">{v}</p>
            </div>
          ))}
        </div>

        <div className={`rounded-xl border px-5 py-3 mb-5 text-sm font-semibold ${
          log.alert_count ? 'bg-red-50 border-red-200 text-red-700' : 'bg-emerald-50 border-emerald-200 text-emerald-700'
        }`}
        >
          {log.alert_count
            ? `${log.alert_count} alert${log.alert_count === 1 ? '' : 's'} found — see the highlighted points below`
            : 'All points OK — no alerts'}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden mb-5">
          <div className="px-5 py-3 border-b border-amber-100 bg-amber-50/40">
            <h2 className="text-sm font-bold text-amber-800 uppercase tracking-wide">Checklist Items</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase">#</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase">Check Point</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase">Status</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase">Remark</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {PUMP_HOUSE_POINTS.map((p, pIdx) => {
                  const row = items[p.key] || {};
                  const alert = isAlert(p, row.value, minPressure);
                  const filled = hasValue(row.value);
                  const itemPhotos = photosByItem[p.key] || [];
                  return (
                    <tr key={p.key} className={alert ? 'bg-red-50/60' : ''}>
                      <td className="px-4 py-2.5 text-gray-500 align-top">{pIdx + 1}</td>
                      <td className="px-4 py-2.5 text-gray-900 font-semibold align-top">{pointLabel(p, minPressure)}</td>
                      <td className="px-4 py-2.5 align-top">
                        <span
                          className={`text-xs font-semibold px-2 py-0.5 rounded whitespace-nowrap ${
                            alert
                              ? 'bg-red-100 text-red-800'
                              : filled
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-gray-100 text-gray-500'
                          }`}
                        >
                          {filled ? row.value : '—'}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-gray-600 align-top">
                        {row.remark || '—'}
                        {itemPhotos.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-2">
                            {itemPhotos.map((img) => (
                              <a
                                key={img.id}
                                href={resolveUploadUrl(img.url)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block w-16 h-16 rounded-lg overflow-hidden border border-gray-200 bg-gray-50 hover:opacity-90"
                              >
                                <img
                                  src={resolveUploadUrl(img.url)}
                                  alt={img.original_name || p.label}
                                  className="w-full h-full object-cover"
                                />
                              </a>
                            ))}
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
