import pathlib,json,subprocess,hashlib,zipfile,re,collections
folder=pathlib.Path('/workspace/scratch/runtime-validation')
sha='61448f0feee198a8796f4077f32a52f7b863f90d'
runs=[int(x) for x in __import__('sys').argv[1:]]
metadata=[]; reports=[]
for run in runs:
 data=json.loads(subprocess.check_output(['gh','api',f'repos/DigitalBlueprint239/coach-core-ai/actions/runs/{run}/artifacts?per_page=100']))
 assert data['total_count']==12 and len(data['artifacts'])==12
 for artifact in data['artifacts']:
  assert artifact['workflow_run']['head_sha']==sha and not artifact['expired']
  a=dict(artifact,run=run);metadata.append(a)
  p=folder/f"runtime-{artifact['id']}.zip"
  assert p.exists() and p.stat().st_size > 0, 'Download this artifact through the connector before verification'
  digest=hashlib.sha256(p.read_bytes()).hexdigest()
  assert 'sha256:'+digest==artifact['digest']
  assert p.stat().st_size==artifact['size_in_bytes']
  with zipfile.ZipFile(p) as z:
   assert z.testzip() is None
   names=set(z.namelist()); assert len(names)==len(z.namelist())
   required=['ci-evidence/run.log','ci-evidence/run.exit','ci-evidence/release-build-manifest.sha256','ci-evidence/REDACTION.txt','ci-evidence/INVENTORY.sha256','ci-evidence/UPLOAD_OK','test-results/results.json']
   assert all(z.read(n) for n in required)
   listed=[]
   for row in z.read('ci-evidence/INVENTORY.sha256').decode().splitlines():
    if not row or row.startswith('#'):continue
    h,path=row.split('  ',1); assert path.startswith('e2e/')
    path=path[4:]; listed.append(path)
    assert hashlib.sha256(z.read(path)).hexdigest()==h
   assert len(listed)==len(set(listed)) and set(listed)==names-{'ci-evidence/INVENTORY.sha256','ci-evidence/UPLOAD_OK'}
   log=z.read('ci-evidence/run.log').decode(errors='strict')
   patterns=[r'oobCode=[A-Za-z0-9_-]',r'Bearer [A-Za-z0-9._-]{8,}',r'eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}',r'[?&](?:key|apiKey|token|access_token|id_token|refresh_token)=[^&\s"\[]']
   assert not any(re.search(p,log) for p in patterns)
   results=json.loads(z.read('test-results/results.json')); tests=[]
   def walk(s,parents):
    for spec in s.get('specs',[]):
     for t in spec['tests']:tests.append({'title':' / '.join(parents+[spec['title']]),'file':spec['file'],'line':spec['line'],'project':t['projectName'],'status':t['status'],'executions':[{'status':r['status'],'retry':r['retry'],'duration':r['duration']} for r in t['results']]})
    for child in s.get('suites',[]):walk(child,parents+[child['title']])
   for s in results['suites']:walk(s,[])
   exits=z.read('ci-evidence/run.exit').decode().strip()
   reports.append({'run':run,'id':artifact['id'],'name':artifact['name'],'digest':artifact['digest'],'archive_digest_match':True,'size_match':True,'inventory_complete':True,'final_hashes_match':True,'token_scan_clear':True,'required_nonempty':True,'test_exit':exits,'stats':results['stats'],'tests':tests,'result_config':({k:results['config'].get(k) for k in ['workers','fullyParallel','maxFailures','globalTimeout']} | {'projects':[{k:p.get(k) for k in ['name','repeatEach','retries','timeout','grep','grepInvert']} for p in results['config']['projects']]}),'release_manifest_entries':len(z.read('ci-evidence/release-build-manifest.sha256').decode().splitlines()),'log_execution_summary':[line for line in log.splitlines() if re.search(r'(?:\d+ passed|\d+ failed|No tests found|E2E .*execut|E2E .*passed)',line)][-5:]})
 (folder/f'run-{run}-artifact-metadata.json').write_text(json.dumps([a for a in metadata if a['run']==run],indent=2)+'\n')
(folder/'runtime-archive-verification.json').write_text(json.dumps(reports,indent=2)+'\n')
for r in reports:print(json.dumps({k:v for k,v in r.items() if k not in ['tests','result_config','log_execution_summary','stats']}|{'stats':{k:v for k,v in r['stats'].items() if k in ['expected','unexpected','flaky','skipped']},'executions':sum(len(t['executions']) for t in r['tests'])}))
