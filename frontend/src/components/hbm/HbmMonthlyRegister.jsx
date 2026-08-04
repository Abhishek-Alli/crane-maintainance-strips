import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { hbmAPI } from '../../services/api';

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const SHORT_DAY   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

const SUPPORTED_TYPES = [
  { value: 'dc-motor',         label: 'DC Motor',                          itemBased: true  },
  { value: 'rolling-stand',    label: 'Rolling Stand',                     itemBased: true  },
  { value: 'mill-mech',        label: 'Mill Mechanical',                   itemBased: true  },
  { value: 'cooling-bed',      label: 'Cooling Bed',                       itemBased: true  },
  { value: 'pumphouse',        label: 'Pumphouse',                         itemBased: true  },
  { value: 'bar-bundle',       label: 'Bar Bundle Area',                   itemBased: true  },
  { value: 'before-rolling',   label: 'Before Rolling',                    itemBased: true  },
  { value: 'pump-param',       label: 'Pump Parameter',                    itemBased: false },
  { value: 'water-param',      label: 'Water Parameters',                  itemBased: false },
  { value: 'ph-maint',         label: 'PH Maintenance Work Sheet',         itemBased: false },
  { value: 'transformer',      label: 'HBM Transformer',                   itemBased: false },
  { value: 'oil-level',        label: 'Daily Oil Level',                   itemBased: false },
  { value: 'dc-motor-airflow', label: 'DC Motor Airflow, Temp & Vibration',itemBased: false },
  { value: 'roughing-gb-temp', label: 'Roughing Stand & GB Bearing Temp',  itemBased: false },
  { value: 'breakdown',        label: 'HBM Breakdown Report',              itemBased: false },
];

