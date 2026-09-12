/**
 * Run additive migrations without touching existing data.
 * Tracks applied migrations in `schema_migrations` table so each file
 * runs exactly once — safe to call repeatedly.
 *
 * Usage: node src/db/migrate.js
 */
const fs   = require('fs');
const path = require('path');
const pool = require('./index');

const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

async function migrate() {
  // Ensure tracking table exists
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename   VARCHAR(255) PRIMARY KEY,
      applied_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
    )
  `);

  // Which migrations are already done?
  const { rows } = await pool.query('SELECT filename FROM schema_migrations');
  const applied  = new Set(rows.map(r => r.filename));

  const files = fs.readdirSync(MIGRATIONS_DIR)
    .filter(f => f.endsWith('.sql'))
    .sort();

  let ran = 0;
  for (const file of files) {
    if (applied.has(file)) {
      console.log(`⏭  Skipping (already applied): ${file}`);
      continue;
    }

    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
    console.log(`▶  Running migration: ${file}`);
    try {
      await pool.query(sql);
      await pool.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [file]);
      console.log(`✅ ${file} applied.`);
      ran++;
    } catch (err) {
      console.error(`❌ ${file} failed:`, err.message);
      process.exit(1);
    }
  }

  await pool.end();
  if (ran === 0) {
    console.log('\n✅ Already up to date — no new migrations.');
  } else {
    console.log(`\n✅ ${ran} migration(s) applied.`);
  }
}

migrate();
