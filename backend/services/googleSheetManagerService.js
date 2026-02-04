/**
 * ============================================
 * GOOGLE SHEET MANAGER SERVICE - V3 LOCKED ARCHITECTURE
 * ============================================
 *
 * ABSOLUTE RULE: Google Sheets is the SINGLE SOURCE OF TRUTH
 * for ALL crane maintenance inspection data.
 *
 * This service manages:
 *   - Automatic sheet (tab) creation for each crane-form combination
 *   - Writing inspection data with mandatory 15 headers
 *   - Sheet-based duplicate checking
 *   - Reading inspection data for display and export
 *   - Excel and PDF export from Google Sheets
 *   - Dashboard statistics from Google Sheets
 *
 * FIXED SHEET HEADERS (MANDATORY - DO NOT CHANGE ORDER):
 *   1. Inspection Date
 *   2. Shed
 *   3. Crane No
 *   4. Form Name
 *   5. Section Name
 *   6. Item Name
 *   7. Selected Value
 *   8. Item Status (OK / ATTENTION REQUIRED)
 *   9. Recorded By
 *   10. Crane Status (OK / MAINTENANCE REQUIRED)
 *   11. Next Maintenance Date
 *   12. Remarks
 *   13. Maintenance Start Time
 *   14. Maintenance Stop Time
 *   15. Created At (Timestamp)
 *
 * ============================================
 */

const { google } = require('googleapis');
const fs = require('fs');
const { query } = require('../config/database');
const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');
require('dotenv').config();

