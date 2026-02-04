const ExcelJS = require('exceljs');

class ExcelService {
  /**
   * Generate Excel report for inspection
   * @param {Array} data - Array of inspection row data
   * @returns {Promise<Buffer>} Excel file buffer
   */
  static async generateInspectionReport(data) {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Inspection Report');

    // Define columns
    worksheet.columns = [
      { header: 'Date', key: 'Date', width: 12 },
      { header: 'Shed', key: 'Shed', width: 15 },
      { header: 'Crane No', key: 'Crane No', width: 15 },
      { header: 'Section Name', key: 'Section Name', width: 35 },
      { header: 'Inspection Item', key: 'Inspection Item', width: 25 },
      { header: 'Selected Value', key: 'Selected Value', width: 20 },
      { header: 'Status', key: 'Status', width: 20 },
      { header: 'Recorded By', key: 'Recorded By', width: 20 },
      { header: 'Remarks', key: 'Remarks', width: 30 },
      { header: 'Maintenance Start Time', key: 'Maintenance Start Time', width: 20 },
      { header: 'Maintenance Stop Time', key: 'Maintenance Stop Time', width: 20 },
      { header: 'Crane Status', key: 'Crane Status', width: 20 },
      { header: 'Next Maintenance Date', key: 'Next Maintenance Date', width: 20 }
    ];

    // Style header row
    worksheet.getRow(1).font = { bold: true, size: 12 };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' }
    };
    worksheet.getRow(1).font = { ...worksheet.getRow(1).font, color: { argb: 'FFFFFFFF' } };
    worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

    // Add data rows
    data.forEach((row) => {
      const excelRow = worksheet.addRow(row);

      // Highlight ATTENTION REQUIRED rows
      if (row.Status === 'ATTENTION REQUIRED') {
        excelRow.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFFEB9C' } // Light orange
        };
        excelRow.font = { bold: true };
      }
    });

    // Auto-filter
    worksheet.autoFilter = {
      from: 'A1',
      to: 'M1'
    };

    // Freeze first row
    worksheet.views = [
      { state: 'frozen', xSplit: 0, ySplit: 1 }
    ];

    // Add borders to all cells
    worksheet.eachRow((row, rowNumber) => {
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
      });
    });

    // Generate buffer
    const buffer = await workbook.xlsx.writeBuffer();
    return buffer;
  }

  /**
   * Generate Excel report for multiple inspections
   * @param {Array} inspections - Array of inspections
   * @returns {Promise<Buffer>} Excel file buffer
   */
  static async generateMultipleInspectionsReport(inspections) {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Inspections Summary');

    worksheet.columns = [
      { header: 'Date', key: 'inspection_date', width: 12 },
      { header: 'Shed', key: 'shed_name', width: 15 },
      { header: 'Crane No', key: 'crane_number', width: 15 },
      { header: 'Recorded By', key: 'recorded_by', width: 20 },
      { header: 'Crane Status', key: 'crane_status', width: 20 },
      { header: 'Items Checked', key: 'items_checked', width: 15 },
      { header: 'Alert Count', key: 'alert_count', width: 15 },
      { header: 'Has Alerts', key: 'has_alerts', width: 12 },
      { header: 'Created At', key: 'created_at', width: 20 }
    ];

    // Style header
    worksheet.getRow(1).font = { bold: true, size: 12 };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' }
    };
    worksheet.getRow(1).font = { ...worksheet.getRow(1).font, color: { argb: 'FFFFFFFF' } };
    worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

    // Add data
    inspections.forEach((inspection) => {
      const row = worksheet.addRow({
        ...inspection,
        has_alerts: inspection.has_alerts ? 'YES' : 'NO',
        created_at: new Date(inspection.created_at).toLocaleString()
      });

      if (inspection.has_alerts) {
        row.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFFEB9C' }
        };
      }
    });

    // Borders
    worksheet.eachRow((row) => {
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    return buffer;
  }
}

module.exports = ExcelService;
