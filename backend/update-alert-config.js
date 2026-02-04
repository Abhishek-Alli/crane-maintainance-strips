/**
 * Script to update alert_condition and alert_value for ALL inspection items
 * This enables the mandatory remarks validation for failed values
 *
 * Run with: node update-alert-config.js
 */

const { pool } = require('./config/database');

// Define alert configurations for common inspection items
// alert_value = the SATISFACTORY/expected value
// alert_condition = EQUAL_TO (means: satisfactory when value equals this)
const alertConfigs = [
  // Oil-related items
  { pattern: '%oil level%', alert_value: 'OK', alert_condition: 'EQUAL_TO' },
  { pattern: '%oil leakage%', alert_value: 'NO', alert_condition: 'EQUAL_TO' },

  // Noise and Vibration
  { pattern: '%noise%', alert_value: 'NORMAL', alert_condition: 'EQUAL_TO' },
  { pattern: '%vibration%', alert_value: 'NO', alert_condition: 'EQUAL_TO' },

  // Condition items (Bearing, Gear, Wire Rope, Brake, Motor, etc.)
  { pattern: '%bearing condition%', alert_value: 'OK', alert_condition: 'EQUAL_TO' },
  { pattern: '%gear condition%', alert_value: 'OK', alert_condition: 'EQUAL_TO' },
  { pattern: '%wire rope condition%', alert_value: 'OK', alert_condition: 'EQUAL_TO' },
  { pattern: '%wire rope drum%', alert_value: 'OK', alert_condition: 'EQUAL_TO' },
  { pattern: '%brake condition%', alert_value: 'NORMAL', alert_condition: 'EQUAL_TO' },
  { pattern: '%motor condition%', alert_value: 'OK', alert_condition: 'EQUAL_TO' },
  { pattern: '%drive condition%', alert_value: 'OK', alert_condition: 'EQUAL_TO' },
  { pattern: '%idle condition%', alert_value: 'OK', alert_condition: 'EQUAL_TO' },
  { pattern: '%hook condition%', alert_value: 'OK', alert_condition: 'EQUAL_TO' },
  { pattern: '%chain condition%', alert_value: 'OK', alert_condition: 'EQUAL_TO' },
  { pattern: '%wheel condition%', alert_value: 'OK', alert_condition: 'EQUAL_TO' },
  { pattern: '%rope condition%', alert_value: 'OK', alert_condition: 'EQUAL_TO' },
  { pattern: '%drum condition%', alert_value: 'OK', alert_condition: 'EQUAL_TO' },

  // Load Limiter
  { pattern: '%load limiter%', alert_value: 'YES', alert_condition: 'EQUAL_TO' },

  // General condition patterns (catch-all for items ending with "condition")
  { pattern: '%condition', alert_value: 'OK', alert_condition: 'EQUAL_TO' },

  // Leakage patterns
  { pattern: '%leakage%', alert_value: 'NO', alert_condition: 'EQUAL_TO' },

  // Alignment
  { pattern: '%alignment%', alert_value: 'OK', alert_condition: 'EQUAL_TO' },

  // Coupling
  { pattern: '%coupling%', alert_value: 'OK', alert_condition: 'EQUAL_TO' },

  // Safety items
  { pattern: '%safety%', alert_value: 'OK', alert_condition: 'EQUAL_TO' },
  { pattern: '%limit switch%', alert_value: 'OK', alert_condition: 'EQUAL_TO' },
  { pattern: '%emergency%', alert_value: 'OK', alert_condition: 'EQUAL_TO' },
];

async function updateAlertConfigs() {
  const client = await pool.connect();

  try {
    console.log('Starting alert configuration update...\n');

    // First, show current state
    const beforeResult = await client.query(`
      SELECT
        fs.name as section_name,
        fi.field_name,
        fi.alert_condition,
        fi.alert_value
      FROM form_items fi
      JOIN form_sections fs ON fi.section_id = fs.id
      ORDER BY fs.name, fi.display_order
    `);

    console.log('=== BEFORE UPDATE ===');
    console.log(`Total items: ${beforeResult.rows.length}`);
    const itemsWithAlert = beforeResult.rows.filter(r => r.alert_condition && r.alert_value);
    console.log(`Items with alert config: ${itemsWithAlert.length}`);
    console.log(`Items without alert config: ${beforeResult.rows.length - itemsWithAlert.length}\n`);

    // Update each pattern
    let totalUpdated = 0;

    for (const config of alertConfigs) {
      const result = await client.query(`
        UPDATE form_items
        SET
          alert_condition = $1,
          alert_value = $2
        WHERE LOWER(field_name) LIKE LOWER($3)
          AND (alert_condition IS NULL OR alert_value IS NULL)
        RETURNING id, field_name
      `, [config.alert_condition, config.alert_value, config.pattern]);

      if (result.rowCount > 0) {
        console.log(`Updated ${result.rowCount} items matching "${config.pattern}":`);
        result.rows.forEach(row => {
          console.log(`  - ${row.field_name} → ${config.alert_condition}: "${config.alert_value}"`);
        });
        totalUpdated += result.rowCount;
      }
    }

    console.log(`\n=== SUMMARY ===`);
    console.log(`Total items updated: ${totalUpdated}`);

    // Show after state grouped by section
    const afterResult = await client.query(`
      SELECT
        fs.name as section_name,
        COUNT(*) as total_items,
        COUNT(fi.alert_condition) as items_with_alert
      FROM form_items fi
      JOIN form_sections fs ON fi.section_id = fs.id
      GROUP BY fs.name
      ORDER BY fs.name
    `);

    console.log('\n=== AFTER UPDATE (by section) ===');
    afterResult.rows.forEach(row => {
      const status = row.items_with_alert === row.total_items ? '✓' : '⚠';
      console.log(`${status} ${row.section_name}: ${row.items_with_alert}/${row.total_items} items configured`);
    });

    // Show items still missing config
    const missingResult = await client.query(`
      SELECT
        fs.name as section_name,
        fi.field_name
      FROM form_items fi
      JOIN form_sections fs ON fi.section_id = fs.id
      WHERE fi.alert_condition IS NULL OR fi.alert_value IS NULL
      ORDER BY fs.name, fi.display_order
    `);

    if (missingResult.rows.length > 0) {
      console.log('\n=== ITEMS STILL MISSING ALERT CONFIG ===');
      missingResult.rows.forEach(row => {
        console.log(`  - [${row.section_name}] ${row.field_name}`);
      });
      console.log('\nYou may need to manually configure these items or add more patterns to this script.');
    } else {
      console.log('\n✓ All items now have alert configuration!');
    }

  } catch (error) {
    console.error('Error updating alert configs:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

updateAlertConfigs();
