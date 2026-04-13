import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { hbmAPI } from '../../services/api';

const STANDS = ['C-1','C-2','C-3','C-4','C-5','C-6','C-7','C-8','C-9','C-10','C-11','C-12','C-13','C-14'];

const Val = ({ v }) =>
  v != null ? <span className="font-semibold text-gray-900">{v}</span> : <span className="text-gray-400">—</span>;

const LabelRow = ({ label, value }) => (
  <div className="flex justify-between py-1.5 border-b border-gray-100 last:border-0">
    <span className="text-xs text-gray-500 font-medium">{label}</span>
    <Val v={value} />
  </div>
);

const SectionDivider = ({ title }) => (
  <div className="flex items-center gap-3 my-6">
    <div className="h-px flex-1 bg-gray-200" />
    <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">{title}</span>
    <div className="h-px flex-1 bg-gray-200" />
  </div>
);

const RoughingGbTempView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [log, setLog] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchLog(); }, []); // eslint-disable-line

  const fetchLog = async () => {
    try {
      const res = await hbmAPI.getRoughingGbTempLogById(id);
      setLog(res.data);
    } catch {
      toast.error('Failed to load Roughing GB Temp log');
      navigate('/hbm/roughing-gb-temp/history');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }
  if (!log) return null;

  // Build stand map from stands array
  const standMap = {};
  (log.stands || []).forEach(s => { standMap[s.stand_name] = s; });

  const formatDate = (d) => d
    ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    : '—';

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="max-w-5xl mx-auto">

        {/* Page Header */}
        <div className="flex items-center space-x-3 mb-6">
          <button onClick={() => navigate('/hbm/roughing-gb-temp/history')}
            className="p-2 hover:bg-gray-200 rounded-lg transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Roughing GB Temp Report #{log.id}</h1>
            <p className="text-sm text-gray-500">Roughing Stand &amp; Gearbox Bearing Temperature</p>
          </div>
        </div>

        {/* Summary Card */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-5 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <p className="text-xs text-gray-400 uppercase font-semibold">Date</p>
            <p className="font-bold text-gray-900 mt-1">{formatDate(log.log_date)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 uppercase font-semibold">Shift Engineer</p>
            <p className="font-bold text-gray-900 mt-1">{log.shift_eng || '—'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 uppercase font-semibold">Temperature Taken By</p>
            <p className="font-bold text-gray-900 mt-1">{log.temp_taken_by || '—'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 uppercase font-semibold">Filled By</p>
            <p className="font-bold text-gray-900 mt-1">{log.filled_by_name}</p>
          </div>
        </div>

        {/* ── SECTION 1 ──────────────────────────────────────────────────── */}
        <SectionDivider title="Section 1 — Roughing Stand Temperatures" />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">

          {/* Flywheel */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-3">Flywheel</p>
            <LabelRow label="DE"  value={log.s1_flywheel_de} />
            <LabelRow label="NDE" value={log.s1_flywheel_nde} />
          </div>

          {/* Reduction GB */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-3">Reduction GB</p>
            <LabelRow label="DE"     value={log.s1_reduction_de} />
            <LabelRow label="NDE"    value={log.s1_reduction_nde} />
            <LabelRow label="Output" value={log.s1_reduction_output} />
          </div>

          {/* Pinion GB */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-3">Pinion GB</p>
            <p className="text-xs font-semibold text-blue-600 mb-1">DE</p>
            <LabelRow label="Top"    value={log.s1_pinion_de_top} />
            <LabelRow label="Middle" value={log.s1_pinion_de_mid} />
            <LabelRow label="Bottom" value={log.s1_pinion_de_bot} />
            <p className="text-xs font-semibold text-blue-600 mt-3 mb-1">NDE</p>
            <LabelRow label="Top"    value={log.s1_pinion_nde_top} />
            <LabelRow label="Middle" value={log.s1_pinion_nde_mid} />
            <LabelRow label="Bottom" value={log.s1_pinion_nde_bot} />
          </div>

          {/* Stand (Section-1) */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-3">Stand</p>
            <p className="text-xs font-semibold text-blue-600 mb-1">DE</p>
            <LabelRow label="Top"    value={log.s1_stand_de_top} />
            <LabelRow label="Middle" value={log.s1_stand_de_mid} />
            <LabelRow label="Bottom" value={log.s1_stand_de_bot} />
            <p className="text-xs font-semibold text-blue-600 mt-3 mb-1">NDE</p>
            <LabelRow label="Top"    value={log.s1_stand_nde_top} />
            <LabelRow label="Middle" value={log.s1_stand_nde_mid} />
            <LabelRow label="Bottom" value={log.s1_stand_nde_bot} />
          </div>
        </div>

        {log.sec1_remark && (
          <div className="bg-white rounded-xl border border-gray-200 p-4 mb-5">
            <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Section 1 Remark</p>
            <p className="text-sm text-gray-800">{log.sec1_remark}</p>
          </div>
        )}

        {/* ── SECTION 2 ──────────────────────────────────────────────────── */}
        <SectionDivider title="Section 2 — Gearbox Bearing Temperature" />

        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-5">
          <div className="overflow-x-auto">
            <table className="w-full text-xs min-w-[600px]">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 sticky left-0 bg-gray-50">Stand</th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-600">DE</th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-600">INTER</th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-600">OUTPUT TOP</th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-600">OUTPUT BOTTOM</th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-600">GEARBOX</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {STANDS.map(stand => {
                  const s = standMap[stand] || {};
                  return (
                    <tr key={stand} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-bold text-gray-900 sticky left-0 bg-white">{stand}</td>
                      <td className="px-4 py-3 text-center"><Val v={s.gb_de} /></td>
                      <td className="px-4 py-3 text-center"><Val v={s.gb_inter} /></td>
                      <td className="px-4 py-3 text-center"><Val v={s.gb_output_top} /></td>
                      <td className="px-4 py-3 text-center"><Val v={s.gb_output_bot} /></td>
                      <td className="px-4 py-3 text-center"><Val v={s.gb_gearbox} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {log.sec2_remark && (
          <div className="bg-white rounded-xl border border-gray-200 p-4 mb-5">
            <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Section 2 Remark</p>
            <p className="text-sm text-gray-800">{log.sec2_remark}</p>
          </div>
        )}

        {/* ── SECTION 3 ──────────────────────────────────────────────────── */}
        <SectionDivider title="Section 3 — Stand Bearing Temperature" />

        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-5">
          <div className="overflow-x-auto">
            <table className="w-full text-xs min-w-[500px]">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 sticky left-0 bg-gray-50">Stand</th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-600">DE — Top</th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-600">DE — Bottom</th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-600">NDE — Top</th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-600">NDE — Bottom</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {STANDS.map(stand => {
                  const s = standMap[stand] || {};
                  return (
                    <tr key={stand} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-bold text-gray-900 sticky left-0 bg-white">{stand}</td>
                      <td className="px-4 py-3 text-center"><Val v={s.s_de_top} /></td>
                      <td className="px-4 py-3 text-center"><Val v={s.s_de_bot} /></td>
                      <td className="px-4 py-3 text-center"><Val v={s.s_nde_top} /></td>
                      <td className="px-4 py-3 text-center"><Val v={s.s_nde_bot} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {log.sec3_remark && (
          <div className="bg-white rounded-xl border border-gray-200 p-4 mb-5">
            <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Section 3 Remark</p>
            <p className="text-sm text-gray-800">{log.sec3_remark}</p>
          </div>
        )}

      </div>
    </div>
  );
};

export default RoughingGbTempView;
