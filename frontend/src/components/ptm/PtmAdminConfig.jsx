import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { ptmAPI } from '../../services/api';

function ConfigSection({ title, items, onAdd, onToggle, onDelete, onRename, addPlaceholder, extraField }) {
  const [newName, setNewName] = useState('');
  const [extraVal, setExtraVal] = useState(false);
  const [editing, setEditing] = useState(null); // { id, name, extraVal }

  const handleAdd = async () => {
    if (!newName.trim()) return;
    try {
      await onAdd(newName.trim(), extraVal);
      setNewName('');
      setExtraVal(false);
      toast.success('Added');
    } catch { toast.error('Failed to add'); }
  };

  const handleSaveEdit = async () => {
    try {
      await onRename(editing.id, editing.name, editing.extraVal);
      setEditing(null);
      toast.success('Updated');
    } catch { toast.error('Failed to update'); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this item?')) return;
    try { await onDelete(id); toast.success('Deleted'); }
    catch { toast.error('Failed to delete'); }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-5 py-4 bg-gray-50 border-b border-gray-200">
        <h3 className="font-bold text-gray-800">{title}</h3>
      </div>
      <div className="p-5 space-y-3">
        {/* Existing items */}
        {items.map(item => (
          <div key={item.id} className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 bg-gray-50">
            {editing?.id === item.id ? (
              <>
                <input value={editing.name} onChange={e => setEditing(prev => ({ ...prev, name: e.target.value }))}
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                {extraField && (
                  <label className="flex items-center gap-1.5 text-xs text-gray-600 whitespace-nowrap">
                    <input type="checkbox" checked={editing.extraVal} onChange={e => setEditing(prev => ({ ...prev, extraVal: e.target.checked }))} />
                    {extraField}
                  </label>
                )}
                <button onClick={handleSaveEdit} className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 font-medium">Save</button>
                <button onClick={() => setEditing(null)} className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1.5">Cancel</button>
              </>
            ) : (
              <>
                <span className={`flex-1 text-sm font-medium ${item.is_active ? 'text-gray-800' : 'text-gray-400 line-through'}`}>{item.name || item.size_label}</span>
                {extraField && item.has_size_change && (
                  <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded font-medium">Size Change</span>
                )}
                <button onClick={() => onToggle(item)}
                  className={`text-xs px-3 py-1.5 rounded-lg font-medium ${item.is_active ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}`}>
                  {item.is_active ? 'Active' : 'Inactive'}
                </button>
                <button onClick={() => setEditing({ id: item.id, name: item.name || item.size_label, extraVal: item.has_size_change || false })}
                  className="text-xs bg-blue-50 text-blue-700 hover:bg-blue-100 px-3 py-1.5 rounded-lg font-medium">Edit</button>
                <button onClick={() => handleDelete(item.id)}
                  className="text-xs bg-red-50 text-red-600 hover:bg-red-100 px-3 py-1.5 rounded-lg font-medium">Delete</button>
              </>
            )}
          </div>
        ))}

        {/* Add new */}
        <div className="flex items-center gap-3 pt-2 border-t border-gray-100">
          <input value={newName} onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
            placeholder={addPlaceholder}
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
          {extraField && (
            <label className="flex items-center gap-1.5 text-xs text-gray-600 whitespace-nowrap">
              <input type="checkbox" checked={extraVal} onChange={e => setExtraVal(e.target.checked)} />
              {extraField}
            </label>
          )}
          <button onClick={handleAdd} className="text-sm bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium whitespace-nowrap">+ Add</button>
        </div>
      </div>
    </div>
  );
}

export default function PtmAdminConfig() {
  const navigate = useNavigate();
  const [mills, setMills] = useState([]);
  const [types, setTypes] = useState([]);
  const [sizes, setSizes] = useState([]);
  const [loading, setLoading] = useState(true);

  const reload = () => {
    setLoading(true);
    Promise.all([ptmAPI.getMills(), ptmAPI.getBreakdownTypes(), ptmAPI.getSizes()])
      .then(([m, t, s]) => {
        setMills(m.mills || []);
        setTypes(t.breakdown_types || []);
        setSizes(s.sizes || []);
        setLoading(false);
      })
      .catch(() => { toast.error('Failed to load'); setLoading(false); });
  };

  useEffect(() => { reload(); }, []);

  if (loading) return <div className="flex items-center justify-center h-64 text-gray-500">Loading...</div>;

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
      <div className="mb-2">
        <button type="button" onClick={() => navigate('/ptm/dashboard')}
          className="text-sm text-gray-500 hover:text-gray-700 mb-2 flex items-center gap-1">
          ← Back to Dashboard
        </button>
        <h1 className="text-2xl font-bold text-blue-800">PTM Configuration</h1>
        <p className="text-gray-500 text-sm mt-1">Manage mills, breakdown types and sizes from here</p>
      </div>

      <ConfigSection
        title="Mills"
        items={mills}
        addPlaceholder="e.g. Mill No. 5"
        onAdd={async (name) => { await ptmAPI.createMill({ name }); reload(); }}
        onToggle={async (item) => { await ptmAPI.updateMill(item.id, { name: item.name, is_active: !item.is_active }); reload(); }}
        onRename={async (id, name) => { const item = mills.find(m => m.id === id); await ptmAPI.updateMill(id, { name, is_active: item.is_active }); reload(); }}
        onDelete={async (id) => { await ptmAPI.deleteMill(id); reload(); }}
      />

      <ConfigSection
        title="Breakdown Types"
        items={types}
        addPlaceholder="e.g. Power Cut"
        extraField="Has Size Change"
        onAdd={async (name, has_size_change) => { await ptmAPI.createBreakdownType({ name, has_size_change }); reload(); }}
        onToggle={async (item) => { await ptmAPI.updateBreakdownType(item.id, { name: item.name, has_size_change: item.has_size_change, is_active: !item.is_active }); reload(); }}
        onRename={async (id, name, extraVal) => { const item = types.find(t => t.id === id); await ptmAPI.updateBreakdownType(id, { name, has_size_change: extraVal, is_active: item.is_active }); reload(); }}
        onDelete={async (id) => { await ptmAPI.deleteBreakdownType(id); reload(); }}
      />

      <ConfigSection
        title="Sizes (for Roll Change)"
        items={sizes.map(s => ({ ...s, name: s.size_label }))}
        addPlaceholder="e.g. 50MM"
        onAdd={async (size_label) => { await ptmAPI.createSize({ size_label }); reload(); }}
        onToggle={async (item) => { await ptmAPI.updateSize(item.id, { size_label: item.size_label, is_active: !item.is_active }); reload(); }}
        onRename={async (id, name) => { const item = sizes.find(s => s.id === id); await ptmAPI.updateSize(id, { size_label: name, is_active: item.is_active }); reload(); }}
        onDelete={async (id) => { await ptmAPI.deleteSize(id); reload(); }}
      />
    </div>
  );
}
