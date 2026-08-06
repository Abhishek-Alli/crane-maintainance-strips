import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { ptmAPI } from '../../services/api';

export default function PtmAdminItems() {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTpl, setSelectedTpl] = useState(null);
  const [tplDetail, setTplDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // New template form
  const [showNewTpl, setShowNewTpl] = useState(false);
  const [newTplName, setNewTplName] = useState('');
  const [newTplType, setNewTplType] = useState('dc-motor');
  const [savingTpl, setSavingTpl] = useState(false);

  // New item form
  const [showNewItem, setShowNewItem] = useState(false);
  const [newItemSection, setNewItemSection] = useState('General');
  const [newItemName, setNewItemName] = useState('');
  const [newItemOrder, setNewItemOrder] = useState('0');
  const [savingItem, setSavingItem] = useState(false);

  // Edit item
  const [editingItem, setEditingItem] = useState(null);
  const [editItemName, setEditItemName] = useState('');
  const [editItemSection, setEditItemSection] = useState('');

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const res = await ptmAPI.getTemplates();
      setTemplates(res.data || []);
    } catch {
      toast.error('Failed to load templates');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadTemplates(); }, []);

  const loadTemplateDetail = async (id) => {
    setSelectedTpl(id);
    setTplDetail(null);
    setDetailLoading(true);
    try {
      const res = await ptmAPI.getTemplateById(id);
      setTplDetail(res.data);
    } catch {
      toast.error('Failed to load template detail');
    } finally {
      setDetailLoading(false);
    }
  };

  const handleCreateTemplate = async (e) => {
    e.preventDefault();
    if (!newTplName.trim()) return toast.error('Name is required');
    setSavingTpl(true);
    try {
      await ptmAPI.createTemplate({ name: newTplName.trim(), type: newTplType });
      toast.success('Template created');
      setNewTplName(''); setShowNewTpl(false);
      await loadTemplates();
    } catch {
      toast.error('Failed to create template');
    } finally {
      setSavingTpl(false);
    }
  };

  const handleToggleActive = async (tpl) => {
    try {
      await ptmAPI.updateTemplate(tpl.id, { is_active: !tpl.is_active });
      toast.success('Template updated');
      await loadTemplates();
    } catch {
      toast.error('Failed to update template');
    }
  };

  const handleAddItem = async (e) => {
    e.preventDefault();
    if (!newItemName.trim()) return toast.error('Item name is required');
    setSavingItem(true);
    try {
      await ptmAPI.addItem(selectedTpl, { section_name: newItemSection, item_name: newItemName.trim(), item_order: parseInt(newItemOrder) || 0 });
      toast.success('Item added');
      setNewItemName(''); setShowNewItem(false);
      await loadTemplateDetail(selectedTpl);
    } catch {
      toast.error('Failed to add item');
    } finally {
      setSavingItem(false);
    }
  };

  const startEditItem = (item) => {
    setEditingItem(item.id);
    setEditItemName(item.item_name);
    setEditItemSection(item.section_name);
  };

  const handleUpdateItem = async (item) => {
    try {
      await ptmAPI.updateItem(selectedTpl, item.id, { item_name: editItemName, section_name: editItemSection });
      toast.success('Item updated');
      setEditingItem(null);
      await loadTemplateDetail(selectedTpl);
    } catch {
      toast.error('Failed to update item');
    }
  };

  const handleDeleteItem = async (itemId) => {
    if (!window.confirm('Delete this item?')) return;
    try {
      await ptmAPI.deleteItem(selectedTpl, itemId);
      toast.success('Item deleted');
      await loadTemplateDetail(selectedTpl);
    } catch {
      toast.error('Failed to delete item');
    }
  };

  // Group items by section
  const sections = {};
  for (const item of tplDetail?.items || []) {
    const s = item.section_name || 'General';
    if (!sections[s]) sections[s] = [];
    sections[s].push(item);
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <button type="button" onClick={() => navigate('/ptm/dashboard')}
            className="text-sm text-gray-500 hover:text-gray-700 mb-2 flex items-center gap-1">
            ← Back to Dashboard
          </button>
          <h1 className="text-2xl font-bold text-blue-800">PTM Admin — Templates & Items</h1>
          <p className="text-gray-500 text-sm mt-1">Manage checksheet templates and their items</p>
        </div>
        <button onClick={() => setShowNewTpl(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
          + New Template
        </button>
      </div>

      {/* New Template form */}
      {showNewTpl && (
        <form onSubmit={handleCreateTemplate} className="bg-white rounded-xl border border-blue-200 shadow-sm p-5 mb-5">
          <h3 className="font-semibold text-blue-800 mb-3">Create Template</h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Name *</label>
              <input type="text" value={newTplName} onChange={e => setNewTplName(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" placeholder="Template name" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Type *</label>
              <select value={newTplType} onChange={e => setNewTplType(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
                <option value="dc-motor">DC Motor (OK/NOT OK)</option>
                <option value="mechanical">Mechanical (OK/NOT OK)</option>
                <option value="parameter">Parameter (Value)</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            <button type="submit" disabled={savingTpl} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
              {savingTpl ? 'Saving...' : 'Create'}
            </button>
            <button type="button" onClick={() => setShowNewTpl(false)} className="border border-gray-300 text-gray-600 px-4 py-2 rounded-lg text-sm hover:bg-gray-50">Cancel</button>
          </div>
        </form>
      )}

      <div className="flex gap-5">
        {/* Template list */}
        <div className="w-64 flex-shrink-0">
          <h3 className="text-sm font-semibold text-gray-600 mb-2 uppercase tracking-wide">Templates</h3>
          {loading ? (
            <div className="flex justify-center py-6"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" /></div>
          ) : (
            <div className="space-y-2">
              {templates.map(tpl => (
                <div
                  key={tpl.id}
                  className={`rounded-xl border px-4 py-3 cursor-pointer transition-all ${selectedTpl === tpl.id ? 'border-blue-400 bg-blue-50' : 'border-gray-200 bg-white hover:border-blue-200'}`}
                  onClick={() => loadTemplateDetail(tpl.id)}
                >
                  <div className="flex items-start justify-between gap-1">
                    <div>
                      <div className="font-medium text-gray-800 text-sm">{tpl.name}</div>
                      <span className={`text-xs px-1.5 py-0.5 rounded mt-0.5 inline-block
                        ${tpl.type === 'dc-motor' ? 'bg-blue-100 text-blue-700' :
                          tpl.type === 'mechanical' ? 'bg-emerald-100 text-emerald-700' :
                          'bg-purple-100 text-purple-700'}`}>
                        {tpl.type}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={e => { e.stopPropagation(); handleToggleActive(tpl); }}
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${tpl.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}
                    >
                      {tpl.is_active ? 'Active' : 'Inactive'}
                    </button>
                  </div>
                  <div className="text-xs text-gray-400 mt-1">{tpl.item_count} items</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Items panel */}
        <div className="flex-1 min-w-0">
          {!selectedTpl ? (
            <div className="flex items-center justify-center h-40 bg-gray-50 rounded-xl border border-gray-200 text-gray-400">Select a template to manage items</div>
          ) : detailLoading ? (
            <div className="flex justify-center py-10"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>
          ) : tplDetail ? (
            <>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-gray-800">{tplDetail.name}</h3>
                <button onClick={() => setShowNewItem(true)} className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-blue-700">+ Add Item</button>
              </div>

              {showNewItem && (
                <form onSubmit={handleAddItem} className="bg-blue-50 rounded-xl border border-blue-200 p-4 mb-4">
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Section</label>
                      <input type="text" value={newItemSection} onChange={e => setNewItemSection(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" placeholder="General" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Item Name *</label>
                      <input type="text" value={newItemName} onChange={e => setNewItemName(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" placeholder="Item name" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Order</label>
                      <input type="number" value={newItemOrder} onChange={e => setNewItemOrder(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                    </div>
                  </div>
                  <div className="flex gap-2 mt-2">
                    <button type="submit" disabled={savingItem} className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-blue-700 disabled:opacity-50">{savingItem ? 'Adding...' : 'Add'}</button>
                    <button type="button" onClick={() => setShowNewItem(false)} className="border border-gray-300 text-gray-600 px-3 py-1.5 rounded-lg text-xs hover:bg-gray-50">Cancel</button>
                  </div>
                </form>
              )}

              {Object.keys(sections).length === 0 ? (
                <div className="text-center py-8 text-gray-400 bg-gray-50 rounded-xl border border-gray-200">No items yet. Add the first item.</div>
              ) : (
                Object.keys(sections).map(sectionName => (
                  <div key={sectionName} className="mb-4">
                    <div className="text-xs font-bold text-blue-700 uppercase tracking-wide px-2 mb-1">{sectionName}</div>
                    <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100 overflow-hidden">
                      {sections[sectionName].map(item => (
                        <div key={item.id} className="flex items-center gap-3 px-4 py-2">
                          {editingItem === item.id ? (
                            <>
                              <input value={editItemSection} onChange={e => setEditItemSection(e.target.value)} className="w-24 border border-gray-300 rounded px-2 py-1 text-xs" placeholder="Section" />
                              <input value={editItemName} onChange={e => setEditItemName(e.target.value)} className="flex-1 border border-gray-300 rounded px-2 py-1 text-xs" placeholder="Item name" />
                              <button onClick={() => handleUpdateItem(item)} className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700">Save</button>
                              <button onClick={() => setEditingItem(null)} className="text-xs border border-gray-300 text-gray-500 px-2 py-1 rounded hover:bg-gray-50">Cancel</button>
                            </>
                          ) : (
                            <>
                              <span className="flex-1 text-sm text-gray-700">{item.item_name}</span>
                              <button onClick={() => startEditItem(item)} className="text-xs text-blue-600 hover:text-blue-800 px-2 py-1 rounded hover:bg-blue-50">Edit</button>
                              <button onClick={() => handleDeleteItem(item.id)} className="text-xs text-red-600 hover:text-red-800 px-2 py-1 rounded hover:bg-red-50">Delete</button>
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
