import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { smsAPI, resolveUploadUrl } from '../../services/api';
import { ELECTRICAL_SECTIONS, isAlert } from './electricalConfig';

const formatDate = (d) => {
  if (!d) return '—';
  return new Date(String(d).slice(0, 10) + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const isWithinEditWindow = (createdAt) => createdAt && (Date.now() - new Date(createdAt).getTime()) < 24 * 60 * 60 * 1000;

export default function ElectricalView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    smsAPI.getElectricalById(id)
      .then((res) => setData(res?.data))
      .catch(() => toast.error('Failed to load'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleDelete = async () => {
    if (!window.confirm('Delete this checklist?')) return;
    setDeleting(true);
    try {
      await smsAPI.deleteElectrical(id);
      toast.success('Deleted');
      navigate('/sms/electrical/history');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to delete');
    } finally {
      setDeleting(false);
    }
  };

  const handlePDF = async () => {
    setDownloading(true);
    try {
      const res = await smsAPI.downloadElectricalPDF(id);
      const url = URL.createObjectURL(new Blob([res]));
      const a = document.createElement('a'); a.href = url; a.download = `sms_electrical_${id}.pdf`; a.click();
      URL.revokeObjectURL(url);
    } catch { toast.error('Failed to download PDF'); }
    finally { setDownloading(false); }
  };

  if (loading) return <div className="p-10 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600" /></div>;
  if (!data) return <div className="p-10 text-center text-gray-400">Not found</div>;

  const items = data.checklist_items || {};
  const canModify = isWithinEditWindow(data.created_at);

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="max-w-2xl mx-auto p-4">
        <button type="button" onClick={() => navigate('/sms/electrical/history')} className="text-sm text-gray-500 hover:text-gray-700 mb-2">← Back to History</button>
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Electrical Check Sheet</h1>
            <p className="text-sm text-gray-500">{formatDate(data.report_date)} · Shift {data.shift} {data.area ? `· ${data.area}` : ''}</p>
          </div>
          <div className="flex gap-2 flex-wrap justify-end">
            <button onClick={handlePDF} disabled={downloading} className="px-3 py-1.5 text-xs font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
              {downloading ? 'Downloading…' : 'PDF'}
            </button>
            {canModify && (
              <>
                <Link to={`/sms/electrical/${id}/edit`} className="px-3 py-1.5 text-xs font-semibold bg-amber-600 text-white rounded-lg hover:bg-amber-700">Edit</Link>
                <button onClick={handleDelete} disabled={deleting} className="px-3 py-1.5 text-xs font-semibold bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50">
                  {deleting ? 'Deleting…' : 'Delete'}
                </button>
              </>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4 grid grid-cols-2 gap-3 text-sm">
          <div><span className="text-gray-500 text-xs">Recorded By</span><p className="font-medium">{data.recorded_by || '—'}</p></div>
          <div><span className="text-gray-500 text-xs">Filled By</span><p className="font-medium">{data.filled_by_name || '—'}</p></div>
          <div><span className="text-gray-500 text-xs">Alerts</span><p className={`font-bold ${data.alert_count ? 'text-red-600' : 'text-emerald-600'}`}>{data.alert_count ? `${data.alert_count} alert(s)` : 'All OK'}</p></div>
        </div>

        {ELECTRICAL_SECTIONS.map((sec) => (
          <div key={sec.key} className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
            <h2 className="font-semibold text-gray-800 border-b pb-2 mb-3">{sec.label}</h2>
            <div className="space-y-2">
              {sec.points.map((p) => {
                const val = items[p.key]?.value;
                const remark = items[p.key]?.remark;
                const alert = isAlert(p, val);
                const sectionImages = (data.images || []).filter((img) => img.item_key === p.key);
                return (
                  <div key={p.key} className={`rounded-lg p-3 ${alert ? 'bg-red-50 border border-red-200' : 'bg-gray-50'}`}>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-gray-600">{p.label}</span>
                      <span className={`text-xs font-bold ${alert ? 'text-red-600' : 'text-gray-800'}`}>{val || '—'}{remark ? ` — ${remark}` : ''}</span>
                    </div>
                    {sectionImages.map((img) => (
                      <img key={img.id} src={resolveUploadUrl(img.url)} alt={img.original_name} className="mt-2 rounded-lg max-h-40 object-cover" />
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {data.general_remark && (
          <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
            <h2 className="font-semibold text-gray-800 mb-1">General Remark</h2>
            <p className="text-sm text-gray-700">{data.general_remark}</p>
          </div>
        )}
      </div>
    </div>
  );
}
