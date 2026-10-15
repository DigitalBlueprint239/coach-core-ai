/* Local-only UI review harness. No Firebase/auth modules in its entry graph. */
const path=require('node:path');
const fs=require('node:fs');
const http=require('node:http');
const webpack=require('webpack');
process.env.NODE_ENV='production';process.env.BABEL_ENV='production';
const root=path.resolve(__dirname,'..');
const out=path.join(root,'node_modules/.cache/coach-core-visual-preview');
const port=Number(process.argv[2]||4317);
if(!Number.isInteger(port)||port<1024||port>65535)throw new Error('Choose a localhost port from 1024 to 65535.');
webpack({mode:'production',entry:path.join(root,'src/ui/preview.tsx'),output:{path:out,filename:'preview.js'},
  optimization:{minimize:false},devtool:false,
  resolve:{extensions:['.tsx','.ts','.js']},
  module:{rules:[{test:/\.[jt]sx?$/,exclude:/node_modules/,use:{loader:require.resolve('babel-loader'),options:{presets:[require.resolve('babel-preset-react-app')]}}},{test:/\.css$/,use:[require.resolve('style-loader'),require.resolve('css-loader')]}]},
},(err,stats)=>{
  if(err||stats.hasErrors()){console.error(err||stats.toString({all:false,errors:true}));process.exitCode=1;return;}
  fs.writeFileSync(path.join(out,'index.html'),'<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="dark"><title>Coach Core · Local visual preview</title><style>body{margin:0;background:#071019}</style></head><body><div id="root"></div><script src="/preview.js"></script></body></html>');
  const modules=stats.toJson({all:false,modules:true}).modules||[];
  if(modules.some(m=>/firebase|AuthProvider|useAuth|gateway\.ts/.test(m.name||'')))throw new Error('Preview unexpectedly imports a cloud/auth module.');
  console.log('Preview compiled; cloud/auth module check passed.');
  if(process.argv.includes('--build-only'))return;
  http.createServer((req,res)=>{const file=req.url==='/preview.js'?'preview.js':req.url==='/'||req.url==='/index.html'?'index.html':null;
    if(!file){res.writeHead(404).end();return;}
    res.writeHead(200,{'Content-Type':file.endsWith('.js')?'text/javascript':'text/html','Cache-Control':'no-store'});res.end(fs.readFileSync(path.join(out,file)));
  }).listen(port,'127.0.0.1',()=>console.log(`Coach Core visual preview: http://127.0.0.1:${port} (sample data; no cloud connection)`));
});
