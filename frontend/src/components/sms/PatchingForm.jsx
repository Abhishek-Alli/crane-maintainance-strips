import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { smsAPI } from '../../services/api';
import { formatDate } from './eotCraneConfig';
import {
  PATCHING_FURNACES,
  PATCHING_CRUCIBLES,
  PATCHING_POINTS,
  AIR_PRESSURE_POINT,
  isAlert,
  countAlerts,
  hasValue,
  emptyPatchingForm,
  listChecklistIssues,
} from './patchingConfig';

const Field = ({ label, children, required }) => (
  <div>
    <label className="block text-xs font-semibold text-gray-600 mb-1">
      {label}{required ? ' *' : ''}
    </label>
    {children}
  </div>
);

const inputCls =
  'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400';

const loggedInUsername = () => {
  try {
    return JSON.parse(localStorage.getItem('user'))?.username || '';
  } catch {
    return '';
  }
};

const scrollToId = (id) => {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
};

export default function PatchingForm() {
  const { id: editId } = useParams();
  const isEdit = Boolean(editId);
  const navigate = useNavigate();
  const [form, setForm] = useState(() => ({ ...emptyPatchingForm(), recorded_by: isEdit ? '' : loggedInUsername() }));
  const [openRemarks, setOpenRemarks] = useState({}); // { [pointKey]: true }
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState(false);
  const [showIssues, setShowIssues] = useState(false);
  const [flashId, setFlashId] = useState(null);

  useEffect(() => {
    if (!editId) return;
    smsAPI.getPatchingById(editId)
      .then((res) => {
        const d = res?.data || res;
        if (!d?.can_modify) {
          toast.error('Edit window expired (10 hours)');
          navigate(`/sms/patching/${editId}`);
          return;
        }
        const items = {};
        const remarksOpen = {};
        PATCHING_POINTS.forEach((p) => {
          const row = d.checklist_items?.[p.key] || {};
          items[p.key] = { value: hasValue(row.value) ? String(row.value) : '', remark: row.remark || '' };
          if (row.remark) remarksOpen[p.key] = true;
        });
        setForm({
          report_date: String(d.report_date || '').slice(0, 10),
          recorded_by: d.recorded_by || '',
          furnace: d.furnace || PATCHING_FURNACES[0],
          crucible: d.crucible || '',
          checklist_items: items,
          general_remark: d.general_remark || '',
        });
        setOpenRemarks(remarksOpen);
      })
      .catch(() => {
        toast.error('Failed to load checklist');
        navigate('/sms/patching/history');
      })
      .finally(() => setLoading(false));
  }, [editId, navigate]);

  const alertCount = countAlerts(form.checklist_items);
  const filledPoints = PATCHING_POINTS.filter((p) => hasValue(form.checklist_items[p.key].value)).length;

  const flash = (id) => {
    setFlashId(id);
    scrollToId(id);
    setTimeout(() => setFlashId((cur) => (cur === id ? null : cur)), 2000);
  };

  const setPoint = (p, patch) => {
    const next = { ...form.checklist_items[p.key], ...patch };
    if ('value' in patch && isAlert(p, next.value)) setOpenRemarks((o) => ({ ...o, [p.key]: true }));
    setForm((f) => ({ ...f, checklist_items: { ...f.checklist_items, [p.key]: next } }));
  };

  /** All missing compulsory entries, in form order */
  const collectIssues = () => {
    const issues = [];
    const header = (where, message) => issues.push({ targetId: 'pat-header', where, message });
    if (!form.report_date) header('Date', 'Required');
    if (!form.recorded_by.trim()) header('Recorded By', 'Required');
    if (!form.furnace) header('Furnace', 'Required');
    if (!form.crucible) header('Crucible No.', 'Required');
    listChecklistIssues(form.checklist_items).forEach((it) => {
      issues.push({ targetId: `pt-${it.key}`, where: it.where, message: it.message });
    });
    return issues;
  };
  const issues = collectIssues();

  const handleSubmitClick = () => {
    if (issues.length) {
      toast.error(`${issues.length} compulsory item${issues.length === 1 ? '' : 's'} pending`);
      setShowIssues(true);
      return;
    }
    setPreview(true);
  };

  const handleSubmit = async () => {
    setSaving(true);
    try {
      const payload = {
        report_date: form.report_date,
        recorded_by: form.recorded_by.trim(),
        furnace: form.furnace,
        crucible: form.crucible,
        checklist_items: form.checklist_items,
        general_remark: form.general_remark.trim() || null,
      };
      if (isEdit) {
        await smsAPI.updatePatching(editId, payload);
        toast.success('Checklist updated');
        navigate(`/sms/patching/${editId}`);
      } else {
        const res = await smsAPI.createPatching(payload);
        const id = res?.data?.id;
        toast.success('Checklist saved');
        navigate(id ? `/sms/patching/${id}` : '/sms/patching/history');
      }
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Failed to save');
    } finally {
      setSaving(false);
      setPreview(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-amber-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="max-w-4xl mx-auto">
        <button
          type="button"
          onClick={() => navigate('/sms/dashboard')}
          className="text-sm text-gray-500 hover:text-gray-700 mb-1"
        >
          ← Back to Dashboard
        </button>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{isEdit ? 'Edit Patching' : 'Patching'}</h1>
            <p className="text-sm text-gray-500 mt-1">Furnace · Patching check sheet</p>
          </div>
          <Link to="/sms/patching/history" className="text-sm font-semibold text-amber-700 hover:opacity-80">
            History →
          </Link>
        </div>

        <div
          id="pat-header"
          className={`bg-white rounded-xl border shadow-sm p-5 mb-5 space-y-4 transition-shadow ${
            flashId === 'pat-header' ? 'border-red-400 ring-2 ring-red-300' : 'border-gray-200'
          }`}
        >
          <h2 className="text-sm font-bold text-amber-800 uppercase tracking-wide border-b border-amber-100 pb-2">
            Basic Information
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Date" required>
              <input
                type="date"
                className={inputCls}
                value={form.report_date}
                onChange={(e) => setForm({ ...form, report_date: e.target.value })}
              />
            </Field>
            <Field label="Recorded By" required>
              <input
                type="text"
                className={inputCls}
                value={form.recorded_by}
                onChange={(e) => setForm({ ...form, recorded_by: e.target.value })}
                placeholder="Name"
              />
            </Field>
            <Field label="Furnace" required>
              <select
                className={inputCls}
                value={form.furnace}
                onChange={(e) => setForm({ ...form, furnace: e.target.value })}
              >
                <option value="">Select furnace</option>
                {PATCHING_FURNACES.map((f) => <option key={f} value={f}>{f}</option>)}
              </select>
            </Field>
            <Field label="Crucible No." required>
              <select
                className={inputCls}
                value={form.crucible}
                onChange={(e) => setForm({ ...form, crucible: e.target.value })}
              >
                <option value="">Select crucible</option>
                {PATCHING_CRUCIBLES.map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </Field>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden mb-5">
          <div className="px-5 py-3 bg-amber-600">
            <p className="text-sm font-bold text-white">Checklist Items</p>
            <p className="text-[11px] text-amber-100">
              {filledPoints}/{PATCHING_POINTS.length} filled
              {alertCount > 0 ? ` · ${alertCount} alert${alertCount === 1 ? '' : 's'}` : ''}
            </p>
          </div>
          <div className="divide-y divide-gray-100">
            {PATCHING_POINTS.map((p, idx) => {
              const row = form.checklist_items[p.key];
              const alert = isAlert(p, row.value);
              const remarkOpen = alert || openRemarks[p.key];
              return (
                <div
                  key={p.key}
                  id={`pt-${p.key}`}
                  className={`px-5 py-3.5 space-y-3 transition-shadow ${alert ? 'bg-red-50/60' : ''} ${
                    flashId === `pt-${p.key}` ? 'ring-2 ring-inset ring-red-400' : ''
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <p className="text-sm font-semibold text-gray-800">
                      <span className="text-gray-400 font-medium">{idx + 1}. </span>
                      {p.label}
                      {p.required ? <span className="text-red-500"> *</span> : (
                        <span className="text-xs font-normal text-gray-400"> (optional)</span>
                      )}
                    </p>
                    {p.type === 'number' ? (
                      <div className="flex items-center gap-2 sm:justify-end">
                        <input
                          type="number"
                          inputMode="decimal"
                          step="any"
                          className={`w-32 px-3 py-1.5 border rounded-lg text-sm font-semibold focus:outline-none focus:ring-2 ${
                            alert
                              ? 'border-red-400 text-red-700 focus:ring-red-300'
                              : hasValue(row.value)
                                ? 'border-emerald-400 text-emerald-700 focus:ring-amber-400'
                                : 'border-gray-300 focus:ring-amber-400'
                          }`}
                          value={row.value}
                          onChange={(e) => setPoint(p, { value: e.target.value })}
                          placeholder={p.unit}
                        />
                        <span className="text-xs text-gray-500 whitespace-nowrap">Min: {p.min} {p.unit}</span>
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-2 sm:justify-end">
                        {p.options.map((opt) => {
                          const selected = row.value === opt;
                          const bad = p.alertValues.includes(opt);
                          return (
                            <button
                              key={opt}
                              type="button"
                              onClick={() => setPoint(p, { value: selected ? '' : opt })}
                              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${
                                selected
                                  ? bad
                                    ? 'bg-red-600 text-white border-red-600'
                                    : 'bg-emerald-600 text-white border-emerald-600'
                                  : 'bg-white text-gray-700 border-gray-300 hover:border-amber-300'
                              }`}
                            >
                              {opt}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {!alert && (
                    <button
                      type="button"
                      onClick={() => setOpenRemarks((o) => ({ ...o, [p.key]: !o[p.key] }))}
                      className="text-xs font-semibold text-gray-500 hover:text-amber-700"
                    >
                      Remark {remarkOpen ? '▴' : '▾'}
                    </button>
                  )}
                  {alert && (
                    <p className="text-xs font-semibold text-red-700">
                      Alert{p.type === 'number' ? ` (below ${p.min} ${p.unit})` : ''}: Remark required
                    </p>
                  )}
                  {remarkOpen && (
                    <input
                      type="text"
                      className={inputCls}
                      value={row.remark}
                      onChange={(e) => setPoint(p, { remark: e.target.value })}
                      placeholder={alert ? 'Remark *' : 'Remark (optional)'}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 mb-6">
          <Field label="Remark (if any)">
            <textarea
              className={`${inputCls} min-h-[90px]`}
              value={form.general_remark}
              onChange={(e) => setForm({ ...form, general_remark: e.target.value })}
              placeholder="Any other remark"
            />
          </Field>
        </div>

        <div className="flex flex-wrap items-center gap-3 justify-end">
          <span className={`text-sm font-semibold ${alertCount ? 'text-red-600' : 'text-emerald-600'}`}>
            {alertCount} alert{alertCount === 1 ? '' : 's'} · {filledPoints}/{PATCHING_POINTS.length} filled
          </span>
          <button
            type="button"
            onClick={handleSubmitClick}
            className="px-5 py-2.5 bg-amber-600 text-white rounded-lg text-sm font-semibold hover:bg-amber-700"
          >
            {isEdit ? 'Preview & Update' : 'Preview & Submit'}
          </button>
        </div>
      </div>

      {showIssues && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40" onClick={() => setShowIssues(false)}>
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-4 max-h-[75vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-bold text-gray-900 mb-1">Check Compulsory</h3>
            {issues.length === 0 ? (
              <p className="text-sm text-emerald-700 font-semibold py-4">All compulsory items are filled. Ready to submit.</p>
            ) : (
              <>
                <p className="text-xs text-gray-500 mb-3">{issues.length} pending — tap one to go there</p>
                <div className="overflow-y-auto space-y-1.5">
                  {issues.map((it, i) => (
                    <button
                      key={`${it.targetId}-${i}`}
                      type="button"
                      onClick={() => { setShowIssues(false); flash(it.targetId); }}
                      className="w-full flex items-center justify-between gap-3 px-3 py-2 rounded-lg border border-red-100 bg-red-50/50 hover:bg-red-50 text-left"
                    >
                      <span className="text-sm font-semibold text-gray-800">{it.where}</span>
                      <span className="text-xs font-semibold text-red-700 shrink-0">{it.message}</span>
                    </button>
                  ))}
                </div>
              </>
            )}
            <div className="flex justify-end mt-3">
              <button type="button" onClick={() => setShowIssues(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {preview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Confirm submit?</h3>
            <p className="text-sm text-gray-600">
              Date {formatDate(form.report_date)} · Furnace {form.furnace} · Crucible {form.crucible}
            </p>
            <p className="text-sm text-gray-600 mb-4">
              Recorded by {form.recorded_by} · {AIR_PRESSURE_POINT.label}{' '}
              {form.checklist_items[AIR_PRESSURE_POINT.key].value} {AIR_PRESSURE_POINT.unit} ·{' '}
              <span className={alertCount ? 'text-red-600 font-semibold' : 'text-emerald-600 font-semibold'}>
                {alertCount} alert{alertCount === 1 ? '' : 's'}
              </span>
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setPreview(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={handleSubmit}
                className="px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-semibold disabled:opacity-50"
              >
                {saving ? 'Saving…' : isEdit ? 'Update' : 'Submit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
