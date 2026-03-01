require('dotenv').config();

module.exports = {
  port: parseInt(process.env.PORT, 10) || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',

  db: {
    connectionString: process.env.DATABASE_URL || 'postgres://urgence:password@localhost:5432/urgence_dispatch',
  },

  jwt: {
    secret: process.env.JWT_SECRET || 'dev-secret-change-me',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },

  game: {
    defaultTimeFactor: parseInt(process.env.DEFAULT_TIME_FACTOR, 10) || 10,
  },
};
