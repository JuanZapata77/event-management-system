const { Pool } = require('pg');
require('dotenv').config();

const connectionString = process.env.DATABASE_URL;

const poolConfig = connectionString
  ? { connectionString }
  : {
      user: process.env.DB_USER,
      host: process.env.DB_HOST,
      database: process.env.DB_NAME,
      password: process.env.DB_PASSWORD,
      port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 5432,
    };

// Determine whether SSL should be enabled:
// - Explicitly requested via DB_SSL=true
// - Or using a remote DATABASE_URL (common on Render, Neon, Supabase, Railway)
// - Or using a remote DB_HOST
const isRemoteHost = (host) => Boolean(host && host !== 'localhost' && host !== '127.0.0.1');
const shouldUseSsl =
  process.env.DB_SSL === 'true' ||
  (Boolean(connectionString) && !connectionString.includes('localhost') && !connectionString.includes('127.0.0.1')) ||
  isRemoteHost(process.env.DB_HOST);

if (shouldUseSsl && process.env.DB_SSL !== 'false') {
  // Hosted cloud databases (Render, Neon, Supabase) typically use certificates
  // not in Node's default CA bundle. Default rejectUnauthorized to false unless
  // explicitly configured as true via DB_SSL_REJECT_UNAUTHORIZED=true.
  const rejectUnauthorized = process.env.DB_SSL_REJECT_UNAUTHORIZED === 'true';
  poolConfig.ssl = {
    rejectUnauthorized,
  };

  if (process.env.DB_CA_CERT) {
    const raw = process.env.DB_CA_CERT;
    const ca = raw.includes('-----BEGIN') ? raw : raw.replace(/\\n/g, '\n');
    poolConfig.ssl.ca = ca;
  }
}

poolConfig.connectionTimeoutMillis = 10000;
poolConfig.idleTimeoutMillis = 30000;
poolConfig.max = 20;

const pool = new Pool(poolConfig);

pool.on('error', (err) => {
  console.error('Unexpected error on idle PostgreSQL client:', err);
});

// Test the connection
pool.connect((err, client, release) => {
  if (err) {
    console.error('❌ Error connecting to the database:', err.message);
    if (err.message && err.message.includes('self-signed certificate')) {
      console.error('👉 TIP: Set DB_SSL_REJECT_UNAUTHORIZED=false in your environment variables.');
    } else if (err.code === 'ECONNREFUSED') {
      console.error('👉 TIP: Check DB_HOST or DATABASE_URL. Connection was refused.');
    }
    return;
  }
  console.log('✅ Connected to PostgreSQL database successfully!');
  release();
});

module.exports = pool;