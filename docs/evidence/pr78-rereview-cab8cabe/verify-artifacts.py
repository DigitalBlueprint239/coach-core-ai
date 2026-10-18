import pathlib,json,zipfile,hashlib,re,subprocess
p=pathlib.Path('/workspace/scratch/review78-r4');repo=pathlib.Path('/workspace/coach-core-review78-r4');sha='cab8cabe2baf00b8f3a37a36a88466f5c749613e';meta=json.loads((p/'artifacts.json').read_text());assert meta['total_count']==12
out=[]
for a in meta['artifacts']:
 assert a['workflow_run']['head_sha']==sha and not a['expired']; f=p/f"artifact-{a['id']}.zip";assert a['digest']=='sha256:'+hashlib.sha256(f.read_bytes()).hexdigest() and f.stat().st_size==a['size_in_bytes']
 bucket,project=re.fullmatch(r'e2e-results-(acceptance|diagnostic|obsolete-fault-model)-(.*)-'+sha,a['name']).groups()
 with zipfile.ZipFile(f) as z:
  assert z.testzip() is None;names=set(z.namelist());assert len(names)==len(z.namelist());listed=[]
  for row in z.read('ci-evidence/INVENTORY.sha256').decode().splitlines():
   if not row or row.startswith('#'):continue
   h,n=row.split('  ',1);assert n.startswith('e2e/');n=n[4:];assert hashlib.sha256(z.read(n)).hexdigest()==h;listed.append(n)
  assert len(listed)==10 and len(set(listed))==10 and set(listed)==names-{'ci-evidence/INVENTORY.sha256','ci-evidence/UPLOAD_OK'}
  rel='ci-evidence/release-build/';context=z.read(rel+'release-build.context').decode();manifest=z.read('ci-evidence/release-build-manifest.sha256');h=hashlib.sha256(manifest).hexdigest()
  assert context.split('--- full build manifest (all 11 files) ---\n',1)[1].encode()==manifest
  fields=dict(line.split('=',1) for line in context.splitlines() if '=' in line and not line.startswith('---'))
  assert fields['candidate_sha']==fields['head_sha']==sha and fields['run_id']=='39157201371' and fields['run_attempt']=='1'
  assert fields['job']==f'e2e matrix_project={project} matrix_bucket={bucket}'
  assert fields['build_manifest_sha256']==h and fields['executable_verdict']=='off executor=disabled decline=disabled'
  assert fields['effective_import_config']=='.env.production="false"' and fields['target_project']=='coach-core-mvp-staging-239'
  hashes={row.split('  ',1)[1].removeprefix('./'):row.split('  ',1)[0] for row in manifest.decode().splitlines()}
  retained={n[len(rel):] for n in names if n.startswith(rel) and not n.endswith('release-build.context')}
  assert retained=={'index.html','asset-manifest.json','static/js/main.630c8567.js'}
  for n in retained:assert hashlib.sha256(z.read(rel+n)).hexdigest()==hashes[n]
  html=z.read(rel+'index.html').decode();entries={s.removeprefix('/') for s in re.findall(r'<script[^>]*\ssrc="([^"]+\.js)"',html)}
  asset=json.loads(z.read(rel+'asset-manifest.json'));jsfiles={v.removeprefix('/') for v in asset['files'].values() if v.endswith('.js')};assetentries={v for v in asset['entrypoints'] if v.endswith('.js')}
  assert entries==jsfiles==assetentries=={n for n in retained if n.endswith('.js')}
  assert not any(n.endswith('.map') or pathlib.PurePosixPath(n).name.startswith('.env') for n in names)
  patterns=[r'oobCode=[A-Za-z0-9_-]',r'Bearer [A-Za-z0-9._-]{8,}',r'eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}',r'[?&](?:key|apiKey|token|access_token|id_token|refresh_token)=[^&\s"\[]']
  for n in ['ci-evidence/run.log',*[(rel+x) for x in retained],rel+'release-build.context']:
   assert not any(re.search(pattern,z.read(n).decode()) for pattern in patterns),(a['id'],n)
  assert z.read('ci-evidence/run.exit')==b'exit=0\n'
  results=json.loads(z.read('test-results/results.json'));assert results['stats']['unexpected']==results['stats']['skipped']==results['stats']['flaky']==0
  dest=p/f"extracted-{a['id']}";dest.mkdir(exist_ok=True)
  for n in names:
   assert not n.startswith('/') and '..' not in pathlib.PurePosixPath(n).parts
  z.extractall(dest)
  r=subprocess.run(['node',str(repo/'scripts/security/release-import-config.js'),'scan',str(dest/rel)],capture_output=True,text=True,timeout=20)
  assert r.returncode==0,r.stdout+r.stderr;scan=json.loads(r.stdout)
  assert scan['verdict']=='off' and scan['components'][0]['exec']['executor']['outcome']=='disabled' and scan['components'][0]['exec']['decline']['outcome']=='disabled'
  out.append({'id':a['id'],'name':a['name'],'digest':a['digest'],'archive_inventory_and_retained_hashes_verified':True,'provenance_candidate_run_attempt_matrix_verified':True,'all_entry_and_asset_manifest_js_present':True,'configured_token_scans_clear':True,'retained_files_sorted':sorted(retained),'unretained_build_manifest_files':sorted(set(hashes)-retained),'scan':scan,'stats':results['stats'],'test_exit':0})
(p/'artifact-verification.json').write_text(json.dumps(out,indent=2)+'\n');print('Verified',len(out),'new ZIPs; all12 retained build scans OFF; all4 D10-01 executions pass; each10-file inventory and provenance matched')
