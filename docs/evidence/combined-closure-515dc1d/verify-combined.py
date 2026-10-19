import pathlib,json,zipfile,hashlib,re,stat
P=pathlib.Path('/workspace/scratch/combined-closure');HEAD='515dc1d92bf237dae4d70ff2cc38c2aee07d5ae1';SHA='950addf164e4f789c6488bf5af7dd60dc2e43ce8';RUN='39268393120';rows=[]
meta=json.loads((P/'artifacts.json').read_text());assert meta['total_count']==13
for a in meta['artifacts']:
 f=P/f"artifact-{a['id']}.zip";assert not a['expired'] and a['workflow_run']['head_sha']==HEAD;assert a['digest']=='sha256:'+hashlib.sha256(f.read_bytes()).hexdigest() and f.stat().st_size==a['size_in_bytes']
 with zipfile.ZipFile(f) as z:
  names=z.namelist();assert z.testzip() is None and len(names)==len(set(names))
  for i in z.infolist():assert not stat.S_ISLNK(i.external_attr>>16) and not i.filename.startswith('/') and '..' not in pathlib.PurePosixPath(i.filename).parts
  z.extractall(P/f"extracted-{a['id']}");r={'id':a['id'],'name':a['name'],'archive_digest':a['digest'],'files':len(names)}
  if a['name'].startswith('merge-eligibility-'):
   g=json.loads(z.read('merge-eligibility.json'));assert g['sha']==SHA and g['headSha']==HEAD and str(g['runId'])==RUN and str(g['attempt'])=='1' and g['event']=='pull_request';r.update(eligible=g['eligible'],reasons=g['reasons']);rows.append(r);continue
  bucket,project=re.fullmatch(r'e2e-results-(acceptance|diagnostic|obsolete-fault-model)-(.*)-'+SHA,a['name']).groups();listed=[]
  for line in z.read('ci-evidence/INVENTORY.sha256').decode().splitlines():
   if not line or line.startswith('#'):continue
   h,n=line.split('  ',1);assert re.fullmatch('[a-f0-9]{64}',h) and n.startswith('e2e/');n=n[4:];assert hashlib.sha256(z.read(n)).hexdigest()==h;listed.append(n)
  assert len(set(listed))==len(listed) and set(listed)==set(names)-{'ci-evidence/INVENTORY.sha256','ci-evidence/UPLOAD_OK'}
  ctx=dict(l.split('=',1) for l in z.read('ci-evidence/run.context').decode().splitlines() if '=' in l);assert ctx==dict(sha=SHA,head_sha=HEAD,event='pull_request',run_id=RUN,run_attempt='1',project=project,bucket=bucket,repeat='1',grep='')
  for n in ['ci-evidence/run.log','ci-evidence/run.exit','ci-evidence/REDACTION.txt','ci-evidence/UPLOAD_OK','ci-evidence/release-build-manifest.sha256','test-results/results.json','test-results/.last-run.json']:assert z.read(n)
  result=json.loads(z.read('test-results/results.json'));last=json.loads(z.read('test-results/.last-run.json'));tests=[]
  def walk(s):
   for sp in s.get('specs',[]):
    for t in sp.get('tests',[]):tests.append(dict(id=sp['id'],title=sp['title'],project=t['projectName'],status=t['status'],expected=t['expectedStatus'],results=[dict(status=x['status'],retry=x['retry']) for x in t['results']]))
   for x in s.get('suites',[]):walk(x)
  for s in result['suites']:walk(s)
  expected=(15 if project.startswith('phone-') else 65)if bucket=='acceptance' else(0 if project.startswith('phone-') else 10 if bucket=='diagnostic' else 1)
  assert len(tests)==expected and len({x['id']for x in tests})==expected and result['errors']==[]
  assert result['config']['workers']==1 and result['config']['projects'][0]['repeatEach']==1
  for t in tests:assert t['project']==project and len(t['results'])==1 and t['results'][0]['retry']==0 and t['results'][0]['status']in['passed','failed','timedOut']
  exit=z.read('ci-evidence/run.exit').decode().strip();assert exit in['exit=0','exit=1'];failed=[x['id']for x in tests if x['status']=='unexpected'];assert sorted(last['failedTests'])==sorted(failed);assert last['status']==('failed'if failed else'passed');assert exit==('exit=1'if failed else'exit=0')
  if bucket=='acceptance':assert not failed and all(t['results'][0]['status']=='passed'for t in tests)
  manifest={n:h for h,n in [l.split('  ',1)for l in z.read('ci-evidence/release-build-manifest.sha256').decode().splitlines()if l and not l.startswith('#')]}
  for n in names:
   if n.startswith('ci-evidence/release-build/') and (n.endswith('.js')or n.endswith('index.html')or n.endswith('asset-manifest.json')):
    rel='./'+n[len('ci-evidence/release-build/'):];assert manifest[rel]==hashlib.sha256(z.read(n)).hexdigest()
  rc=dict(l.split('=',1)for l in z.read('ci-evidence/release-build/release-build.context').decode().splitlines()if'='in l);assert rc['candidate_sha']==SHA and rc['head_sha']==HEAD and rc['run_id']==RUN and rc['run_attempt']=='1';assert rc['build_manifest_sha256']==hashlib.sha256(z.read('ci-evidence/release-build-manifest.sha256')).hexdigest()
  c=json.loads(z.read('ci-evidence/release-canary.json'));assert c['verdict']=='config-false' and c==json.loads(z.read('ci-evidence/release-build/release-canary.json'))
  html=z.read('ci-evidence/release-build/index.html').decode();assets=json.loads(z.read('ci-evidence/release-build/asset-manifest.json'));scripts={n.lstrip('/')for n in re.findall(r'<script[^>]+src=[\"\']([^\"\']+)',html)};entry={n.lstrip('/')for n in assets['entrypoints']if n.endswith('.js')};assert scripts==entry and scripts
  for n in entry:assert 'ci-evidence/release-build/'+n in names
  if bucket=='acceptance'and project in['chromium','firefox']:
   gate=json.loads(z.read('ci-evidence/release-gate.json'));assert gate['verdict']=='off'and gate['reasons']==[]
   off_manifest=z.read('ci-evidence/release-build/import-off-build-manifest.sha256');assert rc['import_off_build_manifest_sha256'].startswith(hashlib.sha256(off_manifest).hexdigest()+' ');assert len(off_manifest.decode().splitlines())==12
   rp=json.loads(z.read('test-results/release-proof/results.json'));assert rp['errors']==[] and rp['stats']['expected']==5 and rp['stats']['unexpected']==rp['stats']['skipped']==rp['stats']['flaky']==0;r['release_gate']=gate;r['release_proof_stats']=rp['stats']
  patterns=[r'oobCode=[A-Za-z0-9_-]',r'Bearer [A-Za-z0-9._-]{8,}',r'eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}']
  for n in names:
   if n.endswith(('.json','.txt','.log','.context')):assert not any(re.search(x,z.read(n).decode())for x in patterns),(a['id'],n)
  r.update(inventory_complete=True,context=ctx,exit=exit,last_run=last,tests=tests,release_context=rc,stats=result['stats']);rows.append(r)
(P/'archive-verification.json').write_text(json.dumps(rows,indent=2)+'\n');print('Verified',len(rows),'ZIPs; all hashes/inventories/provenance, release retained bytes/canaries and execution exits')
