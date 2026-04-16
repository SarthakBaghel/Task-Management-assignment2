const dotenv = require('dotenv');

dotenv.config();

function getRequiredEnv(name, missing) {
  const value = process.env[name];
  if (!value) {
    missing.push(name);
  }
  return value;
}

const missing = [];

const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 3000),
  jwtSecret: getRequiredEnv('JWT_SECRET', missing),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1d',
  postgresUrl: getRequiredEnv('POSTGRES_URL', missing),
  mongoUri: getRequiredEnv('MONGODB_URI', missing),
  allowedOrigin: process.env.ALLOWED_ORIGIN || '*',
};

if (missing.length > 0) {
  throw new Error(
    `Missing required environment variables: ${missing.join(', ')}`
  );
}

module.exports = env;
