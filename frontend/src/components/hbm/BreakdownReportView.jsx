import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { hbmAPI } from '../../services/api';
import ResendTelegramButton from './ResendTelegramButton';

const sumByType = (slots, type) =>
  (slots || []).flatMap(s => s.entries || [])
    .filter(e => e.breakdown_type === type)
    .reduce((acc, e) => acc + (parseInt(e.breakdown_minutes) || 0), 0);

const calcSummary = (slots) => {
  const mill   = sumByType(slots, 'Mill Breakdown');
  const mech   = sumByType(slots, 'Mechanical Breakdown');
  const elec   = sumByType(slots, 'Electrical Breakdown');
  const rhf    = sumByType(slots, 'RHF Breakdown');
  const tmt    = mill + mech + elec + rhf;
  const maint  = sumByType(slots, 'Mill Maintenance');
  const kv132  = sumByType(slots, '132 KV Breakdown');
  const rhfLow = sumByType(slots, 'RHF Low Temperature');
  const cold   = sumByType(slots, 'Cold, CCM Chilli & Piping Breakdown');
  const ccm    = sumByType(slots, 'CCM Heat Over');
  const other  = sumByType(slots, 'Other');
  const cont   = sumByType(slots, 'Contractor Mistake');
  const total  = tmt + maint + kv132 + rhfLow + cold + ccm + other + cont;
  return { mill, mech, elec, rhf, tmt, maint, kv132, rhfLow, cold, ccm, other, cont, total };
};

