const { Pool } = require('pg');
require('dotenv').config();

const poolConfig = {
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
};

// Enable SSL if requested (useful for cloud providers like Supabase)
if (process.env.DB_SSL === 'true') {
  // By default verify the database server certificate. Only disable verification
  // in exceptional debugging/testing scenarios by setting
  // DB_SSL_REJECT_UNAUTHORIZED=false in the environment.
  poolConfig.ssl = {
    rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false',
  };
}

const pool = new Pool(poolConfig);

// Test the connection
pool.connect((err, client, release) => {
  if (err) {
    return console.error('Error connecting to the database:', err.stack);
  }
  console.log('Connected to PostgreSQL database successfully!');
  release();
});

module.exports = pool;