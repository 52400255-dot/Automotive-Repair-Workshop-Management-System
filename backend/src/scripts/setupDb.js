/**
 * setupDb.js — Script tự động khởi tạo cơ sở dữ liệu PostgreSQL cục bộ.
 *
 * Cách chạy:
 *   node backend/src/scripts/setupDb.js
 *   (hoặc kích đúp vào file khoi_tao_database.bat ở thư mục gốc)
 *
 * Buổi 9 — bỏ hard-code:
 *   - TRƯỚC: host/port/user/password viết cứng trong mã nguồn ở ba nơi khác
 *     nhau; script còn thử lần lượt một danh sách mật khẩu phổ biến để đoán
 *     tài khoản superuser, và in thẳng mật khẩu ứng dụng ra console.
 *   - SAU: mọi giá trị đọc từ cấu hình môi trường (.env / biến môi trường).
 *     Mật khẩu superuser lấy từ DB_SUPERUSER_PASSWORD; nếu thiếu thì HỎI
 *     người dùng nhập, không đoán và không lưu trong code. Mật khẩu không bao
 *     giờ được in ra console.
 *
 * Lưu ý về an toàn truy vấn: các câu DDL (CREATE USER / CREATE DATABASE / GRANT)
 * KHÔNG thể dùng placeholder cho tên role, tên database — PostgreSQL không cho
 * tham số hoá identifier. Cách an toàn là để chính server dựng câu lệnh bằng
 * hàm format() với %I (identifier) và %L (literal), xem hàm buildDdl() dưới đây.
 */
const fs = require('node:fs');
const path = require('node:path');
const readline = require('node:readline');
const { Client } = require('pg');
const { env, optional } = require('../config/env');

const ROOT_DIR = path.resolve(__dirname, '..', '..', '..');
const MIGRATIONS_DIR = path.join(ROOT_DIR, 'database', 'migrations');
const SEEDS_DIR = path.join(ROOT_DIR, 'database', 'seeds');

/** Hang so dung lai, thay cho chuoi gan gach duong ke lap lai 4 lan (S1192). */
const BANNER = '='.repeat(52);

/** Cau hinh ket noi — khong con gia tri bidan trong ma nguon. */
const config = {
  host: env.db.host,
  port: env.db.port,
  appUser: env.db.user,
  appPassword: env.db.password,
  appDatabase: env.db.database,
  superUser: optional('DB_SUPERUSER', 'postgres'),
  superDatabase: optional('DB_SUPERDATABASE', 'postgres'),
  superPassword: optional('DB_SUPERUSER_PASSWORD', ''),
};

function ask(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

/**
 * Dung server PostgreSQL tu sinh cau DDL an toan.
 *
 * Ca chuoi dinh dang lan hai tham so deu duoc truyen bang placeholder ($1, $2, $3),
 * khong noi chuoi trong JavaScript. PostgreSQL se tu bao chu bang:
 *   %I -> identifier (ten role, ten database)   %L -> literal (mat khau)
 * nen khong the "tiem" them SQL vao ten role hay mat khau.
 *
 * Cac cau DDL duoc dung o day deu co dung 2 cho nay.
 */
async function buildDdl(client, template, first, second) {
  const result = await client.query('SELECT format($1, $2, $3) AS stmt', [template, first, second]);
  return result.rows[0].stmt;
}

async function connect(options) {
  const client = new Client(options);
  await client.connect();
  return client;
}

/** Ket noi bang tai khoan superuser (postgres). Tra ve null neu sai mat khau. */
async function connectAsSuperuser(password) {
  try {
    return await connect({
      host: config.host,
      port: config.port,
      user: config.superUser,
      database: config.superDatabase,
      password,
    });
  } catch {
    return null;
  }
}

/** Lay mat khau superuser: tu .env, hoac hoi truc tiep — khong doan. */
async function resolveSuperuserPassword() {
  if (config.superPassword) return config.superPassword;
  return ask(
    `Nhập mật khẩu tài khoản "${config.superUser}" của PostgreSQL đang chạy tại `
    + `${config.host}:${config.port} (giá trị này cũng có thể đặt ở DB_SUPERUSER_PASSWORD trong .env): `
  );
}

/** Tao role + database theo cau hinh trong .env (neu chua ton tai). */
async function ensureRoleAndDatabase(client) {
  console.log(`\n1. Đang kiểm tra / tạo user [${config.appUser}]...`);
  const userExists = await client.query('SELECT 1 FROM pg_roles WHERE rolname = $1', [config.appUser]);
  if (userExists.rowCount === 0) {
    const ddl = await buildDdl(client, 'CREATE USER %I WITH PASSWORD %L', config.appUser, config.appPassword);
    await client.query(ddl);
    console.log(`✓ Đã tạo user: ${config.appUser} (mật khẩu lấy từ DB_PASSWORD, không in ra log)`);
  } else {
    const ddl = await buildDdl(client, 'ALTER USER %I WITH PASSWORD %L', config.appUser, config.appPassword);
    await client.query(ddl);
    console.log(`✓ User ${config.appUser} đã tồn tại (đã đồng bộ mật khẩu theo .env)`);
  }

  console.log(`\n2. Đang kiểm tra / tạo database [${config.appDatabase}]...`);
  const dbExists = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [config.appDatabase]);
  if (dbExists.rowCount === 0) {
    const ddl = await buildDdl(client, 'CREATE DATABASE %I OWNER %I', config.appDatabase, config.appUser);
    await client.query(ddl);
    console.log(`✓ Đã tạo database: ${config.appDatabase}`);
  } else {
    console.log(`✓ Database ${config.appDatabase} đã tồn tại`);
  }

  const grant = await buildDdl(client, 'GRANT ALL PRIVILEGES ON DATABASE %I TO %I', config.appDatabase, config.appUser);
  await client.query(grant);
}

