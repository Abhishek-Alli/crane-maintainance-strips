import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { hbmAPI } from '../../services/api';
import ResendTelegramButton from './ResendTelegramButton';

const PhMaintView = () => {
  const { id } = useParams();
  const [log, setLog]       = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    hbmAPI.getPhMaintLogById(id)
      .then(res => setLog(res))
      .catch(() => toast.error('Failed to load Maintenance log'))
      .finally(() => setLoading(false));
  }, [id]);

  const formatDate = (d) =>
    d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' }) : '—';

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!log) {
    return <div className="p-8 text-center text-gray-400">Log not found.</div>;
  }

  const items = log.items || [];

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="max-w-2xl mx-auto">

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Link to="/hbm/ph-maint/history"
            className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-gray-900">Pump House Maintenance Work Sheet</h1>
            <p className="text-sm text-gray-500">{formatDate(log.log_date)}</p>
          </div>
          <ResendTelegramButton type="ph-maint" id={log.id} />
        </div>

        {/* Log Info */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-5 grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide">Date</p>
            <p className="font-semibold text-gray-900 mt-0.5">{formatDate(log.log_date)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide">Filled By</p>
            <p className="font-semibold text-gray-900 mt-0.5">{log.filled_by_name}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide">Submitted</p>
            <p className="font-semibold text-gray-900 mt-0.5">
              {new Date(log.created_at).toLocaleString('en-IN')}
            </p>
          </div>
        </div>

        {/* Work Items */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
            <h2 className="font-bold text-gray-800 text-sm">Maintenance Work</h2>
            <span className="text-xs text-gray-400">{items.length} item{items.length !== 1 ? 's' : ''}</span>
          </div>
          {items.length === 0 ? (
            <div className="p-8 text-center text-gray-400 text-sm">No items recorded</div>
          ) : (
            <div className="divide-y divide-gray-100">
              {items.map((item) => (
                <div key={item.id} className="flex items-start gap-4 px-5 py-4">
                  <span className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-blue-100 text-blue-700 text-xs font-bold mt-0.5">
                    {item.item_no}
                  </span>
                  <p className="text-sm text-gray-800 leading-relaxed pt-0.5">{item.item_text}</p>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default PhMaintView;
