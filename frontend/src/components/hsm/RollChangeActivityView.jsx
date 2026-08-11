import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { hsmAPI, resolveUploadUrl } from '../../services/api';
import { isWithinEditWindow, editWindowLabel } from '../../utils/editWindow';
import { displayEquipmentName } from './rollChangeConfig';

const formatDate = (d) =>
  d
    ? new Date(d).toLocaleDateString('en-IN', {
        weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
      })
    : '—';

const Info = ({ label, value, full }) => (
  <div className={full ? 'sm:col-span-2' : ''}>
    <p className="text-xs font-semibold text-gray-400 uppercase mb-1">{label}</p>
    <p className="text-sm text-gray-900 whitespace-pre-wrap">{value || '—'}</p>
  </div>
);

const Section = ({ title, children, flush }) => (
  <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 mb-5">
    <h2 className="text-sm font-bold text-indigo-800 uppercase tracking-wide mb-4 border-b border-indigo-100 pb-2">
      {title}
    </h2>
    {flush ? children : <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{children}</div>}
  </div>
);

export default function RollChangeActivityView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [log, setLog] = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    hsmAPI.getRollChangeActivityById(id)
      .then((res) => setLog(res?.data || res))
      .catch(() => {
        toast.error('Failed to load report');
        navigate('/hsm/roll-change-activity/history');
      })
      .finally(() => setLoading(false));
  }, [id, navigate]);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const res = await hsmAPI.downloadRollChangeActivityPDF(id);
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `hsm_roll_change_activity_${id}.pdf`;
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
      await hsmAPI.deleteRollChangeActivity(id);
      toast.success('Report deleted');
      navigate('/hsm/roll-change-activity/history');
    } catch (err) {
      toast.error(err?.message || 'Failed to delete report');
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
      </div>
    );
  }

  if (!log) return null;

  const canModify = log.can_modify === true || isWithinEditWindow(log.created_at);
  const equipment = log.equipment_entries || [];
  const manpower = log.manpower_entries || [];
  const images = log.images || [];

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={() => navigate('/hsm/roll-change-activity/history')}
              className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Roll Change Activity #{log.id}</h1>
              <p className="text-sm text-gray-500">{formatDate(log.report_date)} · Shift {log.shift}</p>
              <p className="text-xs text-gray-400 mt-0.5">{editWindowLabel(log.created_at)}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleDownload}
              disabled={downloading}
              className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 disabled:opacity-60"
            >
              {downloading ? 'Downloading…' : 'Download PDF'}
            </button>
            {canModify && (
              <button
                type="button"
                onClick={() => navigate(`/hsm/roll-change-activity/${id}/edit`)}
                className="px-3 py-1.5 bg-white border border-indigo-300 text-indigo-800 rounded-lg text-xs font-semibold hover:bg-indigo-50"
              >
                Edit
              </button>
            )}
            {canModify && !confirmDelete && (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="px-3 py-1.5 bg-red-50 border border-red-300 text-red-700 rounded-lg text-xs font-semibold hover:bg-red-100"
              >
                Delete
              </button>
            )}
            {canModify && confirmDelete && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-red-600 font-medium">Confirm delete?</span>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleting}
                  className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-semibold hover:bg-red-700 disabled:opacity-60"
                >
                  {deleting ? 'Deleting…' : 'Yes, Delete'}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  className="px-3 py-1.5 border border-gray-300 text-gray-600 rounded-lg text-xs font-semibold hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>

        <Section title="Basic Details">
          <Info label="Date" value={formatDate(log.report_date)} />
          <Info label="Shift" value={log.shift} />
          <Info label="Area" value={log.area} full />
        </Section>

        <Section title="Equipment" flush>
          {equipment.length === 0 ? (
            <p className="text-sm text-gray-400">No equipment entries</p>
          ) : (
            <div className="overflow-x-auto border border-gray-200 rounded-lg">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-indigo-800 text-white">
                    <th className="text-left px-3 py-2.5 font-semibold w-12">#</th>
                    <th className="text-left px-3 py-2.5 font-semibold">Equipment</th>
                    <th className="text-left px-3 py-2.5 font-semibold">Job Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {equipment.map((e, i) => (
                    <tr key={e.id || i} className="odd:bg-indigo-50/30">
                      <td className="px-3 py-2.5 text-gray-500 align-top">{i + 1}</td>
                      <td className="px-3 py-2.5 font-semibold text-indigo-900 align-top whitespace-nowrap">
                        {displayEquipmentName(e)}
                      </td>
                      <td className="px-3 py-2.5 text-gray-900 whitespace-pre-wrap align-top">
                        {e.job_details || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Section>

        <Section title="Manpower Involved" flush>
          {manpower.length === 0 ? (
            <p className="text-sm text-gray-400">No manpower listed</p>
          ) : (
            <ul className="list-disc list-inside text-sm text-gray-900 space-y-1">
              {manpower.map((m, i) => (
                <li key={m.id || i}>{m.person_name}</li>
              ))}
            </ul>
          )}
        </Section>

        <Section title="Remark" flush>
          <p className="text-sm text-gray-900 whitespace-pre-wrap">{log.remark || '—'}</p>
        </Section>

        {images.length > 0 && (
          <Section title="Images" flush>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {images.map((img) => (
                <a
                  key={img.id}
                  href={resolveUploadUrl(img.url)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block rounded-lg overflow-hidden border border-gray-200 bg-gray-50 aspect-square hover:opacity-90"
                >
                  <img
                    src={resolveUploadUrl(img.url)}
                    alt={img.original_name || 'Report image'}
                    className="w-full h-full object-cover"
                  />
                </a>
              ))}
            </div>
          </Section>
        )}

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-5">
          <div className="border-t border-gray-200 pt-8 grid grid-cols-1 sm:grid-cols-2 gap-10">
            <div>
              <p className="text-xs text-gray-500 mb-3">Shift Incharge</p>
              <p className="text-base font-semibold text-gray-900 min-h-[1.5rem]">
                {log.shift_incharge || '—'}
              </p>
              <div className="mt-6 border-b border-gray-400 w-48" />
            </div>
            <div className="sm:text-right">
              <p className="text-xs text-gray-500 mb-3">Shift Engineer</p>
              <p className="text-base font-semibold text-gray-900 min-h-[1.5rem]">
                {log.shift_engineer || '—'}
              </p>
              <div className="mt-6 border-b border-gray-400 w-48 sm:ml-auto" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
