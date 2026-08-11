import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import { hsmAPI } from '../../services/api';
import ChecksheetPreviewModal, { PreviewSection, PreviewGrid } from '../hbm/ChecksheetPreviewModal';
import { isWithinEditWindow } from '../../utils/editWindow';

const BREAKDOWN_TYPES = [
  'Mechanical',
  'Electrical',
  'Hydraulic',
  'Instrumentation',
  'Utility',
  'Other',
];

const emptyForm = () => ({
  report_date: new Date().toLocaleDateString('en-CA'),
  department: '',
  machine_name: '',
  breakdown_date: new Date().toLocaleDateString('en-CA'),
  breakdown_time: '',
  restoration_date: '',
  restoration_time: '',
  breakdown_type: '',
  observed_problem: '',
  immediate_cause: '',
  root_cause: '',
  why1_problem: '',
  why1_due_to: '',
  why2_problem: '',
  why2_due_to: '',
  why3_problem: '',
  why3_due_to: '',
  why4_problem: '',
  why4_due_to: '',
  why5_problem: '',
  why5_due_to: '',
  action_taken_to_restore: '',
  time_taken_for_repair: '',
  preventive_steps: '',
  spare_parts_used: '',
  prepared_by: '',
  verified_by: '',
});

const combineDateTime = (date, time) => {
  if (!date || !time) return null;
  return `${date}T${time}:00`;
};

const splitDateTime = (value) => {
  if (!value) return { date: '', time: '' };
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return { date: '', time: '' };
  const date = d.toLocaleDateString('en-CA');
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return { date, time: `${hh}:${mm}` };
};

const calcDowntimeMinutes = (bdDate, bdTime, rsDate, rsTime) => {
  const start = combineDateTime(bdDate, bdTime);
  const end = combineDateTime(rsDate, rsTime);
  if (!start || !end) return null;
  const mins = Math.round((new Date(end) - new Date(start)) / 60000);
  return mins >= 0 ? mins : null;
};

const formatDowntime = (mins) => {
  if (mins == null) return '—';
  const h = Math.floor(mins / 60);
  const rem = mins % 60;
  if (h <= 0) return `${rem} min`;
  return `${h} hr ${rem} min`;
};

const Field = ({ label, required, children }) => (
  <div>
    <label className="block text-sm font-semibold text-gray-700 mb-1">
      {label}{required && <span className="text-red-500"> *</span>}
    </label>
    {children}
  </div>
);

const inputCls =
  'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent';
const textareaCls = `${inputCls} min-h-[72px] resize-y`;

const Section = ({ title, children }) => (
  <div className="bg-white rounded-xl border border-gray-200 p-5 mb-5">
    <h2 className="text-base font-bold text-gray-800 mb-4 border-b border-gray-100 pb-2">{title}</h2>
    <div className="space-y-4">{children}</div>
  </div>
);

const WhyBlock = ({ n, form, set }) => (
  <div className="rounded-lg border border-indigo-100 bg-indigo-50/40 p-4 space-y-3">
    <p className="text-sm font-bold text-indigo-800">WHY - {n}</p>
    <Field label="WHY Problem Occurs">
      <textarea
        className={textareaCls}
        value={form[`why${n}_problem`]}
        onChange={(e) => set(`why${n}_problem`, e.target.value)}
        placeholder="Why did the problem occur?"
      />
    </Field>
    <Field label="Due To">
      <textarea
        className={textareaCls}
        value={form[`why${n}_due_to`]}
        onChange={(e) => set(`why${n}_due_to`, e.target.value)}
        placeholder="Due to..."
      />
    </Field>
  </div>
);

