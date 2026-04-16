const mongoose = require('mongoose');
const { Pool } = require('pg');
const env = require('./env');

const pool = new Pool({
  connectionString: env.postgresUrl,
  ssl: env.nodeEnv === 'production' ? { rejectUnauthorized: false } : false,
});

mongoose.set('strictQuery', true);

async function connectDatabases() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await mongoose.connect(env.mongoUri, {
    autoIndex: true,
  });
}

async function closeDatabases() {
  await mongoose.disconnect();
  await pool.end();
}

module.exports = {
  pool,
  connectDatabases,
  closeDatabases,
};
