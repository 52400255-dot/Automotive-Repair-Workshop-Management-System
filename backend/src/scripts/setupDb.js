/**
 * setupDb.js — Script tự động khởi tạo cơ sở dữ liệu PostgreSQL cục bộ.
 * Cách chạy:
 *   node src/scripts/setupDb.js [postgres_password]
 * Ví dụ:
 *   node src/scripts/setupDb.js 123456
 *   (Nếu không truyền mật khẩu, mặc định thử: postgres, 123456, admin, root hoặc prompt)
 */
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const ROOT_DIR = path.join(__dirname, '..', '..', '..');
const MIGRATIONS_DIR = path.join(ROOT_DIR, 'database', 'migrations');
const SEEDS_DIR = path.join(ROOT_DIR, 'database', 'seeds');

async function askPassword(promptText) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => {
    rl.question(promptText, (ans) => {
      rl.close();
      resolve(ans.trim());
    });
  });
}

async function tryConnectPostgres(password) {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: password,
    database: 'postgres',
  });
  await client.connect();
  return client;
}

async function main() {
  console.log('====================================================');
  console.log('   TỰ ĐỘNG KHỞI TẠO DATABASE WORKSHOP_DB (POSTGRESQL)');
  console.log('====================================================\n');

  let superPassword = process.argv[2];
  let client;

  // 0. Thử kết nối trực tiếp bằng workshop_user (nếu đã được tạo hoặc chạy trong Docker)
  try {
    const directClient = new Client({
      host: 'localhost',
      port: 5432,
      user: 'workshop_user',
      password: 'workshop_pass',
      database: 'workshop_db',
    });
    await directClient.connect();
    console.log('✓ Kết nối trực tiếp thành công với workshop_user!');
    
    // Bỏ qua bước tạo database, nhảy thẳng tới chạy migrations & seeds
    await runMigrationsAndSeeds(directClient);
    return;
  } catch (directErr) {
    // Không kết nối được workshop_user, tiếp tục với user postgres
  }

  // Thử các mật khẩu phổ biến nếu người dùng không truyền tham số
  const commonPasswords = superPassword ? [superPassword] : ['postgres', '123456', 'admin', 'root', ''];

  for (const pwd of commonPasswords) {
    try {
      client = await tryConnectPostgres(pwd);
      superPassword = pwd;
      console.log(`✓ Kết nối thành công đến PostgreSQL (user: postgres)!`);
      break;
    } catch (err) {
      // Thử mật khẩu tiếp theo
    }
  }

  // Nếu các mật khẩu phổ biến không đúng, hỏi người dùng
  if (!client) {
    console.log('! Các mật khẩu mặc định (postgres, 123456...) không đúng.');
    superPassword = await askPassword('Vui lòng nhập mật khẩu tài khoản "postgres" bạn đã đặt khi cài đặt: ');
    try {
      client = await tryConnectPostgres(superPassword);
      console.log(`✓ Kết nối thành công đến PostgreSQL!`);
    } catch (err) {
      console.error('✗ Kết nối thất bại. Lỗi:', err.message);
      process.exit(1);
    }
  }

  try {
    // 1. Tạo user workshop_user nếu chưa có
    console.log('\n1. Đang kiểm tra / tạo user [workshop_user]...');
    const userExists = await client.query("SELECT 1 FROM pg_roles WHERE rolname = 'workshop_user'");
    if (userExists.rows.length === 0) {
      await client.query("CREATE USER workshop_user WITH PASSWORD 'workshop_pass'");
      console.log('✓ Đã tạo user: workshop_user (mật khẩu: workshop_pass)');
    } else {
      await client.query("ALTER USER workshop_user WITH PASSWORD 'workshop_pass'");
      console.log('✓ User workshop_user đã tồn tại (đã cập nhật mật khẩu)');
    }

    // 2. Tạo database workshop_db nếu chưa có
    console.log('\n2. Đang kiểm tra / tạo database [workshop_db]...');
    const dbExists = await client.query("SELECT 1 FROM pg_database WHERE datname = 'workshop_db'");
    if (dbExists.rows.length === 0) {
      await client.query("CREATE DATABASE workshop_db OWNER workshop_user");
      console.log('✓ Đã tạo database: workshop_db');
    } else {
      console.log('✓ Database workshop_db đã tồn tại');
    }

    await client.query("GRANT ALL PRIVILEGES ON DATABASE workshop_db TO workshop_user");
    await client.end();

    // 3. Kết nối trực tiếp vào workshop_db
    console.log('\n3. Đang kết nối vào database [workshop_db]...');
    const dbClient = new Client({
      host: 'localhost',
      port: 5432,
      user: 'workshop_user',
      password: 'workshop_pass',
      database: 'workshop_db',
    });
    await dbClient.connect();

    await runMigrationsAndSeeds(dbClient);
  } catch (err) {
    console.error('✗ Có lỗi xảy ra trong quá trình thiết lập:', err.message);
    process.exit(1);
  }
}

async function runMigrationsAndSeeds(dbClient) {
  try {
    // Chạy toàn bộ file migrations
    console.log('\n4. Đang chạy các file migrations (*.sql)...');
    const migrationFiles = fs.readdirSync(MIGRATIONS_DIR)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    for (const file of migrationFiles) {
      const filePath = path.join(MIGRATIONS_DIR, file);
      const sql = fs.readFileSync(filePath, 'utf8');
      try {
        await dbClient.query(sql);
        console.log(`   ✓ Migration: ${file}`);
      } catch (mErr) {
        if (mErr.message.includes('already exists')) {
          console.log(`   - Bỏ qua (đã tồn tại): ${file}`);
        } else {
          console.warn(`   ! Lưu ý khi chạy ${file}:`, mErr.message);
        }
      }
    }

    // Chạy các file seeds dữ liệu mẫu
    console.log('\n5. Đang nạp dữ liệu mẫu từ seeds (*.sql)...');
    if (process.argv.includes('--reset')) {
      console.log('   ! Đang làm sạch bảng để nạp lại dữ liệu chuẩn UTF-8 (--reset)...');
      await dbClient.query('TRUNCATE users, customers, vehicles, spare_parts, repair_jobs, diagnoses, mechanic_assignments, repair_tasks, used_parts, inventory_movements, estimates, estimate_details, invoices, invoice_details, payments, services, repair_details RESTART IDENTITY CASCADE;');
    }
    const seedFiles = fs.readdirSync(SEEDS_DIR)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    for (const file of seedFiles) {
      const filePath = path.join(SEEDS_DIR, file);
      const sql = fs.readFileSync(filePath, 'utf8');
      try {
        await dbClient.query(sql);
        console.log(`   ✓ Seed: ${file}`);
      } catch (sErr) {
        if (sErr.message.includes('duplicate key') || sErr.message.includes('already exists')) {
          console.log(`   - Bỏ qua (dữ liệu mẫu đã có): ${file}`);
        } else {
          console.warn(`   ! Lưu ý khi chạy seed ${file}:`, sErr.message);
        }
      }
    }

    await dbClient.end();

    console.log('\n====================================================');
    console.log('🎉 KHỞI TẠO DATABASE VÀ DỮ LIỆU THÀNH CÔNG RỰC RỠ!');
    console.log('====================================================');
    console.log('Bây giờ bạn có thể khởi động Backend và Frontend để test.\n');
  } catch (err) {
    await dbClient.end();
    throw err;
  }
}

main();
