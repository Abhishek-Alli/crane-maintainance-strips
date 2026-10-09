import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { smsAPI } from '../../services/api';
import {
  FP_FURNACES, FP_CHECKS, FP_MOTORS, FP_PHASES, isBadValue, emptyFurnacePollutionForm,
} from './furnacePollutionConfig';
import {
  inputCls, Field, loggedInUsername, optionBtnCls, RemarkToggle, CheckRow, PageLoader,
} from './checkFormParts';

export default function FurnacePollutionForm() {
  const { id: editId } = useParams();
  const isEdit = Boolean(editId);
  const navigate = useNavigate();
  const [form, setForm] = useState(() => ({ ...emptyFurnacePollutionForm(), recorded_by: isEdit ? '' : loggedInUsername() }));
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [openRemarks, setOpenRemarks] = useState({});

  useEffect(() => {
    if (!editId) return;
    smsAPI.getFurnacePollutionById(editId)
      .then((res) => {
        const d = res?.data || res;
        if (!d?.can_modify) {
          toast.error('Edit window expired (10 hours)');
          navigate(`/sms/furnace-pollution/${editId}`);
          return;
        }
        const base = emptyFurnacePollutionForm();
        const checks = {};
        FP_CHECKS.forEach((c) => {
          const row = d.checks?.[c.key] || {};
          checks[c.key] = { value: row.value || '', remark: row.remark || '' };
        });
        const currents = {};
        FP_MOTORS.forEach((m) => {
          currents[m.key] = {};
          FP_PHASES.forEach((p) => { currents[m.key][p.key] = d.currents?.[m.key]?.[p.key] ?? ''; });
        });
        setForm({
          ...base,
          report_date: String(d.report_date || '').slice(0, 10),
          recorded_by: d.recorded_by || '',
          furnace: d.furnace || '',
          checks,
          drive_temperature: d.drive_temperature ?? '',
          drive_temperature_remark: d.drive_temperature_remark || '',
          currents,
          remark: d.remark || '',
        });
      })
      .catch(() => {
        toast.error('Failed to load checklist');
        navigate('/sms/furnace-pollution/history');
      })
      .finally(() => setLoading(false));
  }, [editId, navigate]);

  const set = (patch) => setForm((f) => ({ ...f, ...patch }));
  const setCheck = (key, patch) =>
    setForm((f) => ({ ...f, checks: { ...f.checks, [key]: { ...f.checks[key], ...patch } } }));
  const setCurrent = (motorKey, phase, value) =>
    setForm((f) => ({ ...f, currents: { ...f.currents, [motorKey]: { ...f.currents[motorKey], [phase]: value } } }));
  const toggleRemark = (key) => setOpenRemarks((o) => ({ ...o, [key]: !o[key] }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (isEdit) {
        await smsAPI.updateFurnacePollution(editId, form);
        toast.success('Checklist updated');
        navigate(`/sms/furnace-pollution/${editId}`);
      } else {
        const res = await smsAPI.createFurnacePollution(form);
        toast.success('Checklist saved');
        const id = res?.data?.id;
        navigate(id ? `/sms/furnace-pollution/${id}` : '/sms/furnace-pollution/history');
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to save checklist');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <PageLoader />;

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <form onSubmit={handleSubmit} className="max-w-4xl mx-auto">
        <div className="flex items-start justify-between gap-3 mb-6">
          <div>
            <button type="button" onClick={() => navigate('/sms/main-pcc-room')} className="text-sm text-gray-500 hover:text-gray-700 mb-1">
              ← Back
            </button>
            <h1 className="text-2xl font-bold text-gray-900">{isEdit ? 'Edit Furnace Pollution Check' : 'Furnace Pollution Check'}</h1>
            <p className="text-sm text-gray-500 mt-1">Main PCC Room</p>
          </div>
          <Link to="/sms/furnace-pollution/history" className="text-sm font-semibold text-amber-700 hover:opacity-80">
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
          <Field label="Furnace">
            <div className="flex flex-wrap gap-2">
              {FP_FURNACES.map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => set({ furnace: form.furnace === f ? '' : f })}
                  className={optionBtnCls(form.furnace === f, false)}
                >
                  {f}
                </button>
              ))}
            </div>
          </Field>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 mb-5">
          <h2 className="text-sm font-bold text-amber-800 uppercase tracking-wide mb-3">Checklist</h2>
          <div className="space-y-3">
            {FP_CHECKS.map((c) => (
              <CheckRow
                key={c.key}
                check={c}
                row={form.checks[c.key]}
                isBad={isBadValue}
                open={openRemarks[c.key]}
                onToggleRemark={() => toggleRemark(c.key)}
                onChange={(patch) => setCheck(c.key, patch)}
              />
            ))}

            <div className="rounded-lg p-3 border border-gray-100 bg-gray-50 space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <p className="text-sm font-semibold text-gray-800">Drive Temperature</p>
                <input
                  type="number"
                  step="any"
                  inputMode="decimal"
                  value={form.drive_temperature}
                  onChange={(e) => set({ drive_temperature: e.target.value })}
                  className="w-40 px-3 py-1.5 border border-gray-300 rounded-lg text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              </div>
              <RemarkToggle
                value={form.drive_temperature_remark}
                open={openRemarks.drive_temperature}
                onToggle={() => toggleRemark('drive_temperature')}
                onChange={(v) => set({ drive_temperature_remark: v })}
              />
            </div>
          </div>
        </div>

        {FP_MOTORS.map((m) => (
          <div key={m.key} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 mb-5">
            <h2 className="text-sm font-bold text-amber-800 uppercase tracking-wide mb-3">{m.label} — Current</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {FP_PHASES.map((p) => (
                <Field key={p.key} label={`Current - ${p.label}`}>
                  <input
                    type="number"
                    step="any"
                    value={form.currents[m.key][p.key]}
                    onChange={(e) => setCurrent(m.key, p.key, e.target.value)}
                    className={inputCls}
                  />
                </Field>
              ))}
            </div>
          </div>
        ))}

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
