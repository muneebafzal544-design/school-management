const { Pool }            = require('pg');
const { AsyncLocalStorage } = require('async_hooks');
require('dotenv').config();

// ── Connection pool ───────────────────────────────────────────────────────────
const dbUrl      = process.env.DATABASE_URL || '';
const isLocal    = dbUrl.includes('localhost') || dbUrl.includes('127.0.0.1');
const isServerless = !!process.env.VERCEL;

const rawPool = new Pool({
  connectionString: dbUrl,
  ...(isLocal ? {} : { ssl: { rejectUnauthorized: false } }),
  max:                      parseInt(process.env.DB_POOL_MAX || (isServerless ? '5' : '10'), 10),
  min:                      0,
  idleTimeoutMillis:        isServerless ? 10_000 : 30_000,
  connectionTimeoutMillis:  8_000,
});

rawPool.on('connect', () => {
  try { require('../utils/logger').info('Connected to PostgreSQL database'); }
  catch { console.log('Connected to PostgreSQL database'); }
});
rawPool.on('error', (err) => {
  try { require('../utils/logger').error({ err: err.message }, 'Unexpected database error'); }
  catch { console.error('Unexpected database error:', err); }
});

// ── Slow-query logger ─────────────────────────────────────────────────────────
const SLOW_MS       = parseInt(process.env.DB_SLOW_MS || '500', 10);
const _rawPoolQuery = rawPool.query.bind(rawPool);

function logSlowQuery(text, duration) {
  try {
    const { slowQueryLogger } = require('../utils/logger');
    slowQueryLogger(text.replace(/\s+/g, ' ').slice(0, 200), duration, SLOW_MS);
  } catch {
    console.warn(`[slow-query] ${duration}ms — ${text.replace(/\s+/g, ' ').slice(0, 120)}`);
  }
}

// ── Multi-tenant schema store ─────────────────────────────────────────────────
//
// Each authenticated request stores its tenant schema here.
// Middleware calls: schemaStore.run(schema, next)
// pool.query / pool.connect then pick it up automatically.
//
const schemaStore = new AsyncLocalStorage();

// Valid PostgreSQL identifier: starts with letter/underscore, then alphanumeric/underscore
const SAFE_SCHEMA_RE = /^[a-zA-Z_][a-zA-Z0-9_]{0,62}$/;

function assertSafeSchema(schema) {
  if (schema && !SAFE_SCHEMA_RE.test(schema)) {
    throw new Error(`Invalid tenant schema name: "${schema}"`);
  }
}

// ── Search-path connection affinity ───────────────────────────────────────────
// node-postgres reuses the same physical Client instance across pool checkouts
// (session state like search_path persists between them). Re-running
// `SET search_path` on every single query — even when the connection we were
// just handed already has the right one set from a moment ago — is a pure
// wasted round trip under Neon/Vercel where round trips are the expensive part.
// We tag each client with the schema last SET on it and skip the round trip
// when it already matches. Every place that sets search_path on a raw client
// (here, plus authController's pre-login lookup and schoolController's
// provisioning) goes through `setSearchPath()` so the tag never goes stale.
const schemaTags = new WeakMap();

async function setSearchPath(client, schema) {
  const target = schema || 'public';
  if (schemaTags.get(client) === target) return; // already correct — skip the round trip
  await _rawClientQuery(client, schema
    ? `SET search_path TO "${schema}", public`
    : `SET search_path TO public`);
  schemaTags.set(client, target);
}

// ── Wrapped pool.connect ──────────────────────────────────────────────────────
// Returns a pg Client with search_path already set to the current tenant schema.
// Controllers using pool.connect() for transactions get isolation for free.
//
const _rawPoolConnect = rawPool.connect.bind(rawPool);

async function connect() {
  const client = await _rawPoolConnect();
  const schema = schemaStore.getStore();
  if (schema) {
    assertSafeSchema(schema);
    await setSearchPath(client, schema);
  }
  return client;
}

// Helper to call pg client query directly (bypasses our wrapper, avoids recursion)
function _rawClientQuery(client, text, params) {
  return new Promise((resolve, reject) => {
    client.query(text, params, (err, res) => (err ? reject(err) : resolve(res)));
  });
}

// ── Wrapped pool.query ────────────────────────────────────────────────────────
// For simple (non-transaction) queries.
// If a tenant schema is active: acquires a client, sets search_path (skipped if
// this physical connection is already on the right schema), runs, releases.
// If no schema (super-admin / public): delegates to raw pool directly.
//
async function query(text, params) {
  const queryText = typeof text === 'string' ? text : text?.text ?? String(text);
  const start     = Date.now();

  let result;
  const schema = schemaStore.getStore();

  if (schema) {
    assertSafeSchema(schema);
    // Tenant path — use a dedicated client so search_path is isolated
    const client = await _rawPoolConnect();
    try {
      await setSearchPath(client, schema);
      result = await _rawClientQuery(client, text, params);
    } finally {
      client.release();
    }
  } else {
    // Non-tenant path — direct pool query (same as before)
    result = await _rawPoolQuery(text, params);
  }

  const duration = Date.now() - start;
  if (duration >= SLOW_MS) logSlowQuery(queryText, duration);

  return result;
}

// ── Public db object ──────────────────────────────────────────────────────────
// Drop-in replacement for the old `pool`:
//   const pool = require('../db');
//   pool.query(...)    → schema-aware
//   pool.connect()     → schema-aware client
//   pool.schemaStore   → for middleware use
//   pool.raw           → raw pg Pool (migrations, super-admin provisioning)
//
const db = {
  query,
  connect,
  schemaStore,
  setSearchPath,          // shared helper — any code manually setting search_path on a raw client MUST use this
  raw: rawPool,          // used by schoolController provisioning (needs direct schema DDL)

  // Pass-through events so callers doing pool.on('error') still work
  on:  rawPool.on.bind(rawPool),
  off: rawPool.off.bind(rawPool),
  end: rawPool.end.bind(rawPool),
};

module.exports = db;
