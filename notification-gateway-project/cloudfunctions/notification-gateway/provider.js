'use strict';
const crypto = require('node:crypto');
/** Accept channel/category options only from the server environment, never signed caller input. */
function channelOptions(raw) {
  const value = raw ? JSON.parse(raw) : {};
  if (!value || Array.isArray(value) || Object.keys(value).some(key => !['options','category'].includes(key))) throw Error('CHANNEL_CONFIG');
  for (const key of Object.keys(value)) if (!value[key] || typeof value[key] !== 'object' || Array.isArray(value[key])) throw Error('CHANNEL_CONFIG');
  return value;
}
/** One explicit CID, generic notification text, opaque routing payload, and remaining offline TTL. */
function buildMessage(data, now, channels) {
  const english = data.languageCode === 'en-US';
  return { ...channels, push_clientid:data.pushClientId,
    title:english ? 'New notification' : '您有新消息',
    content:english ? 'Open the app to view details.' : '请打开应用查看详情。',
    payload:{ ...data.payload }, force_notification:true,
    request_id:crypto.randomBytes(16).toString('hex'),
    settings:{ ttl:Math.max(0, Math.min(86400000, Date.parse(data.expiresAt)-now)) },
  };
}
/** Never turn partial/ambiguous results into accepted or blindly retry an uncertain send. */
function classify(result, cid) {
  const code = String(result?.errCode ?? '');
  if (code !== '0' && result?.data != null) return 'unknown';
  if (code === 'uni-cloud-push-error-30019' || code === '30019') return 'retry';
  if (code === 'uni-cloud-push-error-20001' || code === '20001') return 'rejected';
  if (code !== '0') return 'unknown';
  if (result.data == null) return 'accepted';
  const states = [], leaves = [];
  function walk(value) {
    if (!value || typeof value !== 'object') return;
    for (const [key, child] of Object.entries(value)) {
      if (key === cid) { states.push(child); leaves.push(child); }
      else if (typeof child === 'object') walk(child);
      else leaves.push(child);
    }
  }
  walk(result.data);
  if (states.length !== 1 || leaves.length !== 1) return 'unknown';
  if (states.every(state => ['successed_online','successed_offline'].includes(state))) return 'accepted';
  if (states.every(state => state === 'successed_ignore')) return 'rejected';
  return 'unknown';
}
/** A timeout is an unknown outcome; the SDK operation is never automatically retried. */
async function send(manager, message, timeoutMs = 8000) {
  let timer;
  try {
    return await Promise.race([
      Promise.resolve().then(() => manager.sendMessage(message)),
      new Promise((_, reject) => { timer = setTimeout(() => reject(Error('PROVIDER_TIMEOUT')), timeoutMs); }),
    ]);
  } finally { clearTimeout(timer); }
}
module.exports = { channelOptions, buildMessage, classify, send };
