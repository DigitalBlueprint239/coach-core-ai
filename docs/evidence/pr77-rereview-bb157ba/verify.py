import json,pathlib,zipfile,hashlib,re,stat
p=pathlib.Path('/workspace/scratch/review77-r3');out=[];sha='bb157ba057913bd0835db8df9ca5eb569df0011f'
for a in json.loads((p/'all-artifacts.json').read_text()):
 f=p/f"artifact-{a['id']}.zip";assert f.stat().st_size==a['size_in_bytes'];assert a['digest']=='sha256:'+hashlib.sha256(f.read_bytes()).hexdigest();assert a['workflow_run']['head_sha']==sha
 with zipfile.ZipFile(f) as z:
  assert z.testzip() is None;names=z.namelist();assert len(names)==len(set(names))
  for i in z.infolist():assert not stat.S_ISLNK(i.external_attr>>16) and not i.filename.startswith('/') and '..' not in pathlib.PurePosixPath(i.filename).parts
  d=p/f"extracted-{a['id']}";z.extractall(d)
  row={'id':a['id'],'run':a['workflow_run']['id'],'digest':a['digest'],'files':len(names)}
  if a['name'].startswith('merge-eligibility-'):
   r=json.loads(z.read('merge-eligibility.json'));assert not r['eligible'] and r['sha']==r['headSha']==sha and str(r['runId'])==str(row['run']);row.update(reasons=r['reasons'],gatherErrors=r['gatherErrors'])
  else:
   listed=[]
   for line in z.read('ci-evidence/INVENTORY.sha256').decode().splitlines():
    if not line or line.startswith('#'):continue
    h,n=line.split('  ',1);assert re.fullmatch('[0-9a-f]{64}',h) and n.startswith('e2e/');n=n[4:];assert hashlib.sha256(z.read(n)).hexdigest()==h;listed.append(n)
   assert len(set(listed))==len(listed) and set(listed)==set(names)-{'ci-evidence/INVENTORY.sha256','ci-evidence/UPLOAD_OK'}
   ctx=dict(l.split('=',1) for l in z.read('ci-evidence/run.context').decode().splitlines() if '=' in l);assert ctx['sha']==ctx['head_sha']==sha and ctx['run_id']==str(row['run']) and ctx['run_attempt']=='1' and ctx['grep']=='D10-01|N2-D0|N2-A2' and ctx['repeat']=='1'
   for n in ['ci-evidence/run.log','ci-evidence/run.exit','ci-evidence/REDACTION.txt','ci-evidence/UPLOAD_OK','ci-evidence/release-build-manifest.sha256','test-results/results.json','test-results/.last-run.json']:assert z.read(n)
   res=json.loads(z.read('test-results/results.json'));last=json.loads(z.read('test-results/.last-run.json'));ex=z.read('ci-evidence/run.exit').decode();assert res['errors']==[];assert last['status']==('failed' if res['stats']['unexpected'] else 'passed');assert ex==('exit=1\n' if res['stats']['unexpected'] else 'exit=0\n')
   row.update(context=ctx,stats=res['stats'],last=last,exit=ex.strip(),inventory_complete=True)
   patterns=[r'oobCode=[A-Za-z0-9_-]',r'Bearer [A-Za-z0-9._-]{8,}',r'eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}']
   for n in names:
    if n.endswith(('.json','.log','.txt','.context')):assert not any(re.search(x,z.read(n).decode()) for x in patterns),(a['id'],n)
  out.append(row)
(p/'verified.json').write_text(json.dumps(out,indent=2)+'\n');print('Verified',len(out),'archives,',sum('inventory_complete'in x for x in out),'E2E inventories')
for x in out:
 if 'reasons'in x:print(x['run'],len(x['reasons']),x['gatherErrors'])
