# Google Sheets Integration Setup Guide

Complete step-by-step guide to set up automatic Google Sheets synchronization for your Crane Maintenance Inspection System.

---

## Overview

Every inspection submission will automatically sync to a Google Spreadsheet, creating a cloud backup and live reporting source.

---

## Setup Steps

### Step 1: Create Google Cloud Project

1. **Go to Google Cloud Console**
   - Navigate to: https://console.cloud.google.com/
   - Sign in with your Google account

2. **Create New Project**
   - Click "Select a project" at the top
   - Click "NEW PROJECT"
   - Project name: `Crane Maintenance System`
   - Click "CREATE"
   - Wait for project creation (30-60 seconds)

3. **Select Your Project**
   - Click "Select a project" again
   - Choose "Crane Maintenance System"

---

### Step 2: Enable Google Sheets API

1. **Navigate to APIs & Services**
   - Left menu → "APIs & Services" → "Library"

2. **Search for Google Sheets API**
   - In the search box, type: `Google Sheets API`
   - Click on "Google Sheets API" from results

3. **Enable the API**
   - Click blue "ENABLE" button
   - Wait for activation

---

### Step 3: Create Service Account

1. **Navigate to Credentials**
   - Left menu → "APIs & Services" → "Credentials"

2. **Create Credentials**
   - Click "+ CREATE CREDENTIALS" at the top
   - Select "Service Account"

3. **Service Account Details**
   - Service account name: `crane-sheets-sync`
   - Service account ID: (auto-filled)
   - Description: `Service account for syncing inspection data to Google Sheets`
   - Click "CREATE AND CONTINUE"

4. **Grant Permissions (Optional)**
   - Skip this step by clicking "CONTINUE"

5. **Grant Users Access (Optional)**
   - Skip this step by clicking "DONE"

---

### Step 4: Generate and Download Key

