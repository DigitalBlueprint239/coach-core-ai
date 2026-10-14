import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
const repo = process.cwd();
const out = path.resolve(repo, '../acceptance-4757eaf-healthy-runs');
if (!out.startsWith(path.dirname(repo) + path.sep)) throw new Error('Unexpected evidence root');
if (process.env.GCLOUD_PROJECT !== 'demo-coach-core-e2e') throw new Error('Emulator project must be demo');
fs.mkdirSync(out, {recursive:true});
const summary = [];
for (let repeat = 1; repeat <= 10; repeat++) {
 const dir = path.join(out, 'run-' + String(repeat).padStart(2, '0'));
 // Never reuse or empty an existing run folder.
 if (fs.existsSync(dir)) throw new Error('Evidence directory already exists: ' + dir);
 fs.mkdirSync(dir);
 const log = fs.openSync(path.join(dir, 'browser.log'), 'wx');
 const env = { ...process.env, PLAYWRIGHT_JSON_OUTPUT_FILE: path.join(dir, 'results.json') };
 delete env.E2E_SKIP_FIREFOX; delete env.E2E_AUTH_ONLY; delete env.E2E_NO_GOOGLE_SCRIPTS;
 console.log('BEGIN run-' + String(repeat).padStart(2,'0'));
 const exitCode = await new Promise((resolve, reject) => {
  const child = spawn(process.execPath, [path.join(repo,'e2e/node_modules/@playwright/test/cli.js'),
    'test','--config',path.join(repo,'e2e/playwright.config.ts'), '--retries=0', '--repeat-each=1',
    '--reporter=list,json','--output',path.join(dir,'artifacts')], {cwd:repo,env,stdio:['ignore',log,log]});
  child.once('error',reject);child.once('exit',resolve);
 });
 fs.closeSync(log);
 let stats = null;
 if (fs.existsSync(path.join(dir,'results.json'))) stats = JSON.parse(fs.readFileSync(path.join(dir,'results.json'),'utf8')).stats;
 const row = {repeat,exitCode,stats}; summary.push(row);
 fs.writeFileSync(path.join(dir,'exit.json'),JSON.stringify(row,null,2)+'\n');
 fs.writeFileSync(path.join(out,'progress.json'),JSON.stringify(summary,null,2)+'\n');
 console.log('END run-' + String(repeat).padStart(2,'0') + ' ' + JSON.stringify(row));
 // A failing run is retained and does not skip the remaining repeats.
}
process.exitCode = summary.some(x=>x.exitCode!==0 || !x.stats || x.stats.skipped>0) ? 1 : 0;
