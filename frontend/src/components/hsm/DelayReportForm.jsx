import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import { hsmAPI } from '../../services/api';
import ChecksheetPreviewModal, { PreviewSection, PreviewGrid } from '../hbm/ChecksheetPreviewModal';
import { isWithinEditWindow } from '../../utils/editWindow';

const SHIFTS = ['A', 'B', 'C'];

const inputCls =
  'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent';
const textareaCls = `${inputCls} min-h-[72px] resize-y`;

const Field = ({ label, required, children }) => (
  <div>
    <label className="block text-sm font-semibold text-gray-700 mb-1">
      {label}{required && <span className="text-red-500"> *</span>}
    </label>
    {children}
  </div>
);

const Section = ({ title, children }) => (
  <div className="bg-white rounded-xl border border-gray-200 p-5 mb-5">
    <h2 className="text-base font-bold text-gray-800 mb-4 border-b border-gray-100 pb-2">{title}</h2>
    <div className="space-y-4">{children}</div>
  </div>
);

const emptyForm = () => ({
  report_date: new Date().toLocaleDateString('en-CA'),
  shift: 'A',
  start_hm: '',
  end_hm: '',
  reason: '',
  agency: '',
  hotout_source: '',
  hotout_thickness: '',
  hotout_width: '',
  hotout_length: '',
  hotout_pieces: '',
  hotout_mt: '',
  hotout_remark: '',
  miss_thickness: '',
  miss_width: '',
  miss_length: '',
  miss_pieces: '',
  miss_mt: '',
  miss_location: '',
  miss_operator_name: '',
  miss_remark: '',
});

