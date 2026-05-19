require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

async function run() {
  const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
  });

  await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS login_password_plain VARCHAR(100)');

  const workersResult = await pool.query(
    'SELECT id, email FROM users WHERE role = $1 ORDER BY id ASC',
    ['worker']
  );

  let updatedCount = 0;

  for (const worker of workersResult.rows) {
    if (!worker.email) {
      continue;
    }

    const username = String(worker.email).trim().toLowerCase();
    const plainPassword = `Worker@${worker.id}`;
    const passwordHash = await bcrypt.hash(plainPassword, 10);

    await pool.query(
      `UPDATE users
       SET username = $1,
           password_hash = $2,
           login_password_plain = $3
       WHERE id = $4`,
      [username, passwordHash, plainPassword, worker.id]
    );

    updatedCount += 1;
  }

  await pool.end();

  console.log(JSON.stringify({
    message: 'Worker login backfill completed',
    workersFound: workersResult.rows.length,
    workersUpdated: updatedCount,
    passwordPattern: 'Worker@<worker_id>',
  }));
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
