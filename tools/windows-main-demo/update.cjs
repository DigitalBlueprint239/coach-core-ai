// Update only files named in the hash-verified package inventory. Never replace
// local emulator exports, browser storage, dependencies, or unrelated user files.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),net=require('node:net');
const readline=require('node:readline/promises');
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
async function update(target){
 const source=__dirname;target=path.resolve(target.replace(/^"|"$/g,''));
 if(target===source)throw Error('Choose the OLD Coach Core folder, not this extracted repair folder.');
 const old=JSON.parse(fs.readFileSync(path.join(target,'package-manifest.json')));
 if(old.configuration?.project!=='demo-coach-core-e2e'||!fs.existsSync(path.join(target,'START-COACH-CORE.cmd')))throw Error('That is not the existing local Coach Core package folder.');
 // Refuse while local application/emulators are still running.
 for(const port of [3000,9099,8080,5001,9199])await new Promise((resolve,reject)=>{const s=net.createServer();s.once('error',()=>reject(Error('Close Coach Core with Ctrl+C and wait for its export before updating (port '+port+' is busy).')));s.listen(port,'127.0.0.1',()=>s.close(resolve));});
 const manifest=JSON.parse(fs.readFileSync(path.join(source,'package-manifest.json')));
 const entries=[...manifest.files,{path:'package-manifest.json',sha256:hash(fs.readFileSync(path.join(source,'package-manifest.json')))}];
 for(const e of entries){if(!e.path||path.isAbsolute(e.path)||e.path.split(/[\\/]/).some(p=>['..','.local-state','.cli-config','node_modules'].includes(p)))throw Error('Unsafe update inventory.');if(hash(fs.readFileSync(path.join(source,e.path)))!==e.sha256)throw Error('Repair package verification failed: '+e.path);}
 const backup=path.join(target,'repair-backup-'+Date.now());fs.mkdirSync(backup);
 // Full immutable snapshot of persisted emulator data before changing app files.
 if(fs.existsSync(path.join(target,'.local-state')))fs.cpSync(path.join(target,'.local-state'),path.join(backup,'.local-state'),{recursive:true});
 const changed=[];
 try{for(const e of entries){const dest=path.join(target,e.path),bak=path.join(backup,e.path);const existed=fs.existsSync(dest);if(existed){fs.mkdirSync(path.dirname(bak),{recursive:true});fs.copyFileSync(dest,bak);}changed.push({dest,bak,existed});fs.mkdirSync(path.dirname(dest),{recursive:true});fs.copyFileSync(path.join(source,e.path),dest);}}
 catch(e){for(const f of changed.reverse()){if(f.existed)fs.copyFileSync(f.bak,f.dest);else if(fs.existsSync(f.dest))fs.unlinkSync(f.dest);}throw e;}
 console.log('UPDATED: '+target+'\nExisting data and dependencies kept. Backup: '+backup+'\nNow double-click START-COACH-CORE.cmd in that OLD folder. Open http://localhost:3000/start');
}
if(require.main===module)(async()=>{const rl=readline.createInterface({input:process.stdin,output:process.stdout});try{const target=process.argv[2]||await rl.question('Paste the OLD Coach Core folder path (containing START-COACH-CORE.cmd), then press Enter: ');await update(target);}catch(e){console.error('UPDATE STOPPED: '+e.message);process.exitCode=1;}finally{rl.close();}})();
module.exports={update};
