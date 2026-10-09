import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { smsAPI } from '../../services/api';

const formatDate = (d) => {
  if (!d) return '—';
  return new Date(String(d).slice(0, 10) + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const isAdminUser = (() => {
  try { const u = JSON.parse(localStorage.getItem('user')); return u?.role === 'ADMIN' || u?.user_type === 'ADMIN'; } catch { return false; }
})();

export default function ElectricalHistory() {
  const navigate = useNavigate();
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [deletingAll, setDeletingAll] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const fetchLogs = async (from = dateFrom, to = dateTo) => {
    setLoading(true);
    try {
      const params = {};
      if (from) params.date_from = from;
      if (to) params.date_to = to;
      const res = await smsAPI.getElectricalLogs(params);
      setLogs(res?.data || []);
      setTotal(res?.total ?? (res?.data || []).length);
    } catch { toast.error('Failed to load'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchLogs('', ''); }, []); // eslint-disable-line

  const handleDeleteAll = async () => {
    if (!window.confirm('Delete ALL Electrical checklist history? This cannot be undone.')) return;
    if (!window.confirm('Final confirmation: delete all electrical checklists?')) return;
    setDeletingAll(true);
    try {
      const res = await smsAPI.clearAllElectrical();
      toast.success(res?.message || 'All deleted');
      setLogs([]); setTotal(0);
    } catch { toast.error('Failed to delete all'); }
    finally { setDeletingAll(false); }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="max-w-4xl mx-auto p-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <div>
            <button type="button" onClick={() => navigate('/sms/dashboard')} className="text-sm text-gray-500 hover:text-gray-700 mb-1">← Back to Dashboard</button>
            <h1 className="text-2xl font-bold text-gray-900">Electrical Check Sheet History</h1>
          </div>
          <div className="flex flex-wrap gap-2">
            {isAdminUser && (
              <button type="button" onClick={handleDeleteAll} disabled={deletingAll} className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700 disabled:opacity-50">
                {deletingAll ? 'Deleting…' : 'Delete All'}
              </button>
            )}
            <Link to="/sms/electrical/new" className="px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-semibold hover:bg-amber-700">+ New</Link>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-3 mb-4">
          <div className="grid grid-cols-2 gap-2 mb-2">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">From Date</label>
              <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">To Date</label>
              <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => fetchLogs(dateFrom, dateTo)} className="w-full py-2 bg-amber-600 text-white rounded-lg text-sm font-semibold hover:bg-amber-700">Search</button>
            <button type="button" onClick={() => { setDateFrom(''); setDateTo(''); fetchLogs('', ''); }} className="w-full py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50">Clear</button>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-10 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600" /></div>
          ) : logs.length === 0 ? (
            <div className="p-10 text-center text-gray-400 text-sm">No checklists found.</div>
          ) : (
            <>
              <div className="px-5 py-2.5 border-b border-gray-100 text-xs text-gray-500">
                Showing {logs.length}{total > logs.length ? ` of ${total}` : ''} checklist{total === 1 ? '' : 's'}
              </div>
              <div className="divide-y divide-gray-100">
                {logs.map((log) => (
                  <Link key={log.id} to={`/sms/electrical/${log.id}`} className="flex items-center justify-between px-5 py-3.5 hover:bg-amber-50/50 transition-colors">
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">{formatDate(log.report_date)} · Shift {log.shift}{log.area ? ` · ${log.area}` : ''}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{log.recorded_by || '—'} · {log.filled_by_name || '—'}</p>
                    </div>
                    <p className={`text-xs font-bold shrink-0 ${log.alert_count ? 'text-red-600' : 'text-emerald-600'}`}>
                      {log.alert_count ? `${log.alert_count} alert(s)` : 'All OK'}
                    </p>
                  </Link>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
