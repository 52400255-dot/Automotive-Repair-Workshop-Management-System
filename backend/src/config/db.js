/**
 * config/db.js — Kết nối PostgreSQL dùng chung cho toàn backend.
 *
 * Sau Buổi 9: mọi giá trị kết nối (host, port, user, password, database) được
 * đọc từ cấu hình môi trường qua config/env.js. Mã nguồn không còn chứa mật khẩu
 * hay tên database viết cứng, và cũng không còn giá trị mặc định dự phòng.
 */
const { Pool } = require('pg');
const { env } = require('./env');

const pool = new Pool({
  host: env.db.host,
  port: env.db.port,
  user: env.db.user,
  password: env.db.password,
  database: env.db.database,
});

async function testConnection() {
  const client = await pool.connect();
  try {
    const result = await client.query('SELECT NOW()');
    // Chi in thong tin khong nhay cam: khong in host/user/mat khau.
    console.log(`PostgreSQL connected at ${result.rows[0].now} (database: ${env.db.database})`);
  } finally {
    client.release();
  }
}

module.exports = { pool, testConnection };
