'use strict';
const COLLECTIONS = Object.freeze({ nonces:'notification_push_nonces', requests:'notification_push_requests', deliveries:'notification_push_deliveries' });
/** Every claim uses shared database _id uniqueness; never downgrade to an in-memory lock. */
function createStore(cloud) {
  const db = cloud.database();
  const collection = name => db.collection(COLLECTIONS[name]);
  return {
    async get(name, id) { return (await collection(name).doc(id).get()).data?.[0] || null; },
    async insert(name, doc) {
      try { await collection(name).add(doc); return true; }
      catch (error) {
        // A failed insert is a duplicate only if the exact durable record can be read.
        if ((await collection(name).doc(doc._id).get()).data?.length) return false;
        throw error;
      }
    },
    async cas(name, id, expected, patch) {
      const result = await collection(name).where({ _id:id, ...expected }).update(patch);
      return result.updated === 1;
    },
  };
}
module.exports = { createStore, COLLECTIONS };
