import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { hbmAPI } from '../../services/api';

const STANDS = ['C-1','C-2','C-3','C-4','C-5','C-6','C-7','C-8','C-9','C-10','C-11','C-12','C-13','C-14'];

// ─── Number Input ─────────────────────────────────────────────────────────────
const NumInput = ({ label, value, onChange }) => (
  <div>
    <label className="block text-xs font-semibold text-gray-600 mb-1">{label}</label>
    <input
      type="number" step="0.01" min="0"
      value={value ?? ''}
      onChange={e => onChange(e.target.value)}
      placeholder="—"
      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
    />
  </div>
);

// ─── Section Divider ──────────────────────────────────────────────────────────
const SectionDivider = ({ title }) => (
  <div className="flex items-center gap-3 my-6">
    <div className="h-px flex-1 bg-gray-200" />
    <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">{title}</span>
    <div className="h-px flex-1 bg-gray-200" />
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────
const RoughingGbTempForm = () => {
  const navigate = useNavigate();

  const [header, setHeader] = useState({
    log_date:      new Date().toLocaleDateString('en-CA'),
    shift_eng:     '',
    temp_taken_by: '',
  });

  // Section-1 flat values
  const [s1, setS1] = useState({});
  const getS1 = (k) => s1[k] ?? '';
  const setS1Val = (k, v) => setS1(p => ({ ...p, [k]: v }));

  // Section-2 & 3 per-stand values (keyed by stand name)
  const [stands, setStands] = useState({});
  const getStand = (stand, field) => stands[stand]?.[field] ?? '';
  const setStand = (stand, field, val) =>
    setStands(prev => ({ ...prev, [stand]: { ...(prev[stand] || {}), [field]: val } }));

  // Open/close accordion per stand
  const [openStands, setOpenStands] = useState({});

  const [sec1Remark, setSec1Remark] = useState('');
  const [sec2Remark, setSec2Remark] = useState('');
  const [sec3Remark, setSec3Remark] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const n = (v) => (v !== '' && v != null ? v : null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!header.log_date) { toast.error('Date is required'); return; }

    const standsArr = STANDS.map(stand => {
      const sv = stands[stand] || {};
      return {
        stand_name:    stand,
        gb_de:         n(sv.gb_de),
        gb_inter:      n(sv.gb_inter),
        gb_output_top: n(sv.gb_output_top),
        gb_output_bot: n(sv.gb_output_bot),
        gb_gearbox:    n(sv.gb_gearbox),
        s_de_top:      n(sv.s_de_top),
        s_de_bot:      n(sv.s_de_bot),
        s_nde_top:     n(sv.s_nde_top),
        s_nde_bot:     n(sv.s_nde_bot),
      };
    });

    setSubmitting(true);
    try {
      await hbmAPI.createRoughingGbTempLog({
        log_date:      header.log_date,
        shift_eng:     n(header.shift_eng),
        temp_taken_by: n(header.temp_taken_by),
        // Section-1
        s1_flywheel_de:     n(getS1('flywheel_de')),
        s1_flywheel_nde:    n(getS1('flywheel_nde')),
        s1_reduction_de:    n(getS1('reduction_de')),
        s1_reduction_nde:   n(getS1('reduction_nde')),
        s1_reduction_output:n(getS1('reduction_output')),
        s1_pinion_de_top:   n(getS1('pinion_de_top')),
        s1_pinion_de_mid:   n(getS1('pinion_de_mid')),
        s1_pinion_de_bot:   n(getS1('pinion_de_bot')),
        s1_pinion_nde_top:  n(getS1('pinion_nde_top')),
        s1_pinion_nde_mid:  n(getS1('pinion_nde_mid')),
        s1_pinion_nde_bot:  n(getS1('pinion_nde_bot')),
        s1_stand_de_top:    n(getS1('stand_de_top')),
        s1_stand_de_mid:    n(getS1('stand_de_mid')),
        s1_stand_de_bot:    n(getS1('stand_de_bot')),
        s1_stand_nde_top:   n(getS1('stand_nde_top')),
        s1_stand_nde_mid:   n(getS1('stand_nde_mid')),
        s1_stand_nde_bot:   n(getS1('stand_nde_bot')),
        sec1_remark:        n(sec1Remark),
        sec2_remark:        n(sec2Remark),
        sec3_remark:        n(sec3Remark),
        stands:             standsArr,
      });
      toast.success('Roughing GB Temp sheet submitted!');
      navigate('/hbm/roughing-gb-temp/history');
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to submit');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="max-w-4xl mx-auto">

        {/* Page Header */}
        <div className="flex items-center space-x-3 mb-6">
          <button onClick={() => navigate('/hbm/dashboard')}
            className="p-2 hover:bg-gray-200 rounded-lg transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Roughing Stand &amp; Gearbox Bearing Temperature</h1>
            <p className="text-sm text-gray-500">Temperature Analysis Report</p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>

          {/* Sheet Header */}
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
                <label className="block text-sm font-semibold text-gray-700 mb-1">Shift Engineer</label>
                <input type="text" value={header.shift_eng}
                  onChange={e => setHeader(p => ({ ...p, shift_eng: e.target.value }))}
                  placeholder="Name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Temperature Taken By</label>
                <input type="text" value={header.temp_taken_by}
                  onChange={e => setHeader(p => ({ ...p, temp_taken_by: e.target.value }))}
                  placeholder="Name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
              </div>
            </div>
          </div>

          {/* ── SECTION 1 ─────────────────────────────────────────────────── */}
          <SectionDivider title="Section 1 — Roughing Stand Temperatures" />

          <div className="bg-white rounded-xl border border-gray-200 p-5 mb-5 space-y-6">

            {/* Flywheel */}
            <div>
              <p className="text-sm font-bold text-gray-700 mb-3 uppercase tracking-wide">Flywheel</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <NumInput label="DE" value={getS1('flywheel_de')}  onChange={v => setS1Val('flywheel_de', v)} />
                <NumInput label="NDE" value={getS1('flywheel_nde')} onChange={v => setS1Val('flywheel_nde', v)} />
              </div>
            </div>

            {/* Reduction GB */}
            <div>
              <p className="text-sm font-bold text-gray-700 mb-3 uppercase tracking-wide">Reduction GB</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <NumInput label="DE"     value={getS1('reduction_de')}     onChange={v => setS1Val('reduction_de', v)} />
                <NumInput label="NDE"    value={getS1('reduction_nde')}    onChange={v => setS1Val('reduction_nde', v)} />
                <NumInput label="Output" value={getS1('reduction_output')} onChange={v => setS1Val('reduction_output', v)} />
              </div>
            </div>

            {/* Pinion GB */}
            <div>
              <p className="text-sm font-bold text-gray-700 mb-3 uppercase tracking-wide">Pinion GB</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <p className="text-xs font-semibold text-gray-500 mb-2">DE</p>
                  <div className="grid grid-cols-3 gap-3">
                    <NumInput label="Top"    value={getS1('pinion_de_top')} onChange={v => setS1Val('pinion_de_top', v)} />
                    <NumInput label="Middle" value={getS1('pinion_de_mid')} onChange={v => setS1Val('pinion_de_mid', v)} />
                    <NumInput label="Bottom" value={getS1('pinion_de_bot')} onChange={v => setS1Val('pinion_de_bot', v)} />
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-500 mb-2">NDE</p>
                  <div className="grid grid-cols-3 gap-3">
                    <NumInput label="Top"    value={getS1('pinion_nde_top')} onChange={v => setS1Val('pinion_nde_top', v)} />
                    <NumInput label="Middle" value={getS1('pinion_nde_mid')} onChange={v => setS1Val('pinion_nde_mid', v)} />
                    <NumInput label="Bottom" value={getS1('pinion_nde_bot')} onChange={v => setS1Val('pinion_nde_bot', v)} />
                  </div>
                </div>
              </div>
            </div>

            {/* Stand (Section-1) */}
            <div>
              <p className="text-sm font-bold text-gray-700 mb-3 uppercase tracking-wide">Stand</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <p className="text-xs font-semibold text-gray-500 mb-2">DE</p>
                  <div className="grid grid-cols-3 gap-3">
                    <NumInput label="Top"    value={getS1('stand_de_top')} onChange={v => setS1Val('stand_de_top', v)} />
                    <NumInput label="Middle" value={getS1('stand_de_mid')} onChange={v => setS1Val('stand_de_mid', v)} />
                    <NumInput label="Bottom" value={getS1('stand_de_bot')} onChange={v => setS1Val('stand_de_bot', v)} />
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-500 mb-2">NDE</p>
                  <div className="grid grid-cols-3 gap-3">
                    <NumInput label="Top"    value={getS1('stand_nde_top')} onChange={v => setS1Val('stand_nde_top', v)} />
                    <NumInput label="Middle" value={getS1('stand_nde_mid')} onChange={v => setS1Val('stand_nde_mid', v)} />
                    <NumInput label="Bottom" value={getS1('stand_nde_bot')} onChange={v => setS1Val('stand_nde_bot', v)} />
                  </div>
                </div>
              </div>
            </div>

            {/* Section-1 Remark */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Remark</label>
              <textarea rows={2} value={sec1Remark} onChange={e => setSec1Remark(e.target.value)}
                placeholder="Section 1 remarks..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none" />
            </div>
          </div>

          {/* ── SECTION 2 ─────────────────────────────────────────────────── */}
          <SectionDivider title="Section 2 — Gearbox Bearing Temperature (C-1 to C-14)" />

          <div className="space-y-3 mb-5">
            {STANDS.map(stand => {
              const isOpen = openStands[`s2_${stand}`];
              const sv = stands[stand] || {};
              const hasSec2 = [sv.gb_de, sv.gb_inter, sv.gb_output_top, sv.gb_output_bot, sv.gb_gearbox].some(x => x !== '' && x != null);
              return (
                <div key={`s2_${stand}`} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <button type="button" onClick={() => setOpenStands(p => ({ ...p, [`s2_${stand}`]: !p[`s2_${stand}`] }))}
                    className={`w-full flex items-center justify-between px-5 py-4 transition-colors ${
                      isOpen ? 'bg-blue-600 text-white' : 'bg-gray-50 hover:bg-gray-100 text-gray-900'
                    }`}>
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-base">{stand}</span>
                      {hasSec2 && (
                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                          isOpen ? 'bg-blue-700 text-white' : 'bg-green-100 text-green-700'
                        }`}>Filled</span>
                      )}
                    </div>
                    <svg className={`w-5 h-5 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                      fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {isOpen && (
                    <div className="p-5">
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                        <NumInput label="DE"           value={getStand(stand,'gb_de')}         onChange={v => setStand(stand,'gb_de',v)} />
                        <NumInput label="INTER"        value={getStand(stand,'gb_inter')}      onChange={v => setStand(stand,'gb_inter',v)} />
                        <NumInput label="OUTPUT — Top"    value={getStand(stand,'gb_output_top')} onChange={v => setStand(stand,'gb_output_top',v)} />
                        <NumInput label="OUTPUT — Bottom" value={getStand(stand,'gb_output_bot')} onChange={v => setStand(stand,'gb_output_bot',v)} />
                        <NumInput label="GEARBOX"      value={getStand(stand,'gb_gearbox')}    onChange={v => setStand(stand,'gb_gearbox',v)} />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Section-2 Remark */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 mb-5">
            <label className="block text-sm font-semibold text-gray-700 mb-1">Section 2 Remark</label>
            <textarea rows={2} value={sec2Remark} onChange={e => setSec2Remark(e.target.value)}
              placeholder="Gearbox bearing temperature remarks..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none" />
          </div>

          {/* ── SECTION 3 ─────────────────────────────────────────────────── */}
          <SectionDivider title="Section 3 — Stand Bearing Temperature (C-1 to C-14)" />

          <div className="space-y-3 mb-5">
            {STANDS.map(stand => {
              const isOpen = openStands[`s3_${stand}`];
              const sv = stands[stand] || {};
              const hasSec3 = [sv.s_de_top, sv.s_de_bot, sv.s_nde_top, sv.s_nde_bot].some(x => x !== '' && x != null);
              return (
                <div key={`s3_${stand}`} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <button type="button" onClick={() => setOpenStands(p => ({ ...p, [`s3_${stand}`]: !p[`s3_${stand}`] }))}
                    className={`w-full flex items-center justify-between px-5 py-4 transition-colors ${
                      isOpen ? 'bg-emerald-600 text-white' : 'bg-gray-50 hover:bg-gray-100 text-gray-900'
                    }`}>
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-base">{stand}</span>
                      {hasSec3 && (
                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                          isOpen ? 'bg-emerald-700 text-white' : 'bg-green-100 text-green-700'
                        }`}>Filled</span>
                      )}
                    </div>
                    <svg className={`w-5 h-5 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                      fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {isOpen && (
                    <div className="p-5">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div>
                          <p className="text-xs font-semibold text-gray-500 mb-2">STAND DE</p>
                          <div className="grid grid-cols-2 gap-3">
                            <NumInput label="Top"    value={getStand(stand,'s_de_top')} onChange={v => setStand(stand,'s_de_top',v)} />
                            <NumInput label="Bottom" value={getStand(stand,'s_de_bot')} onChange={v => setStand(stand,'s_de_bot',v)} />
                          </div>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-gray-500 mb-2">STAND NDE</p>
                          <div className="grid grid-cols-2 gap-3">
                            <NumInput label="Top"    value={getStand(stand,'s_nde_top')} onChange={v => setStand(stand,'s_nde_top',v)} />
                            <NumInput label="Bottom" value={getStand(stand,'s_nde_bot')} onChange={v => setStand(stand,'s_nde_bot',v)} />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Section-3 Remark */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 mb-5">
            <label className="block text-sm font-semibold text-gray-700 mb-1">Section 3 Remark</label>
            <textarea rows={2} value={sec3Remark} onChange={e => setSec3Remark(e.target.value)}
              placeholder="Stand bearing temperature remarks..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none" />
          </div>

          {/* Submit */}
          <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4 shadow-lg rounded-t-xl">
            <button type="submit" disabled={submitting}
              className="w-full py-3 bg-blue-600 text-white rounded-lg font-bold text-base hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
              {submitting ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  Submitting...
                </span>
              ) : 'Submit Roughing GB Temp Report'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};

export default RoughingGbTempForm;
