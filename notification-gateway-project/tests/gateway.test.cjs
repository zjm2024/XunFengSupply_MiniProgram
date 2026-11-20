'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const {spawn}=require('node:child_process');
const {verify,deliver}=require('../cloudfunctions/notification-gateway');
const {sha256}=require('../cloudfunctions/notification-gateway/protocol');
const {buildMessage,classify}=require('../cloudfunctions/notification-gateway/provider');
const {openStore}=require('./durable-store.cjs');
const {secret,now,signed,cloudForStore}=require('./fixture.cjs');
const artifacts=path.resolve(__dirname,'../.artifacts');fs.mkdirSync(artifacts,{recursive:true});
/** Each test retains its synthetic SQLite evidence; no business resource is opened. */
function fixture(t,provider=async()=>({errCode:0})) {
 const folder=fs.mkdtempSync(path.join(artifacts,'case-')),store=openStore(path.join(folder,'ledger.sqlite'));
 t.after(()=>store.close());
 let calls=0;
 const cloud=cloudForStore(store,async message=>{calls++;store.recordCall(message.request_id);return provider(message);});
 return {store,folder,options:{secret,now,appId:'__UNI__TEST',cloud},calls:()=>calls};
}
const status=result=>JSON.parse(result.body).status;
/** Start a separate Node process with the actual uniCloud-store adapter and shared SQLite file. */
function worker(filename,nonce,mode='') {
 return new Promise((resolve,reject)=>{
  const child=spawn(process.execPath,[path.join(__dirname,'worker.cjs'),filename,nonce,mode],{stdio:['ignore','pipe','pipe']});
  let out='',err='';child.stdout.on('data',b=>out+=b);child.stderr.on('data',b=>err+=b);
  child.on('error',reject);child.on('exit',code=>{if(code!==0)reject(Error('Worker failed: '+err));else{try{resolve(JSON.parse(out));}catch(e){reject(e);}}});
 });
}

test('raw UTF8 body signature, mutation, Base64 and mixed-case header names',()=>{
 const e=signed();assert.ok(verify(e,secret,now));
 assert.equal(verify({...e,body:e.body+' '},secret,now),null);
 const encoded={...e,body:Buffer.from(e.body).toString('base64'),isBase64Encoded:true};
 assert.ok(verify(encoded,secret,now));
 assert.equal(verify({...encoded,body:encoded.body+'?'},secret,now),null);
 const headers=Object.fromEntries(Object.entries(e.headers).map(([k,v])=>[k.toLowerCase(),v]));
 assert.ok(verify({...e,headers},secret,now));
 assert.equal(verify({...e,headers:{...headers,'X-Notification-Time':headers['x-notification-time']}},secret,now),null);
});

test('past, future, millisecond timestamp, uppercase and malformed signatures rejected',()=>{
 const e=signed();assert.equal(verify(e,secret,now+61000),null);assert.equal(verify(e,secret,now-61000),null);
 for(const change of [{'X-Notification-Time':String(now)},{'X-Notification-Signature':'x'},{'X-Notification-Signature':e.headers['X-Notification-Signature'].toUpperCase()},{'X-Notification-Nonce':'not-a-nonce'}])
  assert.equal(verify({...e,headers:{...e.headers,...change}},secret,now),null);
 assert.equal(verify({...e,body:{...JSON.parse(e.body)}},secret,now),null);
});

for(const [name,change]of [
 ['CID missing',{pushClientId:undefined}],['CID empty',{pushClientId:''}],['CID array',{pushClientId:['cid1','cid2']}],
 ['CID broadcast syntax',{pushClientId:'cid1,cid2'}],['CID whitespace',{pushClientId:'        '}],
 ['Int64 overflow',{payload:{messageId:'9223372036854775808',accountId:'7',bindingVersion:'b'.repeat(32)}}],
 ['numeric ID loses precision',{payload:{messageId:9007199254740992,accountId:'7',bindingVersion:'b'.repeat(32)}}],
 ['sensitive payload field',{payload:{messageId:'7',accountId:'7',bindingVersion:'b'.repeat(32),orderAmount:100}}],
 ['unsupported message type',{messageType:'marketing'}],['missing expiry',{expiresAt:undefined}],
 ['excessive expiry',{expiresAt:new Date(now+90000000).toISOString()}],['caller supplied title',{title:'secret order'}],
 ['caller supplied recipients',{user_id:'someone'}],['caller supplied options',{options:{}}],['unsupported locale',{languageCode:'xx'}],
])test(name+' cannot reach provider',async t=>{
 const f=fixture(t);const result=await deliver(signed(change),f.options);assert.equal(result.statusCode,401);assert.equal(f.calls(),0);
});

