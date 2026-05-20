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

  const plainPassword = 'Manager@123';
  const passwordHash = await bcrypt.hash(plainPassword, 10);

  await pool.query(`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS username VARCHAR(50)
  `);

  await pool.query(`
    UPDATE users
    SET username = lower(
      regexp_replace(split_part(email, '@', 1), '[^a-zA-Z0-9_]+', '', 'g')
    ) || '_' || id
    WHERE username IS NULL
  `);

  await pool.query(`
    ALTER TABLE users
    ALTER COLUMN username SET NOT NULL
  `);

  await pool.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_indexes
        WHERE schemaname = 'public'
          AND indexname = 'users_username_unique_idx'
      ) THEN
        CREATE UNIQUE INDEX users_username_unique_idx ON users (lower(username));
      END IF;
    END $$;
  `);

  const existing = await pool.query(
    'SELECT id, email FROM users WHERE role = $1 ORDER BY id ASC LIMIT 1',
    ['manager']
  );

  const baseUsername = 'manager';

  for (let attempt = 0; attempt < 20; attempt += 1) {
    const candidate = attempt === 0 ? baseUsername : `${baseUsername}${attempt}`;

    try {
      if (existing.rows.length > 0) {
        const managerId = existing.rows[0].id;
        const result = await pool.query(
          'UPDATE users SET username = $1, password_hash = $2 WHERE id = $3 RETURNING id, email, username, role',
          [candidate, passwordHash, managerId]
        );

        console.log(
          JSON.stringify({
            action: 'updated-existing-manager',
            user: result.rows[0],
            password: plainPassword,
          })
        );
      } else {
        const result = await pool.query(
          'INSERT INTO users (name, email, username, password_hash, role) VALUES ($1, $2, $3, $4, $5) RETURNING id, email, username, role',
          ['System Manager', 'manager@eventpro.local', candidate, passwordHash, 'manager']
        );

        console.log(
          JSON.stringify({
            action: 'created-new-manager',
            user: result.rows[0],
            password: plainPassword,
          })
        );
      }

      await pool.end();
      return;
    } catch (error) {
      if (
        error &&
        error.code === '23505' &&
        String(error.detail || '').toLowerCase().includes('username')
      ) {
        continue;
      }

      await pool.end();
      throw error;
    }
  }

  await pool.end();
  throw new Error('Could not find an available manager username after multiple attempts');
}

module.exports = run;

if (require.main === module) {
  run().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
