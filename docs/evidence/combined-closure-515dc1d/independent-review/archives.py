import json,zipfile,hashlib,pathlib,stat,sys,re
root=pathlib.Path('/workspace/scratch/combined-closure')
meta=json.loads(pathlib.Path(sys.argv[1]).read_text()); arts=meta['artifacts'] if isinstance(meta,dict) else meta
out=[]
for a in arts:
 p=root/f'artifact-{a["id"]}.zip'
 if not p.exists():continue
 data=p.read_bytes(); h=hashlib.sha256(data).hexdigest();assert a['digest']=='sha256:'+h;assert a['size_in_bytes']==len(data)
 with zipfile.ZipFile(p) as z:
  names=z.namelist();assert len(set(names))==len(names)
  for i in z.infolist():
   n=i.filename;assert not n.startswith('/') and '..' not in pathlib.PurePosixPath(n).parts and '\\' not in n
   assert not stat.S_ISLNK(i.external_attr>>16)
  files={n:z.read(n) for n in names if not n.endswith('/')};row={'id':a['id'],'name':a['name'],'archive_sha256':h,'files':len(files)}
  if a['name'].startswith('e2e-results-'):
   inv={}
   for line in files['ci-evidence/INVENTORY.sha256'].decode().splitlines():
    if not line or line.startswith('#'):continue
    m=re.fullmatch(r'([0-9a-f]{64})  e2e/(.+)',line);assert m,line
    dig,n=m.groups();assert n not in inv;inv[n]=dig;assert hashlib.sha256(files[n]).hexdigest()==dig,n
   excluded={'ci-evidence/INVENTORY.sha256','ci-evidence/UPLOAD_OK'};assert set(inv)==set(files)-excluded,(set(inv)^set(files)-excluded)
   ctx=dict(l.split('=',1) for l in files['ci-evidence/run.context'].decode().splitlines() if '=' in l)
   assert ctx['sha']=='950addf164e4f789c6488bf5af7dd60dc2e43ce8';assert ctx['head_sha']=='515dc1d92bf237dae4d70ff2cc38c2aee07d5ae1';assert ctx['event']=='pull_request';assert ctx['run_id']=='39268393120';assert ctx['run_attempt']=='1';assert ctx['grep']=='';assert ctx['repeat']=='1'
   row.update(context=ctx,inventory_files=len(inv),run_exit=files['ci-evidence/run.exit'].decode().strip(),last_run=json.loads(files['test-results/.last-run.json']))
   if 'ci-evidence/release-gate.json' in files:row['release_gate']=json.loads(files['ci-evidence/release-gate.json'])
   if 'ci-evidence/release-build/release-build.context' in files:
    prov=files['ci-evidence/release-build/release-build.context'].decode();row['provenance']=prov
    for expected in ['candidate_sha='+ctx['sha'],'head_sha='+ctx['head_sha'],'run_id='+ctx['run_id'],'run_attempt='+ctx['run_attempt']]:assert expected in prov
    manifest=files['ci-evidence/release-build-manifest.sha256'];assert 'build_manifest_sha256='+hashlib.sha256(manifest).hexdigest() in prov
    mfiles={}
    for line in manifest.decode().splitlines():
     dig,n=line.split('  ',1);mfiles[n.removeprefix('./')]=dig
    retained={n.removeprefix('ci-evidence/release-build/') for n in files if n.startswith('ci-evidence/release-build/static/js/')}
    assert retained=={n for n in mfiles if n.startswith('static/js/') and n.endswith('.js')}
    for n in ['index.html','asset-manifest.json',*retained]:assert hashlib.sha256(files['ci-evidence/release-build/'+n]).hexdigest()==mfiles[n]
    row['retained_release_js']=sorted(retained)
    row['release_manifest_files']=len(mfiles)
  out.append(row)
pathlib.Path('/workspace/scratch/combined-independent/archives.json').write_text(json.dumps(out,indent=2));print(f'Independently verified {len(out)} archives')
