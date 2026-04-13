import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import { userAPI } from '../services/api';

const ALL_HBM_SHEETS = [
  { key: 'dc-motor',       label: 'DC Motor' },
  { key: 'rolling-stand',  label: 'Rolling Stand' },
  { key: 'mill-mech',      label: 'Mill Mechanical' },
  { key: 'cooling-bed',    label: 'Cooling Bed' },
  { key: 'pumphouse',      label: 'Pumphouse' },
  { key: 'bar-bundle',     label: 'Bar Bundle Area' },
  { key: 'before-rolling', label: 'Before Rolling' },
  { key: 'pump-param',     label: 'Pump Parameter Report' },
  { key: 'water-param',    label: 'Water Parameters' },
  { key: 'ph-maint',       label: 'PH Maintenance' },
  { key: 'transformer',    label: 'HBM Transformer' },
  { key: 'oil-level',      label: 'Daily Oil Level' },
];

const ALL_CRANE_SECTIONS = [
  { key: 'dashboard',   label: 'Dashboard' },
  { key: 'inspection',  label: 'New Inspection' },
  { key: 'calendar',    label: 'Maintenance Calendar' },
  { key: 'reports',     label: 'Reports' },
  { key: 'fabrication', label: 'Fabrication' },
];

// ─── Toggle Switch ─────────────────────────────────────────────────────────
function Toggle({ checked, onChange, label }) {
  return (
    <label className="flex items-center justify-between gap-3 cursor-pointer select-none">
      <span className="text-xs font-medium text-gray-700">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors focus:outline-none ${
          checked ? 'bg-blue-600' : 'bg-gray-300'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
            checked ? 'translate-x-4' : 'translate-x-0'
          }`}
        />
      </button>
    </label>
  );
}

// ─── Inline Sheet Access Toggles (used in the Create form) ─────────────────
function SheetAccessToggles({ userType, selectedSheets, onChange }) {
  const sheets = userType === 'HBM_CHECKSHEETS' ? ALL_HBM_SHEETS : ALL_CRANE_SECTIONS;
  const allAllowed = selectedSheets === null;
  const selectedSet = new Set(selectedSheets ?? sheets.map(s => s.key));

  const toggleSheet = (key) => {
    const next = new Set(selectedSet);
    next.has(key) ? next.delete(key) : next.add(key);
    const arr = [...next];
    onChange(arr.length === sheets.length ? null : arr);
  };

  const toggleAll = () => {
    onChange(allAllowed ? [] : null);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="block text-sm font-semibold text-gray-700">Sheet Access</label>
        <button type="button" onClick={toggleAll}
          className="text-xs text-blue-600 hover:underline font-medium">
          {allAllowed ? 'Deselect All' : 'Select All'}
        </button>
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        {sheets.map(({ key, label }) => {
          const isOn = allAllowed || selectedSet.has(key);
          return (
            <label key={key}
              className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg border cursor-pointer text-xs font-medium transition-colors select-none ${
                isOn ? 'bg-blue-50 border-blue-300 text-blue-800' : 'bg-white border-gray-200 text-gray-400'
              }`}>
              <input
                type="checkbox"
                checked={isOn}
                onChange={() => toggleSheet(key)}
                className="w-3 h-3 accent-blue-600"
              />
              {label}
            </label>
          );
        })}
      </div>
      {selectedSheets !== null && selectedSheets.length === 0 && (
        <p className="text-xs text-red-500 mt-1">At least one sheet must be selected.</p>
      )}
    </div>
  );
}

