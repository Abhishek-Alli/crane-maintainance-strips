import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { smsAPI } from '../../services/api';
import { PUMP_HOUSE_CHECKS, isBadValue, emptyPumpHouseForm } from './pumpHouseMotorConfig';

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

export default function PumpHouseMotorForm() {
  const { id: editId } = useParams();
  const isEdit = Boolean(editId);
  const navigate = useNavigate();
  const [form, setForm] = useState(() => ({ ...emptyPumpHouseForm(), recorded_by: isEdit ? '' : loggedInUsername() }));
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [openRemarks, setOpenRemarks] = useState({});

  useEffect(() => {
    if (!editId) return;
    smsAPI.getPumpHouseMotorById(editId)
      .then((res) => {
        const d = res?.data || res;
        if (!d?.can_modify) {
          toast.error('Edit window expired (10 hours)');
          navigate(`/sms/pump-house-motor/${editId}`);
          return;
        }
        const checks = {};
        PUMP_HOUSE_CHECKS.forEach((c) => {
          const row = d.checks?.[c.key] || {};
          checks[c.key] = { value: row.value || '', remark: row.remark || '' };
        });
        setForm({
          ...emptyPumpHouseForm(),
          report_date: String(d.report_date || '').slice(0, 10),
          recorded_by: d.recorded_by || '',
          area: d.area || '',
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
        navigate('/sms/pump-house-motor/history');
      })
      .finally(() => setLoading(false));
  }, [editId, navigate]);

  const set = (patch) => setForm((f) => ({ ...f, ...patch }));
  const setCheck = (key, patch) =>
    setForm((f) => ({ ...f, checks: { ...f.checks, [key]: { ...f.checks[key], ...patch } } }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.area.trim()) return toast.error('Area is required');
    if (!form.motor.trim()) return toast.error('Motor is required');
    setSaving(true);
    try {
      if (isEdit) {
        await smsAPI.updatePumpHouseMotor(editId, form);
        toast.success('Checklist updated');
        navigate(`/sms/pump-house-motor/${editId}`);
      } else {
        const res = await smsAPI.createPumpHouseMotor(form);
        toast.success('Checklist saved');
        const id = res?.data?.id;
        navigate(id ? `/sms/pump-house-motor/${id}` : '/sms/pump-house-motor/history');
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
              {isEdit ? 'Edit Pump House Motor Panel' : 'Pump House Motor Panel'}
            </h1>
            <p className="text-sm text-gray-500 mt-1">FC and CCM Pump House</p>
          </div>
          <Link to="/sms/pump-house-motor/history" className="text-sm font-semibold text-amber-700 hover:opacity-80">
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
            <input type="text" value={form.area} onChange={(e) => set({ area: e.target.value })} className={inputCls} />
          </Field>
          <Field label="Motor" required>
            <input type="text" value={form.motor} onChange={(e) => set({ motor: e.target.value })} className={inputCls} />
          </Field>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 mb-5">
          <h2 className="text-sm font-bold text-amber-800 uppercase tracking-wide mb-3">Current</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[['current_r', 'Current - R'], ['current_y', 'Current - Y'], ['current_b', 'Current - B']].map(([k, label]) => (
              <Field key={k} label={label}>
                <input type="number" step="any" value={form[k]} onChange={(e) => set({ [k]: e.target.value })} className={inputCls} />
              </Field>
            ))}
          </div>
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
            <textarea rows={3} value={form.remark} onChange={(e) => set({ remark: e.target.value })} className={inputCls} />
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
