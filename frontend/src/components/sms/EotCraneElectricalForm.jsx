import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { smsAPI } from '../../services/api';
import {
  EOT_SHEDS, EOT_ELEC_PHASES, getSections, isBadValue, isCurrentOver, craneOptionLabel, emptyItems,
  emptyEotCraneElectricalForm, firstIssue,
} from './eotCraneElectricalConfig';
import {
  inputCls, Field, loggedInUsername, optionBtnCls, RemarkToggle, PageLoader,
} from './checkFormParts';

export default function EotCraneElectricalForm() {
  const { id: editId } = useParams();
  const isEdit = Boolean(editId);
  const navigate = useNavigate();
  const [form, setForm] = useState(() => ({ ...emptyEotCraneElectricalForm(), recorded_by: isEdit ? '' : loggedInUsername() }));
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [openRemarks, setOpenRemarks] = useState({});

  useEffect(() => {
    if (!editId) return;
    smsAPI.getEotCraneElectricalById(editId)
      .then((res) => {
        const d = res?.data || res;
        if (!d?.can_modify) {
          toast.error('Edit window expired (10 hours)');
          navigate(`/sms/eot-crane-electrical/${editId}`);
          return;
        }
        const items = emptyItems();
        getSections(d.shed_name, d.crane_number).forEach((s) => {
          s.points.forEach((p) => {
            const row = d.items?.[s.key]?.[p.key];
            if (!row) return;
            items[s.key][p.key] = p.type === 'check'
              ? { value: row.value || '', remark: row.remark || '' }
              : { r: row.r ?? '', y: row.y ?? '', b: row.b ?? '', remark: row.remark || '' };
          });
        });
        setForm({
          report_date: String(d.report_date || '').slice(0, 10),
          recorded_by: d.recorded_by || '',
          shed_name: d.shed_name || '',
          crane_number: d.crane_number || '',
          items,
          skipped_sections: Array.isArray(d.skipped_sections) ? d.skipped_sections : [],
          remark: d.remark || '',
          maintenance_start: d.maintenance_start || '',
          maintenance_end: d.maintenance_end || '',
        });
      })
      .catch(() => {
        toast.error('Failed to load checklist');
        navigate('/sms/eot-crane-electrical/history');
      })
      .finally(() => setLoading(false));
  }, [editId, navigate]);

  const set = (patch) => setForm((f) => ({ ...f, ...patch }));
  const setPoint = (sectionKey, pointKey, patch) =>
    setForm((f) => ({
      ...f,
      items: { ...f.items, [sectionKey]: { ...f.items[sectionKey], [pointKey]: { ...f.items[sectionKey][pointKey], ...patch } } },
    }));
  const toggleSection = (key) =>
    setForm((f) => ({
      ...f,
      skipped_sections: f.skipped_sections.includes(key)
        ? f.skipped_sections.filter((k) => k !== key)
        : [...f.skipped_sections, key],
    }));
  const toggleRemark = (k) => setOpenRemarks((o) => ({ ...o, [k]: !o[k] }));

  const craneValue = form.shed_name && form.crane_number ? `${form.shed_name}|${form.crane_number}` : '';
  const pickCrane = (v) => {
    const [shed, number] = v.split('|');
    set({ shed_name: shed || '', crane_number: number || '' });
  };
  const splitDT = (v) => [String(v || '').slice(0, 10), String(v || '').slice(11, 16)];
  const setDT = (key, part, value) => {
    const [d, t] = splitDT(form[key]);
    const next = part === 'date' ? [value, t || '00:00'] : [d, value];
    set({ [key]: next[0] && next[1] ? `${next[0]}T${next[1]}` : '' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.shed_name || !form.crane_number) return toast.error('Crane is required');
    const issue = firstIssue(form.items, form.skipped_sections, form.shed_name, form.crane_number);
    if (issue) return toast.error(issue);
    if (!form.maintenance_start) return toast.error('Maintenance Start date & time is required');
    if (!form.maintenance_end) return toast.error('Maintenance End date & time is required');
    if (form.maintenance_end < form.maintenance_start) return toast.error('Maintenance End must be after Maintenance Start');
    setSaving(true);
    try {
      if (isEdit) {
        await smsAPI.updateEotCraneElectrical(editId, form);
        toast.success('Checklist updated');
        navigate(`/sms/eot-crane-electrical/${editId}`);
      } else {
        const res = await smsAPI.createEotCraneElectrical(form);
        toast.success('Checklist saved');
        const id = res?.data?.id;
        navigate(id ? `/sms/eot-crane-electrical/${id}` : '/sms/eot-crane-electrical/history');
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to save checklist');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <PageLoader />;

  const sections = getSections(form.shed_name, form.crane_number);
  const [startD, startT] = splitDT(form.maintenance_start);
  const [endD, endT] = splitDT(form.maintenance_end);

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <form onSubmit={handleSubmit} className="max-w-4xl mx-auto">
        <div className="flex items-start justify-between gap-3 mb-6">
          <div>
            <button type="button" onClick={() => navigate('/sms/electrical')} className="text-sm text-gray-500 hover:text-gray-700 mb-1">
              ← Back
            </button>
            <h1 className="text-2xl font-bold text-gray-900">
              {isEdit ? 'Edit EOT Crane - Electrical Maintenance' : 'EOT Crane - Electrical Maintenance'}
            </h1>
            <p className="text-sm text-gray-500 mt-1">Electrical</p>
          </div>
          <Link to="/sms/eot-crane-electrical/history" className="text-sm font-semibold text-amber-700 hover:opacity-80">
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
          <div className="sm:col-span-2">
            <Field label="Crane" required>
              <select value={craneValue} onChange={(e) => pickCrane(e.target.value)} className={inputCls} required>
                <option value="">Select crane</option>
                {EOT_SHEDS.flatMap((shed) => shed.cranes.map((c) => (
                  <option key={`${shed.name}|${c.number}`} value={`${shed.name}|${c.number}`}>{craneOptionLabel(shed, c)}</option>
                )))}
              </select>
            </Field>
          </div>
        </div>

        {sections.length === 0 && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 mb-5 text-sm text-gray-500">
            Select a crane to see its checklist.
          </div>
        )}

        {sections.map((s) => {
          const skipped = form.skipped_sections.includes(s.key);
          return (
            <div key={s.key} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 mb-5">
              <div className="flex items-center justify-between gap-3 mb-3">
                <h2 className="text-sm font-bold text-amber-800 uppercase tracking-wide">{s.label}</h2>
                <button
                  type="button"
                  role="switch"
                  aria-checked={!skipped}
                  onClick={() => toggleSection(s.key)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${skipped ? 'bg-gray-300' : 'bg-emerald-500'}`}
                  title={skipped ? 'Section skipped' : 'Section checked'}
                >
                  <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${skipped ? 'translate-x-0.5' : 'translate-x-5'}`} />
                </button>
              </div>
              {skipped ? (
                <p className="text-xs text-gray-400">Section not checked.</p>
              ) : (
                <div className="space-y-3">
                  {s.points.map((p) => {
                    const row = form.items[s.key][p.key];
                    const rk = `${s.key}.${p.key}`;
                    if (p.type === 'current') {
                      const over = isCurrentOver(p, row);
                      return (
                        <div key={p.key} className={`rounded-lg p-3 border space-y-2 ${over ? 'border-red-200 bg-red-50/50' : 'border-gray-100 bg-gray-50'}`}>
                          <p className="text-sm font-semibold text-gray-800">
                            {p.label} *
                            {p.limit != null && <span className="ml-2 text-xs font-normal text-gray-500">(Max: {p.limit} A)</span>}
                          </p>
                          <div className="grid grid-cols-3 gap-3">
                            {EOT_ELEC_PHASES.map((ph) => (
                              <Field key={ph.key} label={`Current - ${ph.label}`}>
                                <input
                                  type="number"
                                  step="any"
                                  inputMode="decimal"
                                  value={row[ph.key]}
                                  onChange={(e) => setPoint(s.key, p.key, { [ph.key]: e.target.value })}
                                  className={`${inputCls} ${p.limit != null && row[ph.key] !== '' && Number(row[ph.key]) > p.limit ? 'border-red-500 bg-red-50 text-red-700' : ''}`}
                                />
                              </Field>
                            ))}
                          </div>
                          <RemarkToggle
                            value={row.remark}
                            open={openRemarks[rk]}
                            forceOpen={over}
                            required={over}
                            onToggle={() => toggleRemark(rk)}
                            onChange={(v) => setPoint(s.key, p.key, { remark: v })}
                          />
                        </div>
                      );
                    }
                    const bad = isBadValue(p, row.value);
                    return (
                      <div key={p.key} className={`rounded-lg p-3 border space-y-2 ${bad ? 'border-red-200 bg-red-50/50' : 'border-gray-100 bg-gray-50'}`}>
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                          <p className="text-sm font-semibold text-gray-800">{p.label} *</p>
                          <div className="flex flex-wrap gap-2 sm:justify-end">
                            {p.options.map((opt) => {
                              const selected = row.value === opt;
                              return (
                                <button
                                  key={opt}
                                  type="button"
                                  onClick={() => setPoint(s.key, p.key, { value: selected ? '' : opt })}
                                  className={optionBtnCls(selected, isBadValue(p, opt))}
                                >
                                  {opt}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                        <RemarkToggle
                          value={row.remark}
                          open={openRemarks[rk]}
                          forceOpen={bad}
                          onToggle={() => toggleRemark(rk)}
                          onChange={(v) => setPoint(s.key, p.key, { remark: v })}
                        />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 mb-5">
          <Field label="Remark (if any)">
            <textarea rows={3} value={form.remark} onChange={(e) => set({ remark: e.target.value })} className={inputCls} />
          </Field>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 mb-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <p className="text-xs font-bold text-gray-700 mb-2">MAINTENANCE START TIME *</p>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Date" required>
                <input type="date" value={startD} onChange={(e) => setDT('maintenance_start', 'date', e.target.value)} className={inputCls} />
              </Field>
              <Field label="Time" required>
                <input type="time" value={startT} onChange={(e) => setDT('maintenance_start', 'time', e.target.value)} className={inputCls} />
              </Field>
            </div>
          </div>
          <div>
            <p className="text-xs font-bold text-gray-700 mb-2">MAINTENANCE END TIME *</p>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Date" required>
                <input type="date" value={endD} onChange={(e) => setDT('maintenance_end', 'date', e.target.value)} className={inputCls} />
              </Field>
              <Field label="Time" required>
                <input type="time" value={endT} onChange={(e) => setDT('maintenance_end', 'time', e.target.value)} className={inputCls} />
              </Field>
            </div>
          </div>
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
