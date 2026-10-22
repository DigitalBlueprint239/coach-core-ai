from pathlib import Path
import zipfile,json,hashlib
p=Path('/workspace/CoachCore-Windows-Repair-2026.10.22-r1.zip')
with zipfile.ZipFile(p) as z:
 assert z.testzip() is None
 names=z.namelist();assert not any(any(v in n.split('/') for v in ['node_modules','.local-state','.cli-config']) for n in names)
 m=json.loads(z.read('package-manifest.json'));assert m['applicationSource']=='32f46d34821380dc69c8eaf37554bfc26f71fa06'
 assert all(hashlib.sha256(z.read(f['path'])).hexdigest()==f['sha256'] for f in m['files'])
 css='\n'.join(z.read(n).decode() for n in names if n.endswith('.css'))
 for bad in ['@tailwind','@source','@import "tailwindcss"']:assert bad not in css
 for good in ['.fixed{','.w-6{','.lg\\:grid-cols-4{']:
  assert good in css,good
 assert m['configuration']=={'project':'demo-coach-core-e2e','emulators':True,'legacyImport':False,'ai':False,'filmBackend':False}
 print('PASS ZIP integrity, every manifest hash, source/version, emulator flags, no state/dependencies, compiled fixed/size/responsive utilities and no unresolved Tailwind directives.')
