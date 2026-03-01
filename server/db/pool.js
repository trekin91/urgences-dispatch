const { Pool } = require('pg');
const config = require('../config');

const pool = new Pool({
  connectionString: config.db.connectionString,
});

pool.on('error', (err) => {
  console.error('[db] Unexpected pool error', err);
});

module.exports = pool;
