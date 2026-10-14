const path = require('node:path');
const base = path.join(__dirname, 'smart-playbook-source');
const esbuild = require(path.join(base,'node_modules/esbuild'));
const {JSDOM} = require(path.join(__dirname,'main-platform/node_modules/jsdom'));
const dom = new JSDOM('<html><body></body></html>',{url:'http://localhost/'});
for(const k of ['window','document','localStorage','HTMLElement','Node']) global[k]=dom.window[k];
global.IS_REACT_ACT_ENVIRONMENT=true;
esbuild.buildSync({entryPoints:[path.join(base,'audit-harness.tsx')],bundle:true,platform:'node',format:'cjs',outfile:path.join(base,'audit-harness.cjs'),external:['react','react-dom','react-dom/client'],logLevel:'silent'});
require(path.join(base,'audit-harness.cjs')).run().then(r=>{process.exitCode=r.some(x=>x.status==='FAIL')?1:0;dom.window.close();});
