'use strict';
const { verify, sha256 } = require('./protocol');
const { createStore } = require('./store');
const { channelOptions, buildMessage, classify, send } = require('./provider');
/** URLized integrated response works across providers; no secrets, CID or input echo. */
function response(code, status, error) {
  return { mpserverlessComposedResponse:true, isBase64Encoded:false, statusCode:code,
    headers:{ 'Content-Type':'application/json; charset=utf-8', 'Cache-Control':'no-store' },
    body:JSON.stringify(error ? { status, error } : { status }) };
}
/** Persist nonce, request identity, then atomically claim one business-message/device send. */
async function processVerified(checked, options, channels) {
  const { data, digest, nonce } = checked, { store, now, cloud, appId } = options;
  if (!await store.insert('nonces', { _id:sha256(nonce), expiresAt:new Date(now+180000), createdAt:new Date(now) }))
    return response(401, 'rejected', 'REPLAY_REJECTED');
  const requestKey = sha256(data.requestId);
  const request = { _id:requestKey, digest, createdAt:new Date(now) };
  if (!await store.insert('requests', request) && (await store.get('requests',requestKey))?.digest !== digest)
    return response(409, 'rejected', 'REQUEST_CONTENT_CHANGED');
  const expired = Date.parse(data.expiresAt) <= now;
  const identity = [data.payload.messageId,data.pushClientId];
  const id = sha256(JSON.stringify(identity));
  const semanticDigest = sha256(JSON.stringify({ payload:data.payload, cid:data.pushClientId,
    languageCode:data.languageCode, expiresAt:data.expiresAt, sound:data.sound, vibration:data.vibration }));
  let row = { _id:id, digest:semanticDigest, status:expired ? 'skipped' : 'processing', attempt:1, owner:sha256(nonce), createdAt:new Date(now) };
  const inserted = await store.insert('deliveries', row);
  if (!inserted) {
    row = await store.get('deliveries', id);
    if (!row || row.digest !== semanticDigest) return response(409, 'rejected', 'BUSINESS_CONTENT_CHANGED');
    if (row.status !== 'retry') return response(200, row.status === 'processing' ? 'unknown' : row.status);
    if (row.attempt >= 3) return response(200, 'rejected');
    if (row.retryAt > now) return response(200, 'retry');
    const owner = sha256(nonce), attempt = row.attempt + 1;
    if (!await store.cas('deliveries',id,{status:'retry',attempt:row.attempt},{status:'processing',attempt,owner}))
      return response(200, 'unknown');
    row = { ...row, status:'processing', attempt, owner };
  }
  if (inserted && expired) return response(200, 'skipped');
  let status;
  try {
    const manager = cloud.getPushManager({ appId });
    const result = await send(manager, buildMessage(data, now, channels), options.timeoutMs);
    status = classify(result, data.pushClientId);
  } catch (error) { status = classify(error, data.pushClientId); }
  if (status === 'retry' && row.attempt >= 3) status = 'rejected';
  const patch = { status, updatedAt:new Date(now), retryAt:status === 'retry' ? now + 1000 * 2 ** (row.attempt-1) : 0 };
  if (!await store.cas('deliveries',id,{status:'processing',attempt:row.attempt,owner:row.owner},patch))
    return response(503, 'unknown', 'RESULT_PERSISTENCE_FAILED');
  return response(200, status);
}
/** Public HTTP entry verifies before any send; dependency/configuration failures fail closed. */
async function deliver(event, supplied = {}) {
  const now = supplied.now ?? Date.now();
  const secret = supplied.secret ?? process.env.NOTIFICATION_SIGNING_SECRET;
  const appId = supplied.appId ?? process.env.NOTIFICATION_APP_ID;
  if (typeof secret !== 'string' || secret.length < 32 || typeof appId !== 'string' || !/^__UNI__[A-Za-z0-9]+$/.test(appId))
    return response(503, 'rejected', 'GATEWAY_NOT_CONFIGURED');
  if (event?.httpMethod !== 'POST') return response(405, 'rejected', 'POST_REQUIRED');
  const checked = verify(event, secret, now);
  if (!checked) return response(401, 'rejected', 'INVALID_SIGNED_REQUEST');
  try {
    const cloud = supplied.cloud ?? uniCloud;
    const store = supplied.store ?? createStore(cloud);
    const channels = channelOptions(supplied.channels ?? process.env.NOTIFICATION_CHANNEL_OPTIONS);
    return await processVerified(checked, { ...supplied, now, cloud, appId, store }, channels);
  } catch { return response(503, 'unknown', 'GATEWAY_UNAVAILABLE'); }
}
exports.main = event => deliver(event);
exports.verify = verify;
exports.deliver = deliver;
