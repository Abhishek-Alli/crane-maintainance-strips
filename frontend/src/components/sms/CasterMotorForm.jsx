import React, { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { smsAPI } from '../../services/api';
import { CASTER_SHEETS, CASTER_BACK, isOverMax, emptyCasterForm } from './casterMotorConfig';

const inputCls =
  'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400';

const loggedInUsername = () => {
  try {
    return JSON.parse(localStorage.getItem('user'))?.username || '';
  } catch {
    return '';
  }
};

export default function CasterMotorForm() {
  const { sheet: sheetKey, id: editId } = useParams();
  const sheet = CASTER_SHEETS[sheetKey];
  if (!sheet) return <Navigate to="/sms/electrical" replace />;
  return <CasterMotorFormInner key={`${sheetKey}-${editId || 'new'}`} sheetKey={sheetKey} sheet={sheet} editId={editId} />;
}

function CasterMotorFormInner({ sheetKey, sheet, editId }) {
  const isEdit = Boolean(editId);
  const navigate = useNavigate();
  const base = `/sms/caster-motor/${sheetKey}`;
  const [form, setForm] = useState(() => ({ ...emptyCasterForm(sheet), recorded_by: isEdit ? '' : loggedInUsername() }));
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!editId) return;
    smsAPI.getCasterMotorById(sheetKey, editId)
      .then((res) => {
        const d = res?.data || res;
        if (!d?.can_modify) {
          toast.error('Edit window expired (10 hours)');
          navigate(`${base}/${editId}`);
          return;
        }
        const empty = emptyCasterForm(sheet);
        const readings = {};
        sheet.motors.forEach((m) => {
          const r = d.readings?.[m.key] || {};
          readings[m.key] = { value: r.value ?? '', remark: r.remark || '' };
        });
        setForm({
          ...empty,
          report_date: String(d.report_date || '').slice(0, 10),
          recorded_by: d.recorded_by || '',
          readings,
          remark: d.remark || '',
        });
      })
      .catch(() => {
        toast.error('Failed to load checklist');
        navigate(`${base}/history`);
      })
      .finally(() => setLoading(false));
  }, [editId, navigate, sheetKey, sheet, base]);

  const set = (patch) => setForm((f) => ({ ...f, ...patch }));
  const setReading = (key, patch) =>
    setForm((f) => ({ ...f, readings: { ...f.readings, [key]: { ...f.readings[key], ...patch } } }));

  const overList = sheet.motors.filter((m) => isOverMax(m, form.readings[m.key]?.value));

  const handleSubmit = async (e) => {
    e.preventDefault();
    const missing = overList.find((m) => !form.readings[m.key].remark.trim());
    if (missing) return toast.error(`${missing.label}: current is above max — enter a remark`);
    setSaving(true);
    try {
      if (isEdit) {
        await smsAPI.updateCasterMotor(sheetKey, editId, form);
        toast.success('Checklist updated');
        navigate(`${base}/${editId}`);
      } else {
        const res = await smsAPI.createCasterMotor(sheetKey, form);
        toast.success('Checklist saved');
        const id = res?.data?.id;
        navigate(id ? `${base}/${id}` : `${base}/history`);
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
            <button type="button" onClick={() => navigate(CASTER_BACK)} className="text-sm text-gray-500 hover:text-gray-700 mb-1">
              ← Back
            </button>
            <h1 className="text-2xl font-bold text-gray-900">
              {isEdit ? 'Edit ' : ''}{sheet.label}
            </h1>
            <p className="text-sm text-gray-500 mt-1">Motor current check — enter the measured current (A)</p>
          </div>
          <Link to={`${base}/history`} className="text-sm font-semibold text-amber-700 hover:opacity-80">
            History →
          </Link>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 mb-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Date *</label>
            <input type="date" value={form.report_date} onChange={(e) => set({ report_date: e.target.value })} className={inputCls} required />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Recorded By *</label>
            <input type="text" value={form.recorded_by} onChange={(e) => set({ recorded_by: e.target.value })} className={inputCls} required />
          </div>
        </div>

        {overList.length > 0 && (
          <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            <span className="font-bold">⚠ {overList.length} motor{overList.length > 1 ? 's' : ''} above max current:</span>{' '}
            {overList.map((m) => m.label).join(', ')}
          </div>
        )}

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 mb-5">
          <div className="hidden sm:grid grid-cols-12 gap-3 px-3 pb-2 text-[11px] font-semibold text-gray-500 uppercase">
            <div className="col-span-5">Motor</div>
            <div className="col-span-2">HP</div>
            <div className="col-span-2">Max current (A)</div>
            <div className="col-span-3">Current (A)</div>
          </div>
          <div className="space-y-2">
            {sheet.motors.map((m) => {
              const row = form.readings[m.key];
              const over = isOverMax(m, row.value);
              return (
                <div key={m.key} className={`rounded-lg p-3 border ${over ? 'border-red-300 bg-red-50' : 'border-gray-100 bg-gray-50'}`}>
                  <div className="grid grid-cols-12 gap-3 items-center">
                    <div className="col-span-12 sm:col-span-5 text-sm font-semibold text-gray-800">{m.label}</div>
                    <div className="col-span-4 sm:col-span-2 text-sm text-gray-600">{m.hp} HP</div>
                    <div className="col-span-4 sm:col-span-2 text-sm text-gray-600">{m.max} A</div>
                    <div className="col-span-4 sm:col-span-3">
                      <input
                        type="number"
                        step="any"
                        min="0"
                        inputMode="decimal"
                        value={row.value}
                        onChange={(e) => setReading(m.key, { value: e.target.value })}
                        className={`${inputCls} ${over ? 'border-red-500 text-red-700 font-bold focus:ring-red-400' : ''}`}
                        aria-label={`${m.label} current`}
                      />
                    </div>
                  </div>
                  {over && (
                    <div className="mt-2 space-y-1">
                      <p className="text-xs font-bold text-red-700">
                        ▲ ALERT: {row.value} A is above the max {m.max} A
                      </p>
                      <input
                        type="text"
                        value={row.remark}
                        onChange={(e) => setReading(m.key, { remark: e.target.value })}
                        className={inputCls}
                        placeholder="Remark / action taken (required)"
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 mb-5">
          <label className="block text-xs font-semibold text-gray-600 mb-1">Remark (if any)</label>
          <textarea rows={3} value={form.remark} onChange={(e) => set({ remark: e.target.value })} className={inputCls} />
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