test('POST only and configuration failures do not send',async t=>{
 const f=fixture(t);assert.equal((await deliver({...signed(),httpMethod:'GET'},f.options)).statusCode,405);
 assert.equal((await deliver(signed(),{...f.options,secret:'short'})).statusCode,503);
 assert.equal((await deliver(signed(),{...f.options,appId:''})).statusCode,503);
 assert.equal((await deliver(signed(),{...f.options,channels:'{"push_clientid":"other"}'})).statusCode,503);
 assert.equal(f.calls(),0);
});

test('nonce replay rejected but fresh nonce returns durable prior acceptance',async t=>{
 const f=fixture(t),e=signed();assert.equal(status(await deliver(e,f.options)),'accepted');
 assert.equal((await deliver(e,f.options)).statusCode,401);
 assert.equal(status(await deliver(signed(),f.options)),'accepted');assert.equal(f.calls(),1);
 const row=await f.store.get('nonces',sha256(e.headers['X-Notification-Nonce']));
 assert.ok(Date.parse(row.expiresAt)>=now+120000);
});

test('new request ID for the same business message/device never sends twice',async t=>{
 const f=fixture(t);await deliver(signed(),f.options);
 assert.equal(status(await deliver(signed({requestId:'d'.repeat(32)}),f.options)),'accepted');assert.equal(f.calls(),1);
});

test('changed request body or business content conflicts rather than overwriting',async t=>{
 const f=fixture(t);await deliver(signed(),f.options);
 assert.equal((await deliver(signed({sound:false}),f.options)).statusCode,409);
 assert.equal((await deliver(signed({requestId:'d'.repeat(32),languageCode:'en-US'}),f.options)).statusCode,409);
 assert.equal(f.calls(),1);
});

test('database outages fail closed before provider',async t=>{
 const f=fixture(t);const store={insert:async()=>{throw Error('offline');}};
 assert.equal((await deliver(signed(),{...f.options,store})).statusCode,503);assert.equal(f.calls(),0);
});

test('post-send persistence failure is unknown and cannot be automatically replayed',async t=>{
 const f=fixture(t);const store={...f.store,cas:async()=>{throw Error('offline');}};
 assert.equal((await deliver(signed(),{...f.options,store})).statusCode,503);
 assert.equal(status(await deliver(signed(),f.options)),'unknown');assert.equal(f.calls(),1);
});

test('network exception or bounded timeout remains unknown without resend',async t=>{
 const f=fixture(t,async()=>{throw Error('timeout');});
 assert.equal(status(await deliver(signed(),f.options)),'unknown');
 assert.equal(status(await deliver(signed(),f.options)),'unknown');assert.equal(f.calls(),1);
 const g=fixture(t,()=>new Promise(()=>{}));
 assert.equal(status(await deliver(signed(),{...g.options,timeoutMs:10})),'unknown');assert.equal(g.calls(),1);
});

test('definitive provider rejection is terminal',async t=>{
 const f=fixture(t,async()=>{throw {errCode:'uni-cloud-push-error-20001'};});
 assert.equal(status(await deliver(signed(),f.options)),'rejected');
 assert.equal(status(await deliver(signed(),f.options)),'rejected');assert.equal(f.calls(),1);
});

test('explicit busy rejection allows at most three attempts with backoff and fresh provider request IDs',async t=>{
 const ids=[],f=fixture(t,async message=>{ids.push(message.request_id);return {errCode:'uni-cloud-push-error-30019'};});
 assert.equal(status(await deliver(signed(),f.options)),'retry');
 await deliver(signed(),f.options);assert.equal(f.calls(),1);
 await deliver(signed({},undefined,now+1100),{...f.options,now:now+1100});
 await deliver(signed({},undefined,now+3200),{...f.options,now:now+3200});
 assert.equal(status(await deliver(signed({},undefined,now+8000),{...f.options,now:now+8000})),'rejected');
 assert.equal(f.calls(),3);assert.equal(new Set(ids).size,3);
});

test('expired business message skipped and remaining offline TTL used without sensitive text',async t=>{
 let sent;const f=fixture(t,async msg=>{sent=msg;return {errCode:0};});
 assert.equal(status(await deliver(signed({expiresAt:new Date(now).toISOString()}),f.options)),'skipped');assert.equal(f.calls(),0);
 const g=fixture(t,async msg=>{sent=msg;return {errCode:0};});
 await deliver(signed({expiresAt:new Date(now+5000).toISOString()}),g.options);
 assert.equal(sent.settings.ttl,5000);assert.equal(sent.force_notification,true);
 assert.equal(sent.push_clientid,'test-cid-123');assert.deepEqual(Object.keys(sent.payload).sort(),['accountId','bindingVersion','messageId']);
 assert.equal(sent.title,'您有新消息');assert.equal(sent.content,'请打开应用查看详情。');
 assert.equal(buildMessage(JSON.parse(signed({languageCode:'en-US'}).body),now,{}).title,'New notification');
});

