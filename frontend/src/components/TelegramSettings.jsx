import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import { telegramAPI } from '../services/api';

function TelegramSettings() {
  const [recipients, setRecipients] = useState([]);
  const [chatId, setChatId] = useState('');
  const [label, setLabel] = useState('');
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [testingId, setTestingId] = useState(null);

  const fetchRecipients = useCallback(async () => {
    setLoading(true);
    try {
      const data = await telegramAPI.getRecipients();
      setRecipients(data.recipients || []);
    } catch (err) {
      toast.error('Failed to load recipients');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRecipients();
  }, [fetchRecipients]);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!chatId.trim() || !label.trim()) {
      toast.warn('Both fields are required');
      return;
    }
    setAdding(true);
    try {
      await telegramAPI.addRecipient({ chat_id: chatId.trim(), label: label.trim() });
      toast.success('Recipient added');
      setChatId('');
      setLabel('');
      fetchRecipients();
    } catch (err) {
      toast.error(err?.message || 'Failed to add recipient');
    } finally {
      setAdding(false);
    }
  };

  const handleToggle = async (id) => {
    try {
      await telegramAPI.toggleRecipient(id);
      fetchRecipients();
    } catch {
      toast.error('Failed to toggle status');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Remove this recipient?')) return;
    try {
      await telegramAPI.deleteRecipient(id);
      toast.success('Recipient removed');
      fetchRecipients();
    } catch {
      toast.error('Failed to delete');
    }
  };

  const handleTest = async (targetChatId) => {
    setTestingId(targetChatId);
    try {
      const data = await telegramAPI.sendTest({ chat_id: targetChatId });
      if (data.success) {
        toast.success('Test message sent!');
      } else {
        toast.error(data.message || 'Test failed');
      }
    } catch {
      toast.error('Failed to send test message');
    } finally {
      setTestingId(null);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-4">
      <h1 className="text-xl font-bold text-gray-800 mb-4">Telegram Notifications</h1>

      {/* Add Recipient Form */}
      <form onSubmit={handleAdd} className="bg-white rounded-xl shadow p-4 mb-6">
        <h2 className="text-sm font-semibold text-gray-600 mb-3 uppercase tracking-wide">
          Add Recipient
        </h2>

        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Chat ID</label>
            <input
              type="text"
              value={chatId}
              onChange={(e) => setChatId(e.target.value)}
              placeholder="e.g. 7277986981"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Label</label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. Maintenance Head"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={adding}
            className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-medium text-sm hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
          >
            {adding ? 'Adding...' : 'Add Recipient'}
          </button>
        </div>

        <p className="mt-3 text-xs text-gray-500">
          To get your Chat ID, message <strong>@userinfobot</strong> on Telegram.
        </p>
      </form>

      {/* Recipients List */}
      <div className="bg-white rounded-xl shadow p-4">
        <h2 className="text-sm font-semibold text-gray-600 mb-3 uppercase tracking-wide">
          Recipients ({recipients.length})
        </h2>

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : recipients.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-6">
            No recipients added yet. Add a Telegram Chat ID above.
          </p>
        ) : (
          <div className="space-y-3">
            {recipients.map((r) => (
              <div
                key={r.id}
                className={`border rounded-lg p-3 flex items-center justify-between ${
                  r.is_active ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-gray-50'
                }`}
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-gray-800 truncate">{r.label}</p>
                  <p className="text-xs text-gray-500 font-mono">{r.chat_id}</p>
                  <span
                    className={`inline-block mt-1 text-xs px-2 py-0.5 rounded-full ${
                      r.is_active
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-200 text-gray-500'
                    }`}
                  >
                    {r.is_active ? 'Active' : 'Disabled'}
                  </span>
                </div>

                <div className="flex items-center space-x-2 ml-3 shrink-0">
                  {/* Test Button */}
                  <button
                    onClick={() => handleTest(r.chat_id)}
                    disabled={testingId === r.chat_id}
                    className="text-xs px-2.5 py-1.5 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 disabled:opacity-50 font-medium"
                  >
                    {testingId === r.chat_id ? '...' : 'Test'}
                  </button>

                  {/* Toggle Button */}
                  <button
                    onClick={() => handleToggle(r.id)}
                    className={`text-xs px-2.5 py-1.5 rounded-lg font-medium ${
                      r.is_active
                        ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                        : 'bg-green-100 text-green-700 hover:bg-green-200'
                    }`}
                  >
                    {r.is_active ? 'Disable' : 'Enable'}
                  </button>

                  {/* Delete Button */}
                  <button
                    onClick={() => handleDelete(r.id)}
                    className="text-xs px-2.5 py-1.5 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 font-medium"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default TelegramSettings;
