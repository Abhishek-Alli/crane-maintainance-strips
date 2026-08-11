import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import { hsmAPI, resolveUploadUrl } from '../../services/api';
import ChecksheetPreviewModal, { PreviewSection, PreviewGrid } from '../hbm/ChecksheetPreviewModal';
import { isWithinEditWindow } from '../../utils/editWindow';
import {
  AREAS,
  SHIFTS,
  displayEquipmentName,
  equipmentOptionsForArea,
  isOtherEquipment,
} from './rollChangeConfig';

const MAX_IMAGES = 10;
const MAX_IMAGE_MB = 5;

const inputCls =
  'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent';
const textareaCls = `${inputCls} min-h-[72px] resize-y`;

const Field = ({ label, required, children }) => (
  <div>
    <label className="block text-sm font-semibold text-gray-700 mb-1">
      {label}{required && <span className="text-red-500"> *</span>}
    </label>
    {children}
  </div>
);

const Section = ({ title, children }) => (
  <div className="bg-white rounded-xl border border-gray-200 p-5 mb-5">
    <h2 className="text-base font-bold text-gray-800 mb-4 border-b border-gray-100 pb-2">{title}</h2>
    <div className="space-y-4">{children}</div>
  </div>
);

const emptyEquipmentRow = (area) => {
  const opts = equipmentOptionsForArea(area);
  return {
    equipment_key: opts[0]?.key || '',
    equipment_label: opts[0]?.label || '',
    custom_name: '',
    job_details: '',
  };
};

const emptyForm = () => ({
  report_date: new Date().toLocaleDateString('en-CA'),
  shift: 'A',
  area: '',
  remark: '',
  shift_incharge: '',
  shift_engineer: '',
  equipment_entries: [],
  manpower_entries: [{ person_name: '' }],
});

