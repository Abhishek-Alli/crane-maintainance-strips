import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { smsAPI } from '../../services/api';
import { PUMP_HOUSE_CHECKS, CCM_AREAS, isBadValue, emptyCcmPumpHouseForm } from './ccmPumpHouseConfig';

const inputCls =
  'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400';

const Field = ({ label, required, children }) => (
  <div>
    <label className="block text-xs font-semibold text-gray-600 mb-1">
      {label}{required ? ' *' : ''}
    </label>
    {children}
  </div>
);

const loggedInUsername = () => {
  try {
    return JSON.parse(localStorage.getItem('user'))?.username || '';
  } catch {
    return '';
  }
};

export default function CcmPumpHouseForm() {
  const { id: editId } = useParams();
  const isEdit = Boolean(editId);
  const navigate = useNavigate();
  const [form, setForm] = useState(() => ({ ...emptyCcmPumpHouseForm(), recorded_by: isEdit ? '' : loggedInUsername() }));
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [openRemarks, setOpenRemarks] = useState({});

  useEffect(() => {
    if (!editId) return;
    smsAPI.getCcmPumpHouseById(editId)
      .then((res) => {
        const d = res?.data || res;
        if (!d?.can_modify) {
          toast.error('Edit window expired (10 hours)');
          navigate(`/sms/ccm-pump-house/${editId}`);
          return;
        }
        const checks = {};
        PUMP_HOUSE_CHECKS.forEach((c) => {
          const row = d.checks?.[c.key] || {};
          checks[c.key] = { value: row.value || '', remark: row.remark || '' };
        });
        setForm({
          ...emptyCcmPumpHouseForm(),
          report_date: String(d.report_date || '').slice(0, 10),
          recorded_by: d.recorded_by || '',
          area: d.area || '',
          sub_area: d.sub_area || '',
          motor: d.motor || '',
          current_r: d.current_r ?? '',
          current_y: d.current_y ?? '',
          current_b: d.current_b ?? '',
          checks,
          remark: d.remark || '',
        });
      })
      .catch(() => {
        toast.error('Failed to load checklist');
        navigate('/sms/ccm-pump-house/history');
      })
      .finally(() => setLoading(false));
  }, [editId, navigate]);

  const set = (patch) => setForm((f) => ({ ...f, ...patch }));
  const setCheck = (key, patch) =>
    setForm((f) => ({ ...f, checks: { ...f.checks, [key]: { ...f.checks[key], ...patch } } }));

  const subAreaCfg = CCM_AREAS[form.area]?.[form.sub_area];
  const maxCurrent = subAreaCfg?.max;
  const isOver = (v) => maxCurrent != null && v !== '' && Number(v) > maxCurrent;
  const overLimit = ['current_r', 'current_y', 'current_b'].some((k) => isOver(form[k]));
  const subAreaOptions = Object.keys(CCM_AREAS[form.area] || {});
  if (form.sub_area && form.area && !subAreaOptions.includes(form.sub_area)) subAreaOptions.push(form.sub_area);
  const motorOptions = subAreaCfg ? [...subAreaCfg.motors] : [];
  if (form.motor && form.sub_area && !motorOptions.includes(form.motor)) motorOptions.push(form.motor);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.area.trim()) return toast.error('Area is required');
    if (!form.sub_area.trim()) return toast.error('Sub-area is required');
    if (!form.motor.trim()) return toast.error('Motor is required');
    setSaving(true);
    try {
      if (isEdit) {
        await smsAPI.updateCcmPumpHouse(editId, form);
        toast.success('Checklist updated');
        navigate(`/sms/ccm-pump-house/${editId}`);
      } else {
        const res = await smsAPI.createCcmPumpHouse(form);
        toast.success('Checklist saved');
        const id = res?.data?.id;
        navigate(id ? `/sms/ccm-pump-house/${id}` : '/sms/ccm-pump-house/history');
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

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <form onSubmit={handleSubmit} className="max-w-4xl mx-auto">
        <div className="flex items-start justify-between gap-3 mb-6">
          <div>
            <button
              type="button"
              onClick={() => navigate('/sms/fc-ccm-pump-house')}
              className="text-sm text-gray-500 hover:text-gray-700 mb-1"
            >
              ← Back
            </button>
            <h1 className="text-2xl font-bold text-gray-900">
              {isEdit ? 'Edit CCM Pump House' : 'CCM Pump House'}
            </h1>
            <p className="text-sm text-gray-500 mt-1">CCM Pump House</p>
          </div>
          <Link to="/sms/ccm-pump-house/history" className="text-sm font-semibold text-amber-700 hover:opacity-80">
            History →
          </Link>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 mb-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Date" required>
            <input type="date" value={form.report_date} onChange={(e) => set({ report_date: e.target.value })} className={inputCls} required />
          </Field>
          <Field label="Recorded By" required>
            <input type="text" value={form.recorded_by} onChange={(e) => set({ recorded_by: e.target.value })} className={inputCls} required />
          </Field>
          <Field label="Area" required>
            <select value={form.area} onChange={(e) => set({ area: e.target.value, sub_area: '', motor: '' })} className={inputCls}>
              <option value="">Select area</option>
              {form.area && !CCM_AREAS[form.area] && <option value={form.area}>{form.area}</option>}
              {Object.keys(CCM_AREAS).map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          </Field>
          <Field label="Sub-area" required>
            <select value={form.sub_area} onChange={(e) => set({ sub_area: e.target.value, motor: '' })} className={inputCls} disabled={!form.area}>
              <option value="">Select sub-area</option>
              {subAreaOptions.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          </Field>
          <Field label="Motor" required>
            <select value={form.motor} onChange={(e) => set({ motor: e.target.value })} className={inputCls} disabled={!form.sub_area}>
              <option value="">Select motor</option>
              {motorOptions.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </Field>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 mb-5">
          <h2 className="text-sm font-bold text-amber-800 uppercase tracking-wide mb-3">
            Current{maxCurrent != null && <span className="ml-2 normal-case text-gray-500">(Max: {maxCurrent} A)</span>}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[['current_r', 'Current - R'], ['current_y', 'Current - Y'], ['current_b', 'Current - B']].map(([k, label]) => (
              <Field key={k} label={label}>
                <input type="number" step="any" value={form[k]} onChange={(e) => set({ [k]: e.target.value })}
                  className={`${inputCls} ${isOver(form[k]) ? 'border-red-500 bg-red-50' : ''}`} />
              </Field>
            ))}
          </div>
          {overLimit && (
            <p className="text-xs font-semibold text-red-600 mt-2">
              Current max limit ({maxCurrent} A) se zyada hai. Neeche Remark mein reason likhein.
            </p>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 mb-5">
          <h2 className="text-sm font-bold text-amber-800 uppercase tracking-wide mb-3">Checklist</h2>
          <div className="space-y-4">
            {PUMP_HOUSE_CHECKS.map((c) => {
              const row = form.checks[c.key];
              const bad = isBadValue(c, row.value);
              return (
                <div key={c.key} className={`rounded-lg p-3 border space-y-2 ${bad ? 'border-red-200 bg-red-50/50' : 'border-gray-100 bg-gray-50'}`}>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <p className="text-sm font-semibold text-gray-800">{c.label}</p>
                    <div className="flex flex-wrap gap-2 sm:justify-end">
                      {c.options.map((opt) => {
                        const selected = row.value === opt;
                        const isBad = isBadValue(c, opt);
                        return (
                          <button
                            key={opt}
                            type="button"
                            onClick={() => setCheck(c.key, { value: selected ? '' : opt })}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${
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
                  </div>
                  {!bad && (
                    <button
                      type="button"
                      onClick={() => setOpenRemarks((o) => ({ ...o, [c.key]: !o[c.key] }))}
                      className="text-xs font-semibold text-gray-500 hover:text-amber-700"
                    >
                      Remark {openRemarks[c.key] || row.remark ? '▴' : '▾'}
                    </button>
                  )}
                  {(bad || openRemarks[c.key] || row.remark) && (
                    <input
                      type="text"
                      value={row.remark}
                      onChange={(e) => setCheck(c.key, { remark: e.target.value })}
                      className={inputCls}
                      placeholder={bad ? 'Remark / Action' : 'Remark (optional)'}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 mb-5">
          <Field label="Remark (if any)">
            <textarea
              rows={3}
              value={form.remark}
              onChange={(e) => set({ remark: e.target.value })}
              className={`${inputCls} ${overLimit && !form.remark.trim() ? 'border-red-500 bg-red-50' : ''}`}
              placeholder={overLimit ? 'Current limit cross hui, remark likhein' : ''}
            />
          </Field>
        </div>

        <div className="flex justify-end gap-2">
          <button type="button" onClick={() => navigate(-1)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm">Cancel</button>
          <button type="submit" disabled={saving} className="px-5 py-2 bg-amber-600 text-white rounded-lg text-sm font-semibold hover:bg-amber-700 disabled:opacity-50">
            {saving ? 'Saving…' : isEdit ? 'Update' : 'Save'}
          </button>
        </div>
      </form>
    </div>
  );
}
