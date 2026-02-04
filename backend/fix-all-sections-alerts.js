/**
 * DIRECT FIX: Update ALL inspection items with alert configuration
 * This will enable mandatory remarks for ALL sections
 *
 * Run with: node fix-all-sections-alerts.js
 */

const { pool } = require('./config/database');

async function fixAllSectionsAlerts() {
  const client = await pool.connect();

  try {
    console.log('='.repeat(60));
    console.log('FIXING ALERT CONFIGURATION FOR ALL SECTIONS');
    console.log('='.repeat(60));

    // Step 1: Show all sections
    const sectionsResult = await client.query(`
      SELECT id, name FROM form_sections ORDER BY id
    `);
    console.log('\n📋 SECTIONS IN DATABASE:');
    sectionsResult.rows.forEach(s => console.log(`  - [${s.id}] ${s.name}`));

    // Step 2: Show all items grouped by section
    const itemsResult = await client.query(`
      SELECT
        fs.id as section_id,
        fs.name as section_name,
        fi.id as item_id,
        fi.field_name,
        fi.dropdown_options,
        fi.alert_condition,
        fi.alert_value
      FROM form_items fi
      JOIN form_sections fs ON fi.section_id = fs.id
      ORDER BY fs.id, fi.display_order
    `);

    console.log('\n📋 ALL ITEMS BY SECTION:');
    let currentSection = null;
    itemsResult.rows.forEach(item => {
      if (currentSection !== item.section_name) {
        currentSection = item.section_name;
        console.log(`\n  [${item.section_name}]`);
      }
      const hasConfig = item.alert_condition && item.alert_value;
      const status = hasConfig ? '✓' : '✗';
      console.log(`    ${status} ${item.field_name} | Options: ${JSON.stringify(item.dropdown_options)} | Alert: ${item.alert_condition || 'NONE'} = ${item.alert_value || 'NONE'}`);
    });

    // Step 3: Update ALL items based on their dropdown options
    console.log('\n' + '='.repeat(60));
    console.log('APPLYING ALERT CONFIGURATION...');
    console.log('='.repeat(60));

    // Update items with OK/NOT OK options
    const okNotOkResult = await client.query(`
      UPDATE form_items
      SET alert_condition = 'EQUAL_TO', alert_value = 'OK'
      WHERE (
        dropdown_options::text ILIKE '%OK%'
        OR dropdown_options::text ILIKE '%Okay%'
      )
      AND alert_value IS NULL
      RETURNING id, field_name
    `);
    console.log(`\n✓ Updated ${okNotOkResult.rowCount} items with OK/NOT OK options`);

    // Update items with YES/NO options (satisfactory = YES)
    const yesNoResult = await client.query(`
      UPDATE form_items
      SET alert_condition = 'EQUAL_TO', alert_value = 'YES'
      WHERE dropdown_options::text ILIKE '%YES%'
      AND dropdown_options::text ILIKE '%NO%'
      AND NOT (dropdown_options::text ILIKE '%OK%')
      AND alert_value IS NULL
      RETURNING id, field_name
    `);
    console.log(`✓ Updated ${yesNoResult.rowCount} items with YES/NO options`);

    // Update items with NORMAL/ABNORMAL options
    const normalResult = await client.query(`
      UPDATE form_items
      SET alert_condition = 'EQUAL_TO', alert_value = 'NORMAL'
      WHERE dropdown_options::text ILIKE '%NORMAL%'
      AND dropdown_options::text ILIKE '%ABNORMAL%'
      AND alert_value IS NULL
      RETURNING id, field_name
    `);
    console.log(`✓ Updated ${normalResult.rowCount} items with NORMAL/ABNORMAL options`);

    // FALLBACK: For any remaining items without config, set default OK
    const fallbackResult = await client.query(`
      UPDATE form_items
      SET alert_condition = 'EQUAL_TO', alert_value = 'OK'
      WHERE alert_value IS NULL
      RETURNING id, field_name
    `);
    console.log(`✓ Updated ${fallbackResult.rowCount} remaining items with default OK`);

    // Step 4: Verify all items now have config
    console.log('\n' + '='.repeat(60));
    console.log('VERIFICATION');
    console.log('='.repeat(60));

    const verifyResult = await client.query(`
      SELECT
        fs.name as section_name,
        COUNT(*) as total,
        COUNT(fi.alert_condition) as configured
      FROM form_items fi
      JOIN form_sections fs ON fi.section_id = fs.id
      GROUP BY fs.name
      ORDER BY fs.name
    `);

    console.log('\n📊 FINAL STATUS BY SECTION:');
    let allConfigured = true;
    verifyResult.rows.forEach(row => {
      const pct = Math.round((row.configured / row.total) * 100);
      const status = pct === 100 ? '✓' : '⚠';
      if (pct < 100) allConfigured = false;
      console.log(`  ${status} ${row.section_name}: ${row.configured}/${row.total} (${pct}%)`);
    });

    if (allConfigured) {
      console.log('\n✅ SUCCESS! All sections are now configured for mandatory remarks validation.');
    } else {
      console.log('\n⚠ Some items still need manual configuration.');
    }

    // Show final state of all items
    const finalResult = await client.query(`
      SELECT
        fs.name as section_name,
        fi.field_name,
        fi.alert_condition,
        fi.alert_value
      FROM form_items fi
      JOIN form_sections fs ON fi.section_id = fs.id
      ORDER BY fs.name, fi.display_order
    `);

    console.log('\n📋 FINAL CONFIGURATION:');
    currentSection = null;
    finalResult.rows.forEach(item => {
      if (currentSection !== item.section_name) {
        currentSection = item.section_name;
        console.log(`\n  [${item.section_name}]`);
      }
      console.log(`    ✓ ${item.field_name} → ${item.alert_condition}: "${item.alert_value}"`);
    });

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
  } finally {
    client.release();
    await pool.end();
    console.log('\n' + '='.repeat(60));
    console.log('DONE - Restart your backend and refresh frontend');
    console.log('='.repeat(60));
  }
}

fixAllSectionsAlerts();