// ─── HBM Permissions Panel (edit after creation) ───────────────────────────
function HbmPermissionsPanel({ userId, onClose }) {
  const [perms, setPerms] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    userAPI.getPermissions(userId)
      .then(res => {
        const p = res.data;
        setPerms({
          allowed_checksheets: p.allowed_checksheets,
          can_download_pdf:    p.can_download_pdf,
          can_delete:          p.can_delete,
          can_edit_submitted:  p.can_edit_submitted,
        });
      })
      .catch(() => toast.error('Failed to load permissions'));
  }, [userId]);

  if (!perms) {
    return (
      <div className="mt-3 pt-3 border-t border-gray-200 flex justify-center py-4">
        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600" />
      </div>
    );
  }

  const allAllowed = perms.allowed_checksheets === null;
  const selectedSet = new Set(perms.allowed_checksheets ?? ALL_HBM_SHEETS.map(t => t.key));

  const toggleSheet = (key) => {
    const next = new Set(selectedSet);
    next.has(key) ? next.delete(key) : next.add(key);
    const arr = [...next];
    setPerms(p => ({
      ...p,
      allowed_checksheets: arr.length === ALL_HBM_SHEETS.length ? null : arr,
    }));
  };

  const toggleAll = () => {
    setPerms(p => ({
      ...p,
      allowed_checksheets: allAllowed ? [] : null,
    }));
  };

  const handleSave = async () => {
    if (perms.allowed_checksheets !== null && perms.allowed_checksheets.length === 0) {
      toast.warn('Select at least one checksheet type');
      return;
    }
    setSaving(true);
    try {
      await userAPI.updatePermissions(userId, perms);
      toast.success('Permissions saved');
      onClose();
    } catch {
      toast.error('Failed to save permissions');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mt-3 pt-3 border-t border-gray-200 space-y-3">
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Allowed Checksheets</p>
          <button type="button" onClick={toggleAll}
            className="text-xs text-blue-600 hover:underline font-medium">
            {allAllowed ? 'Deselect All' : 'Select All'}
          </button>
        </div>
        <div className="grid grid-cols-2 gap-1">
          {ALL_HBM_SHEETS.map(({ key, label }) => {
            const isOn = allAllowed || selectedSet.has(key);
            return (
              <label key={key}
                className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg border cursor-pointer text-xs font-medium transition-colors select-none ${
                  isOn ? 'bg-blue-50 border-blue-300 text-blue-800' : 'bg-white border-gray-200 text-gray-400'
                }`}>
                <input
                  type="checkbox"
                  checked={isOn}
                  onChange={() => toggleSheet(key)}
                  className="w-3 h-3 accent-blue-600"
                />
                {label}
              </label>
            );
          })}
        </div>
        {perms.allowed_checksheets !== null && perms.allowed_checksheets.length === 0 && (
          <p className="text-xs text-red-500 mt-1">At least one must be selected.</p>
        )}
      </div>

      <div className="space-y-2 border border-gray-100 rounded-lg p-2.5 bg-gray-50">
        <Toggle
          label="Can Download PDF"
          checked={perms.can_download_pdf}
          onChange={v => setPerms(p => ({ ...p, can_download_pdf: v }))}
        />
        <Toggle
          label="Can Delete Submissions"
          checked={perms.can_delete}
          onChange={v => setPerms(p => ({ ...p, can_delete: v }))}
        />
        <Toggle
          label="Can Edit After Submit"
          checked={perms.can_edit_submitted}
          onChange={v => setPerms(p => ({ ...p, can_edit_submitted: v }))}
        />
      </div>

      <div className="flex gap-2">
        <button type="button" onClick={handleSave} disabled={saving}
          className="flex-1 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors">
          {saving ? 'Saving…' : 'Save Permissions'}
        </button>
        <button type="button" onClick={onClose}
          className="px-4 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-lg transition-colors">
          Cancel
        </button>
      </div>
    </div>
  );
}

// ─── Crane Permissions Panel (edit after creation) ─────────────────────────
function CranePermissionsPanel({ userId, onClose }) {
  const [sections, setSections] = useState(undefined);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    userAPI.getCranePermissions(userId)
      .then(data => setSections(data.data.allowed_sections))
      .catch(() => toast.error('Failed to load permissions'));
  }, [userId]);

  if (sections === undefined) {
    return (
      <div className="mt-3 pt-3 border-t border-gray-200 flex justify-center py-4">
        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600" />
      </div>
    );
  }

  const allAllowed = sections === null;
  const selectedSet = new Set(sections ?? ALL_CRANE_SECTIONS.map(s => s.key));

  const toggleSection = (key) => {
    const next = new Set(selectedSet);
    next.has(key) ? next.delete(key) : next.add(key);
    const arr = [...next];
    setSections(arr.length === ALL_CRANE_SECTIONS.length ? null : arr);
  };

  const toggleAll = () => setSections(allAllowed ? [] : null);

  const handleSave = async () => {
    if (sections !== null && sections.length === 0) {
      toast.warn('Select at least one section');
      return;
    }
    setSaving(true);
    try {
      await userAPI.updateCranePermissions(userId, { allowed_sections: sections });
      toast.success('Permissions saved');
      onClose();
    } catch {
      toast.error('Failed to save permissions');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mt-3 pt-3 border-t border-gray-200 space-y-3">
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Allowed Sections</p>
          <button type="button" onClick={toggleAll}
            className="text-xs text-blue-600 hover:underline font-medium">
            {allAllowed ? 'Deselect All' : 'Select All'}
          </button>
        </div>
        <div className="grid grid-cols-2 gap-1">
          {ALL_CRANE_SECTIONS.map(({ key, label }) => {
            const isOn = allAllowed || selectedSet.has(key);
            return (
              <label key={key}
                className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg border cursor-pointer text-xs font-medium transition-colors select-none ${
                  isOn ? 'bg-orange-50 border-orange-300 text-orange-800' : 'bg-white border-gray-200 text-gray-400'
                }`}>
                <input
                  type="checkbox"
                  checked={isOn}
                  onChange={() => toggleSection(key)}
                  className="w-3 h-3 accent-orange-600"
                />
                {label}
              </label>
            );
          })}
        </div>
        {sections !== null && sections.length === 0 && (
          <p className="text-xs text-red-500 mt-1">At least one must be selected.</p>
        )}
      </div>

      <div className="flex gap-2">
        <button type="button" onClick={handleSave} disabled={saving}
          className="flex-1 py-1.5 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors">
          {saving ? 'Saving…' : 'Save Permissions'}
        </button>
        <button type="button" onClick={onClose}
          className="px-4 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-lg transition-colors">
          Cancel
        </button>
      </div>
    </div>
  );
}

