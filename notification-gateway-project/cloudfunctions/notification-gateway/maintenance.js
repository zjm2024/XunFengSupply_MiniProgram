'use strict';
/** Operator-only helper, never called by HTTP main; expire only nonce rows in bounded pages. */
async function cleanupExpiredNonces(cloud, now = Date.now(), limit = 100) {
  if (!Number.isFinite(now) || !Number.isInteger(limit) || limit < 1 || limit > 100) throw Error('INVALID_CLEANUP_BOUND');
  const db = cloud.database(), cutoff = new Date(now);
  const collection = db.collection('notification_push_nonces');
  const rows = (await collection.where({expiresAt:db.command.lt(cutoff)}).limit(limit).get()).data;
  const ids = rows.map(row => row._id);
  if (!ids.length) return 0;
  const result = await collection.where({_id:db.command.in(ids),expiresAt:db.command.lt(cutoff)}).remove();
  return result.deleted;
}
module.exports={cleanupExpiredNonces};