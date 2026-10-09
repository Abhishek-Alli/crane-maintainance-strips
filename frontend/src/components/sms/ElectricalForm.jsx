import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { smsAPI } from '../../services/api';
import {
  ELECTRICAL_AREAS,
  ELECTRICAL_SECTIONS,
  ALL_POINTS,
  isAlert,
  needsPhoto,
  countAlerts,
  emptyItems,
} from './electricalConfig';

const inputCls = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400';

const loggedInUsername = () => {
  try { return JSON.parse(localStorage.getItem('user'))?.username || ''; } catch { return ''; }
};

const isWithinEditWindow = (createdAt) => {
  if (!createdAt) return false;
  return (Date.now() - new Date(createdAt).getTime()) < 24 * 60 * 60 * 1000;
};

export default function ElectricalForm() {
  const { id: editId } = useParams();
  const isEdit = Boolean(editId);
  const navigate = useNavigate();

  const [form, setForm] = useState({
    report_date: new Date().toLocaleDateString('en-CA'),
    shift: 'A',
    recorded_by: isEdit ? '' : loggedInUsername(),
    area: '',
    general_remark: '',
  });
  const [items, setItems] = useState(emptyItems());
  const [photos, setPhotos] = useState({});
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isEdit) return;
    smsAPI.getElectricalById(editId).then((res) => {
      const d = res?.data;
      if (!d) return;
      if (!isWithinEditWindow(d.created_at)) { toast.error('Edit window expired'); navigate('/sms/electrical/history'); return; }
      setForm({ report_date: String(d.report_date || '').slice(0, 10), shift: d.shift || 'A', recorded_by: d.recorded_by || '', area: d.area || '', general_remark: d.general_remark || '' });
      const loaded = emptyItems();
      ALL_POINTS.forEach((p) => {
        const v = d.checklist_items?.[p.key];
        if (v) loaded[p.key] = { value: v.value || '', remark: v.remark || '' };
      });
      setItems(loaded);
    }).catch(() => toast.error('Failed to load')).finally(() => setLoading(false));
  }, [editId, isEdit, navigate]);

  const setItem = (key, field, val) => setItems((prev) => ({ ...prev, [key]: { ...prev[key], [field]: val } }));

  const handlePhotoChange = (pointKey, files) => {
    const arr = Array.from(files || []);
    setPhotos((prev) => ({ ...prev, [pointKey]: [...(prev[pointKey] || []), ...arr] }));
  };
  const removePhoto = (pointKey, idx) => setPhotos((prev) => ({ ...prev, [pointKey]: prev[pointKey].filter((_, i) => i !== idx) }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      fd.append('checklist_items', JSON.stringify(items));
      const newImageKeys = [];
      ALL_POINTS.forEach((p) => {
        (photos[p.key] || []).forEach((file) => { fd.append('images', file); newImageKeys.push(p.key); });
      });
      fd.append('new_image_item_keys', JSON.stringify(newImageKeys));

      if (isEdit) {
        await smsAPI.updateElectrical(editId, fd);
        toast.success('Updated successfully');
      } else {
        await smsAPI.createElectrical(fd);
        toast.success('Submitted successfully');
      }
      navigate('/sms/electrical/history');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-10 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600" /></div>;

  const alertCount = countAlerts(items);

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="max-w-2xl mx-auto p-4">
        <button type="button" onClick={() => navigate('/sms/electrical/history')} className="text-sm text-gray-500 hover:text-gray-700 mb-2">← Back</button>
        <h1 className="text-xl font-bold text-gray-900 mb-4">{isEdit ? 'Edit' : 'New'} Electrical Check Sheet</h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Basic details */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
            <h2 className="font-semibold text-gray-800 border-b pb-2">Basic Details</h2>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Date *</label>
                <input type="date" value={form.report_date} onChange={(e) => setForm((f) => ({ ...f, report_date: e.target.value }))} className={inputCls} required />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Shift *</label>
                <select value={form.shift} onChange={(e) => setForm((f) => ({ ...f, shift: e.target.value }))} className={inputCls} required>
                  {['A','B','C'].map((s) => <option key={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Recorded By *</label>
              <input value={form.recorded_by} onChange={(e) => setForm((f) => ({ ...f, recorded_by: e.target.value }))} className={inputCls} required />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Area</label>
              <select value={form.area} onChange={(e) => setForm((f) => ({ ...f, area: e.target.value }))} className={inputCls}>
                <option value="">— Select Area —</option>
                {ELECTRICAL_AREAS.map((a) => <option key={a}>{a}</option>)}
              </select>
            </div>
          </div>

          {/* Checklist sections */}
          {ELECTRICAL_SECTIONS.map((sec) => (
            <div key={sec.key} className="bg-white rounded-xl border border-gray-200 p-4">
              <h2 className="font-semibold text-gray-800 border-b pb-2 mb-3">{sec.label}</h2>
              <div className="space-y-3">
                {sec.points.map((p) => {
                  const val = items[p.key]?.value || '';
                  const alert = isAlert(p, val);
                  const photo = needsPhoto(p, val);
                  return (
                    <div key={p.key} className={`rounded-lg border p-3 ${alert ? 'border-red-300 bg-red-50' : 'border-gray-100'}`}>
                      <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                        {p.label}{p.unit ? ` (${p.unit})` : ''}
                        {alert && <span className="ml-2 text-red-600 text-[10px] font-bold">⚠ ALERT</span>}
                      </label>
                      {p.type === 'ok_not_ok' && (
                        <div className="flex gap-2">
                          {['OK','NOT_OK'].map((opt) => (
                            <button key={opt} type="button"
                              onClick={() => setItem(p.key, 'value', val === opt ? '' : opt)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${val === opt ? (opt === 'OK' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-red-600 text-white border-red-600') : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}>
                              {opt === 'OK' ? 'OK' : 'NOT OK'}
                            </button>
                          ))}
                        </div>
                      )}
                      {p.type === 'number' && (
                        <input type="number" step="any" value={val} onChange={(e) => setItem(p.key, 'value', e.target.value)} className={inputCls} />
                      )}
                      {p.type === 'text' && (
                        <textarea value={val} onChange={(e) => setItem(p.key, 'value', e.target.value)} rows={2} className={`${inputCls} resize-none`} />
                      )}
                      {p.type !== 'text' && (
                        <input placeholder="Remark (optional)" value={items[p.key]?.remark || ''} onChange={(e) => setItem(p.key, 'remark', e.target.value)} className={`${inputCls} mt-1.5`} />
                      )}
                      {photo && (
                        <div className="mt-2">
                          <label className="block text-[11px] text-red-600 font-semibold mb-1">Photo required</label>
                          <input type="file" accept="image/*" multiple onChange={(e) => handlePhotoChange(p.key, e.target.files)} className="text-xs" />
                          {(photos[p.key] || []).map((f, i) => (
                            <div key={i} className="flex items-center gap-2 mt-1 text-xs text-gray-600">
                              <span className="truncate">{f.name}</span>
                              <button type="button" onClick={() => removePhoto(p.key, i)} className="text-red-500 hover:text-red-700">✕</button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {/* General remark */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <label className="block text-xs font-semibold text-gray-600 mb-1">General Remark</label>
            <textarea value={form.general_remark} onChange={(e) => setForm((f) => ({ ...f, general_remark: e.target.value }))} rows={3} className={`${inputCls} resize-y`} />
          </div>

          {alertCount > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700 font-medium">
              ⚠ {alertCount} alert{alertCount > 1 ? 's' : ''} detected — photos required for alerted items
            </div>
          )}

          <button type="submit" disabled={saving} className="w-full py-3 bg-amber-600 text-white rounded-xl font-bold text-sm hover:bg-amber-700 disabled:opacity-50">
            {saving ? 'Saving…' : isEdit ? 'Update Checklist' : 'Submit Checklist'}
          </button>
        </form>
      </div>
    </div>
  );
}
