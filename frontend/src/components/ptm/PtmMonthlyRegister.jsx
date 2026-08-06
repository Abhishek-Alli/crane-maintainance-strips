import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ptmAPI } from '../../services/api';

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const SHORT_DAY   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

export default function PtmMonthlyRegister() {
  const navigate = useNavigate();
  const now = new Date();
  const [templates, setTemplates] = useState([]);
  const [templateId, setTemplateId] = useState('');
  const [year, setYear]   = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [data, setData]   = useState(null);
  const [loading, setLoading] = useState(false);

  const years = Array.from({ length: 3 }, (_, i) => now.getFullYear() - i);

  useEffect(() => {
    ptmAPI.getTemplates()
      .then(res => { setTemplates(res.data || []); if (res.data?.[0]) setTemplateId(String(res.data[0].id)); })
      .catch(() => toast.error('Failed to load templates'));
  }, []);

  const fetchData = async () => {
    if (!templateId) return toast.error('Select a template');
    setLoading(true); setData(null);
    try {
      const res = await ptmAPI.getMonthlyRegister(templateId, { year, month });
      setData(res.data);
    } catch {
      toast.error('Failed to load register data');
    } finally {
      setLoading(false);
    }
  };

  // Cell display
  const cellDisplay = (cell, paramType) => {
    if (!cell) return { text: '', bg: '' };
    if (paramType) return { text: cell.value ?? '', bg: cell.status === 'NOT_OK' ? '#fee2e2' : cell.value ? '#f0fdf4' : '' };
    if (cell.status === 'OK')     return { text: 'OK', bg: '#d1fae5', color: '#065f46' };
    if (cell.status === 'NOT_OK') return { text: 'NO', bg: '#fee2e2', color: '#991b1b' };
    return { text: '', bg: '' };
  };

  // NOT OK issues list
  const getNotOkIssues = () => {
    if (!data) return [];
    const issues = [];
    for (const day of data.days) {
      if (!day.filled) continue;
      for (const item of data.items) {
        const cell = item.cells[day.date];
        if (cell && cell.status === 'NOT_OK') {
          issues.push({ date: day.date, day: day.day, section: item.section, item: item.item, remark: cell.remark, action: cell.action_taken });
        }
      }
    }
    return issues;
  };

  const downloadExcel = () => {
    if (!data || !data.items.length) return;
    const wb = XLSX.utils.book_new();
    const label = data.templateName || 'PTM';

    // Sheet 1: Pivot
    const titleRow  = [`${label} — Monthly Register — ${MONTH_NAMES[month-1]} ${year}`];
    const dayNumRow = ['Section', 'Item'];
    const dayAbbRow = ['', ''];
    for (const day of data.days) {
      const d = new Date(day.date + 'T00:00:00');
      dayNumRow.push(day.day);
      dayAbbRow.push(SHORT_DAY[d.getDay()]);
    }
    dayNumRow.push('NOT OK Total');
    dayAbbRow.push('');

    const rows = [titleRow, dayNumRow, dayAbbRow];
    for (const item of data.items) {
      const row = [item.section, item.item];
      let notOkCount = 0;
      for (const day of data.days) {
        const cell = item.cells[day.date];
        if (!day.filled) { row.push('—'); continue; }
        if (!cell) { row.push(''); continue; }
        if (data.paramType) { row.push(cell.value ?? ''); }
        else {
          row.push(cell.status === 'OK' ? 'OK' : cell.status === 'NOT_OK' ? 'NO' : '');
          if (cell.status === 'NOT_OK') notOkCount++;
        }
      }
      row.push(notOkCount || '');
      rows.push(row);
    }
    const ws1 = XLSX.utils.aoa_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws1, 'Register');

    // Sheet 2: NOT OK detail
    if (!data.paramType) {
      const issues = getNotOkIssues();
      const issueRows = [['Date', 'Day', 'Section', 'Item', 'Remark', 'Action Taken']];
      for (const iss of issues) {
        issueRows.push([iss.date, iss.day, iss.section, iss.item, iss.remark || '', iss.action || '']);
      }
      const ws2 = XLSX.utils.aoa_to_sheet(issueRows);
      XLSX.utils.book_append_sheet(wb, ws2, 'NOT OK Details');
    }

    XLSX.writeFile(wb, `PTM_${label}_${year}_${String(month).padStart(2,'0')}.xlsx`);
  };

  const downloadPDF = () => {
    if (!data || !data.items.length) return;
    const label = data.templateName || 'PTM';
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

    const renderTable = (days) => {
      const head = [['Section', 'Item', ...days.map(d => {
        const dt = new Date(d.date + 'T00:00:00');
        return `${d.day}\n${SHORT_DAY[dt.getDay()]}`;
      })]];
      const body = data.items.map(item => [
        item.section, item.item,
        ...days.map(day => {
          if (!day.filled) return '—';
          const cell = item.cells[day.date];
          if (!cell) return '';
          if (data.paramType) return cell.value ?? '';
          return cell.status === 'OK' ? 'OK' : cell.status === 'NOT_OK' ? 'NO' : '';
        }),
      ]);
      return { head, body };
    };

    const mid = Math.ceil(data.daysInMonth / 2);
    const half1 = data.days.slice(0, mid);
    const half2 = data.days.slice(mid);

    const title = `PTM: ${label} — ${MONTH_NAMES[month-1]} ${year}`;

    const { head: h1, body: b1 } = renderTable(half1);
    doc.setFontSize(11);
    doc.text(title + ` (Days 1–${mid})`, 14, 14);
    autoTable(doc, {
      head: h1, body: b1, startY: 18,
      styles: { fontSize: 6, cellPadding: 1 },
      headStyles: { fillColor: [29, 78, 216], textColor: 255, fontStyle: 'bold' },
      didParseCell: (data2) => {
        const val = String(data2.cell.text?.[0] || '');
        if (val === 'NO' || val === 'NOT_OK') data2.cell.styles.fillColor = [254, 226, 226];
        if (val === 'OK') data2.cell.styles.fillColor = [209, 250, 229];
      },
    });

    if (half2.length) {
      doc.addPage();
      const { head: h2, body: b2 } = renderTable(half2);
      doc.setFontSize(11);
      doc.text(title + ` (Days ${mid+1}–${data.daysInMonth})`, 14, 14);
      autoTable(doc, {
        head: h2, body: b2, startY: 18,
        styles: { fontSize: 6, cellPadding: 1 },
        headStyles: { fillColor: [29, 78, 216], textColor: 255, fontStyle: 'bold' },
        didParseCell: (data2) => {
          const val = String(data2.cell.text?.[0] || '');
          if (val === 'NO' || val === 'NOT_OK') data2.cell.styles.fillColor = [254, 226, 226];
          if (val === 'OK') data2.cell.styles.fillColor = [209, 250, 229];
        },
      });
    }

    doc.save(`PTM_${label}_${year}_${String(month).padStart(2,'0')}.pdf`);
  };

  return (
    <div className="max-w-full px-4 py-6">
      <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
        <div>
          <button type="button" onClick={() => navigate('/ptm/dashboard')}
            className="text-sm text-gray-500 hover:text-gray-700 mb-2 flex items-center gap-1">
            ← Back to Dashboard
          </button>
          <h1 className="text-2xl font-bold text-blue-800">PTM Monthly Register</h1>
          <p className="text-gray-500 text-sm mt-1">Pivot view of all checksheet items by date</p>
        </div>
        {data && (
          <div className="flex gap-2">
            <button onClick={downloadExcel} className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700">Excel</button>
            <button onClick={downloadPDF} className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-700">PDF</button>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 mb-5 flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Template</label>
          <select value={templateId} onChange={e => setTemplateId(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
            <option value="">-- Select --</option>
            {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Month</label>
          <select value={month} onChange={e => setMonth(Number(e.target.value))} className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
            {MONTH_NAMES.map((n, i) => <option key={i+1} value={i+1}>{n}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Year</label>
          <select value={year} onChange={e => setYear(Number(e.target.value))} className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <button onClick={fetchData} className="bg-blue-600 text-white px-5 py-1.5 rounded-lg text-sm font-medium hover:bg-blue-700">Load</button>
      </div>

      {loading && (
        <div className="flex justify-center py-10"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>
      )}

      {data && (
        <>
          {/* Stats */}
          <div className="flex gap-3 mb-4 flex-wrap">
            <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2 text-sm">
              <span className="text-blue-600 font-semibold">{data.days.filter(d => d.filled).length}</span>
              <span className="text-blue-500"> / {data.daysInMonth} days filled</span>
            </div>
            {!data.paramType && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-2 text-sm">
                <span className="text-red-600 font-semibold">{getNotOkIssues().length}</span>
                <span className="text-red-500"> NOT OK entries</span>
              </div>
            )}
          </div>

          {/* Pivot Table */}
          {data.items.length === 0 ? (
            <div className="text-center py-10 text-gray-500 bg-white rounded-xl border border-gray-200">No data for this month</div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
              <table className="text-xs border-collapse min-w-full">
                <thead>
                  <tr className="bg-blue-700 text-white">
                    <th className="px-3 py-2 text-left font-semibold border border-blue-600 sticky left-0 bg-blue-700 z-10">Section</th>
                    <th className="px-3 py-2 text-left font-semibold border border-blue-600 sticky left-20 bg-blue-700 z-10">Item</th>
                    {data.days.map(day => {
                      const dt = new Date(day.date + 'T00:00:00');
                      return (
                        <th key={day.date} className={`px-1 py-1 text-center border border-blue-600 min-w-[2.5rem] ${!day.filled ? 'opacity-60' : ''}`}>
                          <div>{day.day}</div>
                          <div className="text-blue-200">{SHORT_DAY[dt.getDay()]}</div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((item, rowIdx) => (
                    <tr key={rowIdx} className={rowIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-3 py-1.5 border border-gray-200 font-medium text-gray-700 sticky left-0 bg-inherit z-10 max-w-[5rem] truncate" title={item.section}>{item.section}</td>
                      <td className="px-3 py-1.5 border border-gray-200 text-gray-600 sticky left-20 bg-inherit z-10 max-w-[8rem]" title={item.item}>{item.item}</td>
                      {data.days.map(day => {
                        const cell = item.cells[day.date];
                        const { text, bg, color } = cellDisplay(cell, data.paramType);
                        return (
                          <td key={day.date} className="border border-gray-200 text-center p-0 h-7">
                            {!day.filled ? (
                              <span className="text-gray-300">—</span>
                            ) : (
                              <div
                                title={cell?.remark ? `Remark: ${cell.remark}` : undefined}
                                style={{ background: bg, color: color || '#374151', fontSize: 10, padding: '2px 4px', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                              >
                                {text}
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* NOT OK Detail */}
          {!data.paramType && getNotOkIssues().length > 0 && (
            <div className="mt-6">
              <h3 className="text-base font-semibold text-gray-700 mb-3">NOT OK Items</h3>
              <div className="space-y-2">
                {getNotOkIssues().map((iss, i) => (
                  <div key={i} className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                    <div className="flex gap-2 items-center flex-wrap">
                      <span className="text-xs font-bold text-red-700 bg-red-100 px-2 py-0.5 rounded">Day {iss.day}</span>
                      <span className="text-xs text-gray-500">{iss.date}</span>
                      <span className="text-sm font-medium text-gray-800">{iss.section} — {iss.item}</span>
                    </div>
                    {iss.remark && <p className="mt-1 text-xs text-red-700">Remark: {iss.remark}</p>}
                    {iss.action && <p className="mt-0.5 text-xs text-blue-700">Action: {iss.action}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
