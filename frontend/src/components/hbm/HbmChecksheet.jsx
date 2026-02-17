import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { hbmAPI } from '../../services/api';

const HbmChecksheet = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = !id || id === 'new';

  // View mode state
  const [checksheet, setChecksheet] = useState(null);

  // New checksheet form state
  const [machines, setMachines] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [templateDetail, setTemplateDetail] = useState(null);
  const [formData, setFormData] = useState({
    machine_id: '',
    template_id: '',
    checksheet_date: new Date().toISOString().split('T')[0],
    shift: 'GENERAL',
    remarks: ''
  });
  const [itemValues, setItemValues] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isNew) {
      fetchNewChecksheetData();
    } else {
      fetchChecksheet();
    }
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchNewChecksheetData = async () => {
    try {
      const machinesRes = await hbmAPI.getMachines({ active_only: 'true' });
      setMachines(machinesRes.data);
    } catch (error) {
      console.error('Fetch error:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const fetchChecksheet = async () => {
    try {
      const res = await hbmAPI.getChecksheetById(id);
      setChecksheet(res.data);
    } catch (error) {
      console.error('Fetch checksheet error:', error);
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

    if (!machineId) {
      setTemplates([]);
      return;
    }

    try {
      const res = await hbmAPI.getMachineTemplates(machineId);
      setTemplates(res.data);
    } catch (error) {
      console.error('Fetch templates error:', error);
      toast.error('Failed to load templates for this machine');
    }
  };

  const handleTemplateChange = async (templateId) => {
    setFormData(prev => ({ ...prev, template_id: templateId }));
    setItemValues({});

    if (!templateId) {
      setTemplateDetail(null);
      return;
    }

    try {
      const res = await hbmAPI.getTemplateById(templateId);
      setTemplateDetail(res.data);

      // Initialize item values
      const values = {};
      res.data.sections?.forEach(section => {
        section.items?.forEach(item => {
          values[item.id] = { value: '', is_issue: false, remarks: '' };
        });
      });
      setItemValues(values);
    } catch (error) {
      console.error('Fetch template error:', error);
      toast.error('Failed to load template details');
    }
  };

  const handleItemChange = (itemId, field, val) => {
    setItemValues(prev => ({
      ...prev,
      [itemId]: { ...prev[itemId], [field]: val }
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.machine_id || !formData.template_id || !formData.checksheet_date) {
      toast.error('Please select machine, template, and date');
      return;
    }

    // ===== SECTION LEVEL VALIDATION =====

for (const section of templateDetail?.sections || []) {

  const sectionItemIds = section.items?.map(i => i.id) || [];

  // Check if any value filled in this section
  const anyFilled = sectionItemIds.some(id => 
    itemValues[id]?.value && itemValues[id]?.value !== ''
  );

  if (!anyFilled) {
    // Section completely empty → allowed
    continue;
  }

  // If any filled → all must be filled
  const allFilled = sectionItemIds.every(id => 
    itemValues[id]?.value && itemValues[id]?.value !== ''
  );

  if (!allFilled) {
    toast.error(`All fields in "${section.name}" must be filled if any one is filled.`);
    return;
  }
}

    // Build items array
    const items = Object.entries(itemValues)
      .filter(([_, v]) => v.value !== '')
      .map(([itemId, v]) => ({
        item_id: parseInt(itemId),
        value: v.value,
        is_issue: v.is_issue || false,
        is_critical_issue: v.is_issue && templateDetail?.sections
          ?.flatMap(s => s.items)
          ?.find(i => i.id === parseInt(itemId))?.is_critical,
        remarks: v.remarks || ''
      }));

    if (items.length === 0) {
      toast.error('Please fill at least one check item');
      return;
    }

    setSubmitting(true);

    try {
      await hbmAPI.createChecksheet({
        machine_id: parseInt(formData.machine_id),
        template_id: parseInt(formData.template_id),
        checksheet_date: formData.checksheet_date,
        shift: formData.shift,
        remarks: formData.remarks,
        items
      });

      toast.success('Checksheet submitted successfully!');
      navigate('/hbm/dashboard');
    } catch (error) {
      console.error('Submit error:', error);
      toast.error(error.message || 'Failed to submit checksheet');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  // ========== VIEW MODE ==========
  if (!isNew && checksheet) {
    // Group values by section
    const sections = {};
    checksheet.values?.forEach(v => {
      if (!sections[v.section_name]) {
        sections[v.section_name] = { order: v.section_order, items: [] };
      }
      sections[v.section_name].items.push(v);
    });

    const sortedSections = Object.entries(sections).sort((a, b) => a[1].order - b[1].order);

    return (
      <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex items-center space-x-4 mb-6">
            <button
              onClick={() => navigate('/hbm/dashboard')}
              className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Checksheet Details</h1>
              <p className="text-sm text-gray-500">#{checksheet.id}</p>
            </div>
          </div>

          {/* Summary Card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-gray-500 uppercase">Machine</p>
                <p className="font-bold text-gray-900">{checksheet.machine_name}</p>
                <p className="text-sm text-gray-500">{checksheet.machine_code}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase">Date</p>
                <p className="font-bold text-gray-900">
                  {new Date(checksheet.checksheet_date).toLocaleDateString()}
                </p>
                <p className="text-sm text-gray-500">{checksheet.shift} shift</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase">Status</p>
                <span className={`inline-block mt-1 text-sm px-3 py-1 rounded-full font-medium ${
                  checksheet.status === 'OK' ? 'bg-green-100 text-green-800' :
                  checksheet.status === 'CRITICAL' ? 'bg-red-100 text-red-800' :
                  'bg-yellow-100 text-yellow-800'
                }`}>
                  {checksheet.status?.replace(/_/g, ' ')}
                </span>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase">Filled By</p>
                <p className="font-bold text-gray-900">{checksheet.filled_by_name}</p>
                <p className="text-sm text-gray-500">
                  {new Date(checksheet.created_at).toLocaleTimeString()}
                </p>
              </div>
            </div>
            {checksheet.remarks && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-xs text-gray-500 uppercase mb-1">Remarks</p>
                <p className="text-gray-700">{checksheet.remarks}</p>
              </div>
            )}
          </div>

          {/* Sections & Items */}
          {sortedSections.map(([sectionName, section]) => (
            <div key={sectionName} className="bg-white rounded-xl shadow-sm border border-gray-200 mb-4">
              <div className="px-5 py-3 bg-gray-50 border-b border-gray-200 rounded-t-xl">
                <h3 className="font-bold text-gray-800">{sectionName}</h3>
              </div>
              <div className="divide-y divide-gray-100">
                {section.items.map(item => (
                  <div key={item.id} className={`px-5 py-3 ${item.is_issue ? 'bg-red-50' : ''}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className={`text-sm ${item.is_issue ? 'text-red-800 font-semibold' : 'text-gray-700'}`}>
                          {item.check_point}
                          {item.is_critical && (
                            <span className="ml-2 text-xs bg-red-200 text-red-800 px-1.5 py-0.5 rounded">CRITICAL</span>
                          )}
                        </p>
                        {item.remarks && (
                          <p className="text-xs text-gray-500 mt-1">Note: {item.remarks}</p>
                        )}
                      </div>
                      <div className="ml-4">
                        <span className={`text-sm font-medium px-3 py-1 rounded ${
                          item.is_issue
                            ? 'bg-red-100 text-red-700'
                            : 'bg-green-100 text-green-700'
                        }`}>
                          {item.value}
                          {item.unit && ` ${item.unit}`}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ========== NEW CHECKSHEET FORM ==========
  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center space-x-4 mb-6">
          <button
            onClick={() => navigate('/hbm/dashboard')}
            className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">New Checksheet</h1>
            <p className="text-gray-500">Fill a machine checksheet</p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Header Fields */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Checksheet Details</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Machine <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.machine_id}
                  onChange={(e) => handleMachineChange(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                >
                  <option value="">-- Select Machine --</option>
                  {machines.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.machine_name} ({m.machine_code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Template <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.template_id}
                  onChange={(e) => handleTemplateChange(e.target.value)}
                  required
                  disabled={!formData.machine_id}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent disabled:bg-gray-100"
                >
                  <option value="">-- Select Template --</option>
                  {templates.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.frequency})
                    </option>
                  ))}
                </select>
                {formData.machine_id && templates.length === 0 && (
                  <p className="text-xs text-orange-600 mt-1">No templates assigned to this machine</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={formData.checksheet_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, checksheet_date: e.target.value }))}
                  required
                  max={new Date().toISOString().split('T')[0]}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Shift</label>
                <select
                  value={formData.shift}
                  onChange={(e) => setFormData(prev => ({ ...prev, shift: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                >
                  <option value="GENERAL">General</option>
                  <option value="DAY">Day</option>
                  <option value="NIGHT">Night</option>
                </select>
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Remarks</label>
              <textarea
                value={formData.remarks}
                onChange={(e) => setFormData(prev => ({ ...prev, remarks: e.target.value }))}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                placeholder="Optional remarks..."
              />
            </div>
          </div>

          {/* Template Sections */}
          {templateDetail?.sections?.map(section => (
            <div key={section.id} className="bg-white rounded-xl shadow-sm border border-gray-200 mb-4">
              <div className="px-5 py-3 bg-emerald-50 border-b border-emerald-200 rounded-t-xl">
                <h3 className="font-bold text-emerald-800">{section.name}</h3>
              </div>
              <div className="divide-y divide-gray-100">
                {section.items?.map(item => (
                  <div key={item.id} className="px-5 py-4">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-700">
                          {item.check_point}
                          {item.is_critical && (
                            <span className="ml-2 text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded">CRITICAL</span>
                          )}
                        </p>
                        {item.unit && (
                          <p className="text-xs text-gray-400 mt-0.5">
                            Unit: {item.unit}
                            {item.min_value != null && ` | Min: ${item.min_value}`}
                            {item.max_value != null && ` | Max: ${item.max_value}`}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Value Input */}
                        {item.check_type === 'OK_NOT_OK' ? (
                          <div className="flex gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                handleItemChange(item.id, 'value', 'OK');
                                handleItemChange(item.id, 'is_issue', false);
                              }}
                              className={`px-4 py-1.5 rounded text-sm font-medium transition-colors ${
                                itemValues[item.id]?.value === 'OK'
                                  ? 'bg-green-500 text-white'
                                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                              }`}
                            >
                              OK
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                handleItemChange(item.id, 'value', 'NOT_OK');
                                handleItemChange(item.id, 'is_issue', true);
                              }}
                              className={`px-4 py-1.5 rounded text-sm font-medium transition-colors ${
                                itemValues[item.id]?.value === 'NOT_OK'
                                  ? 'bg-red-500 text-white'
                                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                              }`}
                            >
                              NOT OK
                            </button>
                          </div>
                        ) : item.check_type === 'YES_NO' ? (
                          <div className="flex gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                handleItemChange(item.id, 'value', 'YES');
                                handleItemChange(item.id, 'is_issue', false);
                              }}
                              className={`px-4 py-1.5 rounded text-sm font-medium transition-colors ${
                                itemValues[item.id]?.value === 'YES'
                                  ? 'bg-green-500 text-white'
                                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                              }`}
                            >
                              YES
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                handleItemChange(item.id, 'value', 'NO');
                                handleItemChange(item.id, 'is_issue', true);
                              }}
                              className={`px-4 py-1.5 rounded text-sm font-medium transition-colors ${
                                itemValues[item.id]?.value === 'NO'
                                  ? 'bg-red-500 text-white'
                                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                              }`}
                            >
                              NO
                            </button>
                          </div>
                        ) : item.check_type === 'READING' ? (
                          <input
                            type="number"
                            step="any"
                            value={itemValues[item.id]?.value || ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              handleItemChange(item.id, 'value', val);
                              // Auto-detect issues based on range
                              const numVal = parseFloat(val);
                              if (!isNaN(numVal) && (
                                (item.min_value != null && numVal < item.min_value) ||
                                (item.max_value != null && numVal > item.max_value)
                              )) {
                                handleItemChange(item.id, 'is_issue', true);
                              } else {
                                handleItemChange(item.id, 'is_issue', false);
                              }
                            }}
                            className="w-28 px-3 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                            placeholder={item.unit || 'Value'}
                          />
                        ) : (
                          <input
                            type="text"
                            value={itemValues[item.id]?.value || ''}
                            onChange={(e) => handleItemChange(item.id, 'value', e.target.value)}
                            className="w-40 px-3 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                            placeholder="Enter value"
                          />
                        )}
                      </div>
                    </div>

                    {/* Remarks for items marked as issues */}
                    {itemValues[item.id]?.is_issue && (
                      <div className="mt-2">
                        <input
                          type="text"
                          value={itemValues[item.id]?.remarks || ''}
                          onChange={(e) => handleItemChange(item.id, 'remarks', e.target.value)}
                          className="w-full px-3 py-1.5 border border-red-200 rounded text-sm bg-red-50 focus:ring-2 focus:ring-red-300 focus:border-transparent"
                          placeholder="Describe the issue..."
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Submit Button */}
          {templateDetail && (
            <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4 rounded-t-xl shadow-lg">
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 bg-emerald-600 text-white rounded-lg font-bold text-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <span className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Submitting...
                  </span>
                ) : (
                  'Submit Checksheet'
                )}
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default HbmChecksheet;