// Fixed headers - DO NOT CHANGE ORDER
const FIXED_HEADERS = [
  'Inspection Date',
  'Shed',
  'Crane No',
  'Form Name',
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

class GoogleSheetManagerService {
  /**
   * ============================================
   * CONFIGURATION
   * ============================================
   */

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
   * ============================================
   * SHEET NAME GENERATION
   * ============================================
   */

  /**
   * Generate sheet name using fixed rule: CRANE_NO_FORM_NAME
   * Examples: CRA001_Standard_Crane, CRB001_Heavy_Duty
   */
  static generateSheetName(craneNumber, formName) {
    // Clean crane number and form name
    const cleanCraneNo = craneNumber.replace(/[^a-zA-Z0-9]/g, '');
    const cleanFormName = formName.replace(/[^a-zA-Z0-9]/g, '_');

    // Sheet names have max 100 chars in Google Sheets
    const sheetName = `${cleanCraneNo}_${cleanFormName}`;

    return sheetName.substring(0, 100);
  }

  /**
   * ============================================
   * SHEET CREATION & MANAGEMENT
   * ============================================
   */

  /**
   * Check if sheet exists in workbook
   */
  static async sheetExists(spreadsheetId, sheetName) {
    try {
      const sheets = await this.getSheetsAPI();
      const response = await sheets.spreadsheets.get({ spreadsheetId });

      const sheet = response.data.sheets.find(
        s => s.properties.title === sheetName
      );

      return sheet ? sheet.properties.sheetId : null;
    } catch (error) {
      console.error('Check sheet existence error:', error);
      throw error;
    }
  }

  /**
   * Get sheet ID by name
   */
  static async getSheetId(spreadsheetId, sheetName) {
    try {
      const sheets = await this.getSheetsAPI();
      const response = await sheets.spreadsheets.get({ spreadsheetId });

      const sheet = response.data.sheets.find(
        s => s.properties.title === sheetName
      );

      if (!sheet) {
        throw new Error(`Sheet "${sheetName}" not found`);
      }

      return sheet.properties.sheetId;
    } catch (error) {
      console.error('Get sheet ID error:', error);
      throw error;
    }
  }

  /**
   * Create new sheet with headers and formatting
   */
  static async createSheet(spreadsheetId, sheetName) {
    try {
      const sheets = await this.getSheetsAPI();

      // Check if sheet already exists
      const existingSheetId = await this.sheetExists(spreadsheetId, sheetName);

      if (existingSheetId !== null) {
        console.log(`Sheet "${sheetName}" already exists. Reusing existing sheet.`);
        return {
          sheetId: existingSheetId,
          sheetName,
          created: false,
          message: 'Sheet already exists'
        };
      }

      // Create new sheet
      const createResponse = await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        resource: {
          requests: [{
            addSheet: {
              properties: {
                title: sheetName,
                gridProperties: {
                  rowCount: 1000,
                  columnCount: 15,
                  frozenRowCount: 1 // Freeze header row
                }
              }
            }
          }]
        }
      });

      const newSheetId = createResponse.data.replies[0].addSheet.properties.sheetId;
      console.log(`Created new sheet: "${sheetName}" with ID: ${newSheetId}`);

      // Initialize headers
      await this.initializeHeaders(spreadsheetId, sheetName, newSheetId);

      return {
        sheetId: newSheetId,
        sheetName,
        created: true,
        message: 'Sheet created successfully'
      };
    } catch (error) {
      console.error('Create sheet error:', error);
      throw error;
    }
  }

  /**
   * Initialize sheet headers with formatting
   * Uses FIXED_HEADERS array - DO NOT MODIFY
   */
  static async initializeHeaders(spreadsheetId, sheetName, sheetId) {
    try {
      const sheets = await this.getSheetsAPI();

      // Write headers
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${sheetName}!A1:O1`,
        valueInputOption: 'RAW',
        resource: {
          values: [FIXED_HEADERS]
        }
      });

      // Apply formatting
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        resource: {
          requests: [
            // Format header row (bold, blue background, white text)
            {
              repeatCell: {
                range: {
                  sheetId,
                  startRowIndex: 0,
                  endRowIndex: 1,
                  startColumnIndex: 0,
                  endColumnIndex: 15
                },
                cell: {
                  userEnteredFormat: {
                    backgroundColor: {
                      red: 0.27,
                      green: 0.45,
                      blue: 0.77
                    },
                    textFormat: {
                      bold: true,
                      foregroundColor: {
                        red: 1,
                        green: 1,
                        blue: 1
                      },
                      fontSize: 11
                    },
                    horizontalAlignment: 'CENTER',
                    verticalAlignment: 'MIDDLE'
                  }
                },
                fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment)'
              }
            },
            // Set column widths
            {
              updateDimensionProperties: {
                range: {
                  sheetId,
                  dimension: 'COLUMNS',
                  startIndex: 0,
                  endIndex: 15
                },
                properties: {
                  pixelSize: 130
                },
                fields: 'pixelSize'
              }
            },
            // Enable auto-filter
            {
              setBasicFilter: {
                filter: {
                  range: {
                    sheetId,
                    startRowIndex: 0,
                    endRowIndex: 1000,
                    startColumnIndex: 0,
                    endColumnIndex: 15
                  }
                }
              }
            }
          ]
        }
      });

      console.log(`Initialized headers for sheet: "${sheetName}"`);
    } catch (error) {
      console.error('Initialize headers error:', error);
      throw error;
    }
  }

  /**
   * ============================================
   * DUPLICATE CHECKING (SHEET-BASED)
   * ============================================
   */

  /**
   * Check if inspection already exists in specific sheet (duplicate prevention)
   * This is the SOURCE OF TRUTH for duplicate detection
   */
  static async checkDuplicateInSheet(spreadsheetId, sheetName, craneNumber, inspectionDate) {
    try {
      const sheets = await this.getSheetsAPI();

      // Read Date and Crane No columns
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
      // If sheet doesn't exist or is empty, no duplicate
      if (error.message.includes('Unable to parse range')) {
        return false;
      }
      console.error('Duplicate check error:', error);
      throw error;
    }
  }

  /**
   * ============================================
   * WRITING INSPECTION DATA
   * ============================================
   */

  /**
   * Write inspection data to specific sheet
   * Uses FIXED_HEADERS order
   */
  static async writeInspectionToSheet(spreadsheetId, sheetName, inspectionData) {
    try {
      const sheets = await this.getSheetsAPI();

      // Prepare rows (one row per inspection item)
      const rows = [];
      const timestamp = new Date().toISOString();

      inspectionData.sections.forEach(section => {
        section.items.forEach(item => {
          if (item.selected_value) {
            rows.push([
              inspectionData.inspection_date,           // 1. Inspection Date
              inspectionData.shed_name,                 // 2. Shed
              inspectionData.crane_number,              // 3. Crane No
              inspectionData.form_name,                 // 4. Form Name
              section.section_name,                     // 5. Section Name
              item.item_name,                           // 6. Item Name
              item.selected_value,                      // 7. Selected Value
              item.is_alert ? 'ATTENTION REQUIRED' : 'OK', // 8. Item Status
              inspectionData.recorded_by,               // 9. Recorded By
              inspectionData.crane_status,              // 10. Crane Status
              inspectionData.next_maintenance_date,     // 11. Next Maintenance Date
              item.remarks || inspectionData.remarks || '', // 12. Remarks
              inspectionData.maintenance_start_time || '', // 13. Maintenance Start Time
              inspectionData.maintenance_stop_time || '',  // 14. Maintenance Stop Time
              timestamp                                 // 15. Created At
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
        range: `${sheetName}!A:O`,
        valueInputOption: 'RAW',
        resource: {
          values: rows
        }
      });

      // Get row numbers that were written
      const updatedRange = appendResponse.data.updates.updatedRange;
      const match = updatedRange.match(/!A(\d+):O(\d+)/);
      const rowStart = match ? parseInt(match[1]) : null;
      const rowEnd = match ? parseInt(match[2]) : null;

      console.log(`Successfully wrote ${rows.length} rows to sheet "${sheetName}" (rows ${rowStart}-${rowEnd})`);

      return {
        success: true,
        sheetName,
        rowCount: rows.length,
        rowStart,
        rowEnd
      };
    } catch (error) {
      console.error('Write to sheet error:', error);
      throw error;
    }
  }

  /**
   * ============================================
   * READING INSPECTION DATA
   * ============================================
   */

  /**
   * Read inspection data from specific sheet
   */
  static async readInspectionsFromSheet(spreadsheetId, sheetName, filters = {}) {
    try {
      const sheets = await this.getSheetsAPI();

      // Read all data
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `${sheetName}!A:O`
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
      // If sheet doesn't exist, return empty array
      if (error.message.includes('Unable to parse range')) {
        return [];
      }
      console.error('Read from sheet error:', error);
      throw error;
    }
  }

  /**
   * Get all sheets in workbook
   */
  static async getAllSheets(spreadsheetId) {
    try {
      const sheets = await this.getSheetsAPI();
      const response = await sheets.spreadsheets.get({ spreadsheetId });

      return response.data.sheets.map(sheet => ({
        sheetId: sheet.properties.sheetId,
        sheetName: sheet.properties.title,
        rowCount: sheet.properties.gridProperties.rowCount,
        columnCount: sheet.properties.gridProperties.columnCount
      }));
    } catch (error) {
      console.error('Get all sheets error:', error);
      throw error;
    }
  }

  /**
   * ============================================
   * DASHBOARD STATISTICS (FROM GOOGLE SHEETS)
   * ============================================
   */

  /**
   * Get dashboard statistics from Google Sheets
   * Reads all sheets and aggregates data
   */
  static async getDashboardStats(spreadsheetId) {
    try {
      const sheets = await this.getSheetsAPI();
      const response = await sheets.spreadsheets.get({ spreadsheetId });

      const allSheets = response.data.sheets
        .map(s => s.properties.title)
        .filter(name => name !== 'Sheet1' && !name.startsWith('_')); // Skip default sheet

      // Get crane count from database (master data)
      const craneResult = await query('SELECT COUNT(*) as total FROM cranes WHERE is_active = true');
      const totalCranes = parseInt(craneResult.rows[0].total);

      let cranesOk = 0;
      let cranesMaintenanceRequired = 0;
      let maintenanceDueToday = 0;
      let maintenancePending = 0;

      const today = new Date().toISOString().split('T')[0];
      const processedCranes = new Set();

      // Read latest inspection from each sheet
      for (const sheetName of allSheets) {
        try {
          const data = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: `${sheetName}!A:K` // Up to Next Maintenance Date column
          });

          if (!data.data.values || data.data.values.length <= 1) continue;

          const rows = data.data.values.slice(1); // Skip header

          // Get latest inspection per crane (last row for each crane)
          const latestByCrane = {};
          rows.forEach(row => {
            const craneNo = row[2]; // Crane No column
            if (craneNo) {
              latestByCrane[craneNo] = row;
            }
          });

          // Process each crane's latest status
          Object.entries(latestByCrane).forEach(([craneNo, row]) => {
            if (processedCranes.has(craneNo)) return;
            processedCranes.add(craneNo);

            const craneStatus = row[9]; // Crane Status column
            const nextMaintenanceDate = row[10]; // Next Maintenance Date column

            if (craneStatus === 'OK') {
              cranesOk++;
            } else if (craneStatus === 'MAINTENANCE_REQUIRED') {
              cranesMaintenanceRequired++;
            }

            // Check maintenance schedule
            if (nextMaintenanceDate) {
              if (nextMaintenanceDate === today) {
                maintenanceDueToday++;
              } else if (nextMaintenanceDate < today) {
                maintenancePending++; // Overdue
              }
            }
          });
        } catch (err) {
          // Skip sheets that can't be read
          console.warn(`Could not read sheet ${sheetName}:`, err.message);
        }
      }

      return {
        total_cranes: totalCranes,
        cranes_ok: cranesOk,
        cranes_maintenance_required: cranesMaintenanceRequired,
        maintenance_due_today: maintenanceDueToday,
        maintenance_pending: maintenancePending,
        cranes_not_inspected: totalCranes - processedCranes.size
      };
    } catch (error) {
      console.error('Get dashboard stats error:', error);
      throw error;
    }
  }

  /**
   * ============================================
   * EXPORT FUNCTIONS (FROM GOOGLE SHEETS)
   * ============================================
   */

  /**
   * Export inspection data from sheet to Excel
   */
  static async exportSheetToExcel(spreadsheetId, sheetName, craneNumber, inspectionDate) {
    try {
      const inspections = await this.readInspectionsFromSheet(spreadsheetId, sheetName, {
        crane_number: craneNumber,
        from_date: inspectionDate,
        to_date: inspectionDate
      });

      if (inspections.length === 0) {
        throw new Error('No inspection data found');
      }

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Inspection Report');

      // Define columns based on FIXED_HEADERS
      worksheet.columns = FIXED_HEADERS.map(header => ({
        header,
        key: header,
        width: header.length > 15 ? header.length + 5 : 20
      }));

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
        to: `O1`
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
   * Export inspection data from sheet to PDF
   */
  static async exportSheetToPDF(spreadsheetId, sheetName, craneNumber, inspectionDate) {
    try {
      const inspections = await this.readInspectionsFromSheet(spreadsheetId, sheetName, {
        crane_number: craneNumber,
        from_date: inspectionDate,
        to_date: inspectionDate
      });

      if (inspections.length === 0) {
        throw new Error('No inspection data found');
      }

      // Create PDF document
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const chunks = [];

      doc.on('data', chunk => chunks.push(chunk));

      // Header
      doc.fontSize(20).font('Helvetica-Bold').text('Crane Maintenance Inspection Report', { align: 'center' });
      doc.moveDown();

      // Inspection details
      const firstRow = inspections[0];
      doc.fontSize(12).font('Helvetica');
      doc.text(`Inspection Date: ${firstRow['Inspection Date']}`);
      doc.text(`Shed: ${firstRow['Shed']}`);
      doc.text(`Crane No: ${firstRow['Crane No']}`);
      doc.text(`Form: ${firstRow['Form Name']}`);
      doc.text(`Recorded By: ${firstRow['Recorded By']}`);
      doc.text(`Crane Status: ${firstRow['Crane Status']}`);
      doc.text(`Next Maintenance: ${firstRow['Next Maintenance Date']}`);

      if (firstRow['Maintenance Start Time']) {
        doc.text(`Maintenance Start: ${firstRow['Maintenance Start Time']}`);
      }
      if (firstRow['Maintenance Stop Time']) {
        doc.text(`Maintenance Stop: ${firstRow['Maintenance Stop Time']}`);
      }

      doc.moveDown();

      // Group by section
      const sections = {};
      inspections.forEach(item => {
        const sectionName = item['Section Name'];
        if (!sections[sectionName]) {
          sections[sectionName] = [];
        }
        sections[sectionName].push(item);
      });

      // Print each section
      Object.entries(sections).forEach(([sectionName, items]) => {
        doc.fontSize(14).font('Helvetica-Bold').text(sectionName);
        doc.moveDown(0.5);

        items.forEach(item => {
          const statusColor = item['Item Status'] === 'ATTENTION REQUIRED' ? 'red' : 'green';
          doc.fontSize(10).font('Helvetica');
          doc.fillColor('black').text(`${item['Item Name']}: `, { continued: true });
          doc.fillColor(statusColor).text(`${item['Selected Value']} (${item['Item Status']})`);

          if (item['Remarks']) {
            doc.fillColor('gray').text(`  Remarks: ${item['Remarks']}`);
          }
        });

        doc.fillColor('black');
        doc.moveDown();
      });

      // Footer
      doc.fontSize(8).fillColor('gray');
      doc.text(`Generated: ${new Date().toISOString()}`, { align: 'right' });
      doc.text('Source: Google Sheets - Official Maintenance Register', { align: 'right' });

      doc.end();

      return new Promise((resolve, reject) => {
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);
      });
    } catch (error) {
      console.error('Export to PDF error:', error);
      throw error;
    }
  }

  /**
   * ============================================
   * CRANE-FORM ASSIGNMENT
   * ============================================
   */

  /**
   * Create sheet for crane-form assignment
   * Called when admin assigns a form to a crane
   */
  static async createSheetForCraneForm(craneNumber, formName) {
    try {
      const config = await this.getConfig();
      const spreadsheetId = config.SPREADSHEET_ID || process.env.GOOGLE_SHEETS_SPREADSHEET_ID;

      if (!spreadsheetId) {
        throw new Error('Google Sheets Spreadsheet ID not configured');
      }

      // Generate sheet name
      const sheetName = this.generateSheetName(craneNumber, formName);

      // Create sheet (or reuse if exists)
      const result = await this.createSheet(spreadsheetId, sheetName);

      console.log(`Sheet "${sheetName}" prepared for crane "${craneNumber}" with form "${formName}"`);

      return {
        success: true,
        sheetName: result.sheetName,
        sheetId: result.sheetId,
        created: result.created,
        message: result.message
      };
    } catch (error) {
      console.error('Create sheet for crane-form error:', error);
      throw error;
    }
  }

  /**
   * ============================================
   * CONNECTION TEST
   * ============================================
   */

  /**
   * Test connection and list all sheets
   */
  static async testConnection() {
    try {
      const config = await this.getConfig();
      const spreadsheetId = config.SPREADSHEET_ID || process.env.GOOGLE_SHEETS_SPREADSHEET_ID;

      if (!spreadsheetId) {
        throw new Error('Spreadsheet ID not configured');
      }

      const sheets = await this.getSheetsAPI();
      const response = await sheets.spreadsheets.get({ spreadsheetId });

      const allSheets = response.data.sheets.map(s => s.properties.title);

      return {
        success: true,
        message: 'Connected to Google Sheets successfully',
        workbook: response.data.properties.title,
        sheets: allSheets,
        sheetCount: allSheets.length,
        architecture: 'V3 LOCKED - Google Sheets is SINGLE SOURCE OF TRUTH'
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

module.exports = GoogleSheetManagerService;