test('partial/ambiguous provider results never trigger a whole-message retry',()=>{
 assert.equal(classify({errCode:0,data:{task:{'test-cid-123':'successed_offline'}}},'test-cid-123'),'accepted');
 assert.equal(classify({errCode:0,data:{task:{'test-cid-123':'successed_ignore'}}},'test-cid-123'),'rejected');
 assert.equal(classify({errCode:0,data:{task:{'test-cid-123':{partial:true}}}},'test-cid-123'),'unknown');
 assert.equal(classify({errCode:0,data:{task:'opaque-task-id'}},'test-cid-123'),'unknown');
});

test('six independent processes sharing durable storage reject a replayed nonce',async t=>{
 const f=fixture(t),filename=path.join(f.folder,'ledger.sqlite'),nonce='c'.repeat(32);
 const results=await Promise.all(Array.from({length:6},()=>worker(filename,nonce)));
 assert.equal(results.filter(r=>r.code===200).length,1);
 assert.equal(results.filter(r=>r.code===401).length,5);assert.equal(f.store.countCalls(),1);
});

test('six independent processes with fresh nonces and request IDs claim one business/device send',async t=>{
 const f=fixture(t),filename=path.join(f.folder,'ledger.sqlite');
 const results=await Promise.all(Array.from({length:6},()=>worker(filename,crypto.randomBytes(16).toString('hex'),'new-request')));
 assert.ok(results.every(r=>r.code===200));assert.equal(f.store.countCalls(),1);
 assert.equal(status(await deliver(signed(),f.options)),'accepted');assert.equal(f.calls(),0);
});
test('device rebinding cannot turn one business message into a second push',async t=>{
 const f=fixture(t);await deliver(signed(),f.options);
 const payload={messageId:'9007199254740993',accountId:'7',bindingVersion:'e'.repeat(32)};
 assert.equal((await deliver(signed({requestId:'e'.repeat(32),payload}),f.options)).statusCode,409);assert.equal(f.calls(),1);
});

test('partial success accompanying a busy error is unknown, never retryable',()=>{
 assert.equal(classify({errCode:'uni-cloud-push-error-30019',data:{task:{'test-cid-123':'successed_online'}}},'test-cid-123'),'unknown');
 assert.equal(classify({errCode:0,data:{task:{'test-cid-123':'successed_online','other-cid':'failure'}}},'test-cid-123'),'unknown');
 assert.equal(classify({errCode:'unrecognized-code'},'test-cid-123'),'unknown');
});

test('expired message keeps a tombstone; changing expiry cannot revive it',async t=>{
 const f=fixture(t);await deliver(signed({expiresAt:new Date(now).toISOString()}),f.options);
 assert.equal((await deliver(signed({requestId:'e'.repeat(32)}),f.options)).statusCode,409);assert.equal(f.calls(),0);
});

test('nonce cleanup removes only expired rows, bounded to one page',async()=>{
 const {cleanupExpiredNonces}=require('../cloudfunctions/notification-gateway/maintenance');
 const rows=[{_id:'old',expiresAt:new Date(now-1)},{_id:'fresh',expiresAt:new Date(now+1)}];
 const cloud={database:()=>({command:{lt:value=>({lt:value}),in:values=>({in:values})},collection:name=>{
  assert.equal(name,'notification_push_nonces');
  return {where:filter=>({limit:limit=>({get:async()=>({data:rows.filter(row=>row.expiresAt<filter.expiresAt.lt).slice(0,limit)})}),
   remove:async()=>{let deleted=0;for(let i=rows.length-1;i>=0;i--)if(filter._id.in.includes(rows[i]._id)&&rows[i].expiresAt<filter.expiresAt.lt){rows.splice(i,1);deleted++;}return {deleted};}})};
 }})};
 assert.equal(await cleanupExpiredNonces(cloud,now,1),1);assert.deepEqual(rows.map(row=>row._id),['fresh']);
 await assert.rejects(()=>cleanupExpiredNonces(cloud,now,101));
});

test('provider-neutral staging requires a choice and refuses to overwrite',t=>{
 const {prepare}=require('../prepare-deployment.cjs');
 const dir=fs.mkdtempSync(path.join(artifacts,'staging-'));
 assert.throws(()=>prepare(undefined,path.join(dir,'unknown')));assert.equal(fs.existsSync(path.join(dir,'unknown')),false);
 for(const provider of ['aliyun','tcb']){
  const dest=path.join(dir,provider),result=prepare(provider,dest);
  assert.ok(fs.existsSync(path.join(result,'cloudfunctions/notification-gateway/index.js')));
  assert.ok(fs.existsSync(path.join(result,'database/notification_push_nonces.schema.json')));
  assert.equal(fs.existsSync(path.join(result,'cloudfunctions/notification-gateway/.env')),false);
  assert.throws(()=>prepare(provider,dest));
 }
});