/**
 * Simple migration runner.
 * Runs all .sql files in server/db/migrations/ in alphabetical order.
 *
 * Usage: node server/db/migrate.js
 */
const fs = require('fs');
const path = require('path');
const pool = require('./pool');

async function migrate() {
  const migrationsDir = path.join(__dirname, 'migrations');
  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  console.log(`[migrate] Found ${files.length} migration(s)`);

  for (const file of files) {
    const filePath = path.join(migrationsDir, file);
    const sql = fs.readFileSync(filePath, 'utf-8');
    console.log(`[migrate] Running ${file}...`);
    await pool.query(sql);
    console.log(`[migrate]   ✓ ${file}`);
  }

  console.log('[migrate] Done.');
  await pool.end();
}

migrate().catch((err) => {
  console.error('[migrate] Error:', err.message);
  process.exit(1);
});
