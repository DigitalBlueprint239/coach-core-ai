#!/usr/bin/env node
// Local build/server only. No emulator, deployment, Firebase or media upload.
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const crypto = require('node:crypto');
const {execFileSync} = require('node:child_process');
const root = path.resolve(__dirname, '..');
process.chdir(root);
process.env.NODE_ENV = 'production';
process.env.BABEL_ENV = 'production';
process.env.PUBLIC_URL = '';
require('react-scripts/config/env');
for (const name of ['GCLOUD_PROJECT', 'GOOGLE_CLOUD_PROJECT', 'FIREBASE_PROJECT_ID', 'REACT_APP_FIREBASE_PROJECT_ID']) {
  if (process.env[name] && !process.env[name].startsWith('demo-')) {
    throw new Error(`A0 refuses non-demo project configuration in ${name}. Unset it for this process; no value is printed.`);
  }
}
const output = path.join(root, 'film-a0-build');
const webpack = require('webpack');
const HtmlPlugin = require('html-webpack-plugin');
const config = require('react-scripts/config/webpack.config')('production');
config.entry = path.join(root, 'src/features/film-analyzer/demo/index.tsx');
config.output.path = output;
config.output.publicPath = '/';
config.devtool = false;
config.plugins = config.plugins.filter(p => !['GenerateSW', 'InjectManifest'].includes(p.constructor.name)).map(p => p.constructor.name === 'HtmlWebpackPlugin' ? new HtmlPlugin({ inject: true, template: path.join(__dirname, 'film-a0/index.html') }) : p);
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'public/film-a0/sample.json')));
if (JSON.stringify(manifest) !== JSON.stringify(JSON.parse(fs.readFileSync(path.join(root, 'src/features/film-analyzer/demo/sample.json'))))) throw new Error('Sample manifests disagree.');
for (const file of manifest.files) {
  if (!['out-route.mp4', 'out-route.webm'].includes(file.name)) throw new Error('Unexpected sample file.');
  const bytes = fs.readFileSync(path.join(root, 'public/film-a0', file.name));
  if (bytes.length !== file.bytes || crypto.createHash('sha256').update(bytes).digest('hex') !== file.sha256) throw new Error('Synthetic sample digest mismatch.');
}
fs.rmSync(output, { recursive: true, force: true });
webpack(config, (error, stats) => {
  if (error || stats.hasErrors()) {
    // Restrict output to build diagnostics; never print process.env/config.
    console.error(error?.message || stats.toString({ all: false, errors: true })); process.exitCode = 1; return;
  }
  const moduleNames = [];
  const visit = modules => { for (const m of modules) { moduleNames.push(m.resource || m.identifier()); if (m.modules) visit(m.modules); } };
  visit(stats.compilation.modules);
  const names = moduleNames.join('\n');
  if (/node_modules\/(@firebase|firebase)\/|src\/(ai-brain|firebase\.|App\.|components\/(Auth|PWA)|services\/)/.test(names.replaceAll('\\', '/'))) {
    console.error('A0 unexpectedly contains a Firebase/AI module.'); process.exitCode = 1; return;
  }
  fs.cpSync(path.join(root, 'public/film-a0'), path.join(output, 'film-a0'), { recursive: true });
  fs.writeFileSync(path.join(output, 'a0-build.json'), JSON.stringify({ sourceSha: execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(), trackedDirty: execFileSync('git',['diff','HEAD','--name-only'],{cwd:root,encoding:'utf8'}).trim().length > 0, entry: 'src/features/film-analyzer/demo/index.tsx', firebaseOrAiModules: false, sample: manifest.id, sampleFiles: manifest.files }, null, 2));
  console.log('A0 isolated production build complete. No Firebase/AI modules; sample hashes verified.');
  if (process.argv.includes('--build-only')) return;
  const types = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json', '.mp4': 'video/mp4', '.webm': 'video/webm', '.txt': 'text/plain' };
  const server = http.createServer((req, res) => {
    res.setHeader('Content-Security-Policy', "default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; media-src 'self' blob:; font-src 'self'; object-src 'none'; frame-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'");
    res.setHeader('Cache-Control', 'no-store'); res.setHeader('Referrer-Policy', 'no-referrer'); res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    if (!['GET', 'HEAD'].includes(req.method)) { res.writeHead(405); res.end(); return; }
    // Reject rebinding/foreign Host requests even though listening only on loopback.
    if (!/^(localhost|127\.0\.0\.1):4210$/.test(req.headers.host || '')) { res.writeHead(403); res.end(); return; }
    let pathname;
    try { pathname = decodeURIComponent(new URL(req.url, 'http://localhost:4210').pathname); } catch { res.writeHead(400); res.end(); return; }
    const relative = pathname === '/' ? 'index.html' : pathname.slice(1);
    if (!(relative === 'index.html' || relative === 'a0-build.json' || /^static\/(js|css|media)\/[a-zA-Z0-9._-]+$/.test(relative) || /^film-a0\/(out-route\.(mp4|webm)|sample\.json)$/.test(relative))) { res.writeHead(404); res.end(); return; }
    const target = path.resolve(output, relative);
    if (!target.startsWith(output + path.sep) || !fs.existsSync(target) || !fs.lstatSync(target).isFile() || fs.lstatSync(target).isSymbolicLink()) { res.writeHead(404); res.end(); return; }
    res.setHeader('Content-Type', types[path.extname(target)] || 'application/octet-stream');
    res.setHeader('Content-Length', fs.statSync(target).size); res.writeHead(200);
    if (req.method === 'HEAD') res.end(); else fs.createReadStream(target).pipe(res);
  });
  server.on('error', e => { console.error('Local A0 server failed:', e.code); process.exitCode = 1; });
  server.listen(4210, '127.0.0.1', () => console.log('Open http://localhost:4210 — local synthetic demo only. Ctrl+C stops it.'));
});
