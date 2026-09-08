import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { hsmAPI } from '../../services/api';
import {
  FM_CHECK_SECTIONS,
  FM_CHECK_ITEMS,
  FM_GUIDE_CENTERLINE_KEYS,
  emptyFmDailyForm,
  emptySectionValues,
} from './fmDailyConfig';

const MAX_IMAGES = 10;
const MAX_IMAGE_MB = 5;

const Field = ({ label, children, required }) => (
  <div>
    <label className="block text-xs font-semibold text-gray-600 mb-1">
      {label}{required ? ' *' : ''}
    </label>
    {children}
  </div>
);

const inputCls =
  'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400';

export default function FmDailyChecklistForm() {
  const { id: editId } = useParams();
  const isEdit = Boolean(editId);
  const navigate = useNavigate();
  const [form, setForm] = useState(() => emptyFmDailyForm());
  const [images, setImages] = useState([]); // { key, id?, url, file?, existing }
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState(false);

  useEffect(() => {
    if (!editId) return;
    hsmAPI.getFmDailyChecklistById(editId)
      .then((res) => {
        const d = res?.data || res;
        if (!d?.can_modify && isEdit) {
          toast.error('Edit window expired (10 hours)');
          navigate(`/hsm/fm-daily-checklist/${editId}`);
          return;
        }
        const base = emptyFmDailyForm();
        const items = { ...base.checklist_items };
        FM_CHECK_ITEMS.forEach(({ key }) => {
          const row = (d.checklist_items || {})[key] || {};
          items[key] = {
            status: row.status || '',
            remark: row.remark || '',
            action_taken: row.action_taken || '',
          };
        });
        const guide = { ...base.guide_centerline };
        FM_GUIDE_CENTERLINE_KEYS.forEach(({ key }) => {
          guide[key] = (d.guide_centerline || {})[key] || '';
        });
        const sectionValues = { ...emptySectionValues() };
        Object.keys(sectionValues).forEach((key) => {
          sectionValues[key] = (d.section_values || {})[key] || '';
        });
        setForm({
          report_date: String(d.report_date || '').slice(0, 10),
          shift: d.shift || 'A',
          shift_engineer: d.shift_engineer || '',
          checklist_items: items,
          guide_centerline: guide,
          section_values: sectionValues,
          note: d.note || '',
        });
        setImages(
          (d.images || []).map((img) => ({
            key: `existing-${img.id}`,
            id: img.id,
            url: img.url,
            existing: true,
          }))
        );
      })
      .catch(() => {
        toast.error('Failed to load checklist');
        navigate('/hsm/fm-daily-checklist/history');
      })
      .finally(() => setLoading(false));
  }, [editId, isEdit, navigate]);

  const setItem = (key, patch) => {
    setForm((f) => ({
      ...f,
      checklist_items: {
        ...f.checklist_items,
        [key]: { ...f.checklist_items[key], ...patch },
      },
    }));
  };

  const setGuide = (key, value) => {
    setForm((f) => ({
      ...f,
      guide_centerline: { ...f.guide_centerline, [key]: value },
    }));
  };

  const handleImagePick = (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (!files.length) return;

    setImages((prev) => {
      const room = MAX_IMAGES - prev.length;
      if (room <= 0) {
        toast.error(`Maximum ${MAX_IMAGES} images allowed`);
        return prev;
      }
      const accepted = [];
      for (const file of files.slice(0, room)) {
        if (!/^image\/(jpeg|jpg|png|webp|gif)$/i.test(file.type)) {
          toast.error(`${file.name}: only JPEG/PNG/WebP/GIF allowed`);
          continue;
        }
        if (file.size > MAX_IMAGE_MB * 1024 * 1024) {
          toast.error(`${file.name}: max ${MAX_IMAGE_MB} MB`);
          continue;
        }
        accepted.push({
          key: `new-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          url: URL.createObjectURL(file),
          file,
          existing: false,
        });
      }
      return [...prev, ...accepted];
    });
  };

  const removeImage = (key) => {
    setImages((prev) => {
      const target = prev.find((i) => i.key === key);
      if (target?.file && target.url) URL.revokeObjectURL(target.url);
      return prev.filter((i) => i.key !== key);
    });
  };

  const validate = () => {
    if (!form.report_date) return 'Date is required';
    if (!['A', 'B', 'C'].includes(form.shift)) return 'Shift must be A, B, or C';
    for (const { key, sectionLabel } of FM_CHECK_ITEMS) {
      const row = form.checklist_items[key] || {};
      if (row.status === 'NOT_OK' && !String(row.action_taken || '').trim()) {
        return `Action taken is required for "${sectionLabel}" (marked NOT OK)`;
      }
    }
    return null;
  };

  const buildFormData = () => {
    const payload = {
      report_date: form.report_date,
      shift: form.shift,
      shift_engineer: form.shift_engineer || null,
      checklist_items: form.checklist_items,
      guide_centerline: form.guide_centerline,
      section_values: form.section_values,
      note: form.note || null,
      keep_image_ids: images.filter((i) => i.existing && i.id).map((i) => i.id),
    };
    const fd = new FormData();
    fd.append('payload', JSON.stringify(payload));
    images.forEach((img) => {
      if (img.file) fd.append('images', img.file);
    });
    return fd;
  };

  const handleSubmit = async () => {
    const err = validate();
    if (err) {
      toast.error(err);
      return;
    }
    setSaving(true);
    try {
      const fd = buildFormData();
      if (isEdit) {
        await hsmAPI.updateFmDailyChecklist(editId, fd);
        toast.success('Checklist updated');
        navigate(`/hsm/fm-daily-checklist/${editId}`);
      } else {
        const res = await hsmAPI.createFmDailyChecklist(fd);
        const id = res?.data?.id;
        toast.success('Checklist saved');
        navigate(id ? `/hsm/fm-daily-checklist/${id}` : '/hsm/fm-daily-checklist/history');
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
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="max-w-4xl mx-auto">
        <button
          type="button"
          onClick={() => navigate('/hsm/dashboard')}
          className="text-sm text-gray-500 hover:text-gray-700 mb-1"
        >
          ← Back to Dashboard
        </button>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            {isEdit ? 'Edit FM Daily Check List' : 'FM Daily Check List'}
          </h1>
          <Link
            to="/hsm/fm-daily-checklist/history"
            className="text-sm font-semibold text-indigo-700 hover:opacity-80"
          >
            History →
          </Link>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 mb-5 space-y-4">
          <h2 className="text-sm font-bold text-indigo-800 uppercase tracking-wide border-b border-indigo-100 pb-2">
            Header
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Field label="Date" required>
              <input
                type="date"
                className={inputCls}
                value={form.report_date}
                onChange={(e) => setForm({ ...form, report_date: e.target.value })}
              />
            </Field>
            <Field label="Shift" required>
              <select
                className={inputCls}
                value={form.shift}
                onChange={(e) => setForm({ ...form, shift: e.target.value })}
              >
                <option value="A">A</option>
                <option value="B">B</option>
                <option value="C">C</option>
              </select>
            </Field>
            <Field label="Shift Engineer">
              <input
                type="text"
                className={inputCls}
                value={form.shift_engineer}
                onChange={(e) => setForm({ ...form, shift_engineer: e.target.value })}
                placeholder="Name"
              />
            </Field>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 mb-5 space-y-4">
          <h2 className="text-sm font-bold text-indigo-800 uppercase tracking-wide border-b border-indigo-100 pb-2">
            All guide centerline should be check
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {FM_GUIDE_CENTERLINE_KEYS.map(({ key, label }) => (
              <Field key={key} label={label}>
                <input
                  type="text"
                  className={inputCls}
                  value={form.guide_centerline[key] || ''}
                  onChange={(e) => setGuide(key, e.target.value)}
                />
              </Field>
            ))}
          </div>
        </div>

        <div className="mb-5 space-y-5">
          <h2 className="text-sm font-bold text-indigo-800 uppercase tracking-wide">
            Checklist
          </h2>
          {FM_CHECK_SECTIONS.map((section, sIdx) => {
            const itemKey = section.key;
            const row = form.checklist_items[itemKey] || { status: '', remark: '' };
            return (
              <div key={section.key} className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-4">
                <p className="text-sm font-bold text-gray-900 border-b border-indigo-100 pb-2">
                  {sIdx + 1}. {section.label}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="Status">
                    <div className="flex gap-2">
                      {['OK', 'NOT_OK'].map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setItem(itemKey, { status: row.status === s ? '' : s })}
                          className={`flex-1 py-2 rounded-lg text-sm font-semibold border ${
                            row.status === s
                              ? s === 'OK'
                                ? 'bg-emerald-600 text-white border-emerald-600'
                                : 'bg-red-600 text-white border-red-600'
                              : 'bg-white text-gray-700 border-gray-300 hover:border-indigo-300'
                          }`}
                        >
                          {s === 'OK' ? 'OK' : 'NOT OK'}
                        </button>
                      ))}
                    </div>
                  </Field>
                  <Field label="Remark">
                    <input
                      type="text"
                      className={inputCls}
                      value={row.remark || ''}
                      onChange={(e) => setItem(itemKey, { remark: e.target.value })}
                      placeholder="Optional remark"
                    />
                  </Field>
                </div>
                {row.status === 'NOT_OK' && (
                  <Field label="Action taken" required>
                    <input
                      type="text"
                      className={inputCls}
                      value={row.action_taken || ''}
                      onChange={(e) => setItem(itemKey, { action_taken: e.target.value })}
                      placeholder="What action was taken?"
                    />
                  </Field>
                )}
              </div>
            );
          })}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 mb-5">
          <Field label="Note">
            <textarea
              className={`${inputCls} min-h-[90px]`}
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
              placeholder="Additional notes"
            />
          </Field>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 mb-6 space-y-3">
          <h2 className="text-sm font-bold text-indigo-800 uppercase tracking-wide border-b border-indigo-100 pb-2">
            Images (multiple)
          </h2>
          <p className="text-xs text-gray-500">
            Up to {MAX_IMAGES} images · JPEG / PNG / WebP / GIF · max {MAX_IMAGE_MB} MB each
          </p>
          {images.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {images.map((img) => (
                <div key={img.key} className="relative group rounded-lg overflow-hidden border border-gray-200 bg-gray-50 aspect-square">
                  <img src={img.url} alt="" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeImage(img.key)}
                    className="absolute top-1.5 right-1.5 px-2 py-0.5 bg-red-600 text-white text-[10px] font-semibold rounded opacity-90 hover:opacity-100"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
          {images.length < MAX_IMAGES && (
            <label className="flex flex-col items-center justify-center w-full py-6 border-2 border-dashed border-indigo-300 rounded-lg cursor-pointer hover:bg-indigo-50 text-indigo-700">
              <span className="text-sm font-semibold">+ Add Images</span>
              <span className="text-xs text-indigo-500 mt-1">{images.length}/{MAX_IMAGES} selected</span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                multiple
                className="hidden"
                onChange={handleImagePick}
              />
            </label>
          )}
        </div>

        <div className="flex flex-wrap gap-3 justify-end">
          <button
            type="button"
            onClick={() => setPreview(true)}
            className="px-5 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700"
          >
            Preview & Submit
          </button>
        </div>
      </div>

      {preview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Confirm submit?</h3>
            <p className="text-sm text-gray-600 mb-4">
              Date {form.report_date} · Shift {form.shift}
              {form.shift_engineer ? ` · ${form.shift_engineer}` : ''}
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
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold disabled:opacity-50"
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
