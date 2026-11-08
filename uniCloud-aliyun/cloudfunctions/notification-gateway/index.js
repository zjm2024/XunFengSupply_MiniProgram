'use strict'
const crypto = require('crypto')
/** Reject unauthenticated callers before touching the provider or database. */
function verify(event, secret, now = Date.now()) {
  if (!secret || secret.length < 32 || event.httpMethod !== 'POST') return null
  const raw = event.isBase64Encoded ? Buffer.from(event.body || '', 'base64').toString('utf8') : event.body
  if (typeof raw !== 'string' || Buffer.byteLength(raw) > 8192) return null
  const h = Object.fromEntries(Object.entries(event.headers || {}).map(([k,v]) => [k.toLowerCase(),String(v)]))
  const time=h['x-notification-time'],nonce=h['x-notification-nonce'],signature=h['x-notification-signature']
  if (!/^\d{10,12}$/.test(time || '') || Math.abs(now/1000-Number(time))>60 || !/^[a-f0-9]{32}$/.test(nonce || '') || !/^[a-f0-9]{64}$/.test(signature || '')) return null
  const digest=crypto.createHash('sha256').update(raw,'utf8').digest('hex')
  const expected=crypto.createHmac('sha256',secret).update(time+'\n'+nonce+'\n'+digest,'utf8').digest()
  if (!crypto.timingSafeEqual(expected,Buffer.from(signature,'hex'))) return null
  let request;try{request=JSON.parse(raw)}catch{return null}
  if (!/^[a-f0-9]{32}$/.test(request.requestId || '') || !/^[A-Za-z0-9_-]{8,200}$/.test(request.pushClientId || '')
    || !/^[1-9][0-9]{0,18}$/.test(request.payload?.messageId || '') || !/^[1-9][0-9]{0,18}$/.test(request.payload?.accountId || '')
    || !/^[a-f0-9]{32}$/.test(request.payload?.bindingVersion || '')) return null
  return {request,digest,nonce}
}
const RETRYABLE = new Set([2, 10003, 10005, 30019])
const REJECTED = new Set([1, 301, 400, 401, 403, 404, 405, 10001, 10002, 10004, 20001,
  30000, 30001, 30002, 30003, 30004, 30005, 30006, 30007, 30008, 30009, 30010, 30011,
  30012, 30013, 30014, 30015, 30016, 30017, 30018])
const MAX_TTL = 24 * 60 * 60 * 1000
const reply = (status, statusCode = 200) => ({ statusCode, body: JSON.stringify({ status }) })

function providerStatus(result, thrown = false) {
  const raw = String(result?.errCode ?? '')
  const match = /^(uni-cloud-push-error-)?(\d+)$/.exec(raw)
  // A generic exception may occur after acceptance. Only a typed provider error proves rejection.
  if (!match || (thrown && !match[1])) return 'unknown'
  const code = Number(match[2])
  if (!thrown && code === 0) return 'accepted'
  if (RETRYABLE.has(code)) return 'retry'
  return REJECTED.has(code) ? 'rejected' : 'unknown'
}

/** Claim before sending. A timeout is never permission to issue another provider request. */
async function deliver(event, { cloud, secret, appId, channelOptions, channelProfiles = {}, now = Date.now() }) {
  const parsed = verify(event, secret, now)
  if (!parsed || !appId) return reply('rejected', 401)
  const { request, digest, nonce } = parsed
  const remaining = request.expiresAt == null ? 3600000 : Date.parse(request.expiresAt) - now
  if (!Number.isFinite(remaining) || remaining <= 0) return reply('skipped')
  const options = channelOptions ?? channelProfiles['11'] ?? {}
  if (!options || typeof options !== 'object' || Array.isArray(options)) return reply('rejected', 503)
  const collection = cloud.database().collection('notification_push_requests')
  const id = request.requestId
  const updatedAt = new Date(now)
  let providerRequestId = id
  try {
    await collection.add({ _id: id, digest, status: 'processing', attemptNonce: nonce, createdAt: updatedAt, updatedAt })
  } catch {
    const existing = (await collection.doc(id).get()).data?.[0]
    if (!existing) return reply('retry', 503)
    if (existing.digest !== digest) return reply('rejected', 409)
    if (existing.status !== 'retry') {
      return reply(['accepted', 'rejected'].includes(existing.status) ? existing.status : 'unknown')
    }
    if (existing.attemptNonce === nonce) return reply('retry')
    const claim = await collection.where({ _id: id, digest, status: 'retry', attemptNonce: existing.attemptNonce })
      .update({ status: 'processing', attemptNonce: nonce, updatedAt })
    if (claim.updated !== 1) return reply('retry')
    // DCloud drops reused provider IDs. Rotate only after an explicit non-acceptance.
    providerRequestId = crypto.createHash('sha256').update(id + ':' + nonce).digest('hex').slice(0, 32)
  }
  let status
  try {
    const result = await cloud.getPushManager({ appId }).sendMessage({
      push_clientid: request.pushClientId, title: '薰风体育',
      content: request.languageCode === 'en-US' ? 'You have a new message. Open the app to view it.' : '你有一条新消息，请打开应用查看。',
      payload: request.payload, request_id: providerRequestId, force_notification: false,
      settings: { ttl: Math.min(MAX_TTL, remaining) }, options
    })
    status = providerStatus(result)
  } catch (error) {
    status = providerStatus(error, true)
  }
  await collection.doc(id).update({ status, updatedAt: new Date() })
  return reply(status)
}

exports.main = event => deliver(event, {
  cloud: uniCloud, secret: process.env.NOTIFICATION_SIGNING_SECRET, appId: process.env.NOTIFICATION_APP_ID,
  channelOptions: process.env.NOTIFICATION_CHANNEL_OPTIONS ? JSON.parse(process.env.NOTIFICATION_CHANNEL_OPTIONS) : undefined,
  channelProfiles: JSON.parse(process.env.NOTIFICATION_CHANNEL_PROFILES || '{}')
})
exports.verify = verify
exports.deliver = deliver
