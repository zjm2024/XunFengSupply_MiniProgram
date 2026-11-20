'use strict';
const crypto = require('node:crypto');
const { TextDecoder } = require('node:util');
const sha256 = value => crypto.createHash('sha256').update(value).digest('hex');

/** Return one unambiguous header; arrays and case-duplicate names are rejected. */
function header(headers, name) {
  const keys = Object.keys(headers || {}).filter(key => key.toLowerCase() === name);
  return keys.length === 1 && typeof headers[keys[0]] === 'string' ? headers[keys[0]] : '';
}
/** Preserve the original UTF-8 bytes, including URLized Base64 transport. */
function bodyBytes(event) {
  if (typeof event.body !== 'string' || event.body.length > 90000) throw Error('BODY');
  let bytes;
  if (event.isBase64Encoded === true) {
    if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(event.body)) throw Error('BASE64');
    bytes = Buffer.from(event.body, 'base64');
    if (bytes.toString('base64') !== event.body) throw Error('BASE64');
  } else {
    if (event.isBase64Encoded != null && event.isBase64Encoded !== false) throw Error('BASE64');
    bytes = Buffer.from(event.body, 'utf8');
  }
  if (!bytes.length || bytes.length > 65536) throw Error('BODY');
  new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  return bytes;
}
/** Positive Int64 IDs remain strings across .NET/Node boundaries. */
function validId(value) {
  return typeof value === 'string' && /^[1-9][0-9]{0,18}$/.test(value) && BigInt(value) <= 9223372036854775807n;
}
/** Allow only the existing business-message envelope; never accept a broadcast target. */
function validate(data, now) {
  const allowed = ['requestId','pushClientId','payload','languageCode','expiresAt','sound','vibration','messageType'];
  if (!data || Array.isArray(data) || Object.keys(data).some(key => !allowed.includes(key))) return false;
  if (!/^[a-f0-9]{32}$/.test(data.requestId || '') || typeof data.pushClientId !== 'string'
    || !/^[A-Za-z0-9_-]{8,256}$/.test(data.pushClientId)) return false;
  const payload = data.payload;
  if (!payload || Object.keys(payload).sort().join(',') !== 'accountId,bindingVersion,messageId'
    || !validId(payload.messageId) || !validId(payload.accountId) || !/^[a-f0-9]{32}$/.test(payload.bindingVersion || '')) return false;
  if (!['zh-CN','en-US'].includes(data.languageCode) || data.messageType != null && data.messageType !== 'business') return false;
  if (['sound','vibration'].some(key => data[key] != null && typeof data[key] !== 'boolean')) return false;
  if (typeof data.expiresAt !== 'string' || !/^\d{4}-\d\d-\d\dT.*Z$/.test(data.expiresAt)) return false;
  const expiry = Date.parse(data.expiresAt);
  return Number.isFinite(expiry) && expiry <= now + 86460000;
}
/** Verify the exact .NET SHA256/HMAC lowercase-hex protocol without exposing failure details. */
function verify(event, secret, now = Date.now()) {
  try {
    if (event.httpMethod !== 'POST' || typeof secret !== 'string' || secret.length < 32) return null;
    const time = header(event.headers, 'x-notification-time');
    const nonce = header(event.headers, 'x-notification-nonce');
    const signature = header(event.headers, 'x-notification-signature');
    if (!/^[0-9]{10,11}$/.test(time) || Math.abs(now - Number(time) * 1000) > 60000
      || !/^[a-f0-9]{32}$/.test(nonce) || !/^[a-f0-9]{64}$/.test(signature)) return null;
    const bytes = bodyBytes(event), digest = sha256(bytes);
    const expected = crypto.createHmac('sha256', Buffer.from(secret, 'utf8')).update(time+'\n'+nonce+'\n'+digest).digest();
    if (!crypto.timingSafeEqual(expected, Buffer.from(signature, 'hex'))) return null;
    const data = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
    return validate(data, now) ? { data, digest, nonce, timestamp: Number(time) } : null;
  } catch { return null; }
}
module.exports = { verify, sha256, validate };