export default function RollChangeActivityForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id: routeId } = useParams();
  const isEdit = Boolean(routeId) && location.pathname.endsWith('/edit');
  const editId = isEdit ? routeId : null;

  const [form, setForm] = useState(emptyForm);
  const [images, setImages] = useState([]); // { key, id?, url, file?, existing }
  const [submitting, setSubmitting] = useState(false);
  const [loadingEdit, setLoadingEdit] = useState(Boolean(editId));
  const [showPreview, setShowPreview] = useState(false);

  const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  useEffect(() => {
    if (!editId) return;
    setLoadingEdit(true);
    hsmAPI.getRollChangeActivityById(editId)
      .then((res) => {
        const log = res?.data || res;
        if (!isWithinEditWindow(log.created_at) && !log.can_modify) {
          toast.error('Edit allowed only within 10 hours of submission');
          navigate(`/hsm/roll-change-activity/${editId}`);
          return;
        }
        setForm({
          report_date: log.report_date
            ? new Date(log.report_date).toLocaleDateString('en-CA')
            : new Date().toLocaleDateString('en-CA'),
          shift: log.shift || 'A',
          area: log.area || '',
          remark: log.remark || '',
          shift_incharge: log.shift_incharge || '',
          shift_engineer: log.shift_engineer || '',
          equipment_entries: (log.equipment_entries || []).map((e) => ({
            equipment_key: e.equipment_key || '',
            equipment_label: e.equipment_label || e.equipment_key || '',
            custom_name: e.custom_name || '',
            job_details: e.job_details || '',
          })),
          manpower_entries: (log.manpower_entries || []).length
            ? log.manpower_entries.map((m) => ({ person_name: m.person_name || '' }))
            : [{ person_name: '' }],
        });
        setImages(
          (log.images || []).map((img) => ({
            key: `existing-${img.id}`,
            id: img.id,
            url: resolveUploadUrl(img.url),
            existing: true,
          }))
        );
      })
      .catch((err) => {
        toast.error(err?.message || 'Failed to load report for edit');
        navigate('/hsm/roll-change-activity/history');
      })
      .finally(() => setLoadingEdit(false));
  }, [editId, navigate]);

  // Revoke blob URLs on unmount
  useEffect(() => () => {
    images.forEach((img) => {
      if (img.file && img.url) URL.revokeObjectURL(img.url);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAreaChange = (area) => {
    setForm((prev) => ({
      ...prev,
      area,
      equipment_entries: area ? [emptyEquipmentRow(area)] : [],
    }));
  };

  const updateEquipment = (index, patch) => {
    setForm((prev) => {
      const next = [...prev.equipment_entries];
      next[index] = { ...next[index], ...patch };
      return { ...prev, equipment_entries: next };
    });
  };

  const addEquipment = () => {
    if (!form.area) {
      toast.error('Select an area first');
      return;
    }
    setForm((prev) => ({
      ...prev,
      equipment_entries: [...prev.equipment_entries, emptyEquipmentRow(prev.area)],
    }));
  };

  const removeEquipment = (index) => {
    setForm((prev) => ({
      ...prev,
      equipment_entries: prev.equipment_entries.filter((_, i) => i !== index),
    }));
  };

  const updateManpower = (index, value) => {
    setForm((prev) => {
      const next = [...prev.manpower_entries];
      next[index] = { person_name: value };
      return { ...prev, manpower_entries: next };
    });
  };

  const addManpower = () => {
    setForm((prev) => ({
      ...prev,
      manpower_entries: [...prev.manpower_entries, { person_name: '' }],
    }));
  };

  const removeManpower = (index) => {
    setForm((prev) => ({
      ...prev,
      manpower_entries: prev.manpower_entries.length <= 1
        ? [{ person_name: '' }]
        : prev.manpower_entries.filter((_, i) => i !== index),
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

  const buildPayload = () => ({
    report_date: form.report_date,
    shift: form.shift,
    area: form.area,
    remark: form.remark.trim() || null,
    shift_incharge: form.shift_incharge.trim() || null,
    shift_engineer: form.shift_engineer.trim() || null,
    equipment_entries: form.equipment_entries
      .filter((e) => e.equipment_key)
      .map((e) => ({
        equipment_key: e.equipment_key,
        equipment_label: e.equipment_label || e.equipment_key,
        custom_name: isOtherEquipment(form.area, e.equipment_key)
          ? (e.custom_name || '').trim() || null
          : null,
        job_details: (e.job_details || '').trim() || null,
      })),
    manpower_entries: form.manpower_entries
      .map((m) => ({ person_name: (m.person_name || '').trim() }))
      .filter((m) => m.person_name),
    keep_image_ids: images.filter((i) => i.existing && i.id).map((i) => i.id),
  });

  const buildFormData = () => {
    const fd = new FormData();
    fd.append('payload', JSON.stringify(buildPayload()));
    images.forEach((img) => {
      if (img.file) fd.append('images', img.file);
    });
    return fd;
  };

  const validate = () => {
    if (!form.report_date) { toast.error('Date is required'); return false; }
    if (!form.shift) { toast.error('Shift is required'); return false; }
    if (!form.area) { toast.error('Area is required'); return false; }
    if (!form.equipment_entries.length) {
      toast.error('Add at least one equipment entry');
      return false;
    }
    for (const e of form.equipment_entries) {
      if (isOtherEquipment(form.area, e.equipment_key) && !(e.custom_name || '').trim()) {
        toast.error('Enter a name for Other equipment');
        return false;
      }
    }
    return true;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    setShowPreview(true);
  };

  const handleConfirmSubmit = async () => {
    setSubmitting(true);
    try {
      const fd = buildFormData();
      let newId = editId;
      if (isEdit) {
        await hsmAPI.updateRollChangeActivity(editId, fd);
        toast.success('Roll change activity updated');
      } else {
        const res = await hsmAPI.createRollChangeActivity(fd);
        newId = res?.data?.id || res?.id;
        toast.success('Roll change activity submitted');
      }
      navigate(newId ? `/hsm/roll-change-activity/${newId}` : '/hsm/roll-change-activity/history');
    } catch (err) {
      toast.error(err?.message || 'Failed to save report');
    } finally {
      setSubmitting(false);
    }
  };

  const equipmentOpts = equipmentOptionsForArea(form.area);

  if (loadingEdit) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center space-x-3 mb-6">
            <button
              type="button"
              onClick={() => navigate(isEdit ? `/hsm/roll-change-activity/${editId}` : '/hsm/dashboard')}
              className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                {isEdit ? 'Edit Roll Change Activity' : 'Mechanical Activities During Roll Change'}
              </h1>
              <p className="text-sm text-gray-500">HSM · Equipment jobs by area</p>
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            <Section title="Basic Details">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Field label="Date" required>
                  <input
                    type="date"
                    required
                    value={form.report_date}
                    onChange={(e) => set('report_date', e.target.value)}
                    className={inputCls}
                  />
                </Field>
                <Field label="Shift" required>
                  <select
                    required
                    value={form.shift}
                    onChange={(e) => set('shift', e.target.value)}
                    className={inputCls}
                  >
                    {SHIFTS.map((s) => (
                      <option key={s} value={s}>Shift {s}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Area" required>
                  <select
                    required
                    value={form.area}
                    onChange={(e) => handleAreaChange(e.target.value)}
                    className={inputCls}
                  >
                    <option value="">Select area...</option>
                    {AREAS.map((a) => (
                      <option key={a} value={a}>{a}</option>
                    ))}
                  </select>
                </Field>
              </div>
            </Section>

            <Section title="Equipment (multiple)">
              {!form.area ? (
                <p className="text-sm text-gray-500">Select an area to add equipment entries.</p>
              ) : (
                <>
                  {form.equipment_entries.map((entry, index) => {
                    const other = isOtherEquipment(form.area, entry.equipment_key);
                    return (
                      <div
                        key={index}
                        className="rounded-lg border border-indigo-100 bg-indigo-50/40 p-4 space-y-3"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-bold text-indigo-800">Equipment #{index + 1}</p>
                          <button
                            type="button"
                            onClick={() => removeEquipment(index)}
                            className="text-xs font-semibold text-red-600 hover:text-red-700"
                          >
                            Remove
                          </button>
                        </div>
                        <Field label="Equipment" required>
                          <select
                            value={entry.equipment_key}
                            onChange={(e) => {
                              const opt = equipmentOpts.find((o) => o.key === e.target.value);
                              updateEquipment(index, {
                                equipment_key: e.target.value,
                                equipment_label: opt?.label || e.target.value,
                                custom_name: opt?.isOther ? entry.custom_name : '',
                              });
                            }}
                            className={inputCls}
                          >
                            {equipmentOpts.map((o) => (
                              <option key={o.key} value={o.key}>{o.label}</option>
                            ))}
                          </select>
                        </Field>
                        {other && (
                          <Field label="Other — type manually" required>
                            <input
                              type="text"
                              value={entry.custom_name}
                              onChange={(e) => updateEquipment(index, { custom_name: e.target.value })}
                              placeholder="Equipment name"
                              className={inputCls}
                            />
                          </Field>
                        )}
                        <Field label="Job details">
                          <textarea
                            className={textareaCls}
                            value={entry.job_details}
                            onChange={(e) => updateEquipment(index, { job_details: e.target.value })}
                            placeholder="Describe the job done..."
                          />
                        </Field>
                      </div>
                    );
                  })}
                  <button
                    type="button"
                    onClick={addEquipment}
                    className="w-full py-2.5 border-2 border-dashed border-indigo-300 text-indigo-700 rounded-lg text-sm font-semibold hover:bg-indigo-50"
                  >
                    + Add Equipment
                  </button>
                </>
              )}
            </Section>

            <Section title="Manpower Involved (multiple)">
              {form.manpower_entries.map((m, index) => (
                <div key={index} className="flex gap-2 items-end">
                  <div className="flex-1">
                    <Field label={`Name #${index + 1}`}>
                      <input
                        type="text"
                        value={m.person_name}
                        onChange={(e) => updateManpower(index, e.target.value)}
                        placeholder="Person name"
                        className={inputCls}
                      />
                    </Field>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeManpower(index)}
                    className="mb-0.5 px-3 py-2 text-xs font-semibold text-red-600 border border-red-200 rounded-lg hover:bg-red-50"
                  >
                    Remove
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={addManpower}
                className="w-full py-2.5 border-2 border-dashed border-indigo-300 text-indigo-700 rounded-lg text-sm font-semibold hover:bg-indigo-50"
              >
                + Add Name
              </button>
            </Section>

            <Section title="Remark">
              <textarea
                className={textareaCls}
                value={form.remark}
                onChange={(e) => set('remark', e.target.value)}
                placeholder="Additional remarks..."
              />
            </Section>

            <Section title="Images (multiple)">
              <p className="text-xs text-gray-500 -mt-2">
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
            </Section>

            <Section title="Sign-off">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Shift Incharge">
                  <input
                    type="text"
                    className={inputCls}
                    value={form.shift_incharge}
                    onChange={(e) => set('shift_incharge', e.target.value)}
                  />
                </Field>
                <Field label="Shift Engineer">
                  <input
                    type="text"
                    className={inputCls}
                    value={form.shift_engineer}
                    onChange={(e) => set('shift_engineer', e.target.value)}
                  />
                </Field>
              </div>
            </Section>

            <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4 shadow-lg rounded-t-xl">
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 bg-indigo-600 text-white rounded-lg font-bold text-base hover:bg-indigo-700 transition-colors disabled:opacity-60"
              >
                {isEdit ? 'Preview & Update' : 'Preview & Submit'}
              </button>
            </div>
          </form>
        </div>
      </div>

      <ChecksheetPreviewModal
        isOpen={showPreview}
        title={isEdit ? 'Roll Change Activity — Update' : 'Mechanical Activities During Roll Change'}
        onEdit={() => setShowPreview(false)}
        onConfirm={handleConfirmSubmit}
        submitting={submitting}
        confirmLabel={isEdit ? 'Confirm & Update' : 'Confirm & Submit'}
      >
        <PreviewSection title="Basic Details" color="bg-indigo-700">
          <PreviewGrid
            rows={[
              ['Date', form.report_date],
              ['Shift', form.shift],
              ['Area', form.area],
            ]}
          />
        </PreviewSection>
        <PreviewSection title="Equipment" color="bg-indigo-700">
          <div className="space-y-2 text-sm">
            {form.equipment_entries.map((e, i) => (
              <div key={i} className="border border-gray-100 rounded-lg p-2">
                <p className="font-semibold text-indigo-800 text-xs mb-1">
                  {displayEquipmentName(e)}
                </p>
                <p className="text-gray-700">
                  <span className="text-gray-400 text-xs">Job: </span>
                  {e.job_details || '—'}
                </p>
              </div>
            ))}
          </div>
        </PreviewSection>
        <PreviewSection title="Manpower / Remark / Sign-off" color="bg-indigo-700">
          <PreviewGrid
            rows={[
              [
                'Manpower',
                form.manpower_entries.map((m) => m.person_name).filter(Boolean).join(', ') || '—',
              ],
              ['Remark', form.remark],
              ['Shift Incharge', form.shift_incharge],
              ['Shift Engineer', form.shift_engineer],
              ['Images', `${images.length} selected`],
            ]}
          />
        </PreviewSection>
        {images.length > 0 && (
          <PreviewSection title="Image Previews" color="bg-indigo-700">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {images.map((img) => (
                <img
                  key={img.key}
                  src={img.url}
                  alt=""
                  className="w-full h-24 object-cover rounded-lg border border-gray-200"
                />
              ))}
            </div>
          </PreviewSection>
        )}
      </ChecksheetPreviewModal>
    </>
  );
}
