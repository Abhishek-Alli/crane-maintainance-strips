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

const formatDt = (d) =>
  d
    ? new Date(d).toLocaleString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
      })
    : '—';

const formatDowntime = (mins) => {
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

const WhyTable = ({ rows }) => (
  <div className="overflow-x-auto border border-gray-200 rounded-lg">
    <table className="w-full text-sm">
      <thead>
        <tr className="bg-indigo-800 text-white">
          <th className="text-left px-3 py-2.5 font-semibold w-24">WHY</th>
          <th className="text-left px-3 py-2.5 font-semibold">WHY Problem Occurs</th>
          <th className="text-left px-3 py-2.5 font-semibold">Due To</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-100">
        {rows.map(([n, problem, dueTo]) => (
          <tr key={n} className="odd:bg-indigo-50/30">
            <td className="px-3 py-2.5 font-bold text-indigo-800 align-top whitespace-nowrap">WHY - {n}</td>
            <td className="px-3 py-2.5 text-gray-900 whitespace-pre-wrap align-top">{problem || '—'}</td>
            <td className="px-3 py-2.5 text-gray-900 whitespace-pre-wrap align-top">{dueTo || '—'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

export default function BreakdownAnalysisView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [log, setLog] = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    hsmAPI.getBreakdownAnalysisById(id)
      .then((res) => setLog(res?.data || res))
      .catch(() => {
        toast.error('Failed to load report');
        navigate('/hsm/breakdown-analysis/history');
      })
      .finally(() => setLoading(false));
  }, [id, navigate]);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const res = await hsmAPI.downloadBreakdownAnalysisPDF(id);
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `hsm_breakdown_analysis_${id}.pdf`;
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
      await hsmAPI.deleteBreakdownAnalysis(id);
      toast.success('Report deleted');
      navigate('/hsm/breakdown-analysis/history');
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
              onClick={() => navigate('/hsm/breakdown-analysis/history')}
              className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Breakdown Analysis #{log.id}</h1>
              <p className="text-sm text-gray-500">{formatDate(log.report_date)}</p>
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
                onClick={() => navigate(`/hsm/breakdown-analysis/${id}/edit`)}
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

        <Section title="Basic Details" flush>
          <KeyValueTable
            rows={[
              ['Date', formatDate(log.report_date)],
              ['Department', log.department],
              ['Machine / Equipment Name', log.machine_name],
              ['Date & Time of Breakdown', formatDt(log.breakdown_at)],
              ['Date & Time of Restoration', formatDt(log.restoration_at)],
              ['Total Downtime', formatDowntime(log.total_downtime_minutes)],
            ]}
          />
        </Section>

        <Section title="Breakdown Description">
          <Info label="Type of Breakdown" value={log.breakdown_type} />
          <Info label="Observed Problem" value={log.observed_problem} full />
        </Section>

        <Section title="Root Cause Analysis (RCA)">
          <Info label="Immediate Cause (What Happened?)" value={log.immediate_cause} full />
          <Info label="Root Cause (Why It Happened?)" value={log.root_cause} full />
        </Section>

        <Section title="Method Used (5 WHY Analysis)" flush>
          <WhyTable
            rows={[
              [1, log.why1_problem, log.why1_due_to],
              [2, log.why2_problem, log.why2_due_to],
              [3, log.why3_problem, log.why3_due_to],
              [4, log.why4_problem, log.why4_due_to],
              [5, log.why5_problem, log.why5_due_to],
            ]}
          />
        </Section>

        <Section title="Corrective Actions (CA)">
          <Info label="Action Taken to Restore" value={log.action_taken_to_restore} full />
          <Info label="Time Taken for Repair" value={log.time_taken_for_repair} />
        </Section>

        <Section title="Preventive Action (PA)">
          <Info label="Steps to Avoid Recurrence" value={log.preventive_steps} full />
        </Section>

        <Section title="Store Material" flush>
          <KeyValueTable
            rows={[
              ['Spare Parts Replaced (If any)', log.spare_parts_used],
            ]}
          />
        </Section>

        {/* Sign-off — document style, no section banner */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-5 mt-2">
          <div className="border-t border-gray-200 pt-8 grid grid-cols-1 sm:grid-cols-2 gap-10">
            <div className="text-left">
              <p className="text-xs text-gray-500">Prepared by</p>
              <p className="text-xs text-gray-400 mb-3">(Maintenance Engineer)</p>
              <p className="text-base font-semibold text-gray-900 min-h-[1.5rem]">
                {log.prepared_by || log.filled_by_name || '—'}
              </p>
              <div className="mt-6 border-b border-gray-400 w-48" />
              <p className="text-[11px] text-gray-400 mt-1">Signature / Name</p>
            </div>
            <div className="text-left sm:text-right">
              <p className="text-xs text-gray-500">Verified by</p>
              <p className="text-xs text-gray-400 mb-3">(Dept Head / Manager)</p>
              <p className="text-base font-semibold text-gray-900 min-h-[1.5rem]">
                {log.verified_by || '—'}
              </p>
              <div className="mt-6 border-b border-gray-400 w-48 sm:ml-auto" />
              <p className="text-[11px] text-gray-400 mt-1">Signature / Name</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
