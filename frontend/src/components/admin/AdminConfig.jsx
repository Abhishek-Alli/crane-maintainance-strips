import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { permissionListsAPI, modulesAPI } from '../../services/api';

const MODULE_LABEL = {
  HBM_CHECKSHEETS: 'HBM Checksheets — Sheet Access',
  CRANE_MAINTENANCE: 'Crane Maintenance — Section Access',
};

function ListSection({ moduleCode, moduleLabel, items, onAdd, onEdit, onDelete, onToggle, onMove }) {
  const [adding, setAdding] = useState(false);
  const [newKey, setNewKey] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [editId, setEditId] = useState(null);
  const [editLabel, setEditLabel] = useState('');

  const handleAdd = async () => {
    if (!newKey.trim() || !newLabel.trim()) return toast.error('Key and label required');
    await onAdd(moduleCode, newKey.trim().toLowerCase().replace(/\s+/g, '-'), newLabel.trim());
    setNewKey(''); setNewLabel(''); setAdding(false);
  };

  const handleEdit = async (item) => {
    await onEdit(item.id, editLabel.trim(), item.display_order, item.is_active);
    setEditId(null); setEditLabel('');
  };

  return (
    <div className="bg-white rounded-xl border shadow-sm overflow-hidden mb-6">
      <div className="flex items-center justify-between px-5 py-3 bg-gray-50 border-b">
        <div>
          <h3 className="font-bold text-gray-800 text-sm">{moduleLabel}</h3>
          <p className="text-xs text-gray-400">{moduleCode}</p>
        </div>
        <button onClick={() => setAdding(a => !a)}
          className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg font-semibold hover:bg-blue-700">
          + Add Item
        </button>
      </div>

      {adding && (
        <div className="px-5 py-3 bg-blue-50 border-b flex gap-2 flex-wrap">
          <input value={newKey} onChange={e => setNewKey(e.target.value)}
            placeholder="key (e.g. new-sheet)"
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-xs font-mono w-40 focus:outline-none focus:ring-2 focus:ring-blue-400" />
          <input value={newLabel} onChange={e => setNewLabel(e.target.value)}
            placeholder="Label (e.g. New Sheet)"
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-xs flex-1 min-w-32 focus:outline-none focus:ring-2 focus:ring-blue-400" />
          <button onClick={handleAdd} className="bg-blue-600 text-white text-xs px-3 py-1.5 rounded-lg font-semibold hover:bg-blue-700">Save</button>
          <button onClick={() => setAdding(false)} className="bg-gray-100 text-gray-600 text-xs px-3 py-1.5 rounded-lg hover:bg-gray-200">Cancel</button>
        </div>
      )}

      <div>
        {items.map((item, idx) => (
          <div key={item.id} className={`flex items-center gap-3 px-5 py-2.5 border-b last:border-0 ${!item.is_active ? 'opacity-50' : ''}`}>
            <div className="flex flex-col gap-0.5">
              <button onClick={() => onMove(item, -1)} disabled={idx === 0} className="text-gray-300 hover:text-gray-600 disabled:opacity-20 text-xs leading-none">▲</button>
              <button onClick={() => onMove(item, 1)} disabled={idx === items.length - 1} className="text-gray-300 hover:text-gray-600 disabled:opacity-20 text-xs leading-none">▼</button>
            </div>

            <code className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded w-44 shrink-0">{item.item_key}</code>

            {editId === item.id ? (
              <input value={editLabel} onChange={e => setEditLabel(e.target.value)}
                className="flex-1 border border-blue-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                autoFocus onKeyDown={e => e.key === 'Enter' && handleEdit(item)} />
            ) : (
              <span className="flex-1 text-sm text-gray-800">{item.item_label}</span>
            )}

            <div className="flex items-center gap-1.5 shrink-0">
              {editId === item.id ? (
                <>
                  <button onClick={() => handleEdit(item)} className="text-xs bg-blue-600 text-white px-2.5 py-1 rounded-lg">Save</button>
                  <button onClick={() => { setEditId(null); setEditLabel(''); }} className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-lg">Cancel</button>
                </>
              ) : (
                <button onClick={() => { setEditId(item.id); setEditLabel(item.item_label); }}
                  className="text-xs bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-1 rounded-lg hover:bg-blue-100">Edit</button>
              )}
              <button onClick={() => onToggle(item)}
                className={`text-xs px-2.5 py-1 rounded-lg border font-medium ${item.is_active ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-gray-50 text-gray-500 border-gray-200'}`}>
                {item.is_active ? 'Active' : 'Inactive'}
              </button>
              <button onClick={() => onDelete(item)}
                className="text-xs bg-red-50 text-red-600 border border-red-200 px-2.5 py-1 rounded-lg hover:bg-red-100">Delete</button>
            </div>
          </div>
        ))}
        {items.length === 0 && <div className="py-6 text-center text-sm text-gray-400">No items. Click "+ Add Item".</div>}
      </div>
    </div>
  );
}

export default function AdminConfig() {
  const [allItems, setAllItems] = useState([]);
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    Promise.all([
      permissionListsAPI.getAll(),
      modulesAPI.getAll(),
    ]).then(([listsRes, modsRes]) => {
      setAllItems(listsRes.items || []);
      setModules((modsRes.modules || []).filter(m => m.is_active));
      setLoading(false);
    }).catch(() => { toast.error('Failed to load'); setLoading(false); });
  };

  useEffect(() => { load(); }, []);

  const handleAdd = async (moduleCode, key, label) => {
    try {
      await permissionListsAPI.create({ module_code: moduleCode, item_key: key, item_label: label });
      toast.success('Item added'); load();
    } catch (e) { toast.error(e?.message || 'Failed to add'); }
  };

  const handleEdit = async (id, label, order, isActive) => {
    try {
      await permissionListsAPI.update(id, { item_label: label, display_order: order, is_active: isActive });
      toast.success('Updated'); load();
    } catch { toast.error('Failed to update'); }
  };

  const handleToggle = async (item) => {
    try {
      await permissionListsAPI.update(item.id, { item_label: item.item_label, display_order: item.display_order, is_active: !item.is_active });
      load();
    } catch { toast.error('Failed to update'); }
  };

  const handleDelete = async (item) => {
    if (!window.confirm(`Delete "${item.item_label}"?`)) return;
    try {
      await permissionListsAPI.delete(item.id);
      toast.success('Deleted'); load();
    } catch { toast.error('Failed to delete'); }
  };

  const handleMove = async (item, direction) => {
    try {
      await permissionListsAPI.update(item.id, { item_label: item.item_label, display_order: item.display_order + direction, is_active: item.is_active });
      load();
    } catch { toast.error('Failed to reorder'); }
  };

  // All active modules + any codes that already have permission items
  const moduleCodes = [...new Set([
    ...modules.map(m => m.code),
    'CRANE_MAINTENANCE',
    ...allItems.map(i => i.module_code),
  ])];

  const getLabel = (code) => MODULE_LABEL[code] || modules.find(m => m.code === code)?.name || code;

  return (
    <div className="max-w-4xl">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Share Sheets Access</h2>
        <p className="text-gray-500 text-sm mt-1">
          Define checksheets (and crane sections) available to share. Assign them to users under User Management. Admin can fill all sheets without assignment.
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>
      ) : (
        moduleCodes.map(code => (
          <ListSection
            key={code}
            moduleCode={code}
            moduleLabel={getLabel(code)}
            items={allItems.filter(i => i.module_code === code)}
            onAdd={handleAdd}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onToggle={handleToggle}
            onMove={handleMove}
          />
        ))
      )}
    </div>
  );
}
