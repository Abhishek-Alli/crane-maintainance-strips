import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { smsAPI, resolveUploadUrl } from '../../services/api';
import {
  EOT_SECTIONS,
  EOT_SHEDS,
  MAX_PHOTOS_PER_POINT,
  isAlert,
  needsPhoto,
  actionLabel,
  countAlerts,
  craneLabel,
  emptyEotForm,
  findCrane,
  formatDate,
  listChecklistIssues,
} from './eotCraneConfig';

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
  'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400';

const loggedInUsername = () => {
  try {
    return JSON.parse(localStorage.getItem('user'))?.username || '';
  } catch {
    return '';
  }
};

const scrollToId = (id) => {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
};

export default function EotCraneMaintenanceForm() {
  const { id: editId } = useParams();
  const [searchParams] = useSearchParams();
  const scheduleParam = searchParams.get('schedule');
  const isEdit = Boolean(editId);
  const navigate = useNavigate();
  const [form, setForm] = useState(() => ({ ...emptyEotForm(), recorded_by: isEdit ? '' : loggedInUsername() }));
  const [photos, setPhotos] = useState({}); // { [itemKey]: [{ key, id?, url, file?, existing }] }
  const [schedule, setSchedule] = useState(null); // { id, planned_date }
  const [openRemarks, setOpenRemarks] = useState({}); // { [itemKey]: true }
  const [loading, setLoading] = useState(isEdit || Boolean(scheduleParam));
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState(false);
  const [showIssues, setShowIssues] = useState(false);
  const [flashId, setFlashId] = useState(null);

  // New checklist opened from a calendar schedule
  useEffect(() => {
    if (isEdit || !scheduleParam) return;
    smsAPI.getEotScheduleById(scheduleParam)
      .then((res) => {
        const s = res?.data;
        if (s?.log_id) {
          toast.info(`Schedule #${s.id} is already done`);
          navigate(`/sms/eot-crane-maintenance/${s.log_id}`);
          return;
        }
        setSchedule({ id: s.id, planned_date: s.planned_date });
        setForm((f) => ({ ...f, shed_name: s.shed_name, crane_number: s.crane_number }));
      })
      .catch(() => toast.error('Schedule not found'))
      .finally(() => setLoading(false));
  }, [isEdit, scheduleParam, navigate]);

  useEffect(() => {
    if (!editId) return;
    smsAPI.getEotCraneById(editId)
      .then((res) => {
        const d = res?.data || res;
        if (!d?.can_modify) {
          toast.error('Edit window expired (10 hours)');
          navigate(`/sms/eot-crane-maintenance/${editId}`);
          return;
        }
        const base = emptyEotForm();
        const items = base.checklist_items;
        const remarksOpen = {};
        EOT_SECTIONS.forEach((section) => {
          section.points.forEach((p) => {
            const row = d.checklist_items?.[section.key]?.[p.key] || {};
            items[section.key][p.key] = { value: row.value || '', remark: row.remark || '' };
            if (row.remark) remarksOpen[`${section.key}.${p.key}`] = true;
          });
        });
        setForm({
          report_date: String(d.report_date || '').slice(0, 10),
          recorded_by: d.recorded_by || '',
          shed_name: d.shed_name || '',
          crane_number: d.crane_number || '',
          checklist_items: items,
          skipped_sections: Array.isArray(d.skipped_sections) ? d.skipped_sections : [],
          general_remark: d.general_remark || '',
          maintenance_start_time: d.maintenance_start_time ? String(d.maintenance_start_time).slice(0, 5) : '',
          maintenance_stop_time: d.maintenance_stop_time ? String(d.maintenance_stop_time).slice(0, 5) : '',
        });
        setOpenRemarks(remarksOpen);
        if (d.schedule_id) setSchedule({ id: d.schedule_id, planned_date: d.planned_date });
        const grouped = {};
        (d.images || []).forEach((img) => {
          (grouped[img.item_key] = grouped[img.item_key] || []).push({
            key: `existing-${img.id}`,
            id: img.id,
            url: resolveUploadUrl(img.url),
            existing: true,
          });
        });
        setPhotos(grouped);
      })
      .catch(() => {
        toast.error('Failed to load checklist');
        navigate('/sms/eot-crane-maintenance/history');
      })
      .finally(() => setLoading(false));
  }, [editId, navigate]);

  const selectedShed = EOT_SHEDS.find((s) => s.name === form.shed_name);
  const selectedCrane = findCrane(form.shed_name, form.crane_number);
  const craneSections = EOT_SECTIONS.filter((s) => selectedCrane?.sections.includes(s.key));
  const checkedKeys = craneSections.map((s) => s.key).filter((k) => !form.skipped_sections.includes(k));
  const checkedSections = craneSections.filter((s) => checkedKeys.includes(s.key));
  const alertCount = countAlerts(form.checklist_items, checkedKeys);
  const sectionFilled = (s) => s.points.filter((p) => form.checklist_items[s.key][p.key].value).length;
  const totalPoints = checkedSections.reduce((n, s) => n + s.points.length, 0);
  const filledPoints = checkedSections.reduce((n, s) => n + sectionFilled(s), 0);
  const isCheckedItem = (itemKey) => checkedKeys.includes(itemKey.split('.')[0]);
  const craneLocked = Boolean(schedule);

  const flash = (id) => {
    setFlashId(id);
    scrollToId(id);
    setTimeout(() => setFlashId((cur) => (cur === id ? null : cur)), 2000);
  };

  const revokePhotos = (list) => {
    (list || []).forEach((ph) => { if (ph.file && ph.url) URL.revokeObjectURL(ph.url); });
  };

  const setPoint = (section, p, patch) => {
    const itemKey = `${section.key}.${p.key}`;
    const next = { ...form.checklist_items[section.key][p.key], ...patch };
    if ('value' in patch) {
      if (isAlert(p, next.value)) setOpenRemarks((o) => ({ ...o, [itemKey]: true }));
      // Photos are only kept while the value still needs one
      if (!needsPhoto(p, next.value) && photos[itemKey]?.length) {
        revokePhotos(photos[itemKey]);
        setPhotos(({ [itemKey]: _drop, ...rest }) => rest);
      }
    }
    setForm((f) => ({
      ...f,
      checklist_items: {
        ...f.checklist_items,
        [section.key]: { ...f.checklist_items[section.key], [p.key]: next },
      },
    }));
  };

  const toggleSection = (key) => {
    setForm((f) => ({
      ...f,
      skipped_sections: f.skipped_sections.includes(key)
        ? f.skipped_sections.filter((k) => k !== key)
        : [...f.skipped_sections, key],
    }));
  };

  const handlePhotoPick = (itemKey, e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (!files.length) return;
    const existing = photos[itemKey] || [];
    const room = MAX_PHOTOS_PER_POINT - existing.length;
    if (room <= 0) {
      toast.error(`Maximum ${MAX_PHOTOS_PER_POINT} photos per point`);
      return;
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
    if (files.length > room) toast.error(`Only ${MAX_PHOTOS_PER_POINT} photos allowed per point`);
    setPhotos((prev) => ({ ...prev, [itemKey]: [...(prev[itemKey] || []), ...accepted] }));
  };

  const removePhoto = (itemKey, key) => {
    setPhotos((prev) => {
      const list = prev[itemKey] || [];
      revokePhotos(list.filter((ph) => ph.key === key));
      return { ...prev, [itemKey]: list.filter((ph) => ph.key !== key) };
    });
  };

  /** All missing compulsory entries, header first */
  const collectIssues = () => {
    const issues = [];
    const header = (where, message) => issues.push({ targetId: 'eot-header', where, message });
    if (!form.report_date) header('Date', 'Required');
    if (!form.recorded_by.trim()) header('Recorded By', 'Required');
    if (!form.shed_name) header('Shed', 'Required');
    if (!selectedCrane) header('Crane No.', 'Required');
    if (selectedCrane && !checkedKeys.length) header('Sections', 'Switch on at least one section');
    if (selectedCrane) {
      const counts = Object.fromEntries(Object.entries(photos).map(([k, list]) => [k, list.length]));
      listChecklistIssues(form.checklist_items, counts, checkedKeys).forEach((it) => {
        issues.push({ targetId: `pt-${it.itemKey}`, where: it.where, message: it.message });
      });
    }
    return issues;
  };
  const issues = collectIssues();

  const handleSubmitClick = () => {
    if (issues.length) {
      toast.error(`${issues.length} compulsory item${issues.length === 1 ? '' : 's'} pending`);
      setShowIssues(true);
      return;
    }
    setPreview(true);
  };

  const buildFormData = () => {
    const all = Object.entries(photos)
      .filter(([itemKey]) => isCheckedItem(itemKey))
      .flatMap(([itemKey, list]) => list.map((ph) => ({ ...ph, itemKey })));
    const newPhotos = all.filter((ph) => ph.file);
    const payload = {
      schedule_id: schedule?.id || null,
      report_date: form.report_date,
      recorded_by: form.recorded_by.trim(),
      shed_name: form.shed_name,
      crane_number: form.crane_number,
      checklist_items: Object.fromEntries(checkedSections.map((s) => [s.key, form.checklist_items[s.key]])),
      skipped_sections: craneSections.map((s) => s.key).filter((k) => !checkedKeys.includes(k)),
      general_remark: form.general_remark || null,
      maintenance_start_time: form.maintenance_start_time || null,
      maintenance_stop_time: form.maintenance_stop_time || null,
      keep_image_ids: all.filter((ph) => ph.existing && ph.id).map((ph) => ph.id),
      new_image_item_keys: newPhotos.map((ph) => ph.itemKey),
    };
    const fd = new FormData();
    fd.append('payload', JSON.stringify(payload));
    newPhotos.forEach((ph) => fd.append('images', ph.file));
    return fd;
  };

  const handleSubmit = async () => {
    setSaving(true);
    try {
      const fd = buildFormData();
      if (isEdit) {
        await smsAPI.updateEotCrane(editId, fd);
        toast.success('Checklist updated');
        navigate(`/sms/eot-crane-maintenance/${editId}`);
      } else {
        const res = await smsAPI.createEotCrane(fd);
        const id = res?.data?.id;
        toast.success('Checklist saved');
        navigate(id ? `/sms/eot-crane-maintenance/${id}` : '/sms/eot-crane-maintenance/history');
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
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-amber-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="max-w-4xl mx-auto">
        <button
          type="button"
          onClick={() => navigate('/sms/dashboard')}
          className="text-sm text-gray-500 hover:text-gray-700 mb-1"
        >
          ← Back to Dashboard
        </button>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {isEdit ? 'Edit EOT Crane Maintenance' : 'EOT Crane Maintenance'}
            </h1>
            <p className="text-sm text-gray-500 mt-1">Mechanical · Preventive maintenance · Furnace</p>
          </div>
          <div className="flex gap-4">
            <Link to="/sms/eot-crane-maintenance/calendar" className="text-sm font-semibold text-amber-700 hover:opacity-80">
              Calendar →
            </Link>
            <Link to="/sms/eot-crane-maintenance/history" className="text-sm font-semibold text-amber-700 hover:opacity-80">
              History →
            </Link>
          </div>
        </div>

        {schedule && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <p className="text-[11px] font-semibold text-amber-700 uppercase">Schedule ID</p>
              <p className="text-lg font-bold text-gray-900">#{schedule.id}</p>
            </div>
            <div>
              <p className="text-[11px] font-semibold text-amber-700 uppercase">Schedule Detail</p>
              <p className="text-sm text-gray-900">
                {form.shed_name} · {craneLabel(selectedCrane?.number, selectedCrane?.capacity)}
              </p>
              <p className="text-sm text-gray-600">Planned: {formatDate(schedule.planned_date)}</p>
            </div>
          </div>
        )}

        <div
          id="eot-header"
          className={`bg-white rounded-xl border shadow-sm p-5 mb-5 space-y-4 transition-shadow ${
            flashId === 'eot-header' ? 'border-red-400 ring-2 ring-red-300' : 'border-gray-200'
          }`}
        >
          <h2 className="text-sm font-bold text-amber-800 uppercase tracking-wide border-b border-amber-100 pb-2">
            Basic Information
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Date" required>
              <input
                type="date"
                className={inputCls}
                value={form.report_date}
                onChange={(e) => setForm({ ...form, report_date: e.target.value })}
              />
            </Field>
            <Field label="Recorded By" required>
              <input
                type="text"
                className={inputCls}
                value={form.recorded_by}
                onChange={(e) => setForm({ ...form, recorded_by: e.target.value })}
                placeholder="Name"
              />
            </Field>
            <Field label="Shed" required>
              <select
                className={`${inputCls} disabled:bg-gray-100`}
                value={form.shed_name}
                disabled={craneLocked}
                onChange={(e) => setForm({ ...form, shed_name: e.target.value, crane_number: '', skipped_sections: [] })}
              >
                <option value="">Select shed</option>
                {EOT_SHEDS.map((s) => (
                  <option key={s.name} value={s.name}>{s.name}</option>
                ))}
              </select>
            </Field>
            <Field label="Crane No." required>
              <select
                className={`${inputCls} disabled:bg-gray-100`}
                value={form.crane_number}
                disabled={!selectedShed || craneLocked}
                onChange={(e) => setForm({ ...form, crane_number: e.target.value, skipped_sections: [] })}
              >
                <option value="">{selectedShed ? 'Select crane' : 'Select shed first'}</option>
                {(selectedShed?.cranes || []).map((c) => (
                  <option key={c.number} value={c.number}>{craneLabel(c.number, c.capacity)}</option>
                ))}
              </select>
            </Field>
          </div>
        </div>

        {!selectedCrane && (
          <div className="bg-white rounded-xl border border-dashed border-amber-300 p-8 mb-5 text-center text-sm text-gray-500">
            Select shed and crane to start the checklist.
          </div>
        )}

        <div className="mb-5 space-y-5">
          {craneSections.map((section, sIdx) => {
            const on = checkedKeys.includes(section.key);
            const rows = form.checklist_items[section.key];
            const sectionAlerts = on ? section.points.filter((p) => isAlert(p, rows[p.key].value)).length : 0;
            return (
              <div
                key={section.key}
                id={`sec-${section.key}`}
                className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden scroll-mt-20"
              >
                <div className={`px-5 py-3 flex items-center justify-between gap-3 ${on ? 'bg-amber-600' : 'bg-gray-200'}`}>
                  <div className="min-w-0">
                    <p className={`text-sm font-bold ${on ? 'text-white' : 'text-gray-500'}`}>
                      {sIdx + 1}. {section.label}
                    </p>
                    <p className={`text-[11px] ${on ? 'text-amber-100' : 'text-gray-500'}`}>
                      {on ? `${sectionFilled(section)}/${section.points.length} filled` : 'Not checked — switched off'}
                      {sectionAlerts > 0 ? ` · ${sectionAlerts} alert${sectionAlerts === 1 ? '' : 's'}` : ''}
                    </p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={on}
                    aria-label={`Check ${section.label}`}
                    onClick={() => toggleSection(section.key)}
                    className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
                      on ? 'bg-white/90' : 'bg-gray-400'
                    }`}
                  >
                    <span
                      className={`inline-block h-5 w-5 rounded-full shadow transform transition-transform ${
                        on ? 'translate-x-5 bg-amber-600' : 'translate-x-0.5 bg-white'
                      }`}
                    />
                  </button>
                </div>

                {on && (
                  <div className="divide-y divide-gray-100">
                    {section.points.map((p) => {
                      const itemKey = `${section.key}.${p.key}`;
                      const row = rows[p.key];
                      const alert = isAlert(p, row.value);
                      const remarkOpen = alert || openRemarks[itemKey];
                      const itemPhotos = photos[itemKey] || [];
                      return (
                        <div
                          key={p.key}
                          id={`pt-${itemKey}`}
                          className={`px-5 py-3.5 space-y-3 transition-shadow ${alert ? 'bg-red-50/60' : ''} ${
                            flashId === `pt-${itemKey}` ? 'ring-2 ring-inset ring-red-400' : ''
                          }`}
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                            <p className="text-sm font-semibold text-gray-800">
                              <span className="text-gray-400 font-medium">{section.short} </span>
                              {p.label}
                              {p.required ? <span className="text-red-500"> *</span> : (
                                <span className="text-xs font-normal text-gray-400"> (optional)</span>
                              )}
                            </p>
                            <div className="flex flex-wrap gap-2 sm:justify-end">
                              {p.options.map((opt) => {
                                const selected = row.value === opt;
                                const bad = p.alertValues.includes(opt);
                                return (
                                  <button
                                    key={opt}
                                    type="button"
                                    onClick={() => setPoint(section, p, { value: selected ? '' : opt })}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${
                                      selected
                                        ? bad
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

                          {!alert && (
                            <button
                              type="button"
                              onClick={() => setOpenRemarks((o) => ({ ...o, [itemKey]: !o[itemKey] }))}
                              className="text-xs font-semibold text-gray-500 hover:text-amber-700"
                            >
                              Remark {remarkOpen ? '▴' : '▾'}
                            </button>
                          )}
                          {alert && (
                            <p className="text-xs font-semibold text-red-700">Alert: {actionLabel(p)} required</p>
                          )}
                          {remarkOpen && (
                            <input
                              type="text"
                              className={inputCls}
                              value={row.remark}
                              onChange={(e) => setPoint(section, p, { remark: e.target.value })}
                              placeholder={alert ? 'Remark *' : 'Remark (optional)'}
                            />
                          )}
                          {needsPhoto(p, row.value) && (
                            <div className="flex flex-wrap gap-2">
                              {itemPhotos.map((ph) => (
                                <div key={ph.key} className="relative w-20 h-20 rounded-lg overflow-hidden border border-gray-200 bg-gray-50">
                                  <img src={ph.url} alt="" className="w-full h-full object-cover" />
                                  <button
                                    type="button"
                                    onClick={() => removePhoto(itemKey, ph.key)}
                                    className="absolute top-1 right-1 px-1.5 py-0.5 bg-red-600 text-white text-[10px] font-semibold rounded"
                                  >
                                    ✕
                                  </button>
                                </div>
                              ))}
                              {itemPhotos.length < MAX_PHOTOS_PER_POINT && (
                                <label className="w-20 h-20 flex flex-col items-center justify-center border-2 border-dashed border-red-300 rounded-lg cursor-pointer hover:bg-red-50 text-red-700">
                                  <span className="text-lg leading-none">+</span>
                                  <span className="text-[10px] font-semibold mt-1">Photo *</span>
                                  <input
                                    type="file"
                                    accept="image/jpeg,image/png,image/webp,image/gif"
                                    multiple
                                    className="hidden"
                                    onChange={(e) => handlePhotoPick(itemKey, e)}
                                  />
                                </label>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {selectedCrane && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 mb-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Maintenance Start Time">
                <input
                  type="time"
                  className={inputCls}
                  value={form.maintenance_start_time}
                  onChange={(e) => setForm({ ...form, maintenance_start_time: e.target.value })}
                />
              </Field>
              <Field label="Maintenance Stop Time">
                <input
                  type="time"
                  className={inputCls}
                  value={form.maintenance_stop_time}
                  onChange={(e) => setForm({ ...form, maintenance_stop_time: e.target.value })}
                />
              </Field>
            </div>
            <Field label="Remark (if any)">
              <textarea
                className={`${inputCls} min-h-[90px]`}
                value={form.general_remark}
                onChange={(e) => setForm({ ...form, general_remark: e.target.value })}
                placeholder="Any other remark"
              />
            </Field>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3 justify-end">
          {selectedCrane && (
            <span className={`text-sm font-semibold ${alertCount ? 'text-red-600' : 'text-emerald-600'}`}>
              {alertCount} alert{alertCount === 1 ? '' : 's'} · {filledPoints}/{totalPoints} filled
            </span>
          )}
          <button
            type="button"
            onClick={handleSubmitClick}
            className="px-5 py-2.5 bg-amber-600 text-white rounded-lg text-sm font-semibold hover:bg-amber-700"
          >
            {isEdit ? 'Preview & Update' : 'Preview & Submit'}
          </button>
        </div>
      </div>

      {showIssues && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40" onClick={() => setShowIssues(false)}>
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-4 max-h-[75vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-bold text-gray-900 mb-1">Check Compulsory</h3>
            {issues.length === 0 ? (
              <p className="text-sm text-emerald-700 font-semibold py-4">All compulsory items are filled. Ready to submit.</p>
            ) : (
              <>
                <p className="text-xs text-gray-500 mb-3">{issues.length} pending — tap one to go there</p>
                <div className="overflow-y-auto space-y-1.5">
                  {issues.map((it, i) => (
                    <button
                      key={`${it.targetId}-${i}`}
                      type="button"
                      onClick={() => { setShowIssues(false); flash(it.targetId); }}
                      className="w-full flex items-center justify-between gap-3 px-3 py-2 rounded-lg border border-red-100 bg-red-50/50 hover:bg-red-50 text-left"
                    >
                      <span className="text-sm font-semibold text-gray-800">{it.where}</span>
                      <span className="text-xs font-semibold text-red-700 shrink-0">{it.message}</span>
                    </button>
                  ))}
                </div>
              </>
            )}
            <div className="flex justify-end mt-3">
              <button type="button" onClick={() => setShowIssues(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {preview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Confirm submit?</h3>
            <p className="text-sm text-gray-600">
              {schedule ? `Schedule #${schedule.id} · ` : ''}Date {formatDate(form.report_date)} · {form.shed_name} ·{' '}
              {craneLabel(selectedCrane?.number, selectedCrane?.capacity)}
            </p>
            <p className="text-sm text-gray-600 mb-4">
              Recorded by {form.recorded_by} · {filledPoints}/{totalPoints} points ·{' '}
              <span className={alertCount ? 'text-red-600 font-semibold' : 'text-emerald-600 font-semibold'}>
                {alertCount} alert{alertCount === 1 ? '' : 's'}
              </span>
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
                className="px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-semibold disabled:opacity-50"
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
