/** Test fixtures for US17 role-management API and browser coverage. */
const { randomUUID } = require('node:crypto');
const { requireDep, requireTestDbConfig } = require('./testEnv');

const { Client } = requireDep('pg');
const bcrypt = requireDep('bcryptjs');
const TEST_PASSWORD = '123456';

async function createRoleManagementFixtures() {
  const db = new Client(requireTestDbConfig());
  await db.connect();

  const suffix = randomUUID();
  const fixtures = {
    db,
    adminId: null,
    targetId: null,
    adminEmail: `admin-${suffix}@integration.test`,
    targetEmail: `role-target-${suffix}@integration.test`,
    password: TEST_PASSWORD,
  };

  try {
    const passwordHash = await bcrypt.hash(TEST_PASSWORD, 10);
    await db.query('BEGIN');
    const admin = await db.query(
      `INSERT INTO users (full_name, email, password_hash, role)
       VALUES ($1, $2, $3, 'admin') RETURNING id`,
      ['Role Management Test Admin', fixtures.adminEmail, passwordHash]
    );
    fixtures.adminId = admin.rows[0].id;

    const target = await db.query(
      `INSERT INTO users (full_name, email, password_hash, role)
       VALUES ($1, $2, $3, 'receptionist') RETURNING id`,
      ['Role Management Test Target', fixtures.targetEmail, passwordHash]
    );
    fixtures.targetId = target.rows[0].id;
    await db.query('COMMIT');
  } catch (error) {
    try { await db.query('ROLLBACK'); } catch { /* Preserve the fixture creation error. */ }
    await db.end();
    throw error;
  }

  fixtures.cleanup = async () => {
    try {
      await db.query('BEGIN');
      const ids = [fixtures.adminId, fixtures.targetId].filter(Boolean);
      if (ids.length) await db.query('DELETE FROM users WHERE id = ANY($1::bigint[])', [ids]);
      await db.query('COMMIT');
    } catch (error) {
      try { await db.query('ROLLBACK'); } catch { /* Preserve cleanup failure. */ }
      throw error;
    } finally {
      await db.end();
    }
  };

  return fixtures;
}

module.exports = { createRoleManagementFixtures };
