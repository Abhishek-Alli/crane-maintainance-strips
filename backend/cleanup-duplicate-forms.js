/**
 * Script to clean up duplicate forms
 * Run with: node cleanup-duplicate-forms.js
 */

const { pool } = require('./config/database');

async function cleanupDuplicateForms() {
  try {
    console.log('Connecting to database...');

    // 1. List all forms
    console.log('\n=== Current Forms ===');
    const forms = await pool.query('SELECT id, name, is_active FROM forms ORDER BY id');
    forms.rows.forEach(f => {
      console.log(`  ID: ${f.id} | Name: "${f.name}" | Active: ${f.is_active}`);
    });

    // 2. Find duplicates (forms with similar names)
    console.log('\n=== Checking for duplicates ===');
    const duplicates = await pool.query(`
      SELECT id, name
      FROM forms
      WHERE LOWER(REPLACE(name, ' ', '')) LIKE '%standardcraneinspection%'
      ORDER BY id
    `);

    if (duplicates.rows.length <= 1) {
      console.log('No duplicate forms found.');
      return;
    }

    console.log('Found potential duplicates:');
    duplicates.rows.forEach(f => {
      console.log(`  ID: ${f.id} | Name: "${f.name}"`);
    });

    // 3. Keep the first one (lowest ID), deactivate/delete others
    const keepId = duplicates.rows[0].id;
    const deleteIds = duplicates.rows.slice(1).map(f => f.id);

    console.log(`\nKeeping form ID: ${keepId} ("${duplicates.rows[0].name}")`);
    console.log(`Deactivating form IDs: ${deleteIds.join(', ')}`);

    // Option 1: Deactivate (safer)
    for (const id of deleteIds) {
      await pool.query('UPDATE forms SET is_active = false WHERE id = $1', [id]);
      console.log(`  Deactivated form ID: ${id}`);
    }

    // Option 2: Delete (uncomment if you want to completely remove)
    // for (const id of deleteIds) {
    //   await pool.query('DELETE FROM forms WHERE id = $1', [id]);
    //   console.log(`  Deleted form ID: ${id}`);
    // }

    console.log('\n=== Updated Forms ===');
    const updatedForms = await pool.query('SELECT id, name, is_active FROM forms WHERE is_active = true ORDER BY id');
    updatedForms.rows.forEach(f => {
      console.log(`  ID: ${f.id} | Name: "${f.name}" | Active: ${f.is_active}`);
    });

    console.log('\nDone! Duplicate forms have been deactivated.');

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

cleanupDuplicateForms();
