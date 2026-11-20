'use strict';
const crypto=require('node:crypto');
const secret='notification-test-secret-32-bytes-only';
const now=1794042000000;
/** Synthetic-only signed envelope follows the current .NET DTO and exact wire bytes. */
function signed(overrides={},nonce=crypto.randomBytes(16).toString('hex'),time=now) {
 const body=JSON.stringify({requestId:'a'.repeat(32),pushClientId:'test-cid-123',payload:{messageId:'9007199254740993',accountId:'7',bindingVersion:'b'.repeat(32)},languageCode:'zh-CN',expiresAt:new Date(now+60000).toISOString(),...overrides});
 const timestamp=String(Math.floor(time/1000));
 const digest=crypto.createHash('sha256').update(body,'utf8').digest('hex');
 const signature=crypto.createHmac('sha256',secret).update(timestamp+'\n'+nonce+'\n'+digest).digest('hex');
 return {httpMethod:'POST',body,headers:{'X-Notification-Time':timestamp,'X-Notification-Nonce':nonce,'X-Notification-Signature':signature}};
}
module.exports={secret,now,signed};
/** Exercise the production uniCloud adapter over a durable SQLite engine in local tests. */
function cloudForStore(store, sendMessage) {
 const {COLLECTIONS}=require('../cloudfunctions/notification-gateway/store');
 return {getPushManager:()=>({sendMessage}),database:()=>({collection:name=>{
  const key=Object.keys(COLLECTIONS).find(key=>COLLECTIONS[key]===name);
  if(!key)throw Error('Unexpected collection');
  return {add:async doc=>{if(!await store.insert(key,doc))throw Error('duplicate');},
   doc:id=>({get:async()=>{const doc=await store.get(key,id);return {data:doc?[doc]:[]};}}),
   where:filter=>({update:async patch=>{const {_id,...expected}=filter;return {updated:await store.cas(key,_id,expected,patch)?1:0};}})};
 }})};
}
module.exports.cloudForStore=cloudForStore;