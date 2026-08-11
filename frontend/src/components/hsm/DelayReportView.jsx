import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { hsmAPI } from '../../services/api';
import { isWithinEditWindow, editWindowLabel } from '../../utils/editWindow';

const formatDate = (d) =>
  d
    ? new Date(d).toLocaleDateString('en-IN', {
        weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
      })
    : '—';

const formatTime = (value) => {
  if (!value) return '—';
  const s = typeof value === 'string' && /^\d{1,2}:\d{2}/.test(value)
    ? value.slice(0, 5)
    : String(value).slice(0, 5);
  const [hhStr, mmStr] = s.split(':');
  const hh = parseInt(hhStr, 10);
  const mm = parseInt(mmStr, 10);
  if (Number.isNaN(hh) || Number.isNaN(mm)) return s;
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
};

const formatDuration = (mins) => {
  if (mins == null) return '—';
  const m = parseInt(mins, 10);
  if (Number.isNaN(m)) return String(mins);
  const h = Math.floor(m / 60);
  const rem = m % 60;
  if (h <= 0) return `${rem} min`;
  return `${h} hr ${rem} min (${m} min)`;
};

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

const KeyValueTable = ({ rows }) => (
  <div className="overflow-x-auto border border-gray-200 rounded-lg">
    <table className="w-full text-sm">
      <tbody className="divide-y divide-gray-100">
        {rows.map(([label, value]) => (
          <tr key={label} className="odd:bg-indigo-50/40">
            <td className="px-4 py-2.5 font-semibold text-gray-600 w-1/3 align-top border-r border-gray-100">
              {label}
            </td>
            <td className="px-4 py-2.5 text-gray-900 whitespace-pre-wrap">{value || '—'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

export default function DelayReportView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [log, setLog] = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    hsmAPI.getDelayReportById(id)
      .then((res) => setLog(res?.data || res))
      .catch(() => {
        toast.error('Failed to load report');
        navigate('/hsm/delay-report/history');
      })
      .finally(() => setLoading(false));
  }, [id, navigate]);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const res = await hsmAPI.downloadDelayReportPDF(id);
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `hsm_delay_report_${id}.pdf`;
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
      await hsmAPI.deleteDelayReport(id);
      toast.success('Report deleted');
      navigate('/hsm/delay-report/history');
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

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={() => navigate('/hsm/delay-report/history')}
              className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Delay Report #{log.id}</h1>
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
                onClick={() => navigate(`/hsm/delay-report/${id}/edit`)}
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
                <button type="button" onClick={handleDelete} disabled={deleting} className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-semibold hover:bg-red-700 disabled:opacity-60">
                  {deleting ? 'Deleting…' : 'Yes, Delete'}
                </button>
                <button type="button" onClick={() => setConfirmDelete(false)} className="px-3 py-1.5 border border-gray-300 text-gray-600 rounded-lg text-xs font-semibold hover:bg-gray-50">
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>

        <Section title="Basic Details" flush>
          <KeyValueTable
            rows={[
              ['Date', formatDate(log.report_date)],
              ['Shift', log.shift],
              ['Start Time', formatTime(log.start_time)],
              ['End Time', formatTime(log.end_time)],
              ['Total Time', formatDuration(log.total_minutes)],
              ['Reason', log.reason],
              ['Agency', log.agency],
            ]}
          />
        </Section>

        <Section title="HOTOUT" flush>
          <KeyValueTable
            rows={[
              ['Source', log.hotout_source],
              ['Thickness', log.hotout_thickness],
              ['Width', log.hotout_width],
              ['Length', log.hotout_length],
              ['Pieces', log.hotout_pieces],
              ['MT', log.hotout_mt],
              ['Remark', log.hotout_remark],
            ]}
          />
        </Section>

        <Section title="Miss Roll">
          <Info label="Thickness" value={log.miss_thickness} />
          <Info label="Width" value={log.miss_width} />
          <Info label="Length" value={log.miss_length} />
          <Info label="Pieces" value={log.miss_pieces} />
          <Info label="MT" value={log.miss_mt} />
          <Info label="Location" value={log.miss_location} />
          <Info label="Operator Name" value={log.miss_operator_name} />
          <Info label="Remark" value={log.miss_remark} full />
        </Section>
      </div>
    </div>
  );
}
