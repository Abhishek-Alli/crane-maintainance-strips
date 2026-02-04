const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
const { query } = require('../config/database');
const InspectionModel = require('../models/Inspection');
require('dotenv').config();

class GoogleSheetsService {
  /**
   * Initialize Google Sheets API client
   */
  static async getAuthClient() {
    const credentialsPath = process.env.GOOGLE_SHEETS_CREDENTIALS_PATH || './config/google-credentials.json';

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
   * Sync inspection data to Google Sheets
   * @param {number} inspection_id - Inspection ID
   */
  static async syncInspection(inspection_id) {
    try {
      const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
      const sheetName = process.env.GOOGLE_SHEETS_SHEET_NAME || 'Inspection_Data';

      if (!spreadsheetId) {
        console.warn('Google Sheets Spreadsheet ID not configured. Skipping sync.');
        return;
      }

      // Get inspection data for export
      const exportData = await InspectionModel.getForExport(inspection_id);

      if (exportData.length === 0) {
        throw new Error('No inspection data found');
      }

      // Get Google Sheets API
      const sheets = await this.getSheetsAPI();

      // Prepare rows for Google Sheets
      const rows = exportData.map((row) => [
        row.Date,
        row.Shed,
        row['Crane No'],
        row['Section Name'],
        row['Inspection Item'],
        row['Selected Value'],
        row.Status,
        row['Recorded By'],
        row.Remarks || '',
        row['Maintenance Start Time'] || '',
        row['Maintenance Stop Time'] || '',
        row['Crane Status'],
        row['Next Maintenance Date']
      ]);

      // Check if sheet exists, create if not
      await this.ensureSheetExists(sheets, spreadsheetId, sheetName);

      // Check if headers exist
      const hasHeaders = await this.checkHeaders(sheets, spreadsheetId, sheetName);

      if (!hasHeaders) {
        // Add headers
        const headers = [
          'Date',
          'Shed',
          'Crane No',
          'Section Name',
          'Inspection Item',
          'Selected Value',
          'Status',
          'Recorded By',
          'Remarks',
          'Maintenance Start Time',
          'Maintenance Stop Time',
          'Crane Status',
          'Next Maintenance Date'
        ];

        await sheets.spreadsheets.values.append({
          spreadsheetId,
          range: `${sheetName}!A1`,
          valueInputOption: 'RAW',
          resource: {
            values: [headers]
          }
        });

        // Format header row
        await sheets.spreadsheets.batchUpdate({
          spreadsheetId,
          resource: {
            requests: [
              {
                repeatCell: {
                  range: {
                    sheetId: await this.getSheetId(sheets, spreadsheetId, sheetName),
                    startRowIndex: 0,
                    endRowIndex: 1
                  },
                  cell: {
                    userEnteredFormat: {
                      backgroundColor: { red: 0.27, green: 0.45, blue: 0.77 },
                      textFormat: { bold: true, foregroundColor: { red: 1, green: 1, blue: 1 } }
                    }
                  },
                  fields: 'userEnteredFormat(backgroundColor,textFormat)'
                }
              }
            ]
          }
        });
      }

      // Append data
      const appendResult = await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: `${sheetName}!A:M`,
        valueInputOption: 'RAW',
        resource: {
          values: rows
        }
      });

      // Log to database
      await query(
        `INSERT INTO google_sheets_log
        (inspection_id, spreadsheet_id, sheet_name, row_count, sync_status)
        VALUES ($1, $2, $3, $4, $5)`,
        [inspection_id, spreadsheetId, sheetName, rows.length, 'SUCCESS']
      );

      console.log(`Successfully synced ${rows.length} rows to Google Sheets for inspection ${inspection_id}`);
      return appendResult;
    } catch (error) {
      console.error('Google Sheets sync error:', error);

      // Log error to database
      await query(
        `INSERT INTO google_sheets_log
        (inspection_id, spreadsheet_id, sheet_name, row_count, sync_status, error_message)
        VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          inspection_id,
          process.env.GOOGLE_SHEETS_SPREADSHEET_ID || null,
          process.env.GOOGLE_SHEETS_SHEET_NAME || 'Inspection_Data',
          0,
          'FAILED',
          error.message
        ]
      );

      throw error;
    }
  }

  /**
   * Ensure sheet exists in spreadsheet
   */
  static async ensureSheetExists(sheets, spreadsheetId, sheetName) {
    try {
      const response = await sheets.spreadsheets.get({
        spreadsheetId
      });

      const sheetExists = response.data.sheets.some(
        (sheet) => sheet.properties.title === sheetName
      );

      if (!sheetExists) {
        await sheets.spreadsheets.batchUpdate({
          spreadsheetId,
          resource: {
            requests: [
              {
                addSheet: {
                  properties: {
                    title: sheetName
                  }
                }
              }
            ]
          }
        });
      }
    } catch (error) {
      console.error('Error ensuring sheet exists:', error);
      throw error;
    }
  }

  /**
   * Check if headers exist in sheet
   */
  static async checkHeaders(sheets, spreadsheetId, sheetName) {
    try {
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `${sheetName}!A1:M1`
      });

      return response.data.values && response.data.values.length > 0;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get sheet ID by name
   */
  static async getSheetId(sheets, spreadsheetId, sheetName) {
    const response = await sheets.spreadsheets.get({
      spreadsheetId
    });

    const sheet = response.data.sheets.find(
      (s) => s.properties.title === sheetName
    );

    return sheet ? sheet.properties.sheetId : 0;
  }

  /**
   * Test Google Sheets connection
   */
  static async testConnection() {
    try {
      const sheets = await this.getSheetsAPI();
      const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;

      if (!spreadsheetId) {
        throw new Error('GOOGLE_SHEETS_SPREADSHEET_ID not configured');
      }

      const response = await sheets.spreadsheets.get({
        spreadsheetId
      });

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