async function main() {
  console.log(BANNER);
  console.log(`   TỰ ĐỘNG KHỞI TẠO DATABASE ${config.appDatabase.toUpperCase()} (POSTGRESQL)`);
  console.log(BANNER);
  console.log(`Cấu hình: ${config.host}:${config.port} | user ứng dụng: ${config.appUser}`);
  console.log(`File .env đã nạp: ${env.loadedFiles.length ? env.loadedFiles.join(', ') : 'không có (dùng biến môi trường)'}`);

  // 0. Nếu ứng dụng đã kết nối được (DB đã tạo sẵn / chạy trong Docker) thì bỏ qua bước tạo.
  let directClient;
  try {
    directClient = await connect({
      host: config.host,
      port: config.port,
      user: config.appUser,
      password: config.appPassword,
      database: config.appDatabase,
    });
  } catch {
    console.log(`\n- Chưa kết nối được bằng ${config.appUser}, tiến hành tạo role/database mới.`);
  }
  if (directClient) {
    console.log(`\n✓ Kết nối trực tiếp thành công với ${config.appUser} — bỏ qua bước tạo database.`);
    await runMigrationsAndSeeds(directClient);
    return;
  }

  // 1. Ket noi bang tai khoan superuser.
  let client = await connectAsSuperuser(config.superPassword);
  if (!client) {
    const nhapLai = await resolveSuperuserPassword();
    client = await connectAsSuperuser(nhapLai);
  }
  if (!client) {
    console.error(`\n✗ Không kết nối được bằng tài khoản "${config.superUser}". Kiểm tra PostgreSQL đã chạy và DB_SUPERUSER_PASSWORD đúng.`);
    process.exit(1);
  }
  console.log(`✓ Kết nối thành công đến PostgreSQL (user: ${config.superUser})`);

  try {
    await ensureRoleAndDatabase(client);
    await client.end();

    console.log(`\n3. Đang kết nối vào database [${config.appDatabase}]...`);
    const dbClient = await connect({
      host: config.host,
      port: config.port,
      user: config.appUser,
      password: config.appPassword,
      database: config.appDatabase,
    });
    await runMigrationsAndSeeds(dbClient);
  } catch (err) {
    console.error(`\n✗ Có lỗi xảy ra trong quá trình thiết lập: ${err.message}`);
    process.exit(1);
  }
}

/** Chạy toàn bộ file *.sql trong database/migrations va database/seeds. */
async function runMigrationsAndSeeds(dbClient) {
  try {
    console.log('\n4. Đang chạy các file migrations (*.sql)...');
    for (const file of sortedSqlFiles(MIGRATIONS_DIR)) {
      await runSqlFile(dbClient, MIGRATIONS_DIR, file, 'Migration', MIGRATION_SKIP_CODES);
    }

    console.log('\n5. Đang nạp dữ liệu mẫu từ seeds (*.sql)...');
    if (process.argv.includes('--reset')) {
      console.log('   ! Đang làm sạch bảng để nạp lại dữ liệu chuẩn UTF-8 (--reset)...');
      await dbClient.query(TRUNCATE_ALL_SQL);
    }
    for (const file of sortedSqlFiles(SEEDS_DIR)) {
      await runSqlFile(dbClient, SEEDS_DIR, file, 'Seed', SEED_SKIP_CODES);
    }

    await dbClient.end();
    console.log(`\n${BANNER}`);
    console.log('🎉 KHỞI TẠO DATABASE VÀ DỮ LIỆU THÀNH CÔNG!');
    console.log(`${BANNER}`);
    console.log('Bây giờ bạn có thể khởi động Backend và Frontend để test.\n');
  } catch (err) {
    await dbClient.end();
    throw err;
  }
}

function sortedSqlFiles(dir) {
  return fs.readdirSync(dir).filter((f) => f.endsWith('.sql')).sort();
}

/** Danh sach bang duoc TRUNCATE khi chay --reset (giu nguyen nhu ban cu). */
const TRUNCATE_ALL_SQL = 'TRUNCATE users, customers, vehicles, spare_parts, repair_jobs, diagnoses, mechanic_assignments, repair_tasks, used_parts, inventory_movements, estimates, estimate_details, invoices, invoice_details, payments, services, repair_details RESTART IDENTITY CASCADE;';

/** Chỉ bỏ qua các SQLSTATE xác định là đối tượng đã tồn tại / khóa seed trùng. */
const MIGRATION_SKIP_CODES = new Set(['42P07', '42701', '42710', '42723']);
const SEED_SKIP_CODES = new Set(['23505']);

/** Chạy một file SQL; mọi lỗi ngoài nhóm SQLSTATE cho phép sẽ dừng setup. */
async function runSqlFile(dbClient, dir, file, label, skipCodes) {
  const sql = fs.readFileSync(path.join(dir, file), 'utf8');
  try {
    await dbClient.query(sql);
    console.log(`   ✓ ${label}: ${file}`);
  } catch (err) {
    if (skipCodes.has(err.code)) {
      console.log(`   - Bỏ qua (đã tồn tại): ${file}`);
    } else {
      console.error(`   ✗ ${label} thất bại: ${file} (${err.code || 'unknown'})`);
      throw new Error(`${label} thất bại: ${file}`, { cause: err });
    }
  }
}

main().catch((err) => {
  console.error(`\n✗ Thiết lập database thất bại: ${err.message}`);
  process.exitCode = 1;
});
