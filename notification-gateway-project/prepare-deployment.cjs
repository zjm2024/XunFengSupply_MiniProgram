'use strict';
const fs=require('node:fs');
const path=require('node:path');
/** Stage local source only after an explicit provider choice; never bind a space or upload. */
function prepare(provider,destination) {
 if(!['aliyun','tcb'].includes(provider))throw Error('Select the actual confirmed provider: aliyun or tcb');
 if(!destination || !path.isAbsolute(destination))throw Error('An absolute, new local output directory is required');
 const root=path.resolve(destination);
 if(fs.existsSync(root))throw Error('Output already exists; refusing to overwrite it');
 fs.mkdirSync(root,{recursive:true});
 const cloudRoot=path.join(root,'uniCloud-'+provider);
 fs.mkdirSync(path.join(cloudRoot,'cloudfunctions'),{recursive:true});
 fs.cpSync(path.join(__dirname,'cloudfunctions/notification-gateway'),path.join(cloudRoot,'cloudfunctions/notification-gateway'),{recursive:true,filter:source=>!['.env','node_modules'].includes(path.basename(source))});
 fs.cpSync(path.join(__dirname,'database'),path.join(cloudRoot,'database'),{recursive:true});
 return cloudRoot;
}
if(require.main===module){try{console.log(prepare(process.argv[2],process.argv[3]));}catch(error){console.error(error.message);process.exitCode=1;}}
module.exports={prepare};