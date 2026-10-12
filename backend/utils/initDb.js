const bcrypt = require('bcryptjs');

async function ensureDatabaseSchema(pool) {
  try {
    // 1. Create tables IF NOT EXISTS
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        username VARCHAR(50) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        login_password_plain VARCHAR(100),
        role VARCHAR(20) NOT NULL CHECK (role IN ('manager', 'worker')),
        phone VARCHAR(20),
        hourly_rate DECIMAL(10, 2),
        is_available_for_shifts BOOLEAN NOT NULL DEFAULT TRUE,
        unavailable_from DATE,
        unavailable_to DATE,
        mfa_secret TEXT,
        mfa_enabled BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS events (
        id SERIAL PRIMARY KEY,
        event_name VARCHAR(200) NOT NULL,
        event_type VARCHAR(50) NOT NULL,
        event_date DATE NOT NULL,
        start_time TIME NOT NULL,
        end_time TIME NOT NULL,
        guest_count INTEGER NOT NULL,
        location VARCHAR(255) NOT NULL,
        status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('draft', 'pending', 'confirmed', 'in_progress', 'completed', 'cancelled')),
        caterers_needed INTEGER NOT NULL DEFAULT 0,
        bartenders_needed INTEGER NOT NULL DEFAULT 0,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS staff_assignments (
        id SERIAL PRIMARY KEY,
        event_id INTEGER REFERENCES events(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        role_for_event VARCHAR(20) NOT NULL CHECK (role_for_event IN ('caterer', 'bartender')),
        confirmation_status VARCHAR(20) DEFAULT 'pending' CHECK (confirmation_status IN ('pending', 'confirmed', 'declined')),
        hours_worked DECIMAL(5, 2) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS inventory_items (
        id SERIAL PRIMARY KEY,
        item_name VARCHAR(100) NOT NULL,
        category VARCHAR(50) NOT NULL,
        quantity_available INTEGER NOT NULL DEFAULT 0,
        unit VARCHAR(20) NOT NULL,
        minimum_threshold INTEGER DEFAULT 10,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS event_inventory (
        id SERIAL PRIMARY KEY,
        event_id INTEGER REFERENCES events(id) ON DELETE CASCADE,
        inventory_item_id INTEGER REFERENCES inventory_items(id) ON DELETE CASCADE,
        quantity_needed INTEGER NOT NULL,
        quantity_used INTEGER DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS payments (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        event_id INTEGER REFERENCES events(id) ON DELETE CASCADE,
        amount DECIMAL(10, 2) NOT NULL,
        payment_date DATE,
        status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'paid')),
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        event_id INTEGER REFERENCES events(id) ON DELETE CASCADE,
        message TEXT NOT NULL,
        is_read BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 2. Ensure all columns and indexes exist in case tables were created with an older schema
    await pool.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS username VARCHAR(50);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS login_password_plain VARCHAR(100);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS is_available_for_shifts BOOLEAN NOT NULL DEFAULT TRUE;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS unavailable_from DATE;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS unavailable_to DATE;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS mfa_secret TEXT;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS mfa_enabled BOOLEAN NOT NULL DEFAULT FALSE;
      ALTER TABLE events ADD COLUMN IF NOT EXISTS caterers_needed INTEGER NOT NULL DEFAULT 0;
      ALTER TABLE events ADD COLUMN IF NOT EXISTS bartenders_needed INTEGER NOT NULL DEFAULT 0;
    `);

    // 3. Ensure a manager account exists
    const managerCheck = await pool.query(
      "SELECT id, username FROM users WHERE role = 'manager' LIMIT 1"
    );

    if (managerCheck.rows.length === 0) {
      const defaultPassword = 'Manager@123';
      const passwordHash = await bcrypt.hash(defaultPassword, 10);
      await pool.query(
        `INSERT INTO users (name, email, username, password_hash, login_password_plain, role)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        ['System Manager', 'manager@eventpro.local', 'manager', passwordHash, defaultPassword, 'manager']
      );
      console.log('✅ Created default manager account (username: manager, password: Manager@123)');
    }

    console.log('✅ Database schema verified successfully.');
  } catch (error) {
    console.error('⚠️ Database schema verification error:', error.message);
  }
}

module.exports = {
  ensureDatabaseSchema,
};

