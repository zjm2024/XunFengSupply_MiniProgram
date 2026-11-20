'use strict';
const {openStore}=require('./durable-store.cjs');
const {secret,now,signed,cloudForStore}=require('./fixture.cjs');
const {deliver}=require('../cloudfunctions/notification-gateway');
/** Separate gateway instance; all shared state and provider call evidence live in SQLite. */
async function main() {
 const store=openStore(process.argv[2]);
 try {
  const overrides=process.argv[4]==='new-request'?{requestId:require('node:crypto').randomBytes(16).toString('hex')}:{};
  const event=signed(overrides,process.argv[3]);
  const result=await deliver(event,{secret,now,appId:'__UNI__TEST',cloud:cloudForStore(store,async message=>{
   store.recordCall(message.request_id);await new Promise(resolve=>setTimeout(resolve,50));return {errCode:0};
  })});
  process.stdout.write(JSON.stringify({code:result.statusCode,...JSON.parse(result.body)}));
 } finally {store.close();}
}
main().catch(()=>{process.stderr.write('WORKER_FAILED');process.exitCode=1;});
