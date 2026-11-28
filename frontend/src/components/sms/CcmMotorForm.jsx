import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { smsAPI } from '../../services/api';
import { CCM_MOTOR_CHECKS, CCM_STANDS, CCM_MOTORS, isBadValue, emptyCcmMotorForm } from './ccmMotorConfig';

const inputCls =
  'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400';
const selectCls =
  'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-400';

const Field = ({ label, required, children }) => (
  <div>
    <label className="block text-xs font-semibold text-gray-600 mb-1">
      {label}{required ? ' *' : ''}
    </label>
    {children}
  </div>
);

const Toggle = ({ label, value, onChange }) => (
  <div className="flex items-center justify-between py-2">
    <span className="text-sm text-gray-700">{label}</span>
    <button
      type="button"
      onClick={() => onChange(!value)}
      className={`relative inline-flex h-6 w-12 items-center rounded-full transition-colors ${value ? 'bg-amber-500' : 'bg-gray-300'}`}
    >
      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${value ? 'translate-x-7' : 'translate-x-1'}`} />
      <span className={`absolute right-1 text-[9px] font-bold ${value ? 'text-white left-1' : 'text-gray-500 right-1'}`}>
        {value ? 'YES' : 'NO'}
      </span>
    </button>
  </div>
);

const loggedInUsername = () => {
  try {
    return JSON.parse(localStorage.getItem('user'))?.username || '';
  } catch {
    return '';
  }
};

export default function CcmMotorForm() {
  const { id: editId } = useParams();
  const isEdit = Boolean(editId);
  const navigate = useNavigate();
  const [page, setPage] = useState(1); // 1 = stand/motor/toggles, 2 = form
  const [form, setForm] = useState(() => ({ ...emptyCcmMotorForm(), recorded_by: isEdit ? '' : loggedInUsername() }));
  const [toggles, setToggles] = useState({
    continuLoop: false,
    continuLoopSelected: false,
    continuLoopSelectedEntries: false,
  });
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [openRemarks, setOpenRemarks] = useState({});

  useEffect(() => {
    if (!editId) return;
    smsAPI.getCcmMotorById(editId)
      .then((res) => {
        const d = res?.data || res;
        if (!d?.can_modify) {
          toast.error('Edit window expired (10 hours)');
          navigate(`/sms/ccm-motor/${editId}`);
          return;
        }
        const base = emptyCcmMotorForm();
        const checks = {};
        CCM_MOTOR_CHECKS.forEach((c) => {
          const row = d.checks?.[c.key] || {};
          checks[c.key] = { value: row.value || '', remark: row.remark || '' };
        });
        setForm({
          ...base,
          report_date: String(d.report_date || '').slice(0, 10),
          recorded_by: d.recorded_by || '',
          stand: d.stand || '',
          motor: d.motor || '',
          current_r: d.current_r ?? '',
          current_y: d.current_y ?? '',
          current_b: d.current_b ?? '',
          checks,
          remark: d.remark || '',
        });
        // Edit mode: skip to page 2
        setPage(2);
      })
      .catch(() => {
        toast.error('Failed to load checklist');
        navigate('/sms/ccm-motor/history');
      })
      .finally(() => setLoading(false));
  }, [editId, navigate]);

  const set = (patch) => setForm((f) => ({ ...f, ...patch }));
  const setCheck = (key, patch) =>
    setForm((f) => ({ ...f, checks: { ...f.checks, [key]: { ...f.checks[key], ...patch } } }));

  const handleNext = () => {
    if (!form.stand) return toast.error('Please select a Stand');
    if (!form.motor) return toast.error('Please select a Motor');
    setPage(2);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.stand) return toast.error('Stand is required');
    if (!form.motor) return toast.error('Motor is required');
    setSaving(true);
    try {
      if (isEdit) {
        await smsAPI.updateCcmMotor(editId, form);
        toast.success('Checklist updated');
        navigate(`/sms/ccm-motor/${editId}`);
      } else {
        const res = await smsAPI.createCcmMotor(form);
        toast.success('Checklist saved');
        const id = res?.data?.id;
        navigate(id ? `/sms/ccm-motor/${id}` : '/sms/ccm-motor/history');
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to save checklist');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-amber-600" />
      </div>
    );
  }

  /* ── PAGE 1: Stand / Motor / Toggles ── */
  if (page === 1) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
        <div className="max-w-lg mx-auto">
          <div className="flex items-start justify-between gap-3 mb-6">
            <div>
              <button type="button" onClick={() => navigate('/sms/billet-slab-caster')} className="text-sm text-gray-500 hover:text-gray-700 mb-1">
                ← Back
              </button>
              <h1 className="text-2xl font-bold text-gray-900">CCM Motor Check</h1>
              <p className="text-sm text-gray-500 mt-1">Billet and Slab Caster</p>
            </div>
            <Link to="/sms/ccm-motor/history" className="text-sm font-semibold text-amber-700 hover:opacity-80">
              History →
            </Link>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-5">
            {/* Stand dropdown */}
            <Field label="Stand" required>
              <select
                value={form.stand}
                onChange={(e) => { set({ stand: e.target.value, motor: '' }); }}
                className={selectCls}
              >
                <option value="">-- Select Stand --</option>
                {CCM_STANDS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </Field>

            {/* Motor dropdown */}
            <Field label="Motor" required>
              <select
                value={form.motor}
                onChange={(e) => set({ motor: e.target.value })}
                className={selectCls}
                disabled={!form.stand}
              >
                <option value="">-- Select Motor --</option>
                {CCM_MOTORS.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </Field>

            {/* Toggles */}
            <div className="border-t border-gray-100 pt-4 space-y-1">
              <Toggle
                label="Enable Entry Continue Loop"
                value={toggles.continuLoop}
                onChange={(v) => setToggles((t) => ({ ...t, continuLoop: v }))}
              />
              <Toggle
                label="Enable Entry Continue Loop For Selected Entry"
                value={toggles.continuLoopSelected}
                onChange={(v) => setToggles((t) => ({ ...t, continuLoopSelected: v }))}
              />
              <Toggle
                label="Enable Continue Loop For Selected Entries"
                value={toggles.continuLoopSelectedEntries}
                onChange={(v) => setToggles((t) => ({ ...t, continuLoopSelectedEntries: v }))}
              />
            </div>

            <button
              type="button"
              onClick={handleNext}
              className="w-full py-3 bg-amber-600 text-white rounded-lg text-sm font-bold hover:bg-amber-700 uppercase tracking-wide"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ── PAGE 2: Full Form ── */
  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <form onSubmit={handleSubmit} className="max-w-4xl mx-auto">
        <div className="flex items-start justify-between gap-3 mb-6">
          <div>
            <button
              type="button"
              onClick={() => isEdit ? navigate(-1) : setPage(1)}
              className="text-sm text-gray-500 hover:text-gray-700 mb-1"
            >
              ← Back
            </button>
            <h1 className="text-2xl font-bold text-gray-900">
              {isEdit ? 'Edit CCM Motor Check' : 'CCM Motor Check'}
            </h1>
            <p className="text-sm text-gray-500 mt-1">Billet and Slab Caster</p>
          </div>
          <Link to="/sms/ccm-motor/history" className="text-sm font-semibold text-amber-700 hover:opacity-80">
            History →
          </Link>
        </div>

        {/* Date + Recorded By */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 mb-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Date" required>
            <input type="date" value={form.report_date} onChange={(e) => set({ report_date: e.target.value })} className={inputCls} required />
          </Field>
          <Field label="Recorded By" required>
            <input type="text" value={form.recorded_by} onChange={(e) => set({ recorded_by: e.target.value })} className={inputCls} required />
          </Field>
        </div>

        {/* Stand + Motor (read-only display, editable on edit) */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 mb-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Stand" required>
            {isEdit ? (
              <select value={form.stand} onChange={(e) => set({ stand: e.target.value, motor: '' })} className={selectCls}>
                {CCM_STANDS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            ) : (
              <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-semibold text-gray-800">{form.stand}</div>
            )}
          </Field>
          <Field label="Motor" required>
            {isEdit ? (
              <select value={form.motor} onChange={(e) => set({ motor: e.target.value })} className={selectCls}>
                {CCM_MOTORS.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            ) : (
              <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-semibold text-gray-800">{form.motor}</div>
            )}
          </Field>
        </div>

        {/* Current R, Y, B */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 mb-5">
          <h2 className="text-sm font-bold text-amber-800 uppercase tracking-wide mb-3">Current *</h2>
          <div className="grid grid-cols-3 gap-4">
            {[['current_r', 'R'], ['current_y', 'Y'], ['current_b', 'B']].map(([k, label]) => (
              <Field key={k} label={label}>
                <input type="number" step="any" value={form[k]} onChange={(e) => set({ [k]: e.target.value })} className={inputCls} />
              </Field>
            ))}
          </div>
        </div>

        {/* Checklist */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 mb-5">
          <div className="space-y-3">
            {CCM_MOTOR_CHECKS.map((c) => {
              const row = form.checks[c.key];
              const bad = isBadValue(c, row.value);
              return (
                <div key={c.key} className={`rounded-lg border ${bad ? 'border-red-200 bg-red-50/50' : 'border-gray-200 bg-gray-50'}`}>
                  <div className="px-3 py-2 bg-gray-100 rounded-t-lg border-b border-gray-200">
                    <p className="text-xs font-bold text-gray-700 uppercase tracking-wide">{c.label} *</p>
                  </div>
                  <div className="px-3 py-3 space-y-2">
                    <div className="flex flex-wrap gap-2">
                      {c.options.map((opt) => {
                        const selected = row.value === opt;
                        const isBad = isBadValue(c, opt);
                        return (
                          <button
                            key={opt}
                            type="button"
                            onClick={() => setCheck(c.key, { value: selected ? '' : opt })}
                            className={`px-5 py-2 rounded-lg text-sm font-semibold border ${
                              selected
                                ? isBad
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
                    {/* Remark toggle */}
                    {!bad && (
                      <button
                        type="button"
                        onClick={() => setOpenRemarks((o) => ({ ...o, [c.key]: !o[c.key] }))}
                        className="text-xs text-gray-400 hover:text-amber-600 flex items-center gap-1"
                      >
                        REMARK {openRemarks[c.key] || row.remark ? '▴' : '▾'}
                      </button>
                    )}
                    {(bad || openRemarks[c.key] || row.remark) && (
                      <input
                        type="text"
                        value={row.remark}
                        onChange={(e) => setCheck(c.key, { remark: e.target.value })}
                        className={inputCls}
                        placeholder="Remark"
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Remark (if any) */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 mb-5">
          <div className="px-0 pb-1">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Remark (If Any)</p>
            <textarea rows={3} value={form.remark} onChange={(e) => set({ remark: e.target.value })} className={inputCls} placeholder="Type Value" />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <button type="button" onClick={() => isEdit ? navigate(-1) : setPage(1)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm">
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2 bg-amber-600 text-white rounded-lg text-sm font-bold hover:bg-amber-700 disabled:opacity-50 uppercase"
          >
            {saving ? 'Saving…' : isEdit ? 'Update' : 'Submit'}
          </button>
        </div>
      </form>
    </div>
  );
}
