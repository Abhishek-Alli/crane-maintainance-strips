import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { modulesAPI } from '../../services/api';

const COLOR_OPTIONS = [
  { value: 'blue',    label: 'Blue',    cls: 'bg-blue-500' },
  { value: 'emerald', label: 'Green',   cls: 'bg-emerald-500' },
  { value: 'indigo',  label: 'Indigo',  cls: 'bg-indigo-500' },
  { value: 'purple',  label: 'Purple',  cls: 'bg-purple-500' },
  { value: 'orange',  label: 'Orange',  cls: 'bg-orange-500' },
  { value: 'red',     label: 'Red',     cls: 'bg-red-500' },
  { value: 'slate',   label: 'Slate',   cls: 'bg-slate-500' },
];

const colorCls = (color) => {
  const c = COLOR_OPTIONS.find(o => o.value === color);
  return c ? c.cls : 'bg-blue-500';
};

const emptyForm = { name: '', code: '', color: 'blue', route_prefix: '' };

export default function AdminModules() {
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState(null);

  const load = () => {
    setLoading(true);
    modulesAPI.getAll()
      .then(res => { setModules(res.modules || []); setLoading(false); })
      .catch(() => { toast.error('Failed to load modules'); setLoading(false); });
  };

  useEffect(() => { load(); }, []);

  const openNew = () => { setForm(emptyForm); setEditId(null); setShowForm(true); };
  const openEdit = (m) => {
    setForm({ name: m.name, code: m.code, color: m.color, route_prefix: m.route_prefix });
    setEditId(m.id);
    setShowForm(true);
  };

  // Auto-generate code from name
  const handleNameChange = (val) => {
    setForm(prev => ({
      ...prev,
      name: val,
      code: editId ? prev.code : val.toUpperCase().replace(/\s+/g, '_').replace(/[^A-Z0-9_]/g, ''),
      route_prefix: editId ? prev.route_prefix : '/' + val.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.code.trim() || !form.route_prefix.trim()) {
      return toast.error('Name, code and route are required');
    }
    setSaving(true);
    try {
      if (editId) {
        const m = modules.find(x => x.id === editId);
        await modulesAPI.update(editId, { ...form, is_active: m.is_active, display_order: m.display_order });
        toast.success('Module updated');
      } else {
        await modulesAPI.create(form);
        toast.success('Module created');
      }
      setShowForm(false);
      setForm(emptyForm);
      setEditId(null);
      load();
    } catch (err) {
      toast.error(err?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (m) => {
    try {
      await modulesAPI.update(m.id, { name: m.name, color: m.color, route_prefix: m.route_prefix, is_active: !m.is_active, display_order: m.display_order });
      load();
    } catch { toast.error('Failed to update'); }
  };

  const moveOrder = async (m, direction) => {
    try {
      await modulesAPI.update(m.id, { name: m.name, color: m.color, route_prefix: m.route_prefix, is_active: m.is_active, display_order: m.display_order + direction });
      load();
    } catch { toast.error('Failed to reorder'); }
  };

  const handleDelete = async (m) => {
    if (!window.confirm(`Delete module "${m.name}"? This cannot be undone.`)) return;
    try {
      await modulesAPI.delete(m.id);
      toast.success('Module deleted');
      load();
    } catch { toast.error('Failed to delete'); }
  };

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Create Module</h2>
          <p className="text-gray-500 text-sm mt-1">
            Add a plant module (HBM, HSM, PTM, SMS…). It appears on login and in Admin → Modules so you can fill checksheets.
          </p>
        </div>
        <button onClick={openNew} className="bg-violet-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-violet-700 shadow-sm">
          + Create Module
        </button>
      </div>

      {/* Create / Edit Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-blue-200 shadow-sm p-5 mb-6">
          <h3 className="font-bold text-blue-800 mb-4">{editId ? 'Edit Module' : 'New Module'}</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Module Name *</label>
              <input type="text" value={form.name} onChange={e => handleNameChange(e.target.value)}
                placeholder="e.g. Rolling Mill"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Code * <span className="text-gray-400 font-normal">(auto-generated, unique)</span></label>
              <input type="text" value={form.code} onChange={e => setForm(p => ({ ...p, code: e.target.value.toUpperCase().replace(/\s+/g,'_') }))}
                placeholder="e.g. ROLLING_MILL"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-400" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Route Prefix * <span className="text-gray-400 font-normal">(URL path)</span></label>
              <input type="text" value={form.route_prefix} onChange={e => setForm(p => ({ ...p, route_prefix: e.target.value }))}
                placeholder="e.g. /rolling-mill"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-400" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-2">Color</label>
              <div className="flex gap-2 flex-wrap">
                {COLOR_OPTIONS.map(c => (
                  <button key={c.value} type="button" onClick={() => setForm(p => ({ ...p, color: c.value }))}
                    className={`w-7 h-7 rounded-full ${c.cls} transition-transform ${form.color === c.value ? 'ring-2 ring-offset-2 ring-gray-600 scale-110' : 'opacity-60 hover:opacity-100'}`}
                    title={c.label} />
                ))}
              </div>
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button type="submit" disabled={saving}
              className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-50">
              {saving ? 'Saving...' : editId ? 'Update' : 'Create Module'}
            </button>
            <button type="button" onClick={() => { setShowForm(false); setEditId(null); setForm(emptyForm); }}
              className="border border-gray-300 text-gray-600 px-4 py-2 rounded-lg text-sm hover:bg-gray-50">
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Modules list */}
      {loading ? (
        <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>
      ) : (
        <div className="space-y-3">
          {modules.map((m, idx) => (
            <div key={m.id} className={`bg-white rounded-xl border shadow-sm overflow-hidden transition-opacity ${m.is_active ? '' : 'opacity-60'}`}>
              <div className="flex items-center gap-4 px-5 py-4">
                {/* Color dot */}
                <div className={`w-3 h-10 rounded-full ${colorCls(m.color)} shrink-0`} />

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-gray-900">{m.name}</span>
                    <span className="text-xs font-mono bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{m.code}</span>
                    {!m.is_active && <span className="text-xs bg-gray-200 text-gray-500 px-2 py-0.5 rounded-full">Inactive</span>}
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5 font-mono">{m.route_prefix}/dashboard</div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                  {/* Reorder */}
                  <button onClick={() => moveOrder(m, -1)} disabled={idx === 0}
                    className="text-gray-400 hover:text-gray-700 disabled:opacity-20 px-1" title="Move up">↑</button>
                  <button onClick={() => moveOrder(m, 1)} disabled={idx === modules.length - 1}
                    className="text-gray-400 hover:text-gray-700 disabled:opacity-20 px-1" title="Move down">↓</button>

                  <button onClick={() => toggleActive(m)}
                    className={`text-xs px-3 py-1.5 rounded-lg font-medium border transition-colors ${m.is_active ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100' : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'}`}>
                    {m.is_active ? 'Active' : 'Inactive'}
                  </button>
                  <button onClick={() => openEdit(m)}
                    className="text-xs px-3 py-1.5 rounded-lg font-medium border bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100">
                    Edit
                  </button>
                  <button onClick={() => handleDelete(m)}
                    className="text-xs px-3 py-1.5 rounded-lg font-medium border bg-red-50 text-red-600 border-red-200 hover:bg-red-100">
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
          {modules.length === 0 && (
            <div className="text-center py-12 text-gray-400">No modules yet. Click "+ Add Module" to create one.</div>
          )}
        </div>
      )}

      <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
        <strong>Note:</strong> Module codes must match what's expected in Login and navigation (e.g. <code className="font-mono bg-amber-100 px-1 rounded">PTM_CHECKSHEETS</code>). The route prefix must match an existing route in the app (e.g. <code className="font-mono bg-amber-100 px-1 rounded">/ptm</code>).
      </div>
    </div>
  );
}