export default function BreakdownAnalysisForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id: routeId } = useParams();
  const isEdit = Boolean(routeId) && location.pathname.endsWith('/edit');
  const editId = isEdit ? routeId : null;

  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [loadingEdit, setLoadingEdit] = useState(Boolean(editId));
  const [showPreview, setShowPreview] = useState(false);

  const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  useEffect(() => {
    if (!editId) return;
    setLoadingEdit(true);
    hsmAPI.getBreakdownAnalysisById(editId)
      .then((res) => {
        const log = res?.data || res;
        if (!isWithinEditWindow(log.created_at) && !log.can_modify) {
          toast.error('Edit allowed only within 10 hours of submission');
          navigate(`/hsm/breakdown-analysis/${editId}`);
          return;
        }
        const bd = splitDateTime(log.breakdown_at);
        const rs = splitDateTime(log.restoration_at);
        setForm({
          report_date: log.report_date
            ? new Date(log.report_date).toLocaleDateString('en-CA')
            : new Date().toLocaleDateString('en-CA'),
          department: log.department || '',
          machine_name: log.machine_name || '',
          breakdown_date: bd.date,
          breakdown_time: bd.time,
          restoration_date: rs.date,
          restoration_time: rs.time,
          breakdown_type: log.breakdown_type || '',
          observed_problem: log.observed_problem || '',
          immediate_cause: log.immediate_cause || '',
          root_cause: log.root_cause || '',
          why1_problem: log.why1_problem || '',
          why1_due_to: log.why1_due_to || '',
          why2_problem: log.why2_problem || '',
          why2_due_to: log.why2_due_to || '',
          why3_problem: log.why3_problem || '',
          why3_due_to: log.why3_due_to || '',
          why4_problem: log.why4_problem || '',
          why4_due_to: log.why4_due_to || '',
          why5_problem: log.why5_problem || '',
          why5_due_to: log.why5_due_to || '',
          action_taken_to_restore: log.action_taken_to_restore || '',
          time_taken_for_repair: log.time_taken_for_repair || '',
          preventive_steps: log.preventive_steps || '',
          spare_parts_used: log.spare_parts_used || '',
          prepared_by: log.prepared_by || '',
          verified_by: log.verified_by || '',
        });
      })
      .catch((err) => {
        toast.error(err?.message || 'Failed to load report for edit');
        navigate('/hsm/breakdown-analysis/history');
      })
      .finally(() => setLoadingEdit(false));
  }, [editId, navigate]);

  const downtimeMins = useMemo(
    () => calcDowntimeMinutes(
      form.breakdown_date,
      form.breakdown_time,
      form.restoration_date,
      form.restoration_time
    ),
    [form.breakdown_date, form.breakdown_time, form.restoration_date, form.restoration_time]
  );

  const buildPayload = () => ({
    report_date: form.report_date,
    department: form.department.trim() || null,
    machine_name: form.machine_name.trim(),
    breakdown_at: combineDateTime(form.breakdown_date, form.breakdown_time),
    restoration_at: combineDateTime(form.restoration_date, form.restoration_time),
    total_downtime_minutes: downtimeMins,
    breakdown_type: form.breakdown_type || null,
    observed_problem: form.observed_problem.trim() || null,
    immediate_cause: form.immediate_cause.trim() || null,
    root_cause: form.root_cause.trim() || null,
    why1_problem: form.why1_problem.trim() || null,
    why1_due_to: form.why1_due_to.trim() || null,
    why2_problem: form.why2_problem.trim() || null,
    why2_due_to: form.why2_due_to.trim() || null,
    why3_problem: form.why3_problem.trim() || null,
    why3_due_to: form.why3_due_to.trim() || null,
    why4_problem: form.why4_problem.trim() || null,
    why4_due_to: form.why4_due_to.trim() || null,
    why5_problem: form.why5_problem.trim() || null,
    why5_due_to: form.why5_due_to.trim() || null,
    action_taken_to_restore: form.action_taken_to_restore.trim() || null,
    time_taken_for_repair: form.time_taken_for_repair.trim() || null,
    preventive_steps: form.preventive_steps.trim() || null,
    spare_parts_used: form.spare_parts_used.trim() || null,
    prepared_by: form.prepared_by.trim() || null,
    verified_by: form.verified_by.trim() || null,
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.report_date) { toast.error('Date is required'); return; }
    if (!form.machine_name.trim()) { toast.error('Machine / Equipment Name is required'); return; }
    setShowPreview(true);
  };

  const handleConfirmSubmit = async () => {
    setSubmitting(true);
    try {
      const payload = buildPayload();
      let newId = editId;
      if (isEdit) {
        await hsmAPI.updateBreakdownAnalysis(editId, payload);
        toast.success('Breakdown Analysis Report updated');
      } else {
        const res = await hsmAPI.createBreakdownAnalysis(payload);
        newId = res?.data?.id || res?.id;
        toast.success('Breakdown Analysis Report submitted');
      }
      navigate(newId ? `/hsm/breakdown-analysis/${newId}` : '/hsm/breakdown-analysis/history');
    } catch (err) {
      toast.error(err?.message || 'Failed to save report');
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingEdit) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
      </div>
    );
  }

  return (
    <>
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center space-x-3 mb-6">
          <button
            type="button"
            onClick={() => navigate(isEdit ? `/hsm/breakdown-analysis/${editId}` : '/hsm/dashboard')}
            className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              {isEdit ? 'Edit Breakdown Analysis Report' : 'Breakdown Analysis Report'}
            </h1>
            <p className="text-sm text-gray-500">
              SMS · RCA & 5-Why analysis{isEdit ? ' · editable within 10 hours' : ''}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <Section title="Basic Details">
            <Field label="Date" required>
              <input
                type="date"
                required
                value={form.report_date}
                onChange={(e) => set('report_date', e.target.value)}
                className={`${inputCls} sm:w-56`}
              />
            </Field>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Department">
                <input
                  type="text"
                  value={form.department}
                  onChange={(e) => set('department', e.target.value)}
                  placeholder="Department name"
                  className={inputCls}
                />
              </Field>
              <Field label="Machine / Equipment Name" required>
                <input
                  type="text"
                  required
                  value={form.machine_name}
                  onChange={(e) => set('machine_name', e.target.value)}
                  placeholder="Machine / equipment"
                  className={inputCls}
                />
              </Field>
            </div>

            <div>
              <p className="text-sm font-semibold text-gray-700 mb-2">Date & Time of Breakdown</p>
              <div className="grid grid-cols-2 gap-3">
                <input type="date" value={form.breakdown_date} onChange={(e) => set('breakdown_date', e.target.value)} className={inputCls} />
                <input type="time" value={form.breakdown_time} onChange={(e) => set('breakdown_time', e.target.value)} className={inputCls} />
              </div>
            </div>

            <div>
              <p className="text-sm font-semibold text-gray-700 mb-2">Date & Time of Restoration</p>
              <div className="grid grid-cols-2 gap-3">
                <input type="date" value={form.restoration_date} onChange={(e) => set('restoration_date', e.target.value)} className={inputCls} />
                <input type="time" value={form.restoration_time} onChange={(e) => set('restoration_time', e.target.value)} className={inputCls} />
              </div>
            </div>

            <div className="rounded-lg bg-indigo-50 border border-indigo-200 px-4 py-3">
              <p className="text-xs font-semibold text-indigo-700 uppercase">Total Downtime</p>
              <p className="text-lg font-bold text-indigo-900 mt-0.5">{formatDowntime(downtimeMins)}</p>
              <p className="text-xs text-indigo-600 mt-1">Auto-calculated from breakdown & restoration times</p>
            </div>
          </Section>

          <Section title="Breakdown Description">
            <Field label="Type of Breakdown">
              <select
                value={form.breakdown_type}
                onChange={(e) => set('breakdown_type', e.target.value)}
                className={inputCls}
              >
                <option value="">Select type...</option>
                {BREAKDOWN_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </Field>
            <Field label="Observed Problem">
              <textarea
                className={textareaCls}
                value={form.observed_problem}
                onChange={(e) => set('observed_problem', e.target.value)}
                placeholder="Describe the observed problem..."
              />
            </Field>
          </Section>

          <Section title="Root Cause Analysis (RCA)">
            <Field label="Immediate Cause (What Happened?)">
              <textarea
                className={textareaCls}
                value={form.immediate_cause}
                onChange={(e) => set('immediate_cause', e.target.value)}
              />
            </Field>
            <Field label="Root Cause (Why It Happened?)">
              <textarea
                className={textareaCls}
                value={form.root_cause}
                onChange={(e) => set('root_cause', e.target.value)}
              />
            </Field>
          </Section>

          <Section title="Method Used (5 WHY Analysis)">
            {[1, 2, 3, 4, 5].map((n) => (
              <WhyBlock key={n} n={n} form={form} set={set} />
            ))}
          </Section>

          <Section title="Corrective Actions (CA)">
            <Field label="Action Taken to Restore">
              <textarea
                className={textareaCls}
                value={form.action_taken_to_restore}
                onChange={(e) => set('action_taken_to_restore', e.target.value)}
              />
            </Field>
            <Field label="Time Taken for Repair">
              <input
                type="text"
                className={inputCls}
                value={form.time_taken_for_repair}
                onChange={(e) => set('time_taken_for_repair', e.target.value)}
                placeholder="e.g. 2 hr 15 min"
              />
            </Field>
          </Section>

          <Section title="Preventive Action (PA)">
            <Field label="Steps to Avoid Recurrence">
              <textarea
                className={textareaCls}
                value={form.preventive_steps}
                onChange={(e) => set('preventive_steps', e.target.value)}
              />
            </Field>
          </Section>

          <Section title="Store Material">
            <Field label="Spare Parts Replaced (If any)">
              <textarea
                className={textareaCls}
                value={form.spare_parts_used}
                onChange={(e) => set('spare_parts_used', e.target.value)}
                placeholder="Part name / qty..."
              />
            </Field>
          </Section>

          <Section title="Sign-off">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Prepared by (Maintenance Engineer)">
                <input
                  type="text"
                  className={inputCls}
                  value={form.prepared_by}
                  onChange={(e) => set('prepared_by', e.target.value)}
                />
              </Field>
              <Field label="Verified By (Dept Head / Manager)">
                <input
                  type="text"
                  className={inputCls}
                  value={form.verified_by}
                  onChange={(e) => set('verified_by', e.target.value)}
                />
              </Field>
            </div>
          </Section>

          <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4 shadow-lg rounded-t-xl">
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 bg-indigo-600 text-white rounded-lg font-bold text-base hover:bg-indigo-700 transition-colors disabled:opacity-60"
            >
              {isEdit ? 'Preview & Update' : 'Preview & Submit'}
            </button>
          </div>
        </form>
      </div>
    </div>

    <ChecksheetPreviewModal
      isOpen={showPreview}
      title={isEdit ? 'Breakdown Analysis — Update' : 'Breakdown Analysis Report'}
      onEdit={() => setShowPreview(false)}
      onConfirm={handleConfirmSubmit}
      submitting={submitting}
      confirmLabel={isEdit ? 'Confirm & Update' : 'Confirm & Submit'}
    >
      <PreviewSection title="Basic Details" color="bg-indigo-700">
        <PreviewGrid
          rows={[
            ['Date', form.report_date],
            ['Department', form.department],
            ['Machine / Equipment', form.machine_name],
            ['Breakdown', form.breakdown_date && form.breakdown_time
              ? `${form.breakdown_date} ${form.breakdown_time}` : '—'],
            ['Restoration', form.restoration_date && form.restoration_time
              ? `${form.restoration_date} ${form.restoration_time}` : '—'],
            ['Total Downtime', formatDowntime(downtimeMins)],
          ]}
        />
      </PreviewSection>
      <PreviewSection title="Breakdown Description" color="bg-indigo-700">
        <PreviewGrid
          rows={[
            ['Type', form.breakdown_type],
            ['Observed Problem', form.observed_problem],
          ]}
        />
      </PreviewSection>
      <PreviewSection title="Root Cause Analysis" color="bg-indigo-700">
        <PreviewGrid
          rows={[
            ['Immediate Cause', form.immediate_cause],
            ['Root Cause', form.root_cause],
          ]}
        />
      </PreviewSection>
      <PreviewSection title="5-Why Analysis" color="bg-indigo-700">
        <div className="space-y-2 text-sm">
          {[1, 2, 3, 4, 5].map((n) => (
            <div key={n} className="border border-gray-100 rounded-lg p-2">
              <p className="font-semibold text-indigo-800 text-xs mb-1">WHY - {n}</p>
              <p className="text-gray-700"><span className="text-gray-400 text-xs">Problem: </span>{form[`why${n}_problem`] || '—'}</p>
              <p className="text-gray-700"><span className="text-gray-400 text-xs">Due to: </span>{form[`why${n}_due_to`] || '—'}</p>
            </div>
          ))}
        </div>
      </PreviewSection>
      <PreviewSection title="Corrective / Preventive / Store" color="bg-indigo-700">
        <PreviewGrid
          rows={[
            ['Action to Restore', form.action_taken_to_restore],
            ['Time for Repair', form.time_taken_for_repair],
            ['Preventive Steps', form.preventive_steps],
            ['Spare Parts', form.spare_parts_used],
          ]}
        />
      </PreviewSection>
      <PreviewSection title="Sign-off" color="bg-indigo-700">
        <PreviewGrid
          rows={[
            ['Prepared by', form.prepared_by],
            ['Verified by', form.verified_by],
          ]}
        />
      </PreviewSection>
    </ChecksheetPreviewModal>
    </>
  );
}
