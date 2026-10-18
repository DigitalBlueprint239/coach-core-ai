import pathlib,json,zipfile,hashlib,re,subprocess
p=pathlib.Path('/workspace/scratch/review78-r5');repo=pathlib.Path('/workspace/coach-core-review78-r5');sha='4f6b901b6c4141f88f5d884af0d67d62b28f40c1';meta=json.loads((p/'artifacts.json').read_text());assert meta['total_count']==12
out=[]
for a in meta['artifacts']:
 assert a['workflow_run']['head_sha']==sha and not a['expired'];f=p/f"artifact-{a['id']}.zip";assert a['digest']=='sha256:'+hashlib.sha256(f.read_bytes()).hexdigest() and f.stat().st_size==a['size_in_bytes']
 bucket,project=re.fullmatch(r'e2e-results-(acceptance|diagnostic|obsolete-fault-model)-(.*)-'+sha,a['name']).groups();hasgate=bucket=='acceptance' and project in ['chromium','firefox']
 with zipfile.ZipFile(f) as z:
  assert z.testzip() is None;names=set(z.namelist());assert len(names)==len(z.namelist());listed=[]
  for row in z.read('ci-evidence/INVENTORY.sha256').decode().splitlines():
   if not row or row.startswith('#'):continue
   h,n=row.split('  ',1);assert n.startswith('e2e/');n=n[4:];assert hashlib.sha256(z.read(n)).hexdigest()==h;listed.append(n)
  assert len(set(listed))==len(listed) and set(listed)==names-{'ci-evidence/INVENTORY.sha256','ci-evidence/UPLOAD_OK'}
  for n in ['ci-evidence/run.log','ci-evidence/run.exit','ci-evidence/REDACTION.txt','ci-evidence/UPLOAD_OK','ci-evidence/release-build-manifest.sha256']:assert z.read(n)
  rel='ci-evidence/release-build/';context=z.read(rel+'release-build.context').decode();manifest=z.read('ci-evidence/release-build-manifest.sha256');h=hashlib.sha256(manifest).hexdigest();assert context.split('--- full build manifest (all 11 files) ---\n',1)[1].encode()==manifest
  fields=dict(line.split('=',1) for line in context.splitlines() if '=' in line and not line.startswith('---'))
  assert fields['candidate_sha']==fields['head_sha']==sha and fields['run_id']=='39163048438' and fields['run_attempt']=='1';assert fields['job']==f'e2e matrix_project={project} matrix_bucket={bucket}';assert fields['build_manifest_sha256']==h and fields['canary_verdict']=='config-false literals=1 claim=configuration-inlining-only';assert fields['effective_import_config']=='.env.production="false"' and fields['target_project']=='coach-core-mvp-staging-239'
  hashes={row.split('  ',1)[1].removeprefix('./'):row.split('  ',1)[0] for row in manifest.decode().splitlines()};retained={n[len(rel):] for n in names if n.startswith(rel)};buildfiles=retained&set(hashes)
  assert buildfiles=={'index.html','asset-manifest.json','static/js/main.630c8567.js'}
  for n in buildfiles:assert hashlib.sha256(z.read(rel+n)).hexdigest()==hashes[n]
  html=z.read(rel+'index.html').decode();entries={s.removeprefix('/') for s in re.findall(r'<script[^>]*\ssrc="([^"]+\.js)"',html)};asset=json.loads(z.read(rel+'asset-manifest.json'));assert entries=={v.removeprefix('/') for v in asset['files'].values() if v.endswith('.js')}=={v for v in asset['entrypoints'] if v.endswith('.js')}=={n for n in buildfiles if n.endswith('.js')}
  assert z.read(rel+'release-canary.json')==z.read('ci-evidence/release-canary.json');canary=json.loads(z.read(rel+'release-canary.json'));assert canary['verdict']=='config-false' and canary['ok'] and 'NOT a behavioural claim' in canary['claim'] and canary['sourceScope']['ok']
  assert not any(n.endswith('.map') or pathlib.PurePosixPath(n).name.startswith('.env') for n in names)
  patterns=[r'oobCode=[A-Za-z0-9_-]',r'Bearer [A-Za-z0-9._-]{8,}',r'eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}',r'[?&](?:key|apiKey|token|access_token|id_token|refresh_token)=[^&\s"\[]']
  for n in names:
   if n.endswith(('.json','.txt','.log','.html','.js','.context','.sha256','.md')):assert not any(re.search(pattern,z.read(n).decode()) for pattern in patterns),(a['id'],n)
  results=json.loads(z.read('test-results/results.json'));expectedexit=1 if bucket=='diagnostic' and project in ['chromium','firefox'] else 0;assert z.read('ci-evidence/run.exit')==f'exit={expectedexit}\n'.encode()
  dest=p/f"extracted-{a['id']}";dest.mkdir(exist_ok=True)
  for n in names:assert not n.startswith('/') and '..' not in pathlib.PurePosixPath(n).parts
  z.extractall(dest)
  r=subprocess.run(['node',str(repo/'scripts/security/release-import-config.js'),'canary',str(dest/rel),'--expect','false'],capture_output=True,text=True,timeout=20);assert r.returncode==0,r.stdout+r.stderr;rechecked=json.loads(r.stdout);assert rechecked['verdict']=='config-false'
  l3=None;gate=None;offhash=None
  if hasgate:
   offmanifest=z.read(rel+'import-off-build-manifest.sha256');offhash=hashlib.sha256(offmanifest).hexdigest();assert fields['import_off_build_manifest_sha256'].split()[0]==offhash;assert len(offmanifest.decode().splitlines())==12
   l3=json.loads(z.read('test-results/release-proof/results.json'));assert l3['stats']['expected']==5 and l3['stats']['skipped']==l3['stats']['unexpected']==l3['stats']['flaky']==0
   tests=[]
   def visit(s):
    for spec in s.get('specs',[]):
     for t in spec['tests']:tests.append({'title':spec['title'],'file':spec['file'],'project':t['projectName'],'status':t['status'],'results':[(x['status'],x['retry']) for x in t['results']]})
    for s2 in s.get('suites',[]):visit(s2)
   for s in l3['suites']:visit(s)
   assert len(tests)==5
   for prefix,pr,file in [('RP-OFF-01','import-off-','release-import-off.spec.ts'),('RP-OFF-02','import-off-','release-import-off.spec.ts'),('RP-OFF-03','import-off-','release-import-off.spec.ts'),('D10-01','on-control-','legacy-import.spec.ts'),('D10-02','on-control-','legacy-import.spec.ts')]:
    hits=[t for t in tests if t['title'].startswith(prefix+' ')];assert len(hits)==1;hit=hits[0];assert hit['project']==pr+project and hit['file'].endswith(file) and hit['status']=='expected' and hit['results']==[('passed',0)]
   r=subprocess.run(['node',str(repo/'scripts/security/release-import-config.js'),'gate','--canary',str(dest/'ci-evidence/release-canary.json'),'--off',str(dest/'test-results/release-proof/results.json'),'--on',str(dest/'test-results/release-proof/results.json')],capture_output=True,text=True,timeout=20);assert r.returncode==0,r.stdout+r.stderr;gate=json.loads(r.stdout);assert gate==json.loads(z.read('ci-evidence/release-gate.json')) and gate['verdict']=='off';l3={'stats':l3['stats'],'tests':tests}
  else:assert 'ci-evidence/release-gate.json' not in names and 'test-results/release-proof/results.json' not in names and 'absent' in fields['import_off_build_manifest_sha256']
  out.append({'id':a['id'],'name':a['name'],'digest':a['digest'],'archive_inventory_and_retained_hashes_verified':True,'inventory_files':len(listed),'provenance_candidate_run_attempt_matrix_verified':True,'retained_files_sorted':sorted(retained),'unretained_release_manifest_files':sorted(set(hashes)-buildfiles),'configured_text_token_scans_clear':True,'release_canary':rechecked,'off_manifest_digest':offhash,'off_build_bytes_retained':False,'l3':l3,'gate':gate,'main_stats':results['stats'],'test_exit':expectedexit})
(p/'artifact-verification.json').write_text(json.dumps(out,indent=2)+'\n');print('Verified12 new ZIPs; all inventories/provenance/config-canaries; two real-browser L3 result sets and gate recomputations agree; diagnostic exits1 preserved')
