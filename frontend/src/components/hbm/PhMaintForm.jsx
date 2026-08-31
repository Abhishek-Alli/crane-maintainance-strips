import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import { hbmAPI } from '../../services/api';
import ChecksheetPreviewModal, { PreviewSection } from './ChecksheetPreviewModal';

const PhMaintForm = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const editData = location.state?.editData;
  const editId = location.state?.editId;
  const isEdit = !!editId;

  const [logDate, setLogDate] = useState(new Date().toLocaleDateString('en-CA'));
  const [items, setItems]     = useState(['', '', '']);
  const [submitting, setSubmitting] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    if (!isEdit || !editData) return;
    setLogDate(editData.log_date?.slice(0, 10) || new Date().toLocaleDateString('en-CA'));
    if (Array.isArray(editData.items) && editData.items.length > 0) {
      setItems(editData.items.map(i => i.item_text || ''));
    }
  }, []); // eslint-disable-line

  const handleItemChange = (idx, val) =>
    setItems(prev => prev.map((v, i) => (i === idx ? val : v)));

  const addItem = () => setItems(prev => [...prev, '']);

  const removeItem = (idx) => {
    if (items.length <= 1) return;
    setItems(prev => prev.filter((_, i) => i !== idx));
  };

  const validItems = () =>
    items.map((t, i) => ({ item_no: i + 1, item_text: t.trim() })).filter(i => i.item_text);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!logDate) { toast.error('Date is required'); return; }
    if (validItems().length === 0) { toast.error('Enter at least one maintenance work item'); return; }
    setShowPreview(true);
  };

  const handleConfirmSubmit = async () => {
    setSubmitting(true);
    try {
      if (isEdit) { await hbmAPI.updateHbmLog('ph-maint', editId, { log_date: logDate, items: validItems() }); } else { await hbmAPI.createPhMaintLog({ log_date: logDate, items: validItems() }); }
      toast.success(isEdit ? 'Pump House Maintenance sheet updated!' : 'Pump House Maintenance sheet submitted!');
      navigate(isEdit ? `/hbm/ph-maint/${editId}` : '/hbm/ph-maint/history');
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to submit');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="max-w-2xl mx-auto">

        {/* Page Header */}
        <div className="flex items-center space-x-3 mb-6">
          <button onClick={() => navigate('/hbm/dashboard')}
            className="p-2 hover:bg-gray-200 rounded-lg transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Pump House Maintenance Work Sheet</h1>
            <p className="text-sm text-gray-500">Daily maintenance log</p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>

          {/* Date */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 mb-5">
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={logDate}
              required
              max={new Date().toLocaleDateString('en-CA')}
              onChange={e => setLogDate(e.target.value)}
              className="w-full sm:w-56 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Maintenance Work Items */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 mb-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-gray-800">Maintenance Work</h2>
              <span className="text-xs text-gray-400">{items.filter(t => t.trim()).length} item{items.filter(t => t.trim()).length !== 1 ? 's' : ''} filled</span>
            </div>

            <div className="space-y-3">
              {items.map((val, idx) => (
                <div key={idx} className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-7 h-7 mt-1.5 flex items-center justify-center rounded-full bg-blue-100 text-blue-700 text-xs font-bold">
                    {idx + 1}
                  </span>
                  <input
                    type="text"
                    value={val}
                    onChange={e => handleItemChange(idx, e.target.value)}
                    placeholder={`Maintenance work point ${idx + 1}...`}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  {items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeItem(idx)}
                      className="flex-shrink-0 mt-1.5 p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={addItem}
              className="mt-4 flex items-center gap-2 px-4 py-2 border-2 border-dashed border-blue-300 text-blue-600 rounded-lg text-sm font-semibold hover:border-blue-400 hover:bg-blue-50 transition-colors w-full justify-center">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Point
            </button>
          </div>

          {/* Submit */}
          <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4 shadow-lg rounded-t-xl">
            <button type="submit"
              className="w-full py-3 bg-blue-600 text-white rounded-lg font-bold text-base hover:bg-blue-700 transition-colors">
              Preview & Submit
            </button>
          </div>

        </form>
      </div>
    </div>

    <ChecksheetPreviewModal
      isOpen={showPreview}
      title="Pump House Maintenance Work Sheet"
      onEdit={() => setShowPreview(false)}
      onConfirm={handleConfirmSubmit}
      submitting={submitting}
    >
      <div className="bg-gray-50 rounded-lg p-3 text-sm">
        <span className="font-semibold text-gray-600">Date: </span>
        <span className="text-gray-900">{logDate}</span>
      </div>
      <PreviewSection title="Maintenance Work Items" color="bg-blue-700">
        <ol className="space-y-2">
          {validItems().map(item => (
            <li key={item.item_no} className="flex gap-2 text-sm">
              <span className="w-6 h-6 flex-shrink-0 flex items-center justify-center rounded-full bg-blue-100 text-blue-700 text-xs font-bold">{item.item_no}</span>
              <span className="text-gray-800">{item.item_text}</span>
            </li>
          ))}
        </ol>
      </PreviewSection>
    </ChecksheetPreviewModal>
    </>
  );
};

export default PhMaintForm;
