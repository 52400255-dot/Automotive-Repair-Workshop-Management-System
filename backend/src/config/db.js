const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
require('dotenv').config({ path: path.resolve(__dirname, '../../../.env') });
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 5432,
  user: process.env.DB_USER || 'workshop_user',
  password: String(process.env.DB_PASSWORD || 'workshop_pass'),
  database: process.env.DB_NAME || 'workshop_db',
});

async function testConnection() {
  const client = await pool.connect();
  try {
    const result = await client.query('SELECT NOW()');
    console.log('PostgreSQL connected at', result.rows[0].now);
  } finally {
    client.release();
  }
}

module.exports = { pool, testConnection };