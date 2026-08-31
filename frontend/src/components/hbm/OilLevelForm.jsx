import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import { hbmAPI } from '../../services/api';
import ChecksheetPreviewModal, { PreviewSection, PreviewGrid } from './ChecksheetPreviewModal';

// ─── TANK CONFIGURATION ──────────────────────────────────────────────────────
const TANKS = [
  { key: 'roughing_lub',   label: 'Roughing Lub Tank',   threshold: 650 },
  { key: 'mill_lub',       label: 'Mill Lub Tank',        threshold: 500 },
  { key: 'air_oil',        label: 'Air Oil Tank',         threshold: 370 },
  { key: 'mill_hydraulic', label: 'Mill Hydraulic Tank',  threshold: 500 },
  { key: 'twin_channel_1', label: 'Twin Channel Tank-1',  threshold: 330 },
  { key: 'twin_channel_2', label: 'Twin Channel Tank-2',  threshold: 300 },
  { key: 'twin_channel_3', label: 'Twin Channel Tank-3',  threshold: 240 },
];

// ─── HELPERS ──────────────────────────────────────────────────────────────────
const getOilStatus = (val, threshold) => {
  if (val === '' || val == null) return null;
  const n = parseFloat(val);
  if (isNaN(n)) return null;
  return n > threshold ? 'OK' : 'NOT_OK';
};