// ─── Change Password Panel ──────────────────────────────────────────────────
function ChangePasswordPanel({ userId, username, onClose }) {
  const [newPwd, setNewPwd]       = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [saving, setSaving]       = useState(false);
  const [show, setShow]           = useState(false);

  const handleSave = async () => {
    if (newPwd.length < 6) { toast.error('Password must be at least 6 characters'); return; }
    if (newPwd !== confirmPwd) { toast.error('Passwords do not match'); return; }
    setSaving(true);
    try {
      await userAPI.changePassword(userId, newPwd);
      toast.success(`Password updated for "${username}"`);
      onClose();
    } catch {
      toast.error('Failed to update password');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mt-3 pt-3 border-t border-gray-200 space-y-3">
      <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Change Password</p>

      <div className="space-y-2">
        <div className="relative">
          <input
            type={show ? 'text' : 'password'}
            value={newPwd}
            onChange={e => setNewPwd(e.target.value)}
            placeholder="New password (min 6 chars)"
            className="w-full px-3 py-2 pr-9 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button type="button" onClick={() => setShow(s => !s)}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
            {show
              ? <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
              : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
            }
          </button>
        </div>

        <input
          type={show ? 'text' : 'password'}
          value={confirmPwd}
          onChange={e => setConfirmPwd(e.target.value)}
          placeholder="Confirm new password"
          className={`w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
            confirmPwd && confirmPwd !== newPwd ? 'border-red-400' : 'border-gray-300'
          }`}
        />
        {confirmPwd && confirmPwd !== newPwd && (
          <p className="text-xs text-red-500">Passwords do not match</p>
        )}
      </div>

      <div className="flex gap-2">
        <button type="button" onClick={handleSave} disabled={saving}
          className="flex-1 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors">
          {saving ? 'Saving…' : 'Update Password'}
        </button>
        <button type="button" onClick={onClose}
          className="px-4 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-lg transition-colors">
          Cancel
        </button>
      </div>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────
const CreateUser = ({ user }) => {
  const [submitting, setSubmitting]   = useState(false);
  const [createdUsers, setCreatedUsers] = useState([]);
  const [expandedId, setExpandedId]   = useState(null); // { id, panel: 'perms'|'pwd' }

  const openPanel = (userId, panel) => {
    setExpandedId(prev =>
      prev?.id === userId && prev?.panel === panel ? null : { id: userId, panel }
    );
  };
  const closePanel = () => setExpandedId(null);

  const [formData, setFormData] = useState({
    username: '',
    password: '',
    user_type: 'HBM_CHECKSHEETS',
    is_active: true,
  });

  // null = all sheets allowed; array = specific sheets enabled
  const [createSheets, setCreateSheets] = useState(null);

  const fetchUsers = useCallback(async () => {
    try {
      const data = await userAPI.getAll();
      if (data.success) setCreatedUsers(data.data);
    } catch {
      console.error('Failed to fetch users');
    }
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (name === 'user_type') {
      setCreateSheets(null); // reset to all-allowed when switching type
    }
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.username || !formData.password) {
      toast.error('Please fill in all required fields');
      return;
    }
    if (formData.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    if (createSheets !== null && createSheets.length === 0) {
      toast.error('Select at least one sheet to enable');
      return;
    }

    setSubmitting(true);
    try {
      const data = await userAPI.create({
        username:  formData.username.trim(),
        password:  formData.password,
        role:      formData.user_type === 'ADMIN' ? 'ADMIN' : 'OPERATOR',
        user_type: formData.user_type,
        is_active: formData.is_active,
      });

      if (data.success) {
        const newUserId = data.data.id;

        // Save sheet permissions immediately after creation
        if (formData.user_type === 'HBM_CHECKSHEETS') {
          await userAPI.updatePermissions(newUserId, {
            allowed_checksheets:  createSheets,
            can_download_pdf:     true,
            can_delete:           false,
            can_edit_submitted:   false,
          });
        } else if (formData.user_type === 'CRANE_MAINTENANCE') {
          await userAPI.updateCranePermissions(newUserId, { allowed_sections: createSheets });
        }

        toast.success(`User "${formData.username}" created successfully!`);
        setCreatedUsers(prev => [data.data, ...prev]);
        setFormData({ username: '', password: '', user_type: 'HBM_CHECKSHEETS', is_active: true });
        setCreateSheets(null);
      }
    } catch (error) {
      toast.error(error?.message || 'Failed to create user');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteUser = async (userId, username) => {
    if (!window.confirm(`Are you sure you want to delete user "${username}"?`)) return;
    try {
      await userAPI.delete(userId);
      toast.success('User deleted successfully');
      setCreatedUsers(prev => prev.filter(u => u.id !== userId));
      if (expandedId?.id === userId) closePanel();
    } catch {
      toast.error('Failed to delete user');
    }
  };

  if (user?.role !== 'ADMIN') {
    return (
      <div className="min-h-screen bg-gray-100 p-4 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-md p-8 max-w-md">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Access Denied</h2>
          <p className="text-gray-600">Only System Administrators can manage users.</p>
        </div>
      </div>
    );
  }

  const showSheetToggles = formData.user_type === 'HBM_CHECKSHEETS' || formData.user_type === 'CRANE_MAINTENANCE';

  return (
    <div className="min-h-screen bg-gray-100 p-4 sm:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
          <p className="text-gray-600 mt-2">Create and manage system users</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* ── Create User Form ── */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Create New User</h2>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Username */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Username <span className="text-red-500">*</span>
                </label>
                <input type="text" name="username" value={formData.username} onChange={handleChange}
                  placeholder="e.g., operator_a1" required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Password <span className="text-red-500">*</span>
                </label>
                <input type="password" name="password" value={formData.password} onChange={handleChange}
                  placeholder="Min 6 characters" required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                <p className="text-xs text-gray-500 mt-1">Min 6 characters</p>
              </div>

              {/* Login Access / Module */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Login Access <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-1 gap-2">
                  {[
                    ['CRANE_MAINTENANCE', 'Crane Maintenance', 'bg-orange-50 border-orange-400 text-orange-800', 'border-gray-200 text-gray-600'],
                    ['HBM_CHECKSHEETS',   'HBM Checksheets',   'bg-emerald-50 border-emerald-400 text-emerald-800', 'border-gray-200 text-gray-600'],
                    ['ADMIN',             'Admin',              'bg-purple-50 border-purple-400 text-purple-800',  'border-gray-200 text-gray-600'],
                  ].map(([val, label, activeClass, inactiveClass]) => (
                    <label key={val}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border-2 cursor-pointer transition-colors select-none ${
                        formData.user_type === val ? activeClass : inactiveClass
                      }`}>
                      <input type="radio" name="user_type" value={val}
                        checked={formData.user_type === val} onChange={handleChange}
                        className="w-4 h-4 shrink-0" />
                      <span className="font-medium text-sm">{label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Sheet Access Toggles — shown for Crane and HBM only */}
              {showSheetToggles && (
                <div className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                  <SheetAccessToggles
                    userType={formData.user_type}
                    selectedSheets={createSheets}
                    onChange={setCreateSheets}
                  />
                </div>
              )}

              {/* Active toggle */}
              <div>
                <label className="flex items-center">
                  <input type="checkbox" name="is_active" checked={formData.is_active}
                    onChange={handleChange} className="w-4 h-4 text-blue-600 rounded" />
                  <span className="ml-3 text-sm font-medium text-gray-700">Active</span>
                </label>
              </div>

              <button type="submit" disabled={submitting}
                className="w-full py-2 px-4 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                {submitting ? 'Creating...' : 'Create User'}
              </button>
            </form>
          </div>

          {/* ── Users List ── */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Users ({createdUsers.length})</h2>

            {createdUsers.length === 0 ? (
              <div className="text-center py-8 text-gray-500">No users created yet</div>
            ) : (
              <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
                {createdUsers.map(u => (
                  <div key={u.id}
                    className="border border-gray-200 rounded-xl p-3.5 hover:border-gray-300 transition-colors">

                    {/* Top row */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 truncate">{u.username}</p>
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                            u.user_type === 'HBM_CHECKSHEETS'   ? 'bg-emerald-100 text-emerald-800'
                            : u.user_type === 'ADMIN'           ? 'bg-purple-100 text-purple-800'
                            :                                     'bg-orange-100 text-orange-800'
                          }`}>{(u.user_type || 'CRANE_MAINTENANCE').replace(/_/g, ' ')}</span>
                          <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                            u.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                          }`}>{u.is_active ? 'Active' : 'Inactive'}</span>
                        </div>
                        {u.last_login && (
                          <p className="text-xs text-gray-400 mt-1">
                            Last login: {new Date(u.last_login).toLocaleDateString()}
                          </p>
                        )}
                      </div>

                      {/* Action buttons */}
                      <div className="flex flex-col gap-1 shrink-0">
                        {u.user_type === 'HBM_CHECKSHEETS' && (
                          <button
                            onClick={() => openPanel(u.id, 'perms')}
                            className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-colors ${
                              expandedId?.id === u.id && expandedId?.panel === 'perms'
                                ? 'bg-indigo-600 text-white'
                                : 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'
                            }`}>
                            Permissions
                          </button>
                        )}
                        {u.user_type === 'CRANE_MAINTENANCE' && (
                          <button
                            onClick={() => openPanel(u.id, 'perms')}
                            className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-colors ${
                              expandedId?.id === u.id && expandedId?.panel === 'perms'
                                ? 'bg-orange-600 text-white'
                                : 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                            }`}>
                            Permissions
                          </button>
                        )}
                        <button
                          onClick={() => openPanel(u.id, 'pwd')}
                          className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-colors ${
                            expandedId?.id === u.id && expandedId?.panel === 'pwd'
                              ? 'bg-gray-700 text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}>
                          Change Password
                        </button>
                        <button
                          onClick={() => handleDeleteUser(u.id, u.username)}
                          className="text-xs px-2.5 py-1 bg-red-100 text-red-700 hover:bg-red-200 rounded-lg font-medium transition-colors">
                          Delete
                        </button>
                      </div>
                    </div>

                    {/* Inline panels */}
                    {expandedId?.id === u.id && expandedId?.panel === 'perms' && u.user_type === 'HBM_CHECKSHEETS' && (
                      <HbmPermissionsPanel userId={u.id} onClose={closePanel} />
                    )}
                    {expandedId?.id === u.id && expandedId?.panel === 'perms' && u.user_type === 'CRANE_MAINTENANCE' && (
                      <CranePermissionsPanel userId={u.id} onClose={closePanel} />
                    )}
                    {expandedId?.id === u.id && expandedId?.panel === 'pwd' && (
                      <ChangePasswordPanel userId={u.id} username={u.username} onClose={closePanel} />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateUser;
