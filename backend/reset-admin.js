// backend/reset-admin.js
const bcrypt = require('bcrypt');
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`
});

async function reset() {
  const newHash = await bcrypt.hash('admin123', 10);
  console.log('New Local Hash Generated:', newHash);
  
  try {
    await pool.query("UPDATE users SET password_hash = $1 WHERE username = 'admin'", [newHash]);
    console.log('✅ Admin password has been reset using your local bcrypt version!');
  } catch (err) {
    console.error('❌ Error updating database:', err.message);
  } finally {
    await pool.end();
  }
}

reset();