import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { hbmAPI } from '../../services/api';

// ─── Single check item row ─────────────────────────────────────────────────
const CheckItem = ({ item, value, onChange }) => {
  const isNotOk = value?.status === 'NOT_OK';

  return (
    <div className={`border-b border-gray-100 last:border-0 px-4 py-3 ${isNotOk ? 'bg-red-50' : ''}`}>
      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
        {/* Check point label */}
        <p className="flex-1 text-sm font-medium text-gray-800">
          {item.check_point}
          {item.is_critical && (
            <span className="ml-2 text-xs bg-red-200 text-red-800 px-1.5 py-0.5 rounded font-semibold">CRITICAL</span>
          )}
        </p>

        {/* OK / NOT OK buttons */}
        <div className="flex gap-2 flex-shrink-0">
          <button
            type="button"
            onClick={() => onChange(item.id, { status: 'OK', remark: '', action_taken: '' })}
            className={`px-5 py-1.5 rounded-lg text-sm font-bold border-2 transition-all ${
              value?.status === 'OK'
                ? 'bg-green-500 border-green-500 text-white shadow-sm'
                : 'bg-white border-gray-300 text-gray-600 hover:border-green-400 hover:text-green-600'
            }`}
          >
            OK
          </button>
          <button
            type="button"
            onClick={() => onChange(item.id, { status: 'NOT_OK', remark: value?.remark || '', action_taken: value?.action_taken || '' })}
            className={`px-4 py-1.5 rounded-lg text-sm font-bold border-2 transition-all ${
              value?.status === 'NOT_OK'
                ? 'bg-red-500 border-red-500 text-white shadow-sm'
                : 'bg-white border-gray-300 text-gray-600 hover:border-red-400 hover:text-red-600'
            }`}
          >
            NOT OK
          </button>
        </div>
      </div>

      {/* NOT OK fields — Remark + Action Taken */}
      {isNotOk && (
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-red-700 mb-1">
              Remark <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={value?.remark || ''}
              onChange={(e) => onChange(item.id, { ...value, remark: e.target.value })}
              placeholder="Describe the issue..."
              className="w-full px-3 py-2 border-2 border-red-200 rounded-lg text-sm bg-white focus:outline-none focus:border-red-400"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-orange-700 mb-1">
              Action Taken <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={value?.action_taken || ''}
              onChange={(e) => onChange(item.id, { ...value, action_taken: e.target.value })}
              placeholder="Action taken to fix..."
              className="w-full px-3 py-2 border-2 border-orange-200 rounded-lg text-sm bg-white focus:outline-none focus:border-orange-400"
            />
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Main Component ────────────────────────────────────────────────────────
const HbmChecksheet = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = !id || id === 'new';

  const [checksheet, setChecksheet] = useState(null);
  const [machines, setMachines] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [templateDetail, setTemplateDetail] = useState(null);
  const [formData, setFormData] = useState({
    machine_id: '',
    template_id: '',
    checksheet_date: new Date().toLocaleDateString('en-CA'),
    checksheet_time: new Date().toTimeString().slice(0, 5),
    shift: 'GENERAL',
    remarks: ''
  });
  const [itemValues, setItemValues] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isNew) fetchFormData();
    else fetchChecksheet();
  }, [id]); // eslint-disable-line

  const fetchFormData = async () => {
    try {
      const res = await hbmAPI.getMachines({ active_only: 'true' });
      setMachines(res.data);
    } catch {
      toast.error('Failed to load machines');
    } finally {
      setLoading(false);
    }
  };

  const fetchChecksheet = async () => {
    try {
      const res = await hbmAPI.getChecksheetById(id);
      setChecksheet(res.data);
    } catch {
      toast.error('Failed to load checksheet');
      navigate('/hbm/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleMachineChange = async (machineId) => {
    setFormData(prev => ({ ...prev, machine_id: machineId, template_id: '' }));
    setTemplateDetail(null);
    setItemValues({});
    if (!machineId) { setTemplates([]); return; }
    try {
      const res = await hbmAPI.getMachineTemplates(machineId);
      setTemplates(res.data);
    } catch {
      toast.error('Failed to load templates');
    }
  };

  const handleTemplateChange = async (templateId) => {
    setFormData(prev => ({ ...prev, template_id: templateId }));
    setItemValues({});
    if (!templateId) { setTemplateDetail(null); return; }
    try {
      const res = await hbmAPI.getTemplateById(templateId);
      setTemplateDetail(res.data);
      // Initialize all item values
      const vals = {};
      res.data.sections?.forEach(section => {
        section.items?.forEach(item => { vals[item.id] = { status: '', remark: '', action_taken: '' }; });
        section.subsections?.forEach(sub => {
          sub.items?.forEach(item => { vals[item.id] = { status: '', remark: '', action_taken: '' }; });
        });
      });
      setItemValues(vals);
    } catch {
      toast.error('Failed to load template');
    }
  };

  const handleItemChange = (itemId, val) => {
    setItemValues(prev => ({ ...prev, [itemId]: val }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.machine_id || !formData.template_id || !formData.checksheet_date || !formData.checksheet_time) {
      toast.error('Machine, template, date and time are required');
      return;
    }

    // Collect all items that have a status selected
    const allItems = [];
    templateDetail?.sections?.forEach(section => {
      section.items?.forEach(item => allItems.push(item));
      section.subsections?.forEach(sub => sub.items?.forEach(item => allItems.push(item)));
    });

    const filledItems = allItems.filter(item => itemValues[item.id]?.status !== '');

    if (filledItems.length === 0) {
      toast.error('Please fill at least one check item');
      return;
    }

    // Validate NOT OK items
    for (const item of filledItems) {
      const val = itemValues[item.id];
      if (val.status === 'NOT_OK') {
        if (!val.remark?.trim()) {
          toast.error(`Remark is compulsory for: "${item.check_point}"`);
          return;
        }
        if (!val.action_taken?.trim()) {
          toast.error(`Action Taken is compulsory for: "${item.check_point}"`);
          return;
        }
      }
    }

    const items = filledItems.map(item => ({
      item_id: item.id,
      value: itemValues[item.id].status,
      remark: itemValues[item.id].remark || '',
      action_taken: itemValues[item.id].action_taken || '',
      is_critical: item.is_critical || false
    }));

    setSubmitting(true);
    try {
      await hbmAPI.createChecksheet({
        machine_id: parseInt(formData.machine_id),
        template_id: parseInt(formData.template_id),
        checksheet_date: formData.checksheet_date,
        checksheet_time: formData.checksheet_time,
        shift: formData.shift,
        remarks: formData.remarks,
        items
      });
      toast.success('Checksheet submitted successfully!');
      navigate('/hbm/dashboard');
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to submit checksheet');
    } finally {
      setSubmitting(false);
    }
  };

  const formatTime = (t) => {
    if (!t) return '—';
    const [h, m] = t.split(':');
    const hour = parseInt(h);
    return `${hour % 12 || 12}:${m} ${hour >= 12 ? 'PM' : 'AM'}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  // ─── VIEW MODE ─────────────────────────────────────────────────────────
  if (!isNew && checksheet) {
    const sections = {};
    checksheet.values?.forEach(v => {
      const key = v.section_name;
      if (!sections[key]) sections[key] = { order: v.section_order, subsections: {}, directItems: [] };
      if (v.subsection_name) {
        if (!sections[key].subsections[v.subsection_name]) {
          sections[key].subsections[v.subsection_name] = { order: v.subsection_order, items: [] };
        }
        sections[key].subsections[v.subsection_name].items.push(v);
      } else {
        sections[key].directItems.push(v);
      }
    });

    const sortedSections = Object.entries(sections).sort((a, b) => a[1].order - b[1].order);

    return (
      <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center space-x-3 mb-6">
            <button onClick={() => navigate('/hbm/dashboard')}
              className="p-2 hover:bg-gray-200 rounded-lg transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Checksheet #{checksheet.id}</h1>
              <p className="text-sm text-gray-500">{checksheet.template_name}</p>
            </div>
          </div>

          {/* Summary */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 mb-5 grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-gray-400 uppercase font-semibold">Machine</p>
              <p className="font-bold text-gray-900 mt-1">{checksheet.machine_name}</p>
              <p className="text-xs text-gray-500">{checksheet.machine_code}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase font-semibold">Date & Time</p>
              <p className="font-bold text-gray-900 mt-1">{new Date(checksheet.checksheet_date).toLocaleDateString('en-IN')}</p>
              <p className="text-xs text-gray-500">{formatTime(checksheet.checksheet_time)} · {checksheet.shift}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase font-semibold">Status</p>
              <div className="mt-1">
                <span className={`text-sm px-3 py-1 rounded-full font-semibold ${
                  checksheet.status === 'OK' ? 'bg-green-100 text-green-800' :
                  checksheet.status === 'CRITICAL' ? 'bg-red-100 text-red-800' :
                  'bg-yellow-100 text-yellow-800'
                }`}>
                  {checksheet.status?.replace(/_/g, ' ')}
                </span>
              </div>
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase font-semibold">Filled By</p>
              <p className="font-bold text-gray-900 mt-1">{checksheet.filled_by_name}</p>
              <p className="text-xs text-gray-500">{new Date(checksheet.created_at).toLocaleTimeString()}</p>
            </div>
          </div>

          {checksheet.remarks && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl px-5 py-3 mb-5">
              <p className="text-xs text-blue-500 font-semibold uppercase">General Remarks</p>
              <p className="text-sm text-blue-900 mt-1">{checksheet.remarks}</p>
            </div>
          )}

          {/* Sections */}
          {sortedSections.map(([sectionName, section]) => (
            <div key={sectionName} className="bg-white rounded-xl border border-gray-200 mb-4 overflow-hidden">
              <div className="px-5 py-3 bg-emerald-600">
                <h3 className="font-bold text-white">{sectionName}</h3>
              </div>

              {/* Direct items */}
              {section.directItems.map(item => (
                <div key={item.id} className={`px-5 py-3 border-b border-gray-100 last:border-0 ${item.is_issue ? 'bg-red-50' : ''}`}>
                  <div className="flex items-center justify-between">
                    <p className={`text-sm font-medium ${item.is_issue ? 'text-red-800' : 'text-gray-800'}`}>
                      {item.check_point}
                      {item.is_critical && <span className="ml-2 text-xs bg-red-200 text-red-800 px-1.5 py-0.5 rounded">CRITICAL</span>}
                    </p>
                    <span className={`text-sm font-bold px-3 py-1 rounded-lg ${item.value === 'OK' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {item.value}
                    </span>
                  </div>
                  {item.is_issue && (
                    <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {item.remark && <p className="text-xs bg-red-100 text-red-700 rounded px-2 py-1"><span className="font-semibold">Remark:</span> {item.remark}</p>}
                      {item.action_taken && <p className="text-xs bg-orange-100 text-orange-700 rounded px-2 py-1"><span className="font-semibold">Action:</span> {item.action_taken}</p>}
                    </div>
                  )}
                </div>
              ))}

              {/* Subsections */}
              {Object.entries(section.subsections).sort((a, b) => a[1].order - b[1].order).map(([subName, sub]) => (
                <div key={subName}>
                  <div className="px-5 py-2 bg-gray-100 border-b border-gray-200">
                    <h4 className="text-sm font-bold text-gray-700">{subName}</h4>
                  </div>
                  {sub.items.map(item => (
                    <div key={item.id} className={`px-5 py-3 border-b border-gray-100 last:border-0 ${item.is_issue ? 'bg-red-50' : ''}`}>
                      <div className="flex items-center justify-between">
                        <p className={`text-sm font-medium ${item.is_issue ? 'text-red-800' : 'text-gray-800'}`}>
                          {item.check_point}
                          {item.is_critical && <span className="ml-2 text-xs bg-red-200 text-red-800 px-1.5 py-0.5 rounded">CRITICAL</span>}
                        </p>
                        <span className={`text-sm font-bold px-3 py-1 rounded-lg ${item.value === 'OK' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {item.value}
                        </span>
                      </div>
                      {item.is_issue && (
                        <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {item.remark && <p className="text-xs bg-red-100 text-red-700 rounded px-2 py-1"><span className="font-semibold">Remark:</span> {item.remark}</p>}
                          {item.action_taken && <p className="text-xs bg-orange-100 text-orange-700 rounded px-2 py-1"><span className="font-semibold">Action:</span> {item.action_taken}</p>}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ─── NEW CHECKSHEET FORM ───────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center space-x-3 mb-6">
          <button onClick={() => navigate('/hbm/dashboard')}
            className="p-2 hover:bg-gray-200 rounded-lg transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">New Checksheet</h1>
            <p className="text-gray-500 text-sm">Fill the checksheet for a machine</p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Header Fields */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 mb-5">
            <h2 className="text-base font-bold text-gray-800 mb-4">Sheet Details</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Machine <span className="text-red-500">*</span></label>
                <select value={formData.machine_id} onChange={e => handleMachineChange(e.target.value)} required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent">
                  <option value="">-- Select Machine --</option>
                  {machines.map(m => <option key={m.id} value={m.id}>{m.machine_name} ({m.machine_code})</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Template <span className="text-red-500">*</span></label>
                <select value={formData.template_id} onChange={e => handleTemplateChange(e.target.value)} required
                  disabled={!formData.machine_id}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent disabled:bg-gray-100">
                  <option value="">-- Select Template --</option>
                  {templates.map(t => <option key={t.id} value={t.id}>{t.name} ({t.frequency})</option>)}
                </select>
                {formData.machine_id && templates.length === 0 && (
                  <p className="text-xs text-orange-600 mt-1">No templates assigned to this machine</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Date <span className="text-red-500">*</span></label>
                <input type="date" value={formData.checksheet_date} required
                  max={new Date().toLocaleDateString('en-CA')}
                  onChange={e => setFormData(p => ({ ...p, checksheet_date: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent" />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Time (When work done) <span className="text-red-500">*</span></label>
                <input type="time" value={formData.checksheet_time} required
                  onChange={e => setFormData(p => ({ ...p, checksheet_time: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent" />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Shift</label>
                <select value={formData.shift} onChange={e => setFormData(p => ({ ...p, shift: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent">
                  <option value="GENERAL">General</option>
                  <option value="DAY">Day</option>
                  <option value="NIGHT">Night</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">General Remarks</label>
                <input type="text" value={formData.remarks}
                  onChange={e => setFormData(p => ({ ...p, remarks: e.target.value }))}
                  placeholder="Optional remarks..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent" />
              </div>
            </div>
          </div>

          {/* Template Sections */}
          {templateDetail?.sections?.map(section => (
            <div key={section.id} className="bg-white rounded-xl border border-gray-200 mb-4 overflow-hidden">
              {/* Section Header */}
              <div className="px-5 py-3 bg-emerald-600">
                <h3 className="font-bold text-white text-base">{section.name}</h3>
              </div>

              {/* Direct items (no subsection) */}
              {section.items?.map(item => (
                <CheckItem key={item.id} item={item}
                  value={itemValues[item.id]}
                  onChange={handleItemChange} />
              ))}

              {/* Sub-sections */}
              {section.subsections?.map(sub => (
                <div key={sub.id}>
                  <div className="px-5 py-2 bg-gray-100 border-t border-b border-gray-200">
                    <h4 className="text-sm font-bold text-gray-700">{sub.name}</h4>
                  </div>
                  {sub.items?.map(item => (
                    <CheckItem key={item.id} item={item}
                      value={itemValues[item.id]}
                      onChange={handleItemChange} />
                  ))}
                </div>
              ))}
            </div>
          ))}

          {/* Submit */}
          {templateDetail && (
            <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4 shadow-lg rounded-t-xl">
              <button type="submit" disabled={submitting}
                className="w-full py-3 bg-emerald-600 text-white rounded-lg font-bold text-base hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                {submitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                    Submitting...
                  </span>
                ) : 'Submit Checksheet'}
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default HbmChecksheet;
