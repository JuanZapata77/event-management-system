require('dotenv').config();
const pool = require('../config/database');
const { ensureDatabaseSchema } = require('../utils/initDb');

async function run() {
  console.log('🔄 Initializing database schema and default accounts...');
  await ensureDatabaseSchema(pool);
  await pool.end();
  console.log('✨ Database initialization finished.');
}

run().catch((error) => {
  console.error('❌ Database initialization failed:', error);
  process.exit(1);
});

