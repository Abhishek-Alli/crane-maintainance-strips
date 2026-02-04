const { google } = require('googleapis');
const fs = require('fs');
const { query } = require('../config/database');
require('dotenv').config();

/**
 * Google Sheets Service V2
 * PRIMARY STORAGE for inspection data
 */
class GoogleSheetsService {
  /**
   * Get configuration from database
   */
  static async getConfig() {
    const result = await query(
      'SELECT config_key, config_value FROM google_sheets_config'
    );

    const config = {};
    result.rows.forEach(row => {
      config[row.config_key] = row.config_value;
    });

    return config;
  }

  /**
   * Initialize Google Sheets API client
   */
  static async getAuthClient() {
    const config = await this.getConfig();
    const credentialsPath = config.CREDENTIALS_PATH || process.env.GOOGLE_SHEETS_CREDENTIALS_PATH;

    if (!fs.existsSync(credentialsPath)) {
      throw new Error(`Google Sheets credentials file not found at: ${credentialsPath}`);
    }

    const credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));

    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });

    return await auth.getClient();
  }

  /**
   * Get Google Sheets API instance
   */
  static async getSheetsAPI() {
    const authClient = await this.getAuthClient();
    return google.sheets({ version: 'v4', auth: authClient });
  }

  /**
   * Initialize Google Sheet with headers if needed
   */
  static async initializeSheet() {
    try {
      const config = await this.getConfig();
      const spreadsheetId = config.SPREADSHEET_ID || process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
      const sheetName = config.SHEET_NAME || 'Crane_Maintenance_Register';

      if (!spreadsheetId) {
        throw new Error('Google Sheets Spreadsheet ID not configured');
      }

      const sheets = await this.getSheetsAPI();

      // Check if sheet exists
      const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
      const sheet = spreadsheet.data.sheets.find(s => s.properties.title === sheetName);

      if (!sheet) {
        // Create sheet
        await sheets.spreadsheets.batchUpdate({
          spreadsheetId,
          resource: {
            requests: [{
              addSheet: {
                properties: { title: sheetName }
              }
            }]
          }
        });
      }

      // Check if headers exist
      const headersRange = `${sheetName}!A1:N1`;
      const headersResponse = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: headersRange
      });

      if (!headersResponse.data.values || headersResponse.data.values.length === 0) {
        // Add headers
        const headers = [
          'Inspection Date',
          'Shed',
          'Crane No',
          'Section Name',
          'Item Name',
          'Selected Value',
          'Item Status',
          'Recorded By',
          'Crane Status',
          'Next Maintenance Date',
          'Remarks',
          'Maintenance Start Time',
          'Maintenance Stop Time',
          'Created At'
        ];

        await sheets.spreadsheets.values.update({
          spreadsheetId,
          range: headersRange,
          valueInputOption: 'RAW',
          resource: {
            values: [headers]
          }
        });

        // Format header row
        const sheetId = await this.getSheetId(sheets, spreadsheetId, sheetName);
        await sheets.spreadsheets.batchUpdate({
          spreadsheetId,
          resource: {
            requests: [{
              repeatCell: {
                range: {
                  sheetId,
                  startRowIndex: 0,
                  endRowIndex: 1
                },
                cell: {
                  userEnteredFormat: {
                    backgroundColor: { red: 0.27, green: 0.45, blue: 0.77 },
                    textFormat: {
                      bold: true,
                      foregroundColor: { red: 1, green: 1, blue: 1 }
                    },
                    horizontalAlignment: 'CENTER'
                  }
                },
                fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)'
              }
            }]
          }
        });
      }

      return { success: true, message: 'Sheet initialized successfully' };
    } catch (error) {
      console.error('Sheet initialization error:', error);
      throw error;
    }
  }

  /**
   * Check if inspection already exists (duplicate prevention)
   */
  static async checkDuplicateInspection(craneNumber, inspectionDate) {
    try {
      const config = await this.getConfig();
      const spreadsheetId = config.SPREADSHEET_ID;
      const sheetName = config.SHEET_NAME;

      const sheets = await this.getSheetsAPI();

      // Read all data
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `${sheetName}!A:C` // Date, Shed, Crane No columns
      });

      if (!response.data.values || response.data.values.length <= 1) {
        return false; // No data or only headers
      }

      // Check for duplicate (skip header row)
      for (let i = 1; i < response.data.values.length; i++) {
        const row = response.data.values[i];
        const rowDate = row[0]; // Inspection Date
        const rowCraneNo = row[2]; // Crane No

        if (rowDate === inspectionDate && rowCraneNo === craneNumber) {
          return true; // Duplicate found
        }
      }

      return false;
    } catch (error) {
      console.error('Duplicate check error:', error);
      throw error;
    }
  }

  /**
   * Write inspection data to Google Sheets
   * This is the PRIMARY storage operation
   */
  static async writeInspection(inspectionData) {
    try {
      const config = await this.getConfig();
      const spreadsheetId = config.SPREADSHEET_ID;
      const sheetName = config.SHEET_NAME;

      if (!spreadsheetId) {
        throw new Error('Google Sheets Spreadsheet ID not configured');
      }

      // Initialize sheet if needed
      await this.initializeSheet();

      // Check for duplicate
      const isDuplicate = await this.checkDuplicateInspection(
        inspectionData.crane_number,
        inspectionData.inspection_date
      );

      if (isDuplicate) {
        throw new Error(`Inspection already exists for ${inspectionData.crane_number} on ${inspectionData.inspection_date}`);
      }

      const sheets = await this.getSheetsAPI();

      // Prepare rows (one row per inspection item)
      const rows = [];
      const timestamp = new Date().toISOString();

      inspectionData.sections.forEach(section => {
        section.items.forEach(item => {
          if (item.selected_value) {
            rows.push([
              inspectionData.inspection_date,
              inspectionData.shed_name,
              inspectionData.crane_number,
              section.section_name,
              item.item_name,
              item.selected_value,
              item.is_alert ? 'ATTENTION REQUIRED' : 'OK',
              inspectionData.recorded_by,
              inspectionData.crane_status,
              inspectionData.next_maintenance_date,
              item.remarks || '',
              inspectionData.maintenance_start_time || '',
              inspectionData.maintenance_stop_time || '',
              timestamp
            ]);
          }
        });
      });

      if (rows.length === 0) {
        throw new Error('No inspection items to write');
      }

      // Append rows to sheet
      const appendResponse = await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: `${sheetName}!A:N`,
        valueInputOption: 'RAW',
        resource: {
          values: rows
        }
      });

      // Get row numbers that were written
      const updatedRange = appendResponse.data.updates.updatedRange;
      const match = updatedRange.match(/!A(\d+):N(\d+)/);
      const rowStart = match ? parseInt(match[1]) : null;
      const rowEnd = match ? parseInt(match[2]) : null;

      console.log(`Successfully wrote ${rows.length} rows to Google Sheets (rows ${rowStart}-${rowEnd})`);

      return {
        success: true,
        rowCount: rows.length,
        rowStart,
        rowEnd,
        spreadsheetId,
        sheetName
      };
    } catch (error) {
      console.error('Write inspection error:', error);
      throw error;
    }
  }

  /**
   * Read inspection data from Google Sheets
   */
  static async readInspections(filters = {}) {
    try {
      const config = await this.getConfig();
      const spreadsheetId = config.SPREADSHEET_ID;
      const sheetName = config.SHEET_NAME;

      const sheets = await this.getSheetsAPI();

      // Read all data
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `${sheetName}!A:N`
      });

      if (!response.data.values || response.data.values.length <= 1) {
        return []; // No data or only headers
      }

      const headers = response.data.values[0];
      const rows = response.data.values.slice(1); // Skip header

      // Convert to objects
      const inspections = rows.map(row => {
        const obj = {};
        headers.forEach((header, index) => {
          obj[header] = row[index] || '';
        });
        return obj;
      });

      // Apply filters
      let filtered = inspections;

      if (filters.crane_number) {
        filtered = filtered.filter(i => i['Crane No'] === filters.crane_number);
      }

      if (filters.shed) {
        filtered = filtered.filter(i => i['Shed'] === filters.shed);
      }

      if (filters.from_date) {
        filtered = filtered.filter(i => i['Inspection Date'] >= filters.from_date);
      }

      if (filters.to_date) {
        filtered = filtered.filter(i => i['Inspection Date'] <= filters.to_date);
      }

      if (filters.has_alerts !== undefined) {
        if (filters.has_alerts) {
          filtered = filtered.filter(i => i['Item Status'] === 'ATTENTION REQUIRED');
        } else {
          filtered = filtered.filter(i => i['Item Status'] === 'OK');
        }
      }

      return filtered;
    } catch (error) {
      console.error('Read inspections error:', error);
      throw error;
    }
  }

  /**
   * Read inspection summary (grouped by inspection date and crane)
   */
  static async readInspectionSummary(filters = {}) {
    try {
      const inspections = await this.readInspections(filters);

      // Group by inspection date + crane
      const grouped = {};

      inspections.forEach(item => {
        const key = `${item['Inspection Date']}_${item['Crane No']}`;

        if (!grouped[key]) {
          grouped[key] = {
            inspection_date: item['Inspection Date'],
            shed: item['Shed'],
            crane_number: item['Crane No'],
            recorded_by: item['Recorded By'],
            crane_status: item['Crane Status'],
            next_maintenance_date: item['Next Maintenance Date'],
            items_checked: 0,
            alert_count: 0,
            has_alerts: false,
            created_at: item['Created At']
          };
        }

        grouped[key].items_checked++;

        if (item['Item Status'] === 'ATTENTION REQUIRED') {
          grouped[key].alert_count++;
          grouped[key].has_alerts = true;
        }
      });

      return Object.values(grouped);
    } catch (error) {
      console.error('Read inspection summary error:', error);
      throw error;
    }
  }

  /**
   * Export inspection data as Excel
   */
  static async exportToExcel(craneNumber, inspectionDate) {
    try {
      const inspections = await this.readInspections({
        crane_number: craneNumber,
        from_date: inspectionDate,
        to_date: inspectionDate
      });

      if (inspections.length === 0) {
        throw new Error('No inspection data found');
      }

      // Use ExcelJS to create workbook
      const ExcelJS = require('exceljs');
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Inspection Report');

      // Define columns
      worksheet.columns = [
        { header: 'Inspection Date', key: 'Inspection Date', width: 15 },
        { header: 'Shed', key: 'Shed', width: 15 },
        { header: 'Crane No', key: 'Crane No', width: 15 },
        { header: 'Section Name', key: 'Section Name', width: 35 },
        { header: 'Item Name', key: 'Item Name', width: 25 },
        { header: 'Selected Value', key: 'Selected Value', width: 20 },
        { header: 'Item Status', key: 'Item Status', width: 20 },
        { header: 'Recorded By', key: 'Recorded By', width: 20 },
        { header: 'Crane Status', key: 'Crane Status', width: 20 },
        { header: 'Next Maintenance Date', key: 'Next Maintenance Date', width: 20 },
        { header: 'Remarks', key: 'Remarks', width: 30 },
        { header: 'Maintenance Start Time', key: 'Maintenance Start Time', width: 20 },
        { header: 'Maintenance Stop Time', key: 'Maintenance Stop Time', width: 20 }
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

      // Add data rows
      inspections.forEach(row => {
        const excelRow = worksheet.addRow(row);

        // Highlight alerts
        if (row['Item Status'] === 'ATTENTION REQUIRED') {
          excelRow.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFFFEB9C' }
          };
          excelRow.font = { bold: true };
        }
      });

      // Add borders
      worksheet.eachRow(row => {
        row.eachCell(cell => {
          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
          };
        });
      });

      // Auto-filter
      worksheet.autoFilter = {
        from: 'A1',
        to: 'M1'
      };

      // Freeze header
      worksheet.views = [
        { state: 'frozen', xSplit: 0, ySplit: 1 }
      ];

      const buffer = await workbook.xlsx.writeBuffer();
      return buffer;
    } catch (error) {
      console.error('Export to Excel error:', error);
      throw error;
    }
  }

  /**
   * Get sheet ID by name
   */
  static async getSheetId(sheets, spreadsheetId, sheetName) {
    const response = await sheets.spreadsheets.get({ spreadsheetId });
    const sheet = response.data.sheets.find(s => s.properties.title === sheetName);
    return sheet ? sheet.properties.sheetId : 0;
  }

  /**
   * Test connection
   */
  static async testConnection() {
    try {
      const config = await this.getConfig();
      const spreadsheetId = config.SPREADSHEET_ID;

      if (!spreadsheetId) {
        throw new Error('Spreadsheet ID not configured');
      }

      const sheets = await this.getSheetsAPI();
      const response = await sheets.spreadsheets.get({ spreadsheetId });

      return {
        success: true,
        message: 'Connected to Google Sheets successfully',
        spreadsheet: response.data.properties.title
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to connect to Google Sheets',
        error: error.message
      };
    }
  }
}

module.exports = GoogleSheetsService;
