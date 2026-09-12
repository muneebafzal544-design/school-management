const crypto = require('crypto');

const B32_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function base32Decode(str) {
  let bits = 0, value = 0;
  const output = [];
  for (const c of str.replace(/=+$/, '').toUpperCase()) {
    const idx = B32_CHARS.indexOf(c);
    if (idx === -1) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) { output.push((value >>> (bits - 8)) & 255); bits -= 8; }
  }
  return Buffer.from(output);
}

function base32Encode(buf) {
  let bits = 0, value = 0, out = '';
  for (const byte of buf) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) { out += B32_CHARS[(value >>> (bits - 5)) & 31]; bits -= 5; }
  }
  if (bits > 0) out += B32_CHARS[(value << (5 - bits)) & 31];
  return out;
}

function hotp(secret, counter) {
  const key = base32Decode(secret);
  const msg = Buffer.alloc(8);
  // Write 64-bit big-endian counter without BigInt for Node 10 compat
  const high = Math.floor(counter / 0x100000000);
  const low  = counter >>> 0;
  msg.writeUInt32BE(high, 0);
  msg.writeUInt32BE(low,  4);
  const mac    = crypto.createHmac('sha1', key).update(msg).digest();
  const offset = mac[19] & 0xf;
  const code   = (mac.readUInt32BE(offset) & 0x7fffffff) % 1000000;
  return code.toString().padStart(6, '0');
}

function generateSecret() {
  return base32Encode(crypto.randomBytes(20));
}

function generateTotpUri(secret, accountLabel, issuer) {
  const enc = encodeURIComponent;
  return `otpauth://totp/${enc(issuer)}:${enc(accountLabel)}?secret=${secret}&issuer=${enc(issuer)}&algorithm=SHA1&digits=6&period=30`;
}

function verifyTotp(secret, token, windowSteps = 1) {
  const counter = Math.floor(Date.now() / 1000 / 30);
  const padded  = String(token).padStart(6, '0');
  for (let i = -windowSteps; i <= windowSteps; i++) {
    if (hotp(secret, counter + i) === padded) return true;
  }
  return false;
}

module.exports = { generateSecret, generateTotpUri, verifyTotp };
