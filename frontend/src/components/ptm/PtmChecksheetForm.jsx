import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { ptmAPI } from '../../services/api';

export default function PtmChecksheetForm() {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [templateData, setTemplateData] = useState(null);
  const [logDate, setLogDate] = useState(new Date().toLocaleDateString('en-CA'));
  const [shift, setShift] = useState('');
  const [remark, setRemark] = useState('');
  const [entries, setEntries] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [loadingTemplate, setLoadingTemplate] = useState(false);

  useEffect(() => {
    ptmAPI.getTemplates()
      .then(res => setTemplates(res.data || []))
      .catch(() => toast.error('Failed to load templates'));
  }, []);

  const handleTemplateChange = async (id) => {
    setSelectedTemplate(id);
    setTemplateData(null);
    setEntries({});
    if (!id) return;
    setLoadingTemplate(true);
    try {
      const res = await ptmAPI.getTemplateById(id);
      setTemplateData(res.data);
      const init = {};
      for (const item of res.data.items || []) {
        init[item.id] = { status: '', value_text: '', remark: '', action_taken: '' };
      }
      setEntries(init);
    } catch {
      toast.error('Failed to load template');
    } finally {
      setLoadingTemplate(false);
    }
  };

  const setEntry = (itemId, field, value) => {
    setEntries(prev => ({ ...prev, [itemId]: { ...prev[itemId], [field]: value } }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedTemplate) return toast.error('Please select a template');
    if (!logDate) return toast.error('Please select a date');

    const isParam = templateData?.type === 'parameter';

    const entriesArr = (templateData?.items || []).map(item => ({
      item_id: item.id,
      status: isParam ? null : (entries[item.id]?.status || null),
      value_text: isParam ? (entries[item.id]?.value_text || null) : null,
      remark: entries[item.id]?.remark || null,
      action_taken: entries[item.id]?.action_taken || null,
    }));

    // Validate NOT_OK
    if (!isParam) {
      for (const item of templateData?.items || []) {
        const e = entries[item.id];
        if (e?.status === 'NOT_OK') {
          if (!e.remark?.trim()) return toast.error(`Remark required for: ${item.item_name}`);
          if (!e.action_taken?.trim()) return toast.error(`Action Taken required for: ${item.item_name}`);
        }
      }
    }

    setSubmitting(true);
    try {
      await ptmAPI.createLog({
        template_id: parseInt(selectedTemplate),
        log_date: logDate,
        shift: shift || null,
        remark: remark || null,
        entries: entriesArr,
      });
      toast.success('Checksheet submitted successfully');
      navigate('/ptm/checksheet/history');
    } catch (err) {
      toast.error(err?.message || 'Failed to submit');
    } finally {
      setSubmitting(false);
    }
  };

  // Group items by section
  const sections = {};
  for (const item of templateData?.items || []) {
    const s = item.section_name || 'General';
    if (!sections[s]) sections[s] = [];
    sections[s].push(item);
  }

  const isParam = templateData?.type === 'parameter';

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <div className="mb-6">
        <button type="button" onClick={() => navigate('/ptm/dashboard')}
          className="text-sm text-gray-500 hover:text-gray-700 mb-2 flex items-center gap-1">
          ← Back to Dashboard
        </button>
        <h1 className="text-2xl font-bold text-blue-800">PTM Checksheet</h1>
        <p className="text-gray-500 text-sm mt-1">Fill a checksheet for any template</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Header fields */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Template *</label>
            <select
              value={selectedTemplate}
              onChange={e => handleTemplateChange(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              <option value="">-- Select template --</option>
              {templates.map(t => (
                <option key={t.id} value={t.id}>{t.name} ({t.type})</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
              <input
                type="date"
                value={logDate}
                onChange={e => setLogDate(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Shift</label>
              <select
                value={shift}
                onChange={e => setShift(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
                <option value="">-- Select --</option>
                <option value="A">Shift A</option>
                <option value="B">Shift B</option>
                <option value="C">Shift C</option>
                <option value="GENERAL">General</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Overall Remark</label>
            <textarea
              value={remark}
              onChange={e => setRemark(e.target.value)}
              rows={2}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
              placeholder="Optional..."
            />
          </div>
        </div>

        {/* Loading */}
        {loadingTemplate && (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        )}

        {/* Items */}
        {templateData && Object.keys(sections).map(sectionName => (
          <div key={sectionName} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="bg-blue-50 border-b border-blue-100 px-5 py-3">
              <h3 className="font-semibold text-blue-800">{sectionName}</h3>
            </div>
            <div className="divide-y divide-gray-100">
              {sections[sectionName].map(item => {
                const entry = entries[item.id] || {};
                const isNotOk = entry.status === 'NOT_OK';
                return (
                  <div key={item.id} className={`px-5 py-4 ${isNotOk ? 'bg-red-50' : ''}`}>
                    <div className="flex items-start justify-between gap-4">
                      <span className="text-sm text-gray-800 flex-1">{item.item_name}</span>

                      {isParam ? (
                        <input
                          type="text"
                          value={entry.value_text || ''}
                          onChange={e => setEntry(item.id, 'value_text', e.target.value)}
                          placeholder="Enter value"
                          className="w-36 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                        />
                      ) : (
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => setEntry(item.id, 'status', 'OK')}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${entry.status === 'OK' ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-emerald-100'}`}
                          >OK</button>
                          <button
                            type="button"
                            onClick={() => setEntry(item.id, 'status', 'NOT_OK')}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${entry.status === 'NOT_OK' ? 'bg-red-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-red-100'}`}
                          >NOT OK</button>
                        </div>
                      )}
                    </div>

                    {isNotOk && (
                      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                        <div>
                          <label className="block text-xs font-medium text-red-700 mb-1">Remark *</label>
                          <textarea
                            value={entry.remark || ''}
                            onChange={e => setEntry(item.id, 'remark', e.target.value)}
                            rows={2}
                            className="w-full border border-red-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                            placeholder="Describe the issue..."
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-red-700 mb-1">Action Taken *</label>
                          <textarea
                            value={entry.action_taken || ''}
                            onChange={e => setEntry(item.id, 'action_taken', e.target.value)}
                            rows={2}
                            className="w-full border border-red-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                            placeholder="Action taken..."
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {templateData && (
          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-blue-600 text-white rounded-xl py-3 font-semibold text-lg hover:bg-blue-700 disabled:opacity-50 transition-colors shadow"
          >
            {submitting ? 'Submitting...' : 'Submit Checksheet'}
          </button>
        )}
      </form>
    </div>
  );
}
