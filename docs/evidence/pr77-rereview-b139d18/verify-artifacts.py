import pathlib,json,zipfile,hashlib,re
p=pathlib.Path('/workspace/scratch/review77-r2');meta=json.loads((p/'artifacts.json').read_text());sha='b139d18d5ea617fd4d505dbdd19ef1e0403662a9';assert meta['total_count']==14;rows=[]
for a in meta['artifacts']:
 assert a['workflow_run']['head_sha']==sha and not a['expired'];f=p/f"artifact-{a['id']}.zip";assert a['digest']=='sha256:'+hashlib.sha256(f.read_bytes()).hexdigest() and f.stat().st_size==a['size_in_bytes']
 with zipfile.ZipFile(f) as z:
  assert z.testzip() is None;names=set(z.namelist());assert len(names)==len(z.namelist());
  for n in names:assert not n.startswith('/') and '..' not in pathlib.PurePosixPath(n).parts
  dest=p/f"extracted-{a['id']}";dest.mkdir(exist_ok=True);z.extractall(dest)
  if a['name'].startswith('merge-eligibility-'):
   assert names=={'merge-eligibility.json','merge-eligibility.md'};r=json.loads(z.read('merge-eligibility.json'));attempt=int(r['attempt']);assert attempt in [1,2];assert not r['eligible'] and r['sha']==r['headSha']==sha and r['event']=='workflow_dispatch' and str(r['runId'])=='39186218570';assert len(r['reasons'])==19+(12 if attempt==2 else 0)
   prefixes=[x.split(' ')[0] for x in r['reasons']];assert prefixes.count('R1')==1 and prefixes.count('R5')==18 and prefixes.count('R4')==(12 if attempt==2 else 0);assert not r.get('gatherErrors');rows.append({'id':a['id'],'name':a['name'],'digest':a['digest'],'attempt':attempt,'verdict':'INELIGIBLE','reason_count':len(r['reasons']),'reasons':r['reasons']});continue
  bucket,project=re.fullmatch(r'e2e-results-(acceptance|diagnostic|obsolete-fault-model)-(.*)-'+sha,a['name']).groups();listed=[]
  for row in z.read('ci-evidence/INVENTORY.sha256').decode().splitlines():
   if not row or row.startswith('#'):continue
   h,n=row.split('  ',1);assert n.startswith('e2e/');n=n[4:];assert hashlib.sha256(z.read(n)).hexdigest()==h;listed.append(n)
  assert len(listed)==len(set(listed)) and set(listed)==names-{'ci-evidence/INVENTORY.sha256','ci-evidence/UPLOAD_OK'}
  for n in ['ci-evidence/run.context','ci-evidence/run.log','ci-evidence/run.exit','ci-evidence/REDACTION.txt','ci-evidence/UPLOAD_OK','ci-evidence/release-build-manifest.sha256','test-results/results.json','test-results/.last-run.json']:assert z.read(n)
  ctx=dict(l.split('=',1) for l in z.read('ci-evidence/run.context').decode().splitlines() if '=' in l);assert ctx=={'sha':sha,'head_sha':sha,'event':'workflow_dispatch','run_id':'39186218570','run_attempt':'1','project':project,'bucket':bucket,'repeat':'1','grep':'D10-01|N2-D0|N2-A2'}
  failed=project=='chromium' and bucket=='obsolete-fault-model';assert z.read('ci-evidence/run.exit')==f'exit={1 if failed else 0}\n'.encode();last=json.loads(z.read('test-results/.last-run.json'));assert last['status']==('failed' if failed else 'passed');res=json.loads(z.read('test-results/results.json'));assert res.get('errors')==[] and res['stats']['unexpected']==int(failed) and res['stats']['skipped']==res['stats']['flaky']==0
  tests=[]
  def walk(s):
   for sp in s.get('specs',[]):
    for t in sp.get('tests',[]):tests.append({'id':sp['id'],'title':sp['title'],'project':t['projectName'],'status':t['status'],'expectedStatus':t['expectedStatus'],'results':[(r['status'],r['retry']) for r in t.get('results',[])]})
   for x in s.get('suites',[]):walk(x)
  for s in res['suites']:walk(s)
  count=0 if project.startswith('phone-') and bucket!='acceptance' else 1;assert len(tests)==count
  for t in tests:assert t['project']==project and t['status']==('unexpected' if failed else 'expected') and t['results']==[('timedOut' if failed else 'passed',0)]
  assert last['failedTests']==([tests[0]['id']] if failed else [])
  patterns=[r'oobCode=[A-Za-z0-9_-]',r'Bearer [A-Za-z0-9._-]{8,}',r'eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}',r'[?&](?:key|apiKey|token|access_token|id_token|refresh_token)=[^&\s"\[]']
  for n in names:
   if n.endswith(('.json','.log','.txt','.context')):assert not any(re.search(x,z.read(n).decode()) for x in patterns),(a['id'],n)
  rows.append({'id':a['id'],'name':a['name'],'digest':a['digest'],'inventory_complete':True,'inventory_file_count':len(listed),'all_hashes_verified':True,'context':ctx,'test_exit':int(failed),'last_run':last,'tests':tests,'configured_text_token_scans_clear':True})
(p/'artifact-verification.json').write_text(json.dumps(rows,indent=2)+'\n');print('Verified14 ZIPs:12 complete E2E inventories plus both aggregate attempts;19 and31 reasons, one completed obsolete timeout/exit1 preserved')
