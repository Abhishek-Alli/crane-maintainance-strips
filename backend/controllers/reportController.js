/**
 * ============================================
 * REPORT CONTROLLER – CRANE MAINTENANCE
 * ============================================
 */

const { query } = require('../config/database');
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');

// Logo path for PDF
const LOGO_PATH = path.join(__dirname, '../assets/srj-logo.png');

class ReportController {

  /* =============================
     DATE RANGE HANDLER
  ============================= */
  static calculateDateRange({ report_type, date, from_date, to_date, month, year, week_start }) {
    if (report_type === 'daily') {
      if (!date) throw new Error('Date required');
      return { fromDate: date, toDate: date };
    }

    if (report_type === 'weekly') {
      if (!week_start) throw new Error('Week start date required');
      const start = new Date(week_start);
      const end = new Date(start);
      end.setDate(end.getDate() + 6);
      return {
        fromDate: start.toISOString().split('T')[0],
        toDate: end.toISOString().split('T')[0]
      };
    }

    if (report_type === 'monthly') {
      if (!month || !year) throw new Error('Month & year required');
      const fromDate = `${year}-${String(month).padStart(2, '0')}-01`;
      const toDate = new Date(year, month, 0).toISOString().split('T')[0];
      return { fromDate, toDate };
    }

    if (report_type === 'yearly') {
      if (!year) throw new Error('Year required');
      return { fromDate: `${year}-01-01`, toDate: `${year}-12-31` };
    }

    if (report_type === 'custom') {
      if (!from_date || !to_date) throw new Error('Date range required');
      return { fromDate: from_date, toDate: to_date };
    }

    throw new Error('Invalid report type');
  }

  /* =============================
     BUILD FILTER CONDITIONS
  ============================= */
  static buildFilters(params, values) {
    let conditions = '';
    if (params.department_id) {
      values.push(parseInt(params.department_id, 10));
      conditions += ` AND i.department_id = $${values.length}`;
    }
    if (params.shed_id) {
      values.push(parseInt(params.shed_id, 10));
      conditions += ` AND i.shed_id = $${values.length}`;
    }
    if (params.crane_id) {
      values.push(parseInt(params.crane_id, 10));
      conditions += ` AND i.crane_id = $${values.length}`;
    }
    if (params.include_alerts_only === 'true' || params.include_alerts_only === true) {
      conditions += ` AND i.has_alerts = true`;
    }
    return conditions;
  }

