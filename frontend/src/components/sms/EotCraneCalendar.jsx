import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { smsAPI } from '../../services/api';
import {
  EOT_SHEDS,
  SCHEDULE_STATUS_STYLE,
  craneLabel,
  findCrane,
  formatDate,
  scheduleStatus,
  todayISO,
} from './eotCraneConfig';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const pad = (n) => String(n).padStart(2, '0');
const toISO = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const craneKey = (shed, number) => `${shed}|${number}`;
const shortCrane = (s) => `${s.shed_name.replace('SHED-', '')}-${s.crane_number}`;

/** 6-week grid (Sun–Sat) covering the month */
function monthGrid(year, month) {
  const first = new Date(year, month, 1);
  const start = new Date(year, month, 1 - first.getDay());
  return Array.from({ length: 42 }, (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i));
}

export default function EotCraneCalendar() {
  const navigate = useNavigate();
  const today = todayISO();
  const [view, setView] = useState(() => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  });
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(today);
  const [picked, setPicked] = useState([]); // craneKey[]
  const [saving, setSaving] = useState(false);

  const days = monthGrid(view.year, view.month);
  const rangeFrom = toISO(days[0]);
  const rangeTo = toISO(days[days.length - 1]);

  const load = useCallback(() => {
    setLoading(true);
    smsAPI.getEotSchedules({ date_from: rangeFrom, date_to: rangeTo })
      .then((res) => setSchedules(res?.data || []))
      .catch(() => toast.error('Failed to load schedules'))
      .finally(() => setLoading(false));
  }, [rangeFrom, rangeTo]);

  useEffect(() => { load(); }, [load]);

  const byDate = {};
  schedules.forEach((s) => {
    const d = String(s.planned_date).slice(0, 10);
    (byDate[d] = byDate[d] || []).push(s);
  });
  const daySchedules = byDate[selectedDate] || [];
  const scheduledKeys = new Set(daySchedules.map((s) => craneKey(s.shed_name, s.crane_number)));
  const canAdd = selectedDate >= today;

  const shiftMonth = (delta) => {
    setView(({ year, month }) => {
      const d = new Date(year, month + delta, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });
  };

  const goToday = () => {
    const d = new Date();
    setView({ year: d.getFullYear(), month: d.getMonth() });
    setSelectedDate(today);
  };

  const selectDate = (iso) => {
    setSelectedDate(iso);
    setPicked([]);
  };

  const togglePick = (key) => {
    setPicked((p) => (p.includes(key) ? p.filter((k) => k !== key) : [...p, key]));
  };

  const addSchedules = async () => {
    if (!picked.length) {
      toast.error('Select at least one crane');
      return;
    }
    setSaving(true);
    try {
      const cranes = picked.map((k) => {
        const [shed_name, crane_number] = k.split('|');
        return { shed_name, crane_number };
      });
      const res = await smsAPI.createEotSchedules({ planned_date: selectedDate, cranes });
      toast.success(res?.message || 'Schedule added');
      setPicked([]);
      load();
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Failed to add schedule');
    } finally {
      setSaving(false);
    }
  };

  const removeSchedule = async (s) => {
    if (!window.confirm(`Delete schedule #${s.id} (${s.shed_name} Crane ${s.crane_number})?`)) return;
    try {
      await smsAPI.deleteEotSchedule(s.id);
      toast.success('Schedule deleted');
      load();
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Failed to delete schedule');
    }
  };

  const monthTitle = new Date(view.year, view.month, 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="max-w-6xl mx-auto">
        <button
          type="button"
          onClick={() => navigate('/sms/dashboard')}
          className="text-sm text-gray-500 hover:text-gray-700 mb-1"
        >
          ← Back to Dashboard
        </button>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">EOT Crane Schedule</h1>
            <p className="text-sm text-gray-500 mt-1">Tap a date to plan cranes · one checklist per crane per day</p>
          </div>
          <div className="flex flex-wrap gap-3 text-xs font-semibold">
            {Object.entries(SCHEDULE_STATUS_STYLE).map(([key, st]) => (
              <span key={key} className="inline-flex items-center gap-1.5 text-gray-600">
                <span className={`w-2.5 h-2.5 rounded-full ${st.dot}`} />{st.label}
              </span>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm p-3 sm:p-4">
            <div className="flex items-center justify-between mb-3">
              <button type="button" onClick={() => shiftMonth(-1)} className="px-3 py-1.5 rounded-lg border border-gray-300 text-sm hover:bg-gray-50" aria-label="Previous month">‹</button>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-gray-900">{monthTitle}</h2>
                <button type="button" onClick={goToday} className="px-2 py-0.5 rounded border border-amber-300 text-xs font-semibold text-amber-700 hover:bg-amber-50">Today</button>
              </div>
              <button type="button" onClick={() => shiftMonth(1)} className="px-3 py-1.5 rounded-lg border border-gray-300 text-sm hover:bg-gray-50" aria-label="Next month">›</button>
            </div>

            <div className="grid grid-cols-7 text-center text-[11px] font-semibold text-gray-500 mb-1">
              {WEEKDAYS.map((w) => <div key={w} className="py-1">{w}</div>)}
            </div>
            <div className={`grid grid-cols-7 gap-1 ${loading ? 'opacity-60' : ''}`}>
              {days.map((d) => {
                const iso = toISO(d);
                const inMonth = d.getMonth() === view.month;
                const list = byDate[iso] || [];
                const selected = iso === selectedDate;
                return (
                  <button
                    key={iso}
                    type="button"
                    onClick={() => selectDate(iso)}
                    className={`min-h-[64px] sm:min-h-[84px] rounded-lg border p-1 text-left align-top flex flex-col ${
                      selected ? 'border-amber-500 ring-2 ring-amber-300' : 'border-gray-100 hover:border-amber-300'
                    } ${inMonth ? 'bg-white' : 'bg-gray-50'}`}
                  >
                    <span
                      className={`text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full ${
                        iso === today ? 'bg-amber-600 text-white' : inMonth ? 'text-gray-800' : 'text-gray-300'
                      }`}
                    >
                      {d.getDate()}
                    </span>
                    <div className="flex flex-wrap gap-0.5 mt-0.5">
                      {list.slice(0, 4).map((s) => (
                        <span
                          key={s.id}
                          className={`text-[9px] sm:text-[10px] font-bold px-1 rounded border ${SCHEDULE_STATUS_STYLE[scheduleStatus(s)].chip}`}
                        >
                          {shortCrane(s)}
                        </span>
                      ))}
                      {list.length > 4 && <span className="text-[9px] font-semibold text-gray-500">+{list.length - 4}</span>}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 space-y-4 h-fit">
            <div>
              <h2 className="text-sm font-bold text-amber-800 uppercase tracking-wide">{formatDate(selectedDate)}</h2>
              <p className="text-xs text-gray-500 mt-0.5">{daySchedules.length} crane{daySchedules.length === 1 ? '' : 's'} scheduled</p>
            </div>

            {daySchedules.length > 0 && (
              <div className="space-y-2">
                {daySchedules.map((s) => {
                  const status = scheduleStatus(s);
                  const st = SCHEDULE_STATUS_STYLE[status];
                  const crane = findCrane(s.shed_name, s.crane_number);
                  return (
                    <div key={s.id} className="flex items-center justify-between gap-2 border border-gray-100 rounded-lg px-3 py-2">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900">
                          {s.shed_name} · {craneLabel(s.crane_number, crane?.capacity)}
                        </p>
                        <p className="text-[11px] text-gray-500">
                          #{s.id} · <span className={`font-semibold px-1.5 rounded border ${st.chip}`}>{st.label}</span>
                        </p>
                      </div>
                      <div className="flex gap-1.5 shrink-0">
                        {status === 'done' ? (
                          <Link to={`/sms/eot-crane-maintenance/${s.log_id}`} className="px-2.5 py-1 rounded bg-gray-800 text-white text-xs font-semibold">
                            View
                          </Link>
                        ) : (
                          <>
                            <Link to={`/sms/eot-crane-maintenance/new?schedule=${s.id}`} className="px-2.5 py-1 rounded bg-amber-600 text-white text-xs font-semibold">
                              Fill
                            </Link>
                            <button type="button" onClick={() => removeSchedule(s)} className="px-2 py-1 rounded border border-red-200 text-red-600 text-xs font-semibold hover:bg-red-50">
                              ✕
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {canAdd ? (
              <div className="border-t border-gray-100 pt-3 space-y-3">
                <p className="text-xs font-semibold text-gray-600">Add cranes to this date</p>
                {EOT_SHEDS.map((shed) => (
                  <div key={shed.name}>
                    <p className="text-[11px] font-bold text-gray-500 mb-1">{shed.name}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {shed.cranes.map((c) => {
                        const key = craneKey(shed.name, c.number);
                        const already = scheduledKeys.has(key);
                        const on = picked.includes(key);
                        return (
                          <button
                            key={key}
                            type="button"
                            disabled={already}
                            onClick={() => togglePick(key)}
                            className={`px-2.5 py-1 rounded-lg border text-xs font-semibold ${
                              already
                                ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                                : on
                                  ? 'bg-amber-600 text-white border-amber-600'
                                  : 'bg-white text-gray-700 border-gray-300 hover:border-amber-300'
                            }`}
                          >
                            {c.number} · {c.capacity}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
                <button
                  type="button"
                  disabled={saving || !picked.length}
                  onClick={addSchedules}
                  className="w-full py-2 rounded-lg bg-amber-600 text-white text-sm font-semibold hover:bg-amber-700 disabled:opacity-50"
                >
                  {saving ? 'Adding…' : `Add ${picked.length || ''} schedule${picked.length === 1 ? '' : 's'}`}
                </button>
              </div>
            ) : (
              <p className="text-xs text-gray-400 border-t border-gray-100 pt-3">Past date — schedules can only be added for today or later.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
