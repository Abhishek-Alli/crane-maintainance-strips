import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { smsAPI, resolveUploadUrl } from '../../services/api';
import { formatDate } from './eotCraneConfig';
import {
  SCRAP_TROLLIES,
  SCRAP_TROLLY_SECTIONS,
  SCRAP_TROLLY_POINTS,
  MAX_PHOTOS_PER_POINT,
  sectionPoints,
  isAlert,
  needsPhoto,
  actionLabel,
  countAlerts,
  emptyScrapTrollyForm,
  listChecklistIssues,
} from './scrapTrollyConfig';

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

export default function ScrapTrollyForm() {
  const { id: editId } = useParams();
  const isEdit = Boolean(editId);
  const navigate = useNavigate();
  const [form, setForm] = useState(() => ({ ...emptyScrapTrollyForm(), recorded_by: isEdit ? '' : loggedInUsername() }));
  const [photos, setPhotos] = useState({}); // { [pointKey]: [{ key, id?, url, file?, existing }] }
  const [openRemarks, setOpenRemarks] = useState({}); // { [pointKey]: true }
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState(false);
  const [showIssues, setShowIssues] = useState(false);
  const [flashId, setFlashId] = useState(null);

  useEffect(() => {
    if (!editId) return;
    smsAPI.getScrapTrollyById(editId)
      .then((res) => {
        const d = res?.data || res;
        if (!d?.can_modify) {
          toast.error('Edit window expired (10 hours)');
          navigate(`/sms/scrap-trolly/${editId}`);
          return;
        }
        const items = {};
        const remarksOpen = {};
        SCRAP_TROLLY_POINTS.forEach((p) => {
          const row = d.checklist_items?.[p.key] || {};
          items[p.key] = { value: row.value || '', remark: row.remark || '' };
          if (row.remark) remarksOpen[p.key] = true;
        });
        setForm({
          report_date: String(d.report_date || '').slice(0, 10),
          recorded_by: d.recorded_by || '',
          trolly: d.trolly || '',
          checklist_items: items,
        });
        setOpenRemarks(remarksOpen);
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
        navigate('/sms/scrap-trolly/history');
      })
      .finally(() => setLoading(false));
  }, [editId, navigate]);

  const alertCount = countAlerts(form.checklist_items);
  const filledPoints = SCRAP_TROLLY_POINTS.filter((p) => form.checklist_items[p.key].value).length;

  const flash = (id) => {
    setFlashId(id);
    scrollToId(id);
    setTimeout(() => setFlashId((cur) => (cur === id ? null : cur)), 2000);
  };

  const revokePhotos = (list) => {
    (list || []).forEach((ph) => { if (ph.file && ph.url) URL.revokeObjectURL(ph.url); });
  };

  const setPoint = (p, patch) => {
    const next = { ...form.checklist_items[p.key], ...patch };
    if ('value' in patch) {
      if (isAlert(p, next.value)) setOpenRemarks((o) => ({ ...o, [p.key]: true }));
      // Photos are only kept while the value still needs one
      if (!needsPhoto(p, next.value) && photos[p.key]?.length) {
        revokePhotos(photos[p.key]);
        setPhotos(({ [p.key]: _drop, ...rest }) => rest);
      }
    }
    setForm((f) => ({ ...f, checklist_items: { ...f.checklist_items, [p.key]: next } }));
  };

  const handlePhotoPick = (pointKey, e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (!files.length) return;
    const existing = photos[pointKey] || [];
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
    setPhotos((prev) => ({ ...prev, [pointKey]: [...(prev[pointKey] || []), ...accepted] }));
  };

  const removePhoto = (pointKey, key) => {
    setPhotos((prev) => {
      const list = prev[pointKey] || [];
      revokePhotos(list.filter((ph) => ph.key === key));
      return { ...prev, [pointKey]: list.filter((ph) => ph.key !== key) };
    });
  };

  /** All missing compulsory entries, in form order */
  const collectIssues = () => {
    const issues = [];
    const header = (where, message) => issues.push({ targetId: 'stt-header', where, message });
    if (!form.report_date) header('Date', 'Required');
    if (!form.recorded_by.trim()) header('Recorded By', 'Required');
    if (!form.trolly) header('Scrap Transfer Trolly', 'Required');
    const counts = Object.fromEntries(Object.entries(photos).map(([k, list]) => [k, list.length]));
    listChecklistIssues(form.checklist_items, counts).forEach((it) => {
      issues.push({ targetId: `pt-${it.key}`, where: it.where, message: it.message });
    });
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
    const all = Object.entries(photos).flatMap(([itemKey, list]) => list.map((ph) => ({ ...ph, itemKey })));
    const newPhotos = all.filter((ph) => ph.file);
    const payload = {
      report_date: form.report_date,
      recorded_by: form.recorded_by.trim(),
      trolly: form.trolly,
      checklist_items: form.checklist_items,
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
        await smsAPI.updateScrapTrolly(editId, fd);
        toast.success('Checklist updated');
        navigate(`/sms/scrap-trolly/${editId}`);
      } else {
        const res = await smsAPI.createScrapTrolly(fd);
        const id = res?.data?.id;
        toast.success('Checklist saved');
        navigate(id ? `/sms/scrap-trolly/${id}` : '/sms/scrap-trolly/history');
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
              {isEdit ? 'Edit Scrap Transfer Trolly' : 'Scrap Transfer Trolly'}
            </h1>
            <p className="text-sm text-gray-500 mt-1">Furnace · Scheduled maintenance</p>
          </div>
          <Link to="/sms/scrap-trolly/history" className="text-sm font-semibold text-amber-700 hover:opacity-80">
            History →
          </Link>
        </div>

        <div
          id="stt-header"
          className={`bg-white rounded-xl border shadow-sm p-5 mb-5 space-y-4 transition-shadow ${
            flashId === 'stt-header' ? 'border-red-400 ring-2 ring-red-300' : 'border-gray-200'
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
            <Field label="Scrap Transfer Trolly" required>
              <select
                className={inputCls}
                value={form.trolly}
                onChange={(e) => setForm({ ...form, trolly: e.target.value })}
              >
                <option value="">Select trolly</option>
                {SCRAP_TROLLIES.map((n) => <option key={n} value={n}>Trolly {n}</option>)}
              </select>
            </Field>
          </div>
        </div>

        <div className="mb-6 space-y-5">
          {SCRAP_TROLLY_SECTIONS.map((section, sIdx) => {
            const points = sectionPoints(section.key);
            const filled = points.filter((p) => form.checklist_items[p.key].value).length;
            const sectionAlerts = points.filter((p) => isAlert(p, form.checklist_items[p.key].value)).length;
            return (
              <div key={section.key} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-5 py-3 bg-amber-600">
                  <p className="text-sm font-bold text-white">{sIdx + 1}. {section.label}</p>
                  <p className="text-[11px] text-amber-100">
                    {filled}/{points.length} filled
                    {sectionAlerts > 0 ? ` · ${sectionAlerts} alert${sectionAlerts === 1 ? '' : 's'}` : ''}
                  </p>
                </div>
                <div className="divide-y divide-gray-100">
                  {points.map((p, idx) => {
                    const row = form.checklist_items[p.key];
                    const alert = isAlert(p, row.value);
                    const remarkOpen = alert || openRemarks[p.key];
                    const itemPhotos = photos[p.key] || [];
                    return (
                      <div
                        key={p.key}
                        id={`pt-${p.key}`}
                        className={`px-5 py-3.5 space-y-3 transition-shadow ${alert ? 'bg-red-50/60' : ''} ${
                          flashId === `pt-${p.key}` ? 'ring-2 ring-inset ring-red-400' : ''
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                          <p className="text-sm font-semibold text-gray-800">
                            <span className="text-gray-400 font-medium">{idx + 1}. </span>
                            {p.label}
                            <span className="text-red-500"> *</span>
                          </p>
                          <div className="flex flex-wrap gap-2 sm:justify-end">
                            {p.options.map((opt) => {
                              const selected = row.value === opt;
                              const bad = p.alertValues.includes(opt);
                              return (
                                <button
                                  key={opt}
                                  type="button"
                                  onClick={() => setPoint(p, { value: selected ? '' : opt })}
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
                            onClick={() => setOpenRemarks((o) => ({ ...o, [p.key]: !o[p.key] }))}
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
                            onChange={(e) => setPoint(p, { remark: e.target.value })}
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
                                  onClick={() => removePhoto(p.key, ph.key)}
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
                                  onChange={(e) => handlePhotoPick(p.key, e)}
                                />
                              </label>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-3 justify-end">
          <span className={`text-sm font-semibold ${alertCount ? 'text-red-600' : 'text-emerald-600'}`}>
            {alertCount} alert{alertCount === 1 ? '' : 's'} · {filledPoints}/{SCRAP_TROLLY_POINTS.length} filled
          </span>
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
              Date {formatDate(form.report_date)} · Trolly {form.trolly}
            </p>
            <p className="text-sm text-gray-600 mb-4">
              Recorded by {form.recorded_by} ·{' '}
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