  /* =============================
     PREVIEW (JSON)
  ============================= */
  static async getReportPreview(req, res) {
    try {
      const { fromDate, toDate } =
        ReportController.calculateDateRange(req.query);

      const values = [fromDate, toDate];
      const filters = ReportController.buildFilters(req.query, values);

      const sql = `
        SELECT
          i.id,
          i.inspection_date,
          d.name AS department,
          s.name AS shed,
          c.crane_number,
          i.has_alerts,
          i.crane_status,
          u.username AS recorded_by
        FROM inspections i
        JOIN departments d ON d.id = i.department_id
        JOIN sheds s ON s.id = i.shed_id
        JOIN cranes c ON c.id = i.crane_id
        LEFT JOIN users u ON u.id = i.recorded_by
        WHERE DATE(i.inspection_date) BETWEEN $1 AND $2
        ${filters}
        ORDER BY i.inspection_date DESC
      `;

      const { rows } = await query(sql, values);

      // Build statistics
      const totalInspections = rows.length;
      const withAlerts = rows.filter(r => r.has_alerts).length;
      const okCount = rows.filter(r => !r.has_alerts).length;
      const craneSet = new Set(rows.map(r => r.crane_number));

      res.json({
        success: true,
        data: {
          statistics: {
            total_inspections: totalInspections,
            inspections_with_alerts: withAlerts,
            ok_count: okCount,
            maintenance_required_count: withAlerts,
            unique_cranes: craneSet.size
          },
          inspections: rows
        }
      });

    } catch (error) {
      console.error('PREVIEW ERROR:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /* =============================
     DETAILED DATA QUERY
  ============================= */
  static async getDetailedData(params) {
    const { fromDate, toDate } = ReportController.calculateDateRange(params);
    const values = [fromDate, toDate];
    const filters = ReportController.buildFilters(params, values);

    const sql = `
      SELECT
        i.inspection_date,
        d.name AS department,
        s.name AS shed,
        c.crane_number,
        fs.name AS section,
        fi.field_name AS item_name,
        iv.selected_value AS status,
        iv.remarks,
        u.username AS recorded_by
      FROM inspections i
      LEFT JOIN inspection_values iv ON iv.inspection_id = i.id
      LEFT JOIN form_sections fs ON fs.id = iv.section_id
      LEFT JOIN form_items fi ON fi.id = iv.item_id
      LEFT JOIN users u ON u.id = i.recorded_by
      JOIN departments d ON d.id = i.department_id
      JOIN sheds s ON s.id = i.shed_id
      JOIN cranes c ON c.id = i.crane_id
      WHERE DATE(i.inspection_date) BETWEEN $1 AND $2
      ${filters}
      ORDER BY i.inspection_date DESC, d.name, s.name, c.crane_number,
               fs.display_order, fi.display_order
    `;

    const { rows } = await query(sql, values);
    return { rows, fromDate, toDate };
  }

  /* =============================
     EXCEL EXPORT
  ============================= */
  static async exportReportToExcel(req, res) {
    try {
      const { rows, fromDate, toDate } = await ReportController.getDetailedData(req.body);

      if (!rows.length) {
        return res.status(404).json({ success: false, message: 'No data found' });
      }

      const wb = new ExcelJS.Workbook();

      // Group data by inspection (crane + date)
      const grouped = {};
      rows.forEach(r => {
        const key = `${r.department}-${r.shed}-${r.crane_number}-${r.inspection_date}`;
        if (!grouped[key]) {
          grouped[key] = {
            inspection_date: r.inspection_date,
            department: r.department,
            shed: r.shed,
            crane_number: r.crane_number,
            recorded_by: r.recorded_by,
            sections: {}
          };
        }
        if (r.section) {
          if (!grouped[key].sections[r.section]) {
            grouped[key].sections[r.section] = [];
          }
          grouped[key].sections[r.section].push({
            item_name: r.item_name || '-',
            status: r.status || '-',
            remarks: r.remarks || ''
          });
        }
      });

      // Create worksheet with all data in flat format
      const ws = wb.addWorksheet('Crane Maintenance Report');

      ws.columns = [
        { header: 'Date', key: 'date', width: 14 },
        { header: 'Department', key: 'department', width: 18 },
        { header: 'Shed', key: 'shed', width: 15 },
        { header: 'Crane No', key: 'crane_number', width: 15 },
        { header: 'Section', key: 'section', width: 22 },
        { header: 'Item Name', key: 'item_name', width: 28 },
        { header: 'Status', key: 'status', width: 12 },
        { header: 'Remarks', key: 'remarks', width: 35 },
        { header: 'Recorded By', key: 'recorded_by', width: 16 }
      ];

      // Style header row
      const headerRow = ws.getRow(1);
      headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      headerRow.fill = {
        type: 'pattern', pattern: 'solid',
        fgColor: { argb: 'FF2563EB' }
      };
      headerRow.alignment = { horizontal: 'center' };

      // Add data rows with conditional formatting
      Object.values(grouped).forEach(insp => {
        Object.entries(insp.sections).forEach(([sectionName, items]) => {
          items.forEach(item => {
            const row = ws.addRow({
              date: new Date(insp.inspection_date).toLocaleDateString('en-IN'),
              department: insp.department,
              shed: insp.shed,
              crane_number: insp.crane_number,
              section: sectionName,
              item_name: item.item_name,
              status: item.status,
              remarks: item.remarks,
              recorded_by: insp.recorded_by || '-'
            });
            // Highlight NOT_OK in red
            if (item.status === 'NOT_OK') {
              row.getCell('status').font = { bold: true, color: { argb: 'FFDC2626' } };
              row.getCell('status').fill = {
                type: 'pattern', pattern: 'solid',
                fgColor: { argb: 'FFFEE2E2' }
              };
            }
          });
        });
      });

      // Auto-filter
      ws.autoFilter = { from: 'A1', to: `I${ws.rowCount}` };

      // Add borders to all data cells
      ws.eachRow((row, rowNumber) => {
        row.eachCell(cell => {
          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
          };
        });
      });

      const buffer = await wb.xlsx.writeBuffer();
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=crane_report_${fromDate}_to_${toDate}.xlsx`);
      res.send(buffer);

    } catch (error) {
      console.error('EXCEL EXPORT ERROR:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /* =============================
     PDF EXPORT – TABULAR FORMAT
  ============================= */
  static async exportReportToPDF(req, res) {
    try {
      const { rows, fromDate, toDate } = await ReportController.getDetailedData(req.body);

      if (!rows.length) {
        return res.status(404).json({ success: false, message: 'No data found' });
      }

      // Group by inspection → section → items
      const grouped = {};
      rows.forEach(r => {
        const key = `${r.department}-${r.shed}-${r.crane_number}-${r.inspection_date}`;
        if (!grouped[key]) {
          grouped[key] = {
            inspection_date: r.inspection_date,
            department: r.department,
            shed: r.shed,
            crane_number: r.crane_number,
            recorded_by: r.recorded_by,
            sections: {}
          };
        }
        if (r.section) {
          if (!grouped[key].sections[r.section]) {
            grouped[key].sections[r.section] = [];
          }
          grouped[key].sections[r.section].push({
            item_name: r.item_name || '-',
            status: r.status || '-',
            remarks: r.remarks || ''
          });
        }
      });

      const doc = new PDFDocument({ margin: 40, size: 'A4' });
      const buffers = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => res.send(Buffer.concat(buffers)));

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=crane_report_${fromDate}_to_${toDate}.pdf`);

      // Table layout constants
      const pageWidth = 515;   // A4 width - margins
      const colX = 40;         // left margin
      const col1W = 220;       // Item Name width
      const col2W = 100;       // Status width
      const col3W = pageWidth - col1W - col2W; // Remarks width
      const rowH = 22;

      const inspections = Object.values(grouped);
      let isFirstPage = true;

      inspections.forEach((insp) => {
        if (!isFirstPage) doc.addPage();
        isFirstPage = false;

        // -- Company Header --
        // SRJ Logo (actual image)
        if (fs.existsSync(LOGO_PATH)) {
          doc.image(LOGO_PATH, colX, 30, { width: 60, height: 60 });
        }

        // Company Name
        doc.font('Helvetica-Bold').fontSize(14)
          .text('SRJ STRIPS AND PIPES PVT LTD', 110, 35, { width: pageWidth - 70 });

        // Report Title
        doc.font('Helvetica-Bold').fontSize(12).fillColor('#1e40af')
          .text('CRANE MAINTENANCE REPORT', 110, 55, { width: pageWidth - 70 });
        doc.fillColor('#000000');

        doc.fontSize(9).font('Helvetica')
          .text(`Report Period: ${fromDate} to ${toDate}`, 110, 72, { width: pageWidth - 70 });

        // Horizontal line
        doc.moveTo(colX, 95).lineTo(colX + pageWidth, 95).stroke('#1e40af');
        doc.y = 105;

        // -- Inspection header --
        const headerY = doc.y;
        doc.font('Helvetica-Bold').fontSize(10);
        doc.text(`Date       : ${new Date(insp.inspection_date).toLocaleDateString('en-IN')}`, colX);
        doc.text(`Department : ${insp.department}`, colX);
        doc.text(`Shed       : ${insp.shed}`, colX);
        doc.text(`Crane No   : ${insp.crane_number}`, colX);
        if (insp.recorded_by) {
          doc.text(`Recorded By: ${insp.recorded_by}`, colX);
        }
        doc.moveDown(1);

        // -- Sections --
        const sectionEntries = Object.entries(insp.sections);
        sectionEntries.forEach(([sectionName, items], sIdx) => {
          // Check if we need a new page (header + at least 2 rows)
          if (doc.y + rowH * (items.length + 3) > 760) {
            doc.addPage();
          }

          // Section title
          doc.font('Helvetica-Bold').fontSize(11)
            .text(`${sIdx + 1}. ${sectionName}`, colX);
          doc.moveDown(0.3);

          const tableTop = doc.y;

          // Table header row
          drawTableRow(doc, colX, tableTop, col1W, col2W, col3W, rowH,
            'Item Name', 'Status', 'Remarks', true);

          // Data rows
          let currentY = tableTop + rowH;
          items.forEach(item => {
            // New page check
            if (currentY + rowH > 760) {
              doc.addPage();
              currentY = 40;
              // Re-draw header on new page
              drawTableRow(doc, colX, currentY, col1W, col2W, col3W, rowH,
                'Item Name', 'Status', 'Remarks', true);
              currentY += rowH;
            }

            drawTableRow(doc, colX, currentY, col1W, col2W, col3W, rowH,
              item.item_name, item.status, item.remarks, false);
            currentY += rowH;
          });

          doc.y = currentY + 10;
        });
      });

      doc.end();

    } catch (error) {
      console.error('PDF EXPORT ERROR:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  }
}

/* =============================
   PDF TABLE DRAWING HELPER
============================= */
function drawTableRow(doc, x, y, col1W, col2W, col3W, h, text1, text2, text3, isHeader) {
  const totalW = col1W + col2W + col3W;

  // Background
  if (isHeader) {
    doc.rect(x, y, totalW, h).fill('#2563EB');
    doc.fillColor('#FFFFFF');
  } else {
    // Alternate row or NOT_OK highlight
    if (text2 === 'NOT_OK') {
      doc.rect(x, y, totalW, h).fill('#FEE2E2');
    }
    doc.fillColor('#000000');
  }

  // Borders
  doc.rect(x, y, totalW, h).stroke('#333333');
  doc.moveTo(x + col1W, y).lineTo(x + col1W, y + h).stroke('#333333');
  doc.moveTo(x + col1W + col2W, y).lineTo(x + col1W + col2W, y + h).stroke('#333333');

  // Text
  const textY = y + 6;
  const fontSize = isHeader ? 10 : 9;
  doc.font(isHeader ? 'Helvetica-Bold' : 'Helvetica').fontSize(fontSize);

  doc.text(text1 || '-', x + 5, textY, { width: col1W - 10, lineBreak: false });
  doc.text(text2 || '-', x + col1W + 5, textY, { width: col2W - 10, lineBreak: false });
  doc.text(text3 || '-', x + col1W + col2W + 5, textY, { width: col3W - 10, lineBreak: false });

  // Reset fill color
  doc.fillColor('#000000');
}

module.exports = ReportController;