const BreakdownReportView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [log, setLog]             = useState(null);
  const [loading, setLoading]     = useState(true);
  const [openSlots, setOpenSlots] = useState({});
  const [deleting, setDeleting]   = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const storedUser = (() => {
    try { return JSON.parse(localStorage.getItem('user') || 'null'); } catch { return null; }
  })();
  const isAdmin = storedUser?.role === 'ADMIN' || storedUser?.user_type === 'ADMIN' || storedUser?.loginType === 'ADMIN';

  useEffect(() => { fetchLog(); }, []); // eslint-disable-line

  const fetchLog = async () => {
    try {
      const res = await hbmAPI.getBreakdownLogById(id);
      setLog(res.data);
    } catch {
      toast.error('Failed to load breakdown report');
      navigate('/hbm/breakdown/history');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await hbmAPI.deleteLog('breakdown', id);
      toast.success('Breakdown report deleted');
      navigate('/hbm/breakdown/history');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to delete report');
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  const toggleSlot = (i) => setOpenSlots(prev => ({ ...prev, [i]: !prev[i] }));

  const formatDate = (d) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-IN', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    );
  }
  if (!log) return null;

  const canEdit = log.created_at && (Date.now() - new Date(log.created_at).getTime()) < 24 * 60 * 60 * 1000;
  const slots = log.slots || [];
  const summary = calcSummary(slots);
  const slotsWithData = slots.filter(s =>
    s.miss_roll || s.miss_roll_18 || (s.entries || []).some(e => e.breakdown_type)
  );

  const SummaryRow = ({ label, value, highlight }) => (
    <div className={`flex justify-between items-center py-2 px-3 rounded-lg ${highlight ? 'bg-blue-50 font-bold' : 'bg-gray-50'}`}>
      <span className="text-sm text-gray-700">{label}</span>
      <span className={`text-sm font-semibold ${highlight ? 'text-blue-700' : 'text-gray-900'}`}>{value} min</span>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <button onClick={() => navigate('/hbm/breakdown/history')}
              className="p-2 hover:bg-gray-200 rounded-lg transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <h1 className="text-xl font-bold text-gray-900">HBM Breakdown Report #{log.id}</h1>
              <p className="text-sm text-gray-500">{formatDate(log.log_date)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ResendTelegramButton type="breakdown" id={log.id} />
          {canEdit && (
            <button
              onClick={() => navigate('/hbm/breakdown/new', { state: { editData: log, editId: log.id } })}
              className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold rounded-lg transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Edit
            </button>
          )}
          
            {isAdmin && !confirmDelete && (
              <button onClick={() => setConfirmDelete(true)}
                className="px-3 py-1.5 bg-red-50 border border-red-300 text-red-700 rounded-lg text-xs font-semibold hover:bg-red-100 transition-colors">
                Delete
              </button>
            )}
            {isAdmin && confirmDelete && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-red-600 font-medium">Confirm delete?</span>
                <button onClick={handleDelete} disabled={deleting}
                  className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-semibold hover:bg-red-700 disabled:opacity-60">
                  {deleting ? 'Deleting…' : 'Yes, Delete'}
                </button>
                <button onClick={() => setConfirmDelete(false)}
                  className="px-3 py-1.5 border border-gray-300 text-gray-600 rounded-lg text-xs font-semibold hover:bg-gray-50">
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Info Card */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 mb-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase mb-1">Date</p>
              <p className="font-bold text-gray-900">
                {new Date(log.log_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase mb-1">Size</p>
              <span className="bg-red-100 text-red-700 text-xs font-semibold px-2 py-1 rounded-full">{log.size}</span>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase mb-1">Submitted By</p>
              <p className="font-semibold text-gray-900">{log.filled_by_name || '—'}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase mb-1">Submitted At</p>
              <p className="text-gray-700 text-xs">
                {new Date(log.created_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
        </div>

        {/* Hourly Slots */}
        <div className="mb-6 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide">Hourly Breakdown Entries</h2>
            <span className="text-xs text-gray-500">{slotsWithData.length} of {slots.length} slots have data</span>
          </div>

          {slots.map((slot, si) => {
            const isOpen = !!openSlots[si];
            const hasData = slot.miss_roll || slot.miss_roll_18 ||
              (slot.entries || []).some(e => e.breakdown_type);
            const slotTotal = (slot.entries || []).reduce((acc, e) => acc + (parseInt(e.breakdown_minutes) || 0), 0);

            return (
              <div key={si} className={`bg-white rounded-xl border shadow-sm overflow-hidden ${hasData ? 'border-orange-200' : 'border-gray-200'}`}>
                <button onClick={() => toggleSlot(si)}
                  className="w-full flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors text-left">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-gray-800">{slot.slot_label}</span>
                    {hasData ? (
                      <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-semibold">
                        {slotTotal > 0 ? `${slotTotal} min BD` : 'Data'}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">No data</span>
                    )}
                  </div>
                  <span className="text-gray-400 text-sm">{isOpen ? '▲' : '▼'}</span>
                </button>

                {isOpen && (
                  <div className="border-t border-gray-100 p-5 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-xs font-semibold text-gray-500 mb-1">Miss Roll</p>
                        <p className="text-lg font-bold text-gray-900">{slot.miss_roll ?? '—'}</p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-xs font-semibold text-gray-500 mb-1">18" Miss Roll</p>
                        <p className="text-lg font-bold text-gray-900">{slot.miss_roll_18 ?? '—'}</p>
                      </div>
                    </div>

                    {(slot.entries || []).filter(e => e.breakdown_type).length > 0 ? (
                      <div>
                        <p className="text-xs font-semibold text-gray-500 mb-2">Breakdown Entries</p>
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
                            <thead>
                              <tr className="bg-gray-100">
                                <th className="text-left px-3 py-2 text-xs font-semibold text-gray-600">Breakdown Type</th>
                                <th className="text-left px-3 py-2 text-xs font-semibold text-gray-600">Minutes</th>
                                <th className="text-left px-3 py-2 text-xs font-semibold text-gray-600">Reason</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                              {slot.entries.filter(e => e.breakdown_type).map((entry, ei) => (
                                <tr key={ei} className="hover:bg-gray-50">
                                  <td className="px-3 py-2">
                                    <span className="text-xs bg-red-50 text-red-700 px-2 py-0.5 rounded font-medium">
                                      {entry.breakdown_type}
                                    </span>
                                  </td>
                                  <td className="px-3 py-2 font-semibold text-gray-900">{entry.breakdown_minutes ?? '—'}</td>
                                  <td className="px-3 py-2 text-gray-600">{entry.breakdown_reason || '—'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ) : (
                      !slot.miss_roll && !slot.miss_roll_18 && (
                        <p className="text-sm text-gray-400 text-center py-2">No breakdown data for this slot</p>
                      )
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Summary */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 mb-6">
          <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-4">Summary</h2>
          <div className="space-y-2">
            <SummaryRow label="Mill Breakdown Time"                          value={summary.mill} />
            <SummaryRow label="Mechanical Breakdown Time"                    value={summary.mech} />
            <SummaryRow label="Electrical Breakdown Time"                    value={summary.elec} />
            <SummaryRow label="RHF Breakdown Time"                           value={summary.rhf} />
            <SummaryRow label="TMT (HBM) Total Breakdown Time"               value={summary.tmt}  highlight />
            <div className="h-px bg-gray-200 my-1" />
            <SummaryRow label="Mill Maintenance Time"                        value={summary.maint} />
            <SummaryRow label="132 KV Breakdown Time"                        value={summary.kv132} />
            <SummaryRow label="RHF Low Temperature Time"                     value={summary.rhfLow} />
            <SummaryRow label="Cold, CCM Chilli & Piping Breakdown Time"     value={summary.cold} />
            <SummaryRow label="CCM Heat Over Time"                           value={summary.ccm} />
            <SummaryRow label="Other Time"                                   value={summary.other} />
            <SummaryRow label="Contractor Mistake"                           value={summary.cont} />
            <SummaryRow label="Total Breakdown Time"                         value={summary.total} highlight />
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex justify-between items-center">
          <button onClick={() => navigate('/hbm/breakdown/history')}
            className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1">
            ← Back to History
          </button>
          <Link to="/hbm/breakdown/new"
            className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700">
            + New Report
          </Link>
        </div>

      </div>
    </div>
  );
};

export default BreakdownReportView;
