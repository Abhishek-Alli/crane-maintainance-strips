import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { smsAPI } from '../../services/api';
import { DIESEL_REFILL_OPTIONS, AIR_CLEANING_OPTIONS, emptyDgForm } from './dgConfig';

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

/** Clickable options; clicking the selected one clears it */
const OptionButtons = ({ options, value, onChange }) => (
  <div className="flex flex-wrap gap-2 sm:justify-end">
    {options.map((opt) => {
      const selected = value === opt;
      return (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(selected ? '' : opt)}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${
            selected
              ? 'bg-emerald-600 text-white border-emerald-600'
              : 'bg-white text-gray-700 border-gray-300 hover:border-amber-300'
          }`}
        >
          {opt}
        </button>
      );
    })}
  </div>
);

/** Remark that opens from a toggle, and stays open once it has text */
const RemarkToggle = ({ value, open, onToggle, onChange }) => (
  <>
    <button type="button" onClick={onToggle} className="text-xs font-semibold text-gray-500 hover:text-amber-700">
      Remark {open || value ? '▴' : '▾'}
    </button>
    {(open || value) && (
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={inputCls}
        placeholder="Remark (optional)"
      />
    )}
  </>
);

export default function DgForm() {
  const { id: editId } = useParams();
  const isEdit = Boolean(editId);
  const navigate = useNavigate();
  const [form, setForm] = useState(() => ({ ...emptyDgForm(), recorded_by: isEdit ? '' : loggedInUsername() }));
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [openRemarks, setOpenRemarks] = useState({});

  useEffect(() => {
    if (!editId) return;
    smsAPI.getDgById(editId)
      .then((res) => {
        const d = res?.data || res;
        if (!d?.can_modify) {
          toast.error('Edit window expired (10 hours)');
          navigate(`/sms/dg/${editId}`);
          return;
        }
        setForm({
          report_date: String(d.report_date || '').slice(0, 10),
          recorded_by: d.recorded_by || '',
          diesel_refill: d.diesel_refill || '',
          diesel_refill_remark: d.diesel_refill_remark || '',
          air_cleaning: d.air_cleaning || '',
          running_hours: d.running_hours ?? '',
          running_hours_remark: d.running_hours_remark || '',
          remark: d.remark || '',
        });
      })
      .catch(() => {
        toast.error('Failed to load checklist');
        navigate('/sms/dg/history');
      })
      .finally(() => setLoading(false));
  }, [editId, navigate]);

  const set = (patch) => setForm((f) => ({ ...f, ...patch }));
  const toggleRemark = (key) => setOpenRemarks((o) => ({ ...o, [key]: !o[key] }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (isEdit) {
        await smsAPI.updateDg(editId, form);
        toast.success('Checklist updated');
        navigate(`/sms/dg/${editId}`);
      } else {
        const res = await smsAPI.createDg(form);
        toast.success('Checklist saved');
        const id = res?.data?.id;
        navigate(id ? `/sms/dg/${id}` : '/sms/dg/history');
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

  const rowCls = 'rounded-lg p-3 border border-gray-100 bg-gray-50 space-y-2';

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <form onSubmit={handleSubmit} className="max-w-4xl mx-auto">
        <div className="flex items-start justify-between gap-3 mb-6">
          <div>
            <button type="button" onClick={() => navigate('/sms/main-pcc-room')} className="text-sm text-gray-500 hover:text-gray-700 mb-1">
              ← Back
            </button>
            <h1 className="text-2xl font-bold text-gray-900">{isEdit ? 'Edit DG Check' : 'DG Check'}</h1>
            <p className="text-sm text-gray-500 mt-1">Main PCC Room</p>
          </div>
          <Link to="/sms/dg/history" className="text-sm font-semibold text-amber-700 hover:opacity-80">
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
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 mb-5">
          <h2 className="text-sm font-bold text-amber-800 uppercase tracking-wide mb-3">Checklist</h2>
          <div className="space-y-4">
            <div className={rowCls}>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <p className="text-sm font-semibold text-gray-800">Diesel Refill</p>
                <OptionButtons options={DIESEL_REFILL_OPTIONS} value={form.diesel_refill} onChange={(v) => set({ diesel_refill: v })} />
              </div>
              <RemarkToggle
                value={form.diesel_refill_remark}
                open={openRemarks.diesel}
                onToggle={() => toggleRemark('diesel')}
                onChange={(v) => set({ diesel_refill_remark: v })}
              />
            </div>

            <div className={rowCls}>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <p className="text-sm font-semibold text-gray-800">Air Cleaning</p>
                <OptionButtons options={AIR_CLEANING_OPTIONS} value={form.air_cleaning} onChange={(v) => set({ air_cleaning: v })} />
              </div>
            </div>

            <div className={rowCls}>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <p className="text-sm font-semibold text-gray-800">Running Hours in Mins</p>
                <input
                  type="number"
                  step="any"
                  inputMode="decimal"
                  value={form.running_hours}
                  onChange={(e) => set({ running_hours: e.target.value })}
                  className="w-40 px-3 py-1.5 border border-gray-300 rounded-lg text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              </div>
              <RemarkToggle
                value={form.running_hours_remark}
                open={openRemarks.hours}
                onToggle={() => toggleRemark('hours')}
                onChange={(v) => set({ running_hours_remark: v })}
              />
            </div>
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