1. **Find Your Service Account**
   - You'll see it listed under "Service Accounts"
   - Email format: `crane-sheets-sync@project-id.iam.gserviceaccount.com`
   - **Copy this email address** (you'll need it later)

2. **Create Key**
   - Click on the service account email
   - Go to "KEYS" tab
   - Click "ADD KEY" → "Create new key"
   - Select "JSON" format
   - Click "CREATE"

3. **Save the Downloaded File**
   - A JSON file will download automatically
   - File name format: `project-name-xxxxx.json`
   - **IMPORTANT:** Keep this file secure - it's like a password!

---

### Step 5: Create Google Spreadsheet

1. **Create New Spreadsheet**
   - Go to: https://sheets.google.com/
   - Click "+ Blank" to create new spreadsheet
   - Name it: `Crane Maintenance Inspections`

2. **Share with Service Account**
   - Click "Share" button (top right)
   - Paste the service account email you copied earlier
   - Format: `crane-sheets-sync@project-id.iam.gserviceaccount.com`
   - Set role to: **Editor**
   - Uncheck "Notify people"
   - Click "Share"

3. **Get Spreadsheet ID**
   - Look at the URL in your browser
   - URL format: `https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit`
   - Copy the `SPREADSHEET_ID` part (long string between `/d/` and `/edit`)
   - Example: `1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms`

---

### Step 6: Configure Application

1. **Prepare Credentials File**
   - Rename downloaded JSON file to: `google-credentials.json`
   - Place it in: `backend/config/google-credentials.json`

   ```bash
   # Create config directory if it doesn't exist
   mkdir backend/config

   # Move the file (adjust path as needed)
   # Windows
   move Downloads\project-name-xxxxx.json backend\config\google-credentials.json

   # Linux/Mac
   mv ~/Downloads/project-name-xxxxx.json backend/config/google-credentials.json
   ```

2. **Update Backend .env File**
   ```bash
   cd backend
   # Edit .env file
   ```

   Add these lines:
   ```env
   # Google Sheets Configuration
   GOOGLE_SHEETS_CREDENTIALS_PATH=./config/google-credentials.json
   GOOGLE_SHEETS_SPREADSHEET_ID=your_spreadsheet_id_here
   GOOGLE_SHEETS_SHEET_NAME=Inspection_Data
   ```

   Replace `your_spreadsheet_id_here` with the ID you copied in Step 5.

3. **Secure the Credentials File**
   - Ensure `google-credentials.json` is in `.gitignore`
   - Never commit credentials to version control
   - Restrict file permissions (Linux/Mac):
     ```bash
     chmod 600 backend/config/google-credentials.json
     ```

---

### Step 7: Test the Connection

1. **Restart Backend Server**
   ```bash
   cd backend
   npm run dev
   ```

2. **Test API Endpoint**
   - Open browser and navigate to:
   ```
   http://localhost:5000/api/config/test-google-sheets
   ```

   **Success Response:**
   ```json
   {
     "success": true,
     "message": "Connected to Google Sheets successfully",
     "spreadsheet": "Crane Maintenance Inspections"
   }
   ```

   **Error Response:**
   ```json
   {
     "success": false,
     "message": "Failed to connect to Google Sheets",
     "error": "Error details here"
   }
   ```

3. **Test with Real Inspection**
   - Create an inspection through the UI
   - Check your Google Spreadsheet
   - A new sheet named "Inspection_Data" should appear
   - Headers and inspection data rows should be visible

---

## Troubleshooting

### Error: "credentials file not found"

**Solution:**
```bash
# Check if file exists
ls backend/config/google-credentials.json

# If not, verify the path in .env
# Make sure it's relative to backend/ directory
GOOGLE_SHEETS_CREDENTIALS_PATH=./config/google-credentials.json
```

### Error: "The caller does not have permission"

**Causes:**
1. Spreadsheet not shared with service account
2. Service account email incorrect

**Solution:**
1. Re-share spreadsheet:
   - Open spreadsheet
   - Click "Share"
   - Add service account email (from JSON file: `client_email` field)
   - Set role to "Editor"

2. Verify service account email:
   ```bash
   # Open JSON file
   cat backend/config/google-credentials.json | grep client_email
   ```

### Error: "Unable to parse range"

**Cause:** Sheet name doesn't match

**Solution:**
- Check sheet name in spreadsheet (bottom tab)
- Update `.env`:
  ```env
  GOOGLE_SHEETS_SHEET_NAME=Inspection_Data
  ```

### Error: "API key not valid"

**Cause:** Credentials file is invalid or corrupted

**Solution:**
1. Re-download credentials from Google Cloud Console
2. Replace `google-credentials.json`
3. Restart backend

### Error: "Quota exceeded"

**Cause:** Too many API requests

**Limits:**
- 100 requests per 100 seconds per user
- 500 requests per 100 seconds per project

**Solution:**
1. Wait a minute and try again
2. For production, implement rate limiting
3. Consider batching multiple inspections

---

## Verification Steps

### 1. Check Spreadsheet Structure

After first sync, your spreadsheet should have:

**Headers (Row 1):**
- Date
- Shed
- Crane No
- Section Name
- Inspection Item
- Selected Value
- Status
- Recorded By
- Remarks
- Maintenance Start Time
- Maintenance Stop Time
- Crane Status
- Next Maintenance Date

**Data Rows:**
- One row per inspection item
- Values populated from inspection

### 2. Check Database Logs

```sql
-- View sync logs
SELECT * FROM google_sheets_log
ORDER BY synced_at DESC
LIMIT 10;

-- Check for failures
SELECT * FROM google_sheets_log
WHERE sync_status = 'FAILED'
ORDER BY synced_at DESC;
```

### 3. Manual Sync Test

```bash
# Get inspection ID from database
psql -U postgres -d crane_maintenance -c "SELECT id FROM inspections LIMIT 1;"

# Manually trigger sync via API
curl -X POST http://localhost:5000/api/inspections/1/sync
```

---

## Production Considerations

### Security

1. **Protect Credentials File**
   ```bash
   # Set restrictive permissions
   chmod 600 google-credentials.json
   chown app-user:app-user google-credentials.json
   ```

2. **Environment Variables**
   - Never commit `.env` to version control
   - Use secrets management in production (AWS Secrets Manager, etc.)

3. **Service Account Permissions**
   - Grant minimum required permissions
   - Only share specific spreadsheets, not entire Drive

### Reliability

1. **Error Handling**
   - Sync failures don't block inspection creation
   - Errors logged to database
   - Manual retry endpoint available

2. **Monitoring**
   ```sql
   -- Daily check for sync failures
   SELECT COUNT(*) as failed_syncs
   FROM google_sheets_log
   WHERE sync_status = 'FAILED'
   AND synced_at > NOW() - INTERVAL '24 hours';
   ```

3. **Alerts**
   - Set up email alerts for repeated sync failures
   - Monitor API quota usage

### Performance

1. **Async Processing**
   - Sync happens asynchronously (doesn't block API response)
   - Users get immediate feedback

2. **Batch Operations**
   - For bulk imports, consider batching
   - Reduces API calls

3. **Rate Limiting**
   - Implement backoff strategy for retries
   - Respect Google API quotas

---

## Advanced Configuration

### Multiple Spreadsheets

To sync different sheds to different spreadsheets:

1. **Update Code** (backend/models/Inspection.js):
   ```javascript
   const spreadsheetId = shed_id === 1
     ? process.env.SHED_A_SPREADSHEET_ID
     : process.env.SHED_B_SPREADSHEET_ID;
   ```

2. **Update .env**:
   ```env
   SHED_A_SPREADSHEET_ID=spreadsheet_id_1
   SHED_B_SPREADSHEET_ID=spreadsheet_id_2
   ```

### Custom Sheet Formatting

Modify `backend/services/googleSheetsService.js`:

```javascript
// Add conditional formatting
await sheets.spreadsheets.batchUpdate({
  spreadsheetId,
  resource: {
    requests: [{
      addConditionalFormatRule: {
        rule: {
          ranges: [{ sheetId: 0, startRowIndex: 1 }],
          booleanRule: {
            condition: {
              type: 'TEXT_EQ',
              values: [{ userEnteredValue: 'ATTENTION REQUIRED' }]
            },
            format: {
              backgroundColor: { red: 1, green: 0.6, blue: 0 }
            }
          }
        }
      }
    }]
  }
});
```

---

## Alternative: Google Sheets Add-on

If you prefer a no-code solution, you can create a Google Sheets Add-on that pulls data from your API.

**Pros:**
- No service account needed
- User controls data flow
- Can customize sheets easily

**Cons:**
- Not automatic
- Requires user action
- More setup for end users

---

## FAQ

**Q: Can I use multiple Google accounts?**
A: Yes, create separate service accounts for each environment (dev, staging, production).

**Q: What happens if sync fails?**
A: Inspection is still created. Error is logged. You can manually retry using the sync endpoint.

**Q: Can I delete old data from Google Sheets?**
A: Yes, but it doesn't affect database. Archive old sheets periodically.

**Q: Is the data encrypted in transit?**
A: Yes, Google Sheets API uses HTTPS/TLS encryption.

**Q: How much does Google Sheets API cost?**
A: Free for most use cases. Quotas are generous for typical usage.

**Q: Can I sync to Excel Online instead?**
A: Different API (Microsoft Graph API). Similar setup process but different implementation.

---

## Support

### Getting Help

1. **Check Logs**
   ```bash
   # Backend logs
   tail -f backend/logs/app.log

   # Database logs
   SELECT * FROM google_sheets_log WHERE sync_status = 'FAILED';
   ```

2. **Test Connection**
   ```
   http://localhost:5000/api/config/test-google-sheets
   ```

3. **Verify Configuration**
   ```bash
   # Check environment variables
   cat backend/.env | grep GOOGLE_SHEETS

   # Check credentials file
   cat backend/config/google-credentials.json | jq .
   ```

### Resources

- [Google Sheets API Documentation](https://developers.google.com/sheets/api)
- [Google Cloud Console](https://console.cloud.google.com/)
- [Service Accounts Overview](https://cloud.google.com/iam/docs/service-accounts)

---

## Summary

✅ Created Google Cloud Project
✅ Enabled Google Sheets API
✅ Created Service Account
✅ Downloaded credentials
✅ Created and shared spreadsheet
✅ Configured application
✅ Tested connection
✅ Ready for automatic sync!

**Next Steps:**
1. Create a test inspection
2. Verify data appears in Google Sheets
3. Monitor sync logs for any issues
4. Set up production alerts if needed

---

**Congratulations!** Your Crane Maintenance System now has automatic cloud backup and live reporting via Google Sheets.
