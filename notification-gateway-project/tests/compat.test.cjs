'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {spawnSync}=require('node:child_process');
const crypto=require('node:crypto');
const fs=require('node:fs');
const path=require('node:path');
const {verify}=require('../cloudfunctions/notification-gateway');
const {secret,now,signed}=require('./fixture.cjs');
const probe=path.resolve(__dirname,'../.artifacts/signature-probe/SignatureProbe.dll');
/** Execute a separately compiled .NET process, not a second JavaScript implementation. */
function dotnet(body,nonce='c'.repeat(32),timestamp=String(now/1000)) {
 const result=spawnSync('dotnet',[probe],{encoding:'utf8',input:JSON.stringify({secret,bodyBase64:Buffer.from(body).toString('base64'),timestamp,nonce})});
 assert.equal(result.status,0,'The offline .NET probe must be built before this suite');
 return JSON.parse(result.stdout);
}
for(const [name,body]of [['ASCII',signed().body],['Chinese raw UTF8','{"text":"中文通知"}\n'],['Escaped Unicode','{"text":"\\u4f60\\u597d","x":"a\\nb"}'],['Unicode and CRLF','{"text":"您好，🏸","x":1}\r\n']])
 test('.NET / Node signature equality: '+name,()=>{
  const expected=dotnet(body),digest=crypto.createHash('sha256').update(body,'utf8').digest('hex');
  const signature=crypto.createHmac('sha256',secret).update(String(now/1000)+'\n'+'c'.repeat(32)+'\n'+digest).digest('hex');
  assert.ok(expected.digest===digest && expected.signature===signature,'Cross-language digest and signature match');
 });

test('.NET-signed business envelope verifies raw and Base64, mutation/expiry fail',()=>{
 const event=signed({},'c'.repeat(32)),result=dotnet(event.body);
 event.headers['X-Notification-Signature']=result.signature;
 assert.ok(verify(event,secret,now));
 assert.ok(verify({...event,isBase64Encoded:true,body:Buffer.from(event.body).toString('base64')},secret,now));
 assert.equal(verify({...event,body:event.body+' '},secret,now),null);
 assert.equal(verify(event,secret,now+61000),null);
});

test('production .NET sender still uses the exact inspected signature/header contract',()=>{
 const filename=process.env.NOTIFICATION_BACKEND_SOURCE || 'E:/MyWork/全部项目/供应链项目/SupplyChain.Backend/XunFeng.Module.MallDealer/Services/NotificationDeliveryService.cs';
 const source=fs.readFileSync(filename,'utf8');
 for(const expression of ['SHA256.HashData(Encoding.UTF8.GetBytes(body))','HMACSHA256.HashData(Encoding.UTF8.GetBytes(_options.SigningSecret),Encoding.UTF8.GetBytes(timestamp+"\\n"+nonce+"\\n"+digest))','X-Notification-Time','X-Notification-Nonce','X-Notification-Signature','ToUnixTimeSeconds()','.ToLowerInvariant()'])
  assert.ok(source.includes(expression),'Production signature contract must be reviewed if it changes');
});