import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { smsAPI } from '../../services/api';
import {
  FSB_FURNACES, FSB_CRUCIBLES, FSB_CHECKS, isBadValue, emptyFurnaceStandByForm,
} from './furnaceStandByConfig';
import {
  inputCls, Field, loggedInUsername, optionBtnCls, CheckRow, PageLoader,
} from './checkFormParts';

export default function FurnaceStandByForm() {
  const { id: editId } = useParams();
  const isEdit = Boolean(editId);
  const navigate = useNavigate();
  const [form, setForm] = useState(() => ({ ...emptyFurnaceStandByForm(), recorded_by: isEdit ? '' : loggedInUsername() }));
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [openRemarks, setOpenRemarks] = useState({});

  useEffect(() => {
    if (!editId) return;
    smsAPI.getFurnaceStandById(editId)
      .then((res) => {
        const d = res?.data || res;
        if (!d?.can_modify) {
          toast.error('Edit window expired (10 hours)');
          navigate(`/sms/furnace-stand-by/${editId}`);
          return;
        }
        const checks = {};
        FSB_CHECKS.forEach((c) => {
          const row = d.checks?.[c.key] || {};
          checks[c.key] = { value: row.value || '', remark: row.remark || '' };
        });
        setForm({
          report_date: String(d.report_date || '').slice(0, 10),
          recorded_by: d.recorded_by || '',
          furnace: d.furnace || '',
          crucible: d.crucible || '',
          checks,
          remark: d.remark || '',
        });
      })
      .catch(() => {
        toast.error('Failed to load checklist');
        navigate('/sms/furnace-stand-by/history');
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
        await smsAPI.updateFurnaceStandBy(editId, form);
        toast.success('Checklist updated');
        navigate(`/sms/furnace-stand-by/${editId}`);
      } else {
        const res = await smsAPI.createFurnaceStandBy(form);
        toast.success('Checklist saved');
        const id = res?.data?.id;
        navigate(id ? `/sms/furnace-stand-by/${id}` : '/sms/furnace-stand-by/history');
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to save checklist');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <PageLoader />;

  // Single-choice buttons; clicking the selected one clears it
  const choice = (options, value, onPick) => (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button key={o} type="button" onClick={() => onPick(value === o ? '' : o)} className={optionBtnCls(value === o, false)}>
          {o}
        </button>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <form onSubmit={handleSubmit} className="max-w-4xl mx-auto">
        <div className="flex items-start justify-between gap-3 mb-6">
          <div>
            <button type="button" onClick={() => navigate('/sms/furnace-side')} className="text-sm text-gray-500 hover:text-gray-700 mb-1">
              ← Back
            </button>
            <h1 className="text-2xl font-bold text-gray-900">{isEdit ? 'Edit Furnace Stand By Check' : 'Furnace Stand By Check'}</h1>
            <p className="text-sm text-gray-500 mt-1">Furnace Side</p>
          </div>
          <Link to="/sms/furnace-stand-by/history" className="text-sm font-semibold text-amber-700 hover:opacity-80">
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
          <Field label="Furnace">{choice(FSB_FURNACES, form.furnace, (v) => set({ furnace: v }))}</Field>
          <Field label="Crucible">{choice(FSB_CRUCIBLES, form.crucible, (v) => set({ crucible: v }))}</Field>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 mb-5">
          <h2 className="text-sm font-bold text-amber-800 uppercase tracking-wide mb-3">Checklist</h2>
          <div className="space-y-3">
            {FSB_CHECKS.map((c) => (
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
