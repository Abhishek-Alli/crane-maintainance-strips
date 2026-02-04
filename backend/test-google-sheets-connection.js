/**
 * Test Google Sheets Connection
 * Run this to verify your Google Sheets credentials and connection
 */

require('dotenv').config();
const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

async function testGoogleSheetsConnection() {
  console.log('\n========================================');
  console.log('Testing Google Sheets Connection');
  console.log('========================================\n');

  try {
    // 1. Check environment variables
    console.log('1. Checking environment variables...');
    const credentialsPath = process.env.GOOGLE_SHEETS_CREDENTIALS_PATH;
    const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
    const workbookName = process.env.GOOGLE_SHEETS_WORKBOOK_NAME;

    console.log(`   Credentials Path: ${credentialsPath}`);
    console.log(`   Spreadsheet ID: ${spreadsheetId}`);
    console.log(`   Workbook Name: ${workbookName}`);

    if (!credentialsPath || !spreadsheetId) {
      throw new Error('Missing required environment variables');
    }
    console.log('   ✓ Environment variables found\n');

    // 2. Check credentials file exists
    console.log('2. Checking credentials file...');
    const fullCredentialsPath = path.resolve(__dirname, credentialsPath);
    console.log(`   Full path: ${fullCredentialsPath}`);

    if (!fs.existsSync(fullCredentialsPath)) {
      throw new Error(`Credentials file not found at: ${fullCredentialsPath}`);
    }
    console.log('   ✓ Credentials file found\n');

    // 3. Load and validate credentials
    console.log('3. Loading credentials...');
    const credentials = JSON.parse(fs.readFileSync(fullCredentialsPath, 'utf8'));
    console.log(`   Service Account Email: ${credentials.client_email}`);
    console.log(`   Project ID: ${credentials.project_id}`);
    console.log('   ✓ Credentials loaded successfully\n');

    // 4. Initialize Google Auth
    console.log('4. Initializing Google Auth...');
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });

    const authClient = await auth.getClient();
    console.log('   ✓ Auth client initialized\n');

    // 5. Initialize Sheets API
    console.log('5. Initializing Sheets API...');
    const sheets = google.sheets({ version: 'v4', auth: authClient });
    console.log('   ✓ Sheets API initialized\n');

    // 6. Test connection by getting spreadsheet metadata
    console.log('6. Testing connection to spreadsheet...');
    const response = await sheets.spreadsheets.get({
      spreadsheetId: spreadsheetId
    });

    console.log(`   ✓ Successfully connected to spreadsheet!`);
    console.log(`   Spreadsheet Title: ${response.data.properties.title}`);
    console.log(`   Spreadsheet URL: https://docs.google.com/spreadsheets/d/${spreadsheetId}\n`);

    // 7. List existing sheets
    console.log('7. Listing existing sheets (tabs)...');
    const existingSheets = response.data.sheets || [];
    console.log(`   Total sheets: ${existingSheets.length}`);

    if (existingSheets.length > 0) {
      console.log('   Existing sheets:');
      existingSheets.forEach((sheet, index) => {
        console.log(`     ${index + 1}. ${sheet.properties.title} (ID: ${sheet.properties.sheetId})`);
      });
    } else {
      console.log('   No sheets found in workbook');
    }
    console.log('');

    // 8. Test write permission (create a test sheet)
    console.log('8. Testing write permission...');
    const testSheetName = 'CONNECTION_TEST_' + Date.now();

    try {
      const createResponse = await sheets.spreadsheets.batchUpdate({
        spreadsheetId: spreadsheetId,
        requestBody: {
          requests: [
            {
              addSheet: {
                properties: {
                  title: testSheetName
                }
              }
            }
          ]
        }
      });

      const newSheetId = createResponse.data.replies[0].addSheet.properties.sheetId;
      console.log(`   ✓ Test sheet created: ${testSheetName} (ID: ${newSheetId})`);

      // Write test data
      await sheets.spreadsheets.values.update({
        spreadsheetId: spreadsheetId,
        range: `${testSheetName}!A1:B2`,
        valueInputOption: 'RAW',
        requestBody: {
          values: [
            ['Test Column 1', 'Test Column 2'],
            ['Test Value 1', 'Test Value 2']
          ]
        }
      });
      console.log('   ✓ Test data written successfully');

      // Delete test sheet
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: spreadsheetId,
        requestBody: {
          requests: [
            {
              deleteSheet: {
                sheetId: newSheetId
              }
            }
          ]
        }
      });
      console.log(`   ✓ Test sheet deleted\n`);

    } catch (error) {
      if (error.code === 403) {
        console.log('   ✗ PERMISSION ERROR: Service account does not have write access');
        console.log('   Please share the spreadsheet with this email:');
        console.log(`   ${credentials.client_email}`);
        console.log('   Give it "Editor" permission\n');
        throw error;
      } else {
        throw error;
      }
    }

    // Success summary
    console.log('========================================');
    console.log('✓ ALL TESTS PASSED!');
    console.log('========================================\n');
    console.log('Your Google Sheets connection is working correctly.');
    console.log('\nNext steps:');
    console.log('1. Make sure your database is set up (run database-schema-v2.sql)');
    console.log('2. Start the server: npm run dev');
    console.log('3. Test the API endpoints\n');

    console.log('Important reminder:');
    console.log(`Make sure the spreadsheet is shared with: ${credentials.client_email}`);
    console.log('with "Editor" permission.\n');

  } catch (error) {
    console.log('\n========================================');
    console.log('✗ TEST FAILED');
    console.log('========================================\n');
    console.error('Error:', error.message);

    if (error.code === 403) {
      console.log('\nTroubleshooting:');
      console.log('1. Open your Google Spreadsheet');
      console.log('2. Click "Share" button');
      console.log('3. Add this email as an Editor:');
      console.log(`   ${credentials.client_email || 'crane-maintainance@black-agility-465215-q9.iam.gserviceaccount.com'}`);
      console.log('4. Run this test again\n');
    } else if (error.code === 404) {
      console.log('\nTroubleshooting:');
      console.log('1. Check that the spreadsheet ID is correct in .env');
      console.log('2. Make sure the spreadsheet exists');
      console.log('3. Verify the service account has access\n');
    } else {
      console.log('\nStack trace:');
      console.error(error);
    }

    process.exit(1);
  }
}

// Run the test
testGoogleSheetsConnection();
