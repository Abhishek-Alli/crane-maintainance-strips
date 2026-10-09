import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { smsAPI } from '../../services/api';
import { CP_CHECKS, isBadValue, emptyCompressorPmForm } from './compressorPmConfig';
import { inputCls, Field, loggedInUsername, CheckRow, PageLoader } from './checkFormParts';

export default function CompressorPmForm() {
  const { id: editId } = useParams();
  const isEdit = Boolean(editId);
  const navigate = useNavigate();
  const [form, setForm] = useState(() => ({ ...emptyCompressorPmForm(), recorded_by: isEdit ? '' : loggedInUsername() }));
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [openRemarks, setOpenRemarks] = useState({});

  useEffect(() => {
    if (!editId) return;
    smsAPI.getCompressorPmById(editId)
      .then((res) => {
        const d = res?.data || res;
        if (!d?.can_modify) {
          toast.error('Edit window expired (10 hours)');
          navigate(`/sms/compressor-pm/${editId}`);
          return;
        }
        const checks = {};
        CP_CHECKS.forEach((c) => {
          const row = d.checks?.[c.key] || {};
          checks[c.key] = { value: row.value || '', remark: row.remark || '' };
        });
        setForm({
          schedule_id: d.schedule_id ?? '',
          schedule_detail: d.schedule_detail || '',
          recorded_by: d.recorded_by || '',
          checks,
          current_r: d.current_r ?? '',
          current_y: d.current_y ?? '',
          current_b: d.current_b ?? '',
          remark: d.remark || '',
        });
      })
      .catch(() => {
        toast.error('Failed to load checklist');
        navigate('/sms/compressor-pm/history');
      })
      .finally(() => setLoading(false));
  }, [editId, navigate]);

  const set = (patch) => setForm((f) => ({ ...f, ...patch }));
  const setCheck = (key, patch) =>
    setForm((f) => ({ ...f, checks: { ...f.checks, [key]: { ...f.checks[key], ...patch } } }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (isEdit) {
        await smsAPI.updateCompressorPm(editId, form);
        toast.success('Checklist updated');
        navigate(`/sms/compressor-pm/${editId}`);
      } else {
        const res = await smsAPI.createCompressorPm(form);
        toast.success('Checklist saved');
        const id = res?.data?.id;
        navigate(id ? `/sms/compressor-pm/${id}` : '/sms/compressor-pm/history');
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
            <h1 className="text-2xl font-bold text-gray-900">
              {isEdit ? 'Edit Compressor - Scheduled PM' : 'Compressor - Scheduled PM'}
            </h1>
            <p className="text-sm text-gray-500 mt-1">Main PCC Room</p>
          </div>
          <Link to="/sms/compressor-pm/history" className="text-sm font-semibold text-amber-700 hover:opacity-80">
            History →
          </Link>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 mb-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Schedule ID">
            <input type="number" step="1" value={form.schedule_id} onChange={(e) => set({ schedule_id: e.target.value })} className={inputCls} />
          </Field>
          <Field label="Recorded By" required>
            <input type="text" value={form.recorded_by} onChange={(e) => set({ recorded_by: e.target.value })} className={inputCls} required />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Schedule Detail">
              <input
                type="text"
                value={form.schedule_detail}
                onChange={(e) => set({ schedule_detail: e.target.value })}
                className={inputCls}
                placeholder="e.g. Electrical - Compressor - Scheduled PM, Planned : 18/11/2024"
              />
            </Field>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 mb-5">
          <h2 className="text-sm font-bold text-amber-800 uppercase tracking-wide mb-3">Checklist</h2>
          <div className="space-y-3">
            {CP_CHECKS.map((c) => (
              <CheckRow
                key={c.key}
                check={c}
                row={form.checks[c.key]}
                isBad={isBadValue}
                open={openRemarks[c.key]}
                onToggleRemark={() => setOpenRemarks((o) => ({ ...o, [c.key]: !o[c.key] }))}
                onChange={(patch) => setCheck(c.key, patch)}
              />
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 mb-5">
          <h2 className="text-sm font-bold text-amber-800 uppercase tracking-wide mb-3">Motor (100 HP) — Current</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[['current_r', 'Current - R'], ['current_y', 'Current - Y'], ['current_b', 'Current - B']].map(([k, label]) => (
              <Field key={k} label={label}>
                <input type="number" step="any" value={form[k]} onChange={(e) => set({ [k]: e.target.value })} className={inputCls} />
              </Field>
            ))}
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