const statusBadge = (status) => {
  if (!status) return null;
  return status === 'OK'
    ? <span className="ml-2 text-xs font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700">OK</span>
    : <span className="ml-2 text-xs font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700">NOT OK</span>;
};

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
const OilLevelForm = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const editData = location.state?.editData;
  const editId = location.state?.editId;
  const isEdit = !!editId;

  const [header, setHeader] = useState({
    log_date:   new Date().toLocaleDateString('en-CA'),
    shift_eng:  '',
    reading_by: '',
  });

  const [values, setValues]     = useState({});
  const [remark, setRemark]     = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    if (!isEdit || !editData) return;
    setHeader({ log_date: editData.log_date?.slice(0, 10) || new Date().toLocaleDateString('en-CA'), shift_eng: editData.shift_eng || '', reading_by: editData.reading_by || '' });
    setRemark(editData.remark || '');
    if (editData.entries) {
      const vals = {};
      editData.entries.forEach(e => {
        const tank = TANKS.find(t => t.label === e.tank_name);
        if (!tank) return;
        vals[tank.key] = { oil_level: e.oil_level ?? '', pressure: e.pressure ?? '', temperature: e.temperature ?? '' };
      });
      setValues(vals);
    }
  }, []); // eslint-disable-line

  const handleChange = (key, field, val) =>
    setValues(prev => ({ ...prev, [key]: { ...(prev[key] || {}), [field]: val } }));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!header.log_date) { toast.error('Date is required'); return; }
    setShowPreview(true);
  };

  const handleConfirmSubmit = async () => {
    const entries = TANKS.map(tank => {
      const v = values[tank.key] || {};
      const oil_level = v.oil_level !== '' && v.oil_level != null ? v.oil_level : null;
      return {
        tank_name:   tank.label,
        oil_level,
        oil_status:  oil_level != null ? getOilStatus(oil_level, tank.threshold) : null,
        pressure:    v.pressure !== '' && v.pressure != null ? v.pressure : null,
        temperature: v.temperature !== '' && v.temperature != null ? v.temperature : null,
      };
    });

    setSubmitting(true);
    try {
      const payload = { log_date: header.log_date, shift_eng: header.shift_eng || null, reading_by: header.reading_by || null, remark: remark || null, entries };
      if (isEdit) { await hbmAPI.updateHbmLog('oil-level', editId, payload); } else { await hbmAPI.createOilLevelLog(payload); }
      toast.success(isEdit ? 'Oil Level Sheet updated!' : 'Daily Oil Level Sheet submitted!');
      navigate(isEdit ? `/hbm/oil-level/${editId}` : '/hbm/oil-level/history');
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to submit');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="max-w-3xl mx-auto">

        {/* Page Header */}
        <div className="flex items-center space-x-3 mb-6">
          <button onClick={() => navigate('/hbm/dashboard')}
            className="p-2 hover:bg-gray-200 rounded-lg transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Daily Oil Level Sheet</h1>
            <p className="text-sm text-gray-500">Tank oil levels, pressure &amp; temperature</p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>

          {/* Header */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 mb-5">
            <h2 className="text-base font-bold text-gray-800 mb-4">Sheet Header</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Date <span className="text-red-500">*</span>
                </label>
                <input type="date" value={header.log_date} required
                  max={new Date().toLocaleDateString('en-CA')}
                  onChange={e => setHeader(p => ({ ...p, log_date: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Shift Eng</label>
                <input type="text" value={header.shift_eng}
                  onChange={e => setHeader(p => ({ ...p, shift_eng: e.target.value }))}
                  placeholder="Shift engineer name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Reading Taken By</label>
                <input type="text" value={header.reading_by}
                  onChange={e => setHeader(p => ({ ...p, reading_by: e.target.value }))}
                  placeholder="Name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
              </div>
            </div>
          </div>

          {/* Tank Entries */}
          <div className="flex items-center gap-3 mb-4">
            <div className="h-px flex-1 bg-gray-200" />
            <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Tank Readings</span>
            <div className="h-px flex-1 bg-gray-200" />
          </div>

          <div className="space-y-3 mb-5">
            {TANKS.map(tank => {
              const v = values[tank.key] || {};
              const oilStatus = getOilStatus(v.oil_level, tank.threshold);
              return (
                <div key={tank.key} className="bg-white rounded-xl border border-gray-200 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-bold text-sm text-gray-900">{tank.label}</h3>
                    <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                      Oil Level OK if &gt; {tank.threshold}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">
                        Today's Oil Level
                        {statusBadge(oilStatus)}
                      </label>
                      <input
                        type="number" step="0.01" min="0"
                        value={v.oil_level ?? ''}
                        onChange={e => handleChange(tank.key, 'oil_level', e.target.value)}
                        placeholder="0.00"
                        className={`w-full px-3 py-2 border-2 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-400 transition-colors ${
                          oilStatus === 'OK'     ? 'border-green-400 bg-green-50' :
                          oilStatus === 'NOT_OK' ? 'border-red-400 bg-red-50'    :
                          'border-gray-300 bg-white'
                        }`} />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Pressure (Kg/Cm²)</label>
                      <input
                        type="number" step="0.01" min="0"
                        value={v.pressure ?? ''}
                        onChange={e => handleChange(tank.key, 'pressure', e.target.value)}
                        placeholder="0.00"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Temperature</label>
                      <input
                        type="number" step="0.01"
                        value={v.temperature ?? ''}
                        onChange={e => handleChange(tank.key, 'temperature', e.target.value)}
                        placeholder="0.00"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Remark */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 mb-5">
            <label className="block text-sm font-semibold text-gray-700 mb-2">Remark</label>
            <textarea
              rows={3}
              value={remark}
              onChange={e => setRemark(e.target.value)}
              placeholder="Any additional remarks..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none" />
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
      title="Daily Oil Level Sheet"
      onEdit={() => setShowPreview(false)}
      onConfirm={handleConfirmSubmit}
      submitting={submitting}
    >
      <PreviewGrid rows={[
        ['Date', header.log_date],
        ['Shift Eng', header.shift_eng],
        ['Reading By', header.reading_by],
      ]} />

      <PreviewSection title="Tank Readings" color="bg-blue-700">
        <div className="space-y-3">
          {TANKS.map(tank => {
            const v = values[tank.key] || {};
            const status = getOilStatus(v.oil_level, tank.threshold);
            return (
              <div key={tank.key} className="border border-gray-200 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-bold text-gray-700">{tank.label}</p>
                  {status && (
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${status === 'OK' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{status}</span>
                  )}
                </div>
                <PreviewGrid rows={[
                  ['Oil Level', v.oil_level],
                  ['Pressure (Kg/Cm²)', v.pressure],
                  ['Temperature', v.temperature],
                ]} />
              </div>
            );
          })}
        </div>
      </PreviewSection>

      {remark && (
        <div className="bg-gray-50 rounded-lg p-3 text-sm">
          <span className="font-semibold text-gray-600">Remark: </span>
          <span className="text-gray-800">{remark}</span>
        </div>
      )}
    </ChecksheetPreviewModal>
    </>
  );
};

export default OilLevelForm;