/** Format digits into HH:MM; block invalid hour/minute as user types */
const maskHmInput = (raw) => {
  let digits = String(raw).replace(/\D/g, '').slice(0, 4);
  if (!digits) return '';

  // Hour: first digit 0-2; if 2, second digit 0-3
  if (digits.length >= 1 && digits[0] > '2') digits = '2' + digits.slice(1);
  if (digits.length >= 2) {
    const hh = parseInt(digits.slice(0, 2), 10);
    if (hh > 23) digits = '23' + digits.slice(2);
  }
  // Minute: first digit 0-5
  if (digits.length >= 3 && digits[2] > '5') {
    digits = digits.slice(0, 2) + '5' + digits.slice(3);
  }
  if (digits.length >= 4) {
    const mm = parseInt(digits.slice(2, 4), 10);
    if (mm > 59) digits = digits.slice(0, 2) + '59';
  }

  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}:${digits.slice(2)}`;
};

/** Normalize complete HH:MM to 00-23 / 00-59 */
const normalizeHm = (hm) => {
  if (!hm || !hm.includes(':')) return hm;
  const [hStr, mStr] = hm.split(':');
  let h = parseInt(hStr, 10);
  let m = parseInt(mStr, 10);
  if (Number.isNaN(h) || Number.isNaN(m)) return hm;
  if (h < 0) h = 0;
  if (h > 23) h = 23;
  if (m < 0) m = 0;
  if (m > 59) m = 59;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

const isValidHm = (hm) => {
  if (!/^\d{2}:\d{2}$/.test(hm || '')) return false;
  const h = parseInt(hm.slice(0, 2), 10);
  const m = parseInt(hm.slice(3, 5), 10);
  return h >= 0 && h <= 23 && m >= 0 && m <= 59;
};

const fromDbTime = (value) => {
  if (!value) return '';
  const s = String(value).slice(0, 5);
  if (!/^\d{1,2}:\d{2}/.test(s)) return '';
  return normalizeHm(s.length >= 5 ? s : `0${s}`);
};

const calcTotalMinutes = (start24, end24) => {
  if (!start24 || !end24) return null;
  const [sh, sm] = start24.split(':').map(Number);
  const [eh, em] = end24.split(':').map(Number);
  if ([sh, sm, eh, em].some((n) => Number.isNaN(n))) return null;
  let diff = eh * 60 + em - (sh * 60 + sm);
  if (diff < 0) diff += 24 * 60;
  return diff;
};

const formatDuration = (mins) => {
  if (mins == null) return '—';
  const h = Math.floor(mins / 60);
  const rem = mins % 60;
  if (h <= 0) return `${rem} min`;
  return `${h} hr ${rem} min`;
};

const TimeHmInput = ({ hm, onChange }) => (
  <input
    type="text"
    inputMode="numeric"
    value={hm ?? ''}
    onChange={(e) => onChange(maskHmInput(e.target.value))}
    onBlur={() => {
      if (!hm || !hm.includes(':')) return;
      onChange(normalizeHm(hm));
    }}
    placeholder="__:__"
    className="w-full max-w-[9rem] px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
    aria-label="Time (HH:MM)"
  />
);

export default function DelayReportForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id: routeId } = useParams();
  const isEdit = Boolean(routeId) && location.pathname.endsWith('/edit');
  const editId = isEdit ? routeId : null;

  const [form, setForm] = useState(() => emptyForm());
  const [submitting, setSubmitting] = useState(false);
  const [loadingEdit, setLoadingEdit] = useState(Boolean(editId));
  const [showPreview, setShowPreview] = useState(false);
  const [entryMode, setEntryMode] = useState('form'); // 'form' | 'excel'
  const [importing, setImporting] = useState(false);
  const [downloadingTemplate, setDownloadingTemplate] = useState(false);
  const [importResult, setImportResult] = useState(null);

  const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const start24 = useMemo(
    () => (isValidHm(form.start_hm) ? form.start_hm : ''),
    [form.start_hm]
  );
  const end24 = useMemo(
    () => (isValidHm(form.end_hm) ? form.end_hm : ''),
    [form.end_hm]
  );

  const totalMins = useMemo(
    () => calcTotalMinutes(start24, end24),
    [start24, end24]
  );

  useEffect(() => {
    if (!editId) return;
    setLoadingEdit(true);
    hsmAPI.getDelayReportById(editId)
      .then((res) => {
        const log = res?.data || res;
        if (!isWithinEditWindow(log.created_at) && !log.can_modify) {
          toast.error('Edit allowed only within 10 hours of submission');
          navigate(`/hsm/delay-report/${editId}`);
          return;
        }
        setForm({
          report_date: log.report_date
            ? new Date(log.report_date).toLocaleDateString('en-CA')
            : new Date().toLocaleDateString('en-CA'),
          shift: log.shift || 'A',
          start_hm: fromDbTime(log.start_time) || '',
          end_hm: fromDbTime(log.end_time) || '',
          reason: log.reason || '',
          agency: log.agency || '',
          hotout_source: log.hotout_source || '',
          hotout_thickness: log.hotout_thickness || '',
          hotout_width: log.hotout_width || '',
          hotout_length: log.hotout_length || '',
          hotout_pieces: log.hotout_pieces || '',
          hotout_mt: log.hotout_mt || '',
          hotout_remark: log.hotout_remark || '',
          miss_thickness: log.miss_thickness || '',
          miss_width: log.miss_width || '',
          miss_length: log.miss_length || '',
          miss_pieces: log.miss_pieces || '',
          miss_mt: log.miss_mt || '',
          miss_location: log.miss_location || '',
          miss_operator_name: log.miss_operator_name || '',
          miss_remark: log.miss_remark || '',
        });
      })
      .catch((err) => {
        toast.error(err?.message || 'Failed to load report for edit');
        navigate('/hsm/delay-report/history');
      })
      .finally(() => setLoadingEdit(false));
  }, [editId, navigate]);

  const buildPayload = () => {
    const { start_hm, end_hm, ...rest } = form;
    return {
      ...Object.fromEntries(
        Object.entries(rest).map(([k, v]) => [k, typeof v === 'string' ? v.trim() : v])
      ),
      start_time: start24 || null,
      end_time: end24 || null,
      total_minutes: totalMins,
    };
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.report_date) { toast.error('Date is required'); return; }
    if (!form.shift) { toast.error('Shift is required'); return; }
    if (form.start_hm && !start24) {
      toast.error('Start time must be HH:MM (00–23 : 00–59)');
      return;
    }
    if (form.end_hm && !end24) {
      toast.error('End time must be HH:MM (00–23 : 00–59)');
      return;
    }
    setShowPreview(true);
  };

  const handleConfirmSubmit = async () => {
    setSubmitting(true);
    try {
      const payload = buildPayload();
      let newId = editId;
      if (isEdit) {
        await hsmAPI.updateDelayReport(editId, payload);
        toast.success('Delay report updated');
      } else {
        const res = await hsmAPI.createDelayReport(payload);
        newId = res?.data?.id || res?.id;
        toast.success('Delay report submitted');
      }
      navigate(newId ? `/hsm/delay-report/${newId}` : '/hsm/delay-report/history');
    } catch (err) {
      toast.error(err?.message || 'Failed to save report');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownloadTemplate = async () => {
    setDownloadingTemplate(true);
    try {
      const res = await hsmAPI.downloadDelayReportTemplate();
      const blob = new Blob([res.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'HSM_Delay_Report_Import_Template.xlsx';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      toast.error('Failed to download template');
    } finally {
      setDownloadingTemplate(false);
    }
  };

  const handleImportExcel = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setImporting(true);
    setImportResult(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await hsmAPI.importDelayReports(fd);
      const data = res?.data || res;
      setImportResult(data);
      toast.success(res?.message || `Imported ${data?.imported || 0} report(s)`);
      if (data?.imported > 0) {
        setTimeout(() => navigate('/hsm/delay-report/history'), 1200);
      }
    } catch (err) {
      toast.error(err?.message || 'Import failed');
      if (err?.errors) setImportResult({ errors: err.errors, imported: 0 });
    } finally {
      setImporting(false);
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
              onClick={() => navigate(isEdit ? `/hsm/delay-report/${editId}` : '/hsm/dashboard')}
              className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                {isEdit ? 'Edit Delay Report' : 'Delay Report'}
              </h1>
              <p className="text-sm text-gray-500">HSM · HOTOUT & Miss Roll</p>
            </div>
          </div>

          {!isEdit && (
            <div className="mb-5 bg-white rounded-xl border border-gray-200 p-2 flex gap-2">
              <button
                type="button"
                onClick={() => setEntryMode('form')}
                className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                  entryMode === 'form'
                    ? 'bg-indigo-600 text-white'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                Fill Form
              </button>
              <button
                type="button"
                onClick={() => setEntryMode('excel')}
                className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                  entryMode === 'excel'
                    ? 'bg-indigo-600 text-white'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                Excel Import
              </button>
            </div>
          )}

          {!isEdit && entryMode === 'excel' ? (
            <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
              <div>
                <h2 className="text-base font-bold text-gray-800 mb-1">Import multiple delay reports</h2>
                <p className="text-sm text-gray-500">
                  Download the template, fill one row per report, then upload the Excel file.
                </p>
              </div>

              <div className="rounded-lg bg-indigo-50 border border-indigo-100 px-4 py-3 text-sm text-indigo-900 space-y-1">
                <p>• Date: <span className="font-mono">DD-MM-YYYY</span> (e.g. 11-08-2026)</p>
                <p>• Shift: A / B / C</p>
                <p>• Time: <span className="font-mono">hh:mm AM/PM</span> (e.g. 09:30 AM)</p>
                <p>• Total Time is calculated automatically</p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={handleDownloadTemplate}
                  disabled={downloadingTemplate}
                  className="flex-1 py-3 border-2 border-indigo-300 text-indigo-700 rounded-lg font-semibold text-sm hover:bg-indigo-50 disabled:opacity-60"
                >
                  {downloadingTemplate ? 'Downloading…' : 'Download Template'}
                </button>
                <label className={`flex-1 py-3 text-center bg-indigo-600 text-white rounded-lg font-semibold text-sm hover:bg-indigo-700 cursor-pointer ${importing ? 'opacity-60 pointer-events-none' : ''}`}>
                  {importing ? 'Importing…' : 'Upload Excel & Import'}
                  <input
                    type="file"
                    accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                    className="hidden"
                    onChange={handleImportExcel}
                    disabled={importing}
                  />
                </label>
              </div>

              {importResult && (
                <div className="rounded-lg border border-gray-200 p-4 text-sm space-y-2">
                  <p className="font-semibold text-gray-900">
                    Imported: {importResult.imported ?? 0}
                    {importResult.skipped_errors != null ? ` · Issues: ${importResult.skipped_errors}` : ''}
                  </p>
                  {Array.isArray(importResult.errors) && importResult.errors.length > 0 && (
                    <ul className="list-disc list-inside text-red-600 space-y-0.5">
                      {importResult.errors.slice(0, 10).map((err, i) => (
                        <li key={i}>{err}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          ) : (
          <form onSubmit={handleSubmit}>
            <Section title="Basic Details">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Date" required>
                  <input type="date" required value={form.report_date} onChange={(e) => set('report_date', e.target.value)} className={inputCls} />
                </Field>
                <Field label="Shift" required>
                  <select required value={form.shift} onChange={(e) => set('shift', e.target.value)} className={inputCls}>
                    {SHIFTS.map((s) => <option key={s} value={s}>Shift {s}</option>)}
                  </select>
                </Field>
                <Field label="Start Time">
                  <TimeHmInput hm={form.start_hm} onChange={(v) => set('start_hm', v)} />
                </Field>
                <Field label="End Time">
                  <TimeHmInput hm={form.end_hm} onChange={(v) => set('end_hm', v)} />
                </Field>
              </div>
              <div className="rounded-lg bg-indigo-50 border border-indigo-200 px-4 py-3">
                <p className="text-xs font-semibold text-indigo-700 uppercase">Total Time</p>
                <p className="text-lg font-bold text-indigo-900 mt-0.5">{formatDuration(totalMins)}</p>
                <p className="text-xs text-indigo-600 mt-1">Auto-calculated from start & end time</p>
              </div>
              <Field label="Reason">
                <textarea className={textareaCls} value={form.reason} onChange={(e) => set('reason', e.target.value)} />
              </Field>
              <Field label="Agency">
                <input type="text" className={inputCls} value={form.agency} onChange={(e) => set('agency', e.target.value)} />
              </Field>
            </Section>

            <Section title="HOTOUT">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Source"><input className={inputCls} value={form.hotout_source} onChange={(e) => set('hotout_source', e.target.value)} /></Field>
                <Field label="Thickness"><input className={inputCls} value={form.hotout_thickness} onChange={(e) => set('hotout_thickness', e.target.value)} /></Field>
                <Field label="Width"><input className={inputCls} value={form.hotout_width} onChange={(e) => set('hotout_width', e.target.value)} /></Field>
                <Field label="Length"><input className={inputCls} value={form.hotout_length} onChange={(e) => set('hotout_length', e.target.value)} /></Field>
                <Field label="Pieces"><input className={inputCls} value={form.hotout_pieces} onChange={(e) => set('hotout_pieces', e.target.value)} /></Field>
                <Field label="MT"><input className={inputCls} value={form.hotout_mt} onChange={(e) => set('hotout_mt', e.target.value)} /></Field>
              </div>
              <Field label="Remark">
                <textarea className={textareaCls} value={form.hotout_remark} onChange={(e) => set('hotout_remark', e.target.value)} />
              </Field>
            </Section>

            <Section title="Miss Roll">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Thickness"><input className={inputCls} value={form.miss_thickness} onChange={(e) => set('miss_thickness', e.target.value)} /></Field>
                <Field label="Width"><input className={inputCls} value={form.miss_width} onChange={(e) => set('miss_width', e.target.value)} /></Field>
                <Field label="Length"><input className={inputCls} value={form.miss_length} onChange={(e) => set('miss_length', e.target.value)} /></Field>
                <Field label="Pieces"><input className={inputCls} value={form.miss_pieces} onChange={(e) => set('miss_pieces', e.target.value)} /></Field>
                <Field label="MT"><input className={inputCls} value={form.miss_mt} onChange={(e) => set('miss_mt', e.target.value)} /></Field>
                <Field label="Location"><input className={inputCls} value={form.miss_location} onChange={(e) => set('miss_location', e.target.value)} /></Field>
                <Field label="Operator Name"><input className={inputCls} value={form.miss_operator_name} onChange={(e) => set('miss_operator_name', e.target.value)} /></Field>
              </div>
              <Field label="Remark">
                <textarea className={textareaCls} value={form.miss_remark} onChange={(e) => set('miss_remark', e.target.value)} />
              </Field>
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
          )}
        </div>
      </div>

      <ChecksheetPreviewModal
        isOpen={showPreview}
        title={isEdit ? 'Delay Report — Update' : 'Delay Report'}
        onEdit={() => setShowPreview(false)}
        onConfirm={handleConfirmSubmit}
        submitting={submitting}
        confirmLabel={isEdit ? 'Confirm & Update' : 'Confirm & Submit'}
      >
        <PreviewSection title="Basic Details" color="bg-indigo-700">
          <PreviewGrid rows={[
            ['Date', form.report_date],
            ['Shift', form.shift],
            ['Start', start24 || '—'],
            ['End', end24 || '—'],
            ['Total Time', formatDuration(totalMins)],
            ['Reason', form.reason],
            ['Agency', form.agency],
          ]} />
        </PreviewSection>
        <PreviewSection title="HOTOUT" color="bg-indigo-700">
          <PreviewGrid rows={[
            ['Source', form.hotout_source],
            ['Thickness', form.hotout_thickness],
            ['Width', form.hotout_width],
            ['Length', form.hotout_length],
            ['Pieces', form.hotout_pieces],
            ['MT', form.hotout_mt],
            ['Remark', form.hotout_remark],
          ]} />
        </PreviewSection>
        <PreviewSection title="Miss Roll" color="bg-indigo-700">
          <PreviewGrid rows={[
            ['Thickness', form.miss_thickness],
            ['Width', form.miss_width],
            ['Length', form.miss_length],
            ['Pieces', form.miss_pieces],
            ['MT', form.miss_mt],
            ['Location', form.miss_location],
            ['Operator', form.miss_operator_name],
            ['Remark', form.miss_remark],
          ]} />
        </PreviewSection>
      </ChecksheetPreviewModal>
    </>
  );
}