export default function HbmMonthlyRegister() {
  const now   = new Date();
  const [year, setYear]   = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [type, setType]   = useState('rolling-stand');
  const [data, setData]   = useState(null);
  const [loading, setLoading] = useState(false);
  const [tooltip, setTooltip] = useState(null); // { x, y, cell, item, date }

  const years = Array.from({ length: 3 }, (_, i) => now.getFullYear() - i);
  const label = SUPPORTED_TYPES.find(t => t.value === type)?.label || type;

  const fetchData = async () => {
    setLoading(true);
    setData(null);
    try {
      const res = await hbmAPI.getMonthlyRegister(type, { year, month });
      setData(res.data);
    } catch {
      toast.error('Failed to load register data');
    } finally {
      setLoading(false);
    }
  };

  // Parse "X min" → number (returns 0 if not parseable)
  const parseMins = (val) => {
    if (val == null) return 0;
    const n = parseInt(String(val));
    return isNaN(n) ? 0 : n;
  };

  const isBreakdown = type === 'breakdown';

  // Per-day total minutes (sum across all items for that date)
  const dayTotals = {};
  if (data && isBreakdown) {
    for (const day of data.days) {
      dayTotals[day.date] = data.items.reduce((sum, item) => sum + parseMins(item.cells[day.date]?.value), 0);
    }
  }

  // Collect all NOT OK issues across all items and dates
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


    // ── Sheet 1: Pivot grid ──────────────────────────────────────
    const titleRow  = [`${label} — Monthly Register — ${MONTH_NAMES[month-1]} ${year}`];
    const dayNumRow = ['Section', 'Item'];
    const dayAbbRow = ['', ''];
    for (const day of data.days) {
      const d = new Date(day.date + 'T00:00:00');
      dayNumRow.push(day.day);
      dayAbbRow.push(SHORT_DAY[d.getDay()]);
    }

    if (isBreakdown) {
      dayNumRow.push('Total Min');
      dayAbbRow.push('');
    } else {
      dayNumRow.push('NOT OK Count');
      dayAbbRow.push('');
    }

    const aoa = [titleRow, dayNumRow, dayAbbRow];
    let currentSection = null;
    for (const item of data.items) {
      const row = [item.section !== currentSection ? item.section : '', item.item];
      currentSection = item.section;
      let notOkCount = 0;
      let rowTotal = 0;
      for (const day of data.days) {
        const cell = item.cells[day.date];
        if (isBreakdown) {
          const mins = parseMins(cell?.value);
          row.push(mins > 0 ? mins : (day.filled ? 0 : '—'));
          rowTotal += mins;
        } else {
          if (!day.filled)                    row.push('—');
          else if (!cell)                     row.push('?');
          else if (cell.status === 'NOT_OK') { row.push('✗'); notOkCount++; }
          else                               row.push('✓');
        }
      }
      row.push(isBreakdown ? (rowTotal > 0 ? rowTotal : 0) : (notOkCount || ''));
      aoa.push(row);
    }
    if (isBreakdown) {
      // Daily total row
      const dtRow = ['', 'Daily Total (min)'];
      let grandTotal = 0;
      for (const day of data.days) {
        const t = dayTotals[day.date] || 0;
        dtRow.push(t > 0 ? t : 0);
        grandTotal += t;
      }
      dtRow.push(grandTotal);
      aoa.push(dtRow);
    } else {
      // Not-filled footer
      const notFilledRow = ['', 'NOT FILLED'];
      for (const day of data.days) notFilledRow.push(day.filled ? '' : '✗');
      notFilledRow.push(`${data.days.filter(d => !d.filled).length} days`);
      aoa.push([], notFilledRow);
    }

    const ws1 = XLSX.utils.aoa_to_sheet(aoa);
    const colWidths = [{ wch: 28 }, { wch: 36 }];
    for (let i = 0; i < data.daysInMonth; i++) colWidths.push({ wch: 4 });
    colWidths.push({ wch: 14 });
    ws1['!cols'] = colWidths;
    const totalCols = 2 + data.daysInMonth + 1;
    ws1['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: totalCols - 1 } }];
    XLSX.utils.book_append_sheet(wb, ws1, `${MONTH_NAMES[month-1]} ${year}`);

    // ── Sheet 2: NOT OK Details ──────────────────────────────────
    const issues = getNotOkIssues();
    const detailAoa = [
      [`${label} — NOT OK Details — ${MONTH_NAMES[month-1]} ${year}`],
      ['Date', 'Day', 'Section', 'Item / Parameter', 'Remark / Cause', 'Action Taken'],
    ];
    for (const iss of issues) {
      const d = new Date(iss.date + 'T00:00:00');
      detailAoa.push([
        iss.date,
        `${iss.day} ${SHORT_DAY[d.getDay()]}`,
        iss.section,
        iss.item,
        iss.remark || '',
        iss.action  || '',
      ]);
    }
    if (issues.length === 0) detailAoa.push(['No NOT OK items found for this month', '', '', '', '', '']);

    const ws2 = XLSX.utils.aoa_to_sheet(detailAoa);
    ws2['!cols'] = [{ wch: 14 }, { wch: 10 }, { wch: 28 }, { wch: 36 }, { wch: 40 }, { wch: 40 }];
    ws2['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 5 } }];
    XLSX.utils.book_append_sheet(wb, ws2, 'NOT OK Details');

    // ── Sheet 3: Not-filled dates ────────────────────────────────
    const notFilledAoa = [
      [`${label} — Not Filled Dates — ${MONTH_NAMES[month-1]} ${year}`],
      ['Date', 'Day', 'Weekday'],
    ];
    for (const day of data.days.filter(d => !d.filled)) {
      const d = new Date(day.date + 'T00:00:00');
      notFilledAoa.push([day.date, day.day, SHORT_DAY[d.getDay()]]);
    }
    if (!data.days.some(d => !d.filled)) notFilledAoa.push(['All days filled!', '', '']);
    const ws3 = XLSX.utils.aoa_to_sheet(notFilledAoa);
    ws3['!cols'] = [{ wch: 14 }, { wch: 8 }, { wch: 12 }];
    ws3['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 2 } }];
    XLSX.utils.book_append_sheet(wb, ws3, 'Not Filled Dates');

    XLSX.writeFile(wb, `HBM-${type}-${MONTH_NAMES[month-1]}-${year}.xlsx`);
  };

  // ── Per-table download helpers ────────────────────────────────
  const makeTitle = (suffix) => `${label} — ${suffix} — ${MONTH_NAMES[month-1]} ${year}`;

  const downloadPivotExcel = () => downloadExcel(); // existing full workbook

  const downloadPivotPDF = () => {
    if (!data) return;

    // For breakdown: portrait A4 with 3 stacked tables (days 1-10, 11-20, 21-end)
    // For others: landscape A4 single table
    const orientation = isBreakdown ? 'portrait' : 'landscape';
    const doc = new jsPDF({ orientation, unit: 'pt', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();
    const margin = 20;

    doc.setFontSize(10);
    doc.text(makeTitle('Monthly Register'), margin, 22);
    doc.setFontSize(7);
    doc.setTextColor(100);
    doc.text(`Filled: ${data.days.filter(d=>d.filled).length}/${data.daysInMonth} days`, pageW - margin, 22, { align: 'right' });
    doc.setTextColor(0);

    // Helper: build a cell object for a breakdown day cell
    const bdCell = (item, day) => {
      const c = item.cells[day.date];
      if (!day.filled || !c) return { content: '—', styles: { textColor: [200,200,200] } };
      const mins = parseMins(c.value);
      return mins > 0
        ? { content: String(mins), styles: { textColor: [185,28,28], fontStyle: 'bold' } }
        : { content: '—', styles: { textColor: [200,200,200] } };
    };

    // Helper: build a cell object for non-breakdown day cell
    const itemCell = (item, day) => {
      const c = item.cells[day.date];
      if (!day.filled) return { content: '—', styles: { textColor: [200,200,200] } };
      if (!c) return { content: '?', styles: { textColor: [234,179,8] } };
      return c.status === 'NOT_OK'
        ? { content: '✗', styles: { textColor: [185,28,28], fontStyle: 'bold' } }
        : { content: '✓', styles: { textColor: [22,163,74] } };
    };

    if (isBreakdown) {
      // Split days into 3 chunks
      const chunks = [
        data.days.filter(d => d.day <= 10),
        data.days.filter(d => d.day >= 11 && d.day <= 20),
        data.days.filter(d => d.day >= 21),
      ];
      const grandTotal = Object.values(dayTotals).reduce((a,b)=>a+b,0);
      const typeColW = 130;
      let curY = 32;

      const isLastChunk = (ci) => ci === chunks.filter(c=>c.length>0).length - 1;
      let renderedCount = 0;

      chunks.forEach((chunkDays, ci) => {
        if (!chunkDays.length) return;
        const isLast = renderedCount === chunks.filter(c=>c.length>0).length - 1;
        renderedCount++;

        // Extra "Grand Total 1–31" column only on last table
        const extraTotalColW = isLast ? 32 : 0;
        const dayColW = Math.floor((pageW - margin*2 - typeColW - 28 - extraTotalColW) / chunkDays.length);
        const chunkLabel = ci === 0 ? '1–10' : ci === 1 ? '11–20' : `21–${data.daysInMonth}`;

        const head = [[
          { content: 'Breakdown Type', styles: { halign: 'left' } },
          ...chunkDays.map(d => {
            const wd = new Date(d.date+'T00:00:00');
            return { content: `${d.day}\n${SHORT_DAY[wd.getDay()]}`, styles: { halign: 'center' } };
          }),
          { content: `Total\n${chunkLabel}`, styles: { halign: 'center' } },
          ...(isLast ? [{ content: 'Grand\n1–31', styles: { halign: 'center', fillColor: [254,215,170], textColor: [154,52,18] } }] : []),
        ]];

        const body = data.items.map(item => {
          const chunkTotal = chunkDays.reduce((s,day)=>s+parseMins(item.cells[day.date]?.value),0);
          const monthTotal = data.days.reduce((s,day)=>s+parseMins(item.cells[day.date]?.value),0);
          return [
            item.item,
            ...chunkDays.map(day => bdCell(item, day)),
            { content: chunkTotal > 0 ? String(chunkTotal) : '—', styles: { fontStyle:'bold', textColor: chunkTotal>0?[194,65,12]:[180,180,180] } },
            ...(isLast ? [{ content: monthTotal > 0 ? String(monthTotal) : '—', styles: { fontStyle:'bold', fillColor:[254,243,199], textColor: monthTotal>0?[154,52,18]:[180,180,180] } }] : []),
          ];
        });

        // Daily total footer row
        const chunkDayTotal = chunkDays.reduce((s,d)=>s+(dayTotals[d.date]||0),0);
        body.push([
          { content: 'Daily Total (min)', styles: { fontStyle:'bold', fillColor:[255,237,213], textColor:[154,52,18] } },
          ...chunkDays.map(day => ({
            content: dayTotals[day.date]>0 ? String(dayTotals[day.date]) : '—',
            styles: { fontStyle:'bold', fillColor:[255,237,213], textColor: dayTotals[day.date]>0?[185,28,28]:[180,180,180] },
          })),
          { content: String(chunkDayTotal), styles: { fontStyle:'bold', fillColor:[254,215,170], textColor:[154,52,18] } },
          ...(isLast ? [{ content: String(grandTotal), styles: { fontStyle:'bold', fillColor:[253,186,116], textColor:[154,52,18] } }] : []),
        ]);

        autoTable(doc, {
          head,
          body,
          startY: curY,
          margin: { left: margin, right: margin },
          styles: { fontSize: 7, cellPadding: 2, overflow: 'ellipsize' },
          headStyles: { fillColor: [185,28,28], textColor: 255, fontStyle: 'bold', fontSize: 7, halign: 'center', minCellHeight: 20 },
          columnStyles: {
            0: { cellWidth: typeColW, halign: 'left' },
            ...Object.fromEntries(chunkDays.map((_, i) => [i+1, { cellWidth: dayColW, halign: 'center' }])),
            [chunkDays.length + 1]: { cellWidth: 28, halign: 'center' },
            ...(isLast ? { [chunkDays.length + 2]: { cellWidth: 32, halign: 'center' } } : {}),
          },
        });
        curY = doc.lastAutoTable.finalY + 14;
      });

    } else {
      // Non-breakdown: landscape A4, split into 3 stacked tables (days 1-10, 11-20, 21-end)
      const chunks = [
        data.days.filter(d => d.day <= 10),
        data.days.filter(d => d.day >= 11 && d.day <= 20),
        data.days.filter(d => d.day >= 21),
      ];
      const itemColW = data.paramType ? 90 : 100;
      const lastColW = data.paramType ? 0 : 20;
      let curY2 = 32;

      // Helper: build a cell for param-type or item-type sheets
      const buildCell = (item, day) => {
        const c = item.cells[day.date];
        if (!day.filled) return { content: '—', styles: { textColor: [200,200,200] } };
        if (!c) return { content: '?', styles: { textColor: [234,179,8] } };
        if (data.paramType) {
          const val = c.value != null ? String(c.value) : '';
          const display = val.length > 7 ? val.slice(0,7) : val;
          const isNotOk = c.status === 'NOT_OK';
          const isOk = c.status === 'OK';
          return {
            content: display || '—',
            styles: {
              textColor: isNotOk ? [185,28,28] : isOk ? [21,128,61] : [50,50,50],
              fontStyle: isNotOk ? 'bold' : 'normal',
            },
          };
        }
        return c.status === 'NOT_OK'
          ? { content: '✗', styles: { textColor: [185,28,28], fontStyle: 'bold' } }
          : { content: '✓', styles: { textColor: [22,163,74] } };
      };

      chunks.forEach((chunkDays, ci) => {
        if (!chunkDays.length) return;
        const chunkLabel = ci === 0 ? '1–10' : ci === 1 ? '11–20' : `21–${data.daysInMonth}`;
        const availW = pageW - margin*2 - itemColW - lastColW;
        const dayColW = Math.max(10, Math.floor(availW / chunkDays.length));

        const headRow = [
          { content: `Item — Days ${chunkLabel}`, styles: { halign: 'left' } },
          ...chunkDays.map(d => {
            const wd = new Date(d.date+'T00:00:00');
            return { content: `${d.day}\n${SHORT_DAY[wd.getDay()]}`, styles: { halign: 'center' } };
          }),
          ...(data.paramType ? [] : [{ content: 'NOT\nOK', styles: { halign: 'center' } }]),
        ];

        const body = [];
        let lastSec = null;
        for (const item of data.items) {
          if (item.section !== lastSec) {
            lastSec = item.section;
            const span = 1 + chunkDays.length + (data.paramType ? 0 : 1);
            body.push([{ content: item.section, colSpan: span, styles: { fontStyle:'bold', fillColor:[209,250,229], textColor:[6,95,70], fontSize: 6 } }]);
          }
          const notOkCount = data.paramType ? null : data.days.filter(day=>item.cells[day.date]?.status==='NOT_OK').length;
          body.push([
            { content: item.item, styles: { halign: 'left' } },
            ...chunkDays.map(day => buildCell(item, day)),
            ...(data.paramType ? [] : [{ content: String(notOkCount||''), styles: { halign:'center' } }]),
          ]);
        }

        autoTable(doc, {
          head: [headRow],
          body,
          startY: curY2,
          margin: { left: margin, right: margin },
          styles: { fontSize: 6, cellPadding: 1.5, overflow: 'ellipsize' },
          headStyles: { fillColor: [22,163,74], textColor: 255, fontStyle: 'bold', fontSize: 6.5, halign: 'center', minCellHeight: 18 },
          columnStyles: {
            0: { cellWidth: itemColW, halign: 'left' },
            ...Object.fromEntries(chunkDays.map((_,i) => [i+1, { cellWidth: dayColW, halign:'center' }])),
            ...(data.paramType ? {} : { [chunkDays.length+1]: { cellWidth: lastColW, halign:'center', fontStyle:'bold' } }),
          },
        });
        curY2 = doc.lastAutoTable.finalY + 12;
      });
    }

    doc.save(`HBM-${type}-Pivot-${MONTH_NAMES[month-1]}-${year}.pdf`);
  };

  const downloadSummaryExcel = () => {
    if (!data?.details?.length) return;
    const groupMap = {};
    for (const row of data.details) {
      const key = `${row.date}||${row.size||''}||${row.type}||${row.reason||''}`;
      if (!groupMap[key]) groupMap[key] = { date: row.date, size: row.size||'', type: row.type, reason: row.reason||'', minutes: 0 };
      groupMap[key].minutes += row.minutes;
    }
    const groups = Object.values(groupMap).sort((a,b) => a.date.localeCompare(b.date) || a.type.localeCompare(b.type));
    const aoa = [
      [makeTitle('Reason-wise Summary')],
      ['Date', 'Size', 'Breakdown Type', 'Reason', 'Total Min'],
      ...groups.map(g => {
        const d = new Date(g.date+'T00:00:00');
        return [`${d.getDate()} ${SHORT_DAY[d.getDay()]} ${MONTH_NAMES[month-1].slice(0,3)}`, g.size||'—', g.type, g.reason||'—', g.minutes];
      }),
      ['Grand Total', '', '', '', groups.reduce((s,g)=>s+g.minutes,0)],
    ];
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws['!cols'] = [{wch:16},{wch:16},{wch:28},{wch:50},{wch:12}];
    ws['!merges'] = [{s:{r:0,c:0},e:{r:0,c:4}}];
    XLSX.utils.book_append_sheet(wb, ws, 'Summary');
    XLSX.writeFile(wb, `HBM-${type}-Summary-${MONTH_NAMES[month-1]}-${year}.xlsx`);
  };

  const downloadSummaryPDF = () => {
    if (!data?.details?.length) return;
    const groupMap = {};
    for (const row of data.details) {
      const key = `${row.date}||${row.size||''}||${row.type}||${row.reason||''}`;
      if (!groupMap[key]) groupMap[key] = { date: row.date, size: row.size||'', type: row.type, reason: row.reason||'', minutes: 0 };
      groupMap[key].minutes += row.minutes;
    }
    const groups = Object.values(groupMap).sort((a,b) => a.date.localeCompare(b.date) || a.type.localeCompare(b.type));
    const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
    doc.setFontSize(11);
    doc.text(makeTitle('Reason-wise Summary'), 40, 30);
    autoTable(doc, {
      head: [['Date', 'Size', 'Breakdown Type', 'Reason', 'Total Min']],
      body: [
        ...groups.map(g => {
          const d = new Date(g.date+'T00:00:00');
          return [`${d.getDate()} ${SHORT_DAY[d.getDay()]} ${MONTH_NAMES[month-1].slice(0,3)}`, g.size||'—', g.type, g.reason||'—', `${g.minutes} min`];
        }),
        ['Grand Total', '', '', '', `${groups.reduce((s,g)=>s+g.minutes,0)} min`],
      ],
      startY: 45,
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: [185,28,28] },
      columnStyles: { 4: { halign: 'center' } },
    });
    doc.save(`HBM-${type}-Summary-${MONTH_NAMES[month-1]}-${year}.pdf`);
  };

  const downloadDetailExcel = () => {
    if (!data?.details?.length) return;
    const aoa = [
      [makeTitle('Breakdown Details')],
      ['Date', 'Size', 'Time / Slot', 'Breakdown Type', 'Minutes', 'Reason'],
      ...data.details.map(row => {
        const d = new Date(row.date+'T00:00:00');
        return [`${d.getDate()} ${SHORT_DAY[d.getDay()]} ${MONTH_NAMES[month-1].slice(0,3)}`, row.size||'—', row.slot||'—', row.type, row.minutes, row.reason||'—'];
      }),
      ['Total', '', '', '', data.details.reduce((s,r)=>s+r.minutes,0), ''],
    ];
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws['!cols'] = [{wch:16},{wch:16},{wch:14},{wch:28},{wch:10},{wch:60}];
    ws['!merges'] = [{s:{r:0,c:0},e:{r:0,c:5}}];
    XLSX.utils.book_append_sheet(wb, ws, 'Details');
    XLSX.writeFile(wb, `HBM-${type}-Details-${MONTH_NAMES[month-1]}-${year}.xlsx`);
  };

  const downloadDetailPDF = () => {
    if (!data?.details?.length) return;
    const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
    doc.setFontSize(11);
    doc.text(makeTitle('Breakdown Details'), 40, 30);
    autoTable(doc, {
      head: [['Date', 'Size', 'Time / Slot', 'Breakdown Type', 'Minutes', 'Reason']],
      body: [
        ...data.details.map(row => {
          const d = new Date(row.date+'T00:00:00');
          return [`${d.getDate()} ${SHORT_DAY[d.getDay()]} ${MONTH_NAMES[month-1].slice(0,3)}`, row.size||'—', row.slot||'—', row.type, `${row.minutes} min`, row.reason||'—'];
        }),
        ['Total', '', '', '', `${data.details.reduce((s,r)=>s+r.minutes,0)} min`, ''],
      ],
      startY: 45,
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: [194,65,12] },
      columnStyles: { 4: { halign: 'center' } },
    });
    doc.save(`HBM-${type}-Details-${MONTH_NAMES[month-1]}-${year}.pdf`);
  };

  const notOkIssues = data ? getNotOkIssues() : [];

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="max-w-full mx-auto">

        {/* Header */}
        <div className="mb-5">
          <Link to="/hbm/dashboard" className="text-emerald-600 hover:underline text-sm">← Dashboard</Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-1">Monthly Register</h1>
          <p className="text-sm text-gray-500">Dates as columns · Items as rows · Hover ✗ for remark · Download includes full detail</p>
        </div>

        {/* Controls */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 mb-5 flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Checksheet</label>
            <select value={type} onChange={e => { setType(e.target.value); setData(null); }}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
              {SUPPORTED_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Month</label>
            <select value={month} onChange={e => { setMonth(+e.target.value); setData(null); }}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
              {MONTH_NAMES.map((mn, i) => <option key={i+1} value={i+1}>{mn}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Year</label>
            <select value={year} onChange={e => { setYear(+e.target.value); setData(null); }}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <button onClick={fetchData} disabled={loading}
            className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold px-5 py-2 rounded-lg text-sm">
            {loading ? 'Loading…' : 'Load Register'}
          </button>
          {data && data.items.length > 0 && (
            <div className="flex gap-2">
              <button onClick={downloadPivotExcel}
                className="bg-green-700 hover:bg-green-800 text-white font-semibold px-4 py-2 rounded-lg text-sm flex items-center gap-1.5">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
                Excel
              </button>
              <button onClick={downloadPivotPDF}
                className="bg-red-700 hover:bg-red-800 text-white font-semibold px-4 py-2 rounded-lg text-sm flex items-center gap-1.5">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
                PDF
              </button>
            </div>
          )}
        </div>

        {/* Register Table */}
        {data && (
          data.items.length === 0 ? (
            <div className="text-center py-16 text-gray-400">No data found for {MONTH_NAMES[month-1]} {year}</div>
          ) : (
            <>
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden mb-6">
                {/* Summary strip */}
                <div className="px-4 py-3 bg-emerald-50 border-b border-emerald-100 flex flex-wrap gap-6 text-sm">
                  <span className="text-gray-600">Checksheet: <strong className="text-gray-900">{label}</strong></span>
                  <span className="text-gray-600">Month: <strong className="text-gray-900">{MONTH_NAMES[month-1]} {year}</strong></span>
                  <span className="text-emerald-700 font-semibold">Filled: {data.days.filter(d => d.filled).length} / {data.daysInMonth} days</span>
                  <span className="text-red-600 font-semibold">Not filled: {data.days.filter(d => !d.filled).length} days</span>
                  {notOkIssues.length > 0 && (
                    <span className="text-orange-600 font-semibold">NOT OK issues: {notOkIssues.length}</span>
                  )}
                  {data.paramType && (
                    <span className="text-blue-500 text-xs italic">Parameter view — hover any cell for full value</span>
                  )}
                </div>

                <div className="overflow-x-auto">
                  <table className="border-collapse text-xs">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="border border-gray-300 px-3 py-2 text-left font-semibold text-gray-700 sticky left-0 bg-gray-100 z-10 min-w-[16rem]">
                          {isBreakdown ? 'Breakdown Type' : 'Item'}
                        </th>
                        {data.days.map(day => {
                          const d = new Date(day.date + 'T00:00:00');
                          return (
                            <th key={day.date}
                              className={`border border-gray-300 py-1 text-center font-semibold w-8 min-w-[2rem] ${day.filled ? 'text-emerald-800 bg-emerald-50' : 'text-gray-400 bg-gray-50'}`}>
                              <div>{day.day}</div>
                              <div className="font-normal text-[10px] text-gray-400">{SHORT_DAY[d.getDay()]}</div>
                            </th>
                          );
                        })}
                        {isBreakdown && (
                          <th className="border border-gray-300 py-1 px-2 text-center font-bold text-orange-700 bg-orange-50 min-w-[5rem]">
                            Total<div className="font-normal text-[10px]">Min</div>
                          </th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        let lastSection = null;
                        const rows = [];
                        data.items.forEach((item, idx) => {
                          const isNewSection = item.section !== lastSection;
                          lastSection = item.section;
                          const totalDayCols = data.days.length + (isBreakdown ? 1 : 0);
                          if (isNewSection && !isBreakdown) {
                            rows.push(
                              <tr key={`sec-${idx}`} className="bg-emerald-50 border-t-2 border-emerald-300">
                                <td colSpan={1 + totalDayCols} className="border border-emerald-200 px-3 py-1 text-[10px] font-bold text-emerald-800 uppercase tracking-wide sticky left-0 bg-emerald-50 z-10">
                                  {item.section}
                                </td>
                              </tr>
                            );
                          }
                          rows.push(
                            <tr key={idx}>
                              <td className="border border-gray-200 px-3 py-1.5 text-gray-800 sticky left-0 bg-white z-10 min-w-[16rem]">{item.item}</td>
                              {data.days.map(day => {
                                const cell = item.cells[day.date];
                                if (!day.filled) {
                                  return <td key={day.date} className="border border-gray-100 text-center bg-gray-50 text-gray-300">—</td>;
                                }
                                if (!cell) {
                                  return <td key={day.date} className="border border-gray-100 text-center text-gray-300">{isBreakdown ? '—' : '?'}</td>;
                                }
                                const isNotOk = cell.status === 'NOT_OK';
                                const isOk = cell.status === 'OK';
                                // Parameter sheet: show value
                                if (data.paramType && cell.value != null) {
                                  return (
                                    <td key={day.date}
                                      className={`border border-gray-100 text-center text-[10px] font-medium px-0.5 cursor-default
                                        ${isNotOk ? 'bg-red-50 text-red-700' : isOk ? 'bg-green-50 text-green-800' : 'bg-white text-gray-700'}`}
                                      onMouseEnter={(e) => {
                                        const rect = e.currentTarget.getBoundingClientRect();
                                        setTooltip({ x: rect.left, y: rect.bottom + window.scrollY, cell, item: item.item, section: item.section, date: day.date, day: day.day });
                                      }}
                                      onMouseLeave={() => setTooltip(null)}
                                    >
                                      {isBreakdown ? parseMins(cell.value) || '—' : (String(cell.value).length > 6 ? String(cell.value).slice(0,6) : cell.value)}
                                    </td>
                                  );
                                }
                                // Item sheet: show ✓/✗
                                return (
                                  <td key={day.date}
                                    className={`border border-gray-100 text-center cursor-pointer relative ${isNotOk ? 'bg-red-50 text-red-600 font-bold text-sm' : 'bg-green-50 text-green-600 text-sm'}`}
                                    onMouseEnter={isNotOk ? (e) => {
                                      const rect = e.currentTarget.getBoundingClientRect();
                                      setTooltip({ x: rect.left, y: rect.bottom + window.scrollY, cell, item: item.item, section: item.section, date: day.date, day: day.day });
                                    } : undefined}
                                    onMouseLeave={isNotOk ? () => setTooltip(null) : undefined}
                                  >
                                    {isNotOk ? '✗' : '✓'}
                                  </td>
                                );
                              })}
                              {isBreakdown && (
                                <td className="border border-orange-200 text-center text-xs font-bold text-orange-800 bg-orange-50 px-1">
                                  {(() => {
                                    const t = data.days.reduce((s, day) => s + parseMins(item.cells[day.date]?.value), 0);
                                    return t > 0 ? `${t} min` : '—';
                                  })()}
                                </td>
                              )}
                            </tr>
                          );
                        });
                        return rows;
                      })()}

                      {/* Breakdown daily total row */}
                      {isBreakdown && (
                        <tr className="border-t-2 border-orange-400 bg-orange-50 font-bold">
                          <td colSpan={1} className="border border-orange-300 px-3 py-1.5 text-orange-800 sticky left-0 bg-orange-50 z-10 text-[11px]">Daily Total (min)</td>
                          {data.days.map(day => (
                            <td key={day.date} className={`border border-orange-200 text-center text-xs ${dayTotals[day.date] > 0 ? 'text-red-700 bg-red-50' : 'text-gray-400'}`}>
                              {dayTotals[day.date] > 0 ? dayTotals[day.date] : '—'}
                            </td>
                          ))}
                          <td className="border border-orange-300 text-center text-[11px] text-orange-900 bg-orange-100">
                            {Object.values(dayTotals).reduce((a, b) => a + b, 0)} min
                          </td>
                        </tr>
                      )}

                      {/* Not-filled footer */}
                      <tr className="border-t-2 border-gray-400 bg-gray-50">
                        <td className="border border-gray-300 px-3 py-1.5 font-semibold text-gray-600 sticky left-0 bg-gray-50 z-10 text-[11px]">NOT FILLED</td>
                        {data.days.map(day => (
                          <td key={day.date} className={`border border-gray-200 text-center text-xs font-bold ${!day.filled ? 'text-red-500 bg-red-50' : 'text-gray-100'}`}>
                            {!day.filled ? '✗' : ''}
                          </td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Legend */}
                <div className="px-4 py-2 border-t border-gray-100 flex gap-5 text-xs text-gray-500">
                  <span><span className="text-green-600 font-bold">✓</span> OK</span>
                  <span><span className="text-red-600 font-bold">✗</span> NOT OK (hover to see remark)</span>
                  <span><span className="text-yellow-500">?</span> Missing</span>
                  <span><span className="text-gray-400">—</span> Day not filled</span>
                </div>
              </div>

              {/* NOT OK Details Table */}
              {notOkIssues.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                  <div className="px-4 py-3 bg-red-50 border-b border-red-100">
                    <h2 className="font-semibold text-red-800 text-sm">NOT OK Issues — {MONTH_NAMES[month-1]} {year} ({notOkIssues.length} items)</h2>
                    <p className="text-xs text-red-500 mt-0.5">All items marked NOT OK with their remark/cause and action taken</p>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs border-collapse">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="border border-gray-200 px-3 py-2 text-left font-semibold text-gray-700 w-24">Date</th>
                          <th className="border border-gray-200 px-3 py-2 text-left font-semibold text-gray-700 w-28">Section</th>
                          <th className="border border-gray-200 px-3 py-2 text-left font-semibold text-gray-700">Item / Parameter</th>
                          <th className="border border-gray-200 px-3 py-2 text-left font-semibold text-gray-700">Remark / Cause</th>
                          <th className="border border-gray-200 px-3 py-2 text-left font-semibold text-gray-700">Action Taken</th>
                        </tr>
                      </thead>
                      <tbody>
                        {notOkIssues.map((iss, i) => {
                          const d = new Date(iss.date + 'T00:00:00');
                          return (
                            <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                              <td className="border border-gray-200 px-3 py-2 font-medium text-gray-700 whitespace-nowrap">
                                {iss.day} {SHORT_DAY[d.getDay()]} {MONTH_NAMES[month-1].slice(0,3)}
                              </td>
                              <td className="border border-gray-200 px-3 py-2 text-gray-600">{iss.section}</td>
                              <td className="border border-gray-200 px-3 py-2 text-red-800 font-medium">{iss.item}</td>
                              <td className="border border-gray-200 px-3 py-2">
                                {iss.remark
                                  ? <span className="bg-yellow-50 border border-yellow-200 text-yellow-900 rounded px-2 py-0.5 block">{iss.remark}</span>
                                  : <span className="text-gray-300 italic">No remark</span>}
                              </td>
                              <td className="border border-gray-200 px-3 py-2">
                                {iss.action
                                  ? <span className="bg-blue-50 border border-blue-200 text-blue-900 rounded px-2 py-0.5 block">{iss.action}</span>
                                  : <span className="text-gray-300 italic">No action recorded</span>}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Breakdown Summary — grouped by Date + Type + Reason */}
              {isBreakdown && data.details && data.details.length > 0 && (() => {
                const groupMap = {};
                for (const row of data.details) {
                  const key = `${row.date}||${row.size || ''}||${row.type}||${row.reason || ''}`;
                  if (!groupMap[key]) groupMap[key] = { date: row.date, size: row.size || '', type: row.type, reason: row.reason || '', minutes: 0 };
                  groupMap[key].minutes += row.minutes;
                }
                const groups = Object.values(groupMap).sort((a, b) => a.date.localeCompare(b.date) || a.type.localeCompare(b.type));
                const grandTotal = groups.reduce((s, g) => s + g.minutes, 0);
                return (
                  <div className="bg-white rounded-xl border border-red-200 shadow-sm overflow-hidden">
                    <div className="px-4 py-3 bg-red-50 border-b border-red-100 flex items-start justify-between gap-3">
                      <div>
                        <h2 className="font-semibold text-red-800 text-sm">
                          Reason-wise Summary — {MONTH_NAMES[month-1]} {year} ({groups.length} entries)
                        </h2>
                        <p className="text-xs text-red-400 mt-0.5">Grouped by date, breakdown type &amp; reason — total minutes per group</p>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <button onClick={downloadSummaryExcel}
                          className="bg-green-700 hover:bg-green-800 text-white text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
                          Excel
                        </button>
                        <button onClick={downloadSummaryPDF}
                          className="bg-red-700 hover:bg-red-800 text-white text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
                          PDF
                        </button>
                      </div>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs border-collapse">
                        <thead className="bg-red-50">
                          <tr>
                            <th className="border border-red-200 px-3 py-2 text-left font-semibold text-red-800 w-24">Date</th>
                            <th className="border border-red-200 px-3 py-2 text-left font-semibold text-red-800 w-24">Size</th>
                            <th className="border border-red-200 px-3 py-2 text-left font-semibold text-red-800">Breakdown Type</th>
                            <th className="border border-red-200 px-3 py-2 text-left font-semibold text-red-800">Reason</th>
                            <th className="border border-red-200 px-3 py-2 text-center font-semibold text-red-800 w-24">Total Time</th>
                          </tr>
                        </thead>
                        <tbody>
                          {groups.map((g, i) => {
                            const d = new Date(g.date + 'T00:00:00');
                            return (
                              <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-red-50/40'}>
                                <td className="border border-red-100 px-3 py-1.5 font-medium text-gray-700 whitespace-nowrap">
                                  {d.getDate()} {SHORT_DAY[d.getDay()]} {MONTH_NAMES[month-1].slice(0,3)}
                                </td>
                                <td className="border border-red-100 px-3 py-1.5 text-gray-600">{g.size || '—'}</td>
                                <td className="border border-red-100 px-3 py-1.5 text-red-800 font-medium">{g.type}</td>
                                <td className="border border-red-100 px-3 py-1.5 text-gray-700">
                                  {g.reason
                                    ? <span className="bg-yellow-50 border border-yellow-200 text-yellow-900 rounded px-2 py-0.5 inline-block">{g.reason}</span>
                                    : <span className="text-gray-300 italic">—</span>}
                                </td>
                                <td className="border border-red-100 px-3 py-1.5 text-center font-bold text-orange-700">{g.minutes} min</td>
                              </tr>
                            );
                          })}
                        </tbody>
                        <tfoot>
                          <tr className="bg-red-100 font-bold">
                            <td colSpan={4} className="border border-red-200 px-3 py-1.5 text-red-800">Grand Total</td>
                            <td className="border border-red-200 px-3 py-1.5 text-center text-red-900">{grandTotal} min</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                );
              })()}

              {/* Breakdown Detail Table — parameter wise with date & slot/time */}
              {isBreakdown && data.details && data.details.length > 0 && (
                <div className="bg-white rounded-xl border border-orange-200 shadow-sm overflow-hidden">
                  <div className="px-4 py-3 bg-orange-50 border-b border-orange-100 flex items-start justify-between gap-3">
                    <div>
                      <h2 className="font-semibold text-orange-800 text-sm">
                        Breakdown Details — {MONTH_NAMES[month-1]} {year} ({data.details.length} entries)
                      </h2>
                      <p className="text-xs text-orange-500 mt-0.5">Each individual breakdown entry with date, time slot, type and reason</p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button onClick={downloadDetailExcel}
                        className="bg-green-700 hover:bg-green-800 text-white text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
                        Excel
                      </button>
                      <button onClick={downloadDetailPDF}
                        className="bg-red-700 hover:bg-red-800 text-white text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
                        PDF
                      </button>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs border-collapse">
                      <thead className="bg-orange-50 sticky top-0 z-10">
                        <tr>
                          <th className="border border-orange-200 px-3 py-2 text-left font-semibold text-orange-800 whitespace-nowrap w-24">Date</th>
                          <th className="border border-orange-200 px-3 py-2 text-left font-semibold text-orange-800 whitespace-nowrap w-20">Size</th>
                          <th className="border border-orange-200 px-3 py-2 text-left font-semibold text-orange-800 whitespace-nowrap w-28">Time / Slot</th>
                          <th className="border border-orange-200 px-3 py-2 text-left font-semibold text-orange-800">Breakdown Type</th>
                          <th className="border border-orange-200 px-3 py-2 text-center font-semibold text-orange-800 w-20">Minutes</th>
                          <th className="border border-orange-200 px-3 py-2 text-left font-semibold text-orange-800">Reason</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.details.map((row, i) => {
                          const d = new Date(row.date + 'T00:00:00');
                          const dayNum = d.getDate();
                          const dayName = SHORT_DAY[d.getDay()];
                          return (
                            <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-orange-50/40'}>
                              <td className="border border-orange-100 px-3 py-1.5 font-medium text-gray-700 whitespace-nowrap">
                                {dayNum} {dayName} {MONTH_NAMES[month-1].slice(0,3)}
                              </td>
                              <td className="border border-orange-100 px-3 py-1.5 text-gray-600">{row.size || '—'}</td>
                              <td className="border border-orange-100 px-3 py-1.5 text-gray-600 whitespace-nowrap">{row.slot || '—'}</td>
                              <td className="border border-orange-100 px-3 py-1.5 text-red-800 font-medium">{row.type}</td>
                              <td className="border border-orange-100 px-3 py-1.5 text-center font-bold text-orange-700">{row.minutes} min</td>
                              <td className="border border-orange-100 px-3 py-1.5 text-gray-700">
                                {row.reason
                                  ? <span className="bg-yellow-50 border border-yellow-200 text-yellow-900 rounded px-2 py-0.5 inline-block">{row.reason}</span>
                                  : <span className="text-gray-300 italic">—</span>}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot>
                        <tr className="bg-orange-100 font-bold">
                          <td colSpan={4} className="border border-orange-200 px-3 py-1.5 text-orange-800">Total</td>
                          <td className="border border-orange-200 px-3 py-1.5 text-center text-orange-900">
                            {data.details.reduce((s, r) => s + r.minutes, 0)} min
                          </td>
                          <td className="border border-orange-200"></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              )}
            </>
          )
        )}

        {/* Hover Tooltip */}
        {tooltip && (
          <div
            className="fixed z-50 bg-gray-900 text-white text-xs rounded-lg shadow-xl p-3 max-w-xs pointer-events-none"
            style={{ top: tooltip.y + 8, left: Math.min(tooltip.x, window.innerWidth - 260) }}
          >
            <div className={`font-semibold mb-1 ${tooltip.cell.status === 'NOT_OK' ? 'text-red-300' : 'text-green-300'}`}>
              Day {tooltip.day} — {tooltip.section}
            </div>
            <div className="text-white font-medium mb-1">{tooltip.item}</div>
            {tooltip.cell.value != null && (
              <div className="mt-1"><span className="text-gray-400">Value: </span><span className="text-white font-bold">{tooltip.cell.value}</span></div>
            )}
            {tooltip.cell.status && (
              <div className="mt-1"><span className={`font-bold ${tooltip.cell.status === 'NOT_OK' ? 'text-red-400' : 'text-green-400'}`}>{tooltip.cell.status}</span></div>
            )}
            {tooltip.cell.remark && (
              <div className="mt-1"><span className="text-yellow-400 font-medium">Remark: </span><span>{tooltip.cell.remark}</span></div>
            )}
            {tooltip.cell.action_taken && (
              <div className="mt-1"><span className="text-blue-400 font-medium">Action: </span><span>{tooltip.cell.action_taken}</span></div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
