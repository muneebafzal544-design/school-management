/**
 * smsService.js — Outbound SMS for Pakistani schools
 *
 * Supports multiple providers via SMS_PROVIDER env var:
 *   twilio    — Twilio REST API (recommended, works in Pakistan)
 *   jazz      — Jazz/Mobilink HTTP SMS API
 *   telenor   — Telenor TeleGuru HTTP API
 *   custom    — Generic HTTP GET/POST gateway (configure SMS_GATEWAY_URL)
 *
 * Falls back gracefully (logs + skips) when not configured.
 *
 * Env vars (set in .env):
 *   SMS_PROVIDER         = twilio | jazz | telenor | custom
 *   # Twilio
 *   TWILIO_ACCOUNT_SID   = ACxxxxxxxx
 *   TWILIO_AUTH_TOKEN    = xxxxxxxx
 *   TWILIO_FROM_NUMBER   = +923001234567
 *   # Jazz / Telenor custom HTTP gateway
 *   SMS_GATEWAY_URL      = https://api.example.com/send
 *   SMS_GATEWAY_USER     = your_username
 *   SMS_GATEWAY_PASS     = your_password
 *   SMS_FROM             = YourSchool
 */

const axios = require('axios');
const db    = require('../db');

const PROVIDER = () => (process.env.SMS_PROVIDER || '').toLowerCase();

// ── Normalize Pakistani phone numbers ────────────────────────────────────────
function normalizePk(phone) {
  if (!phone) return null;
  let p = phone.replace(/[\s\-().]/g, '');
  // 03xx-xxxxxxx → +923xx-xxxxxxx
  if (/^0[3][0-9]{9}$/.test(p)) return '+92' + p.slice(1);
  // Already international
  if (p.startsWith('+92')) return p;
  // 923xx... → +923xx...
  if (/^92[3][0-9]{9}$/.test(p)) return '+' + p;
  return p; // return as-is if unknown format
}

// ── Provider: Twilio ─────────────────────────────────────────────────────────
async function sendTwilio(to, message) {
  const sid   = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from  = process.env.TWILIO_FROM_NUMBER;
  if (!sid || !token || !from) throw new Error('Twilio not configured (TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_FROM_NUMBER)');

  const url = `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`;
  const { data } = await axios.post(url, new URLSearchParams({ To: to, From: from, Body: message }), {
    auth: { username: sid, password: token },
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });
  return data.sid;
}

// ── Provider: Jazz / Telenor custom HTTP gateway ──────────────────────────────
// Most Pakistani SMS APIs use a simple GET or POST with these params.
async function sendCustomGateway(to, message) {
  const url  = process.env.SMS_GATEWAY_URL;
  const user = process.env.SMS_GATEWAY_USER;
  const pass = process.env.SMS_GATEWAY_PASS;
  const from = process.env.SMS_FROM || 'SchoolMS';
  if (!url) throw new Error('SMS_GATEWAY_URL not set');

  const params = { username: user, password: pass, to, from, message, type: 'text' };
  const { data } = await axios.post(url, params);
  return JSON.stringify(data).slice(0, 50);
}

// ── Log SMS attempt ───────────────────────────────────────────────────────────
async function logSms({ to, message, status, error_msg, provider, message_id }) {
  try {
    await db.query(
      `INSERT INTO sms_logs (to_number, message, status, error_msg, provider, message_id)
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT DO NOTHING`,
      [to, message.slice(0, 500), status, error_msg || null, provider, message_id || null]
    );
  } catch { /* non-fatal */ }
}

// ── Main export ───────────────────────────────────────────────────────────────
/**
 * Send an SMS message.
 * @param {string} phone  — Raw phone number (will be normalized to +92...)
 * @param {string} message — Plain text message body
 * @returns {{ status: 'sent'|'failed'|'skipped', message_id?: string }}
 */
async function sendSms(phone, message) {
  const provider = PROVIDER();
  if (!provider) {
    console.warn('[SMS] No provider configured (SMS_PROVIDER not set) — skipping');
    return { status: 'skipped' };
  }

  const to = normalizePk(phone);
  if (!to) {
    console.warn('[SMS] Invalid phone number:', phone);
    return { status: 'failed', error: 'Invalid phone number' };
  }

  let messageId = null;
  let status = 'sent';
  let errorMsg = null;

  try {
    if (provider === 'twilio') {
      messageId = await sendTwilio(to, message);
    } else {
      // jazz, telenor, custom — all use custom HTTP gateway
      messageId = await sendCustomGateway(to, message);
    }
  } catch (err) {
    status   = 'failed';
    errorMsg = err.message;
    console.error('[SMS] Send failed:', err.message);
  }

  await logSms({ to, message, status, error_msg: errorMsg, provider, message_id: messageId });
  return { status, message_id: messageId };
}

module.exports = { sendSms, normalizePk };
