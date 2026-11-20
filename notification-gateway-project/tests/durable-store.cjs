'use strict';
const { DatabaseSync } = require('node:sqlite');
/** Test-only real SQLite persistence: independent processes share unique keys and atomic SQL CAS. */
function openStore(filename) {
  const db = new DatabaseSync(filename, { timeout:5000 });
  db.exec('PRAGMA busy_timeout=5000; CREATE TABLE IF NOT EXISTS ledger (collection TEXT NOT NULL, id TEXT NOT NULL, doc TEXT NOT NULL, PRIMARY KEY(collection,id)); CREATE TABLE IF NOT EXISTS provider_calls (call_id INTEGER PRIMARY KEY, request_id TEXT NOT NULL);');
  return {
    async get(collection,id) { const row=db.prepare('SELECT doc FROM ledger WHERE collection=? AND id=?').get(collection,id);return row ? JSON.parse(row.doc) : null; },
    async insert(collection,doc) { const result=db.prepare('INSERT OR IGNORE INTO ledger(collection,id,doc) VALUES(?,?,?)').run(collection,doc._id,JSON.stringify(doc));return result.changes===1; },
    async cas(collection,id,expected,patch) {
      const row=db.prepare('SELECT doc FROM ledger WHERE collection=? AND id=?').get(collection,id);
      if (!row) return false;
      const doc=JSON.parse(row.doc);
      if (!Object.entries(expected).every(([key,value])=>doc[key]===value)) return false;
      return db.prepare('UPDATE ledger SET doc=? WHERE collection=? AND id=? AND doc=?').run(JSON.stringify({...doc,...patch}),collection,id,row.doc).changes===1;
    },
    recordCall(id) { db.prepare('INSERT INTO provider_calls(request_id) VALUES(?)').run(id); },
    countCalls() { return db.prepare('SELECT COUNT(*) AS count FROM provider_calls').get().count; },
    close() { db.close(); },
  };
}
module.exports={openStore};
