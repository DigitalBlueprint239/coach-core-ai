import subprocess,json,pathlib,concurrent.futures
repo='DigitalBlueprint239/coach-core-ai';p=pathlib.Path('/workspace/scratch/review78-r5');run=39163048438
info=json.loads(subprocess.check_output(['gh','api',f'repos/{repo}/actions/runs/{run}']));assert info['head_sha']=='4f6b901b6c4141f88f5d884af0d67d62b28f40c1' and info['status']=='completed' and info['conclusion']=='failure'
jobs=json.loads(subprocess.check_output(['gh','api',f'repos/{repo}/actions/runs/{run}/jobs?per_page=100']))['jobs'];assert len(jobs)==12
anns=[]
def ann(j):
 d=json.loads(subprocess.check_output(['gh','api',j['check_run_url'].replace('https://api.github.com/','')+'/annotations?per_page=100']))
 return {'job':j['name'],'id':j['id'],'annotations':[{k:x.get(k) for k in ['annotation_level','title','message']} for x in d if x.get('title','').startswith(('E2E','Release')) and not x['title'].startswith('E2E emulator log')]}
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:anns=list(pool.map(ann,jobs))
for j in jobs:
 print(j['name'],j['conclusion'])
 desktop=j['name'] in ['E2E acceptance (chromium)','E2E acceptance (firefox)']
 for s in j['steps']:
  n=s['name']
  if n.startswith(('Reporter self-checks','Evidence self-checks','Release-build proof L1+L2','Finalize evidence','Run actions/upload-artifact')):assert s['conclusion']=='success',(j['name'],n,s['conclusion'])
  if n.startswith(('Release proof L3 (','Release gate - L1','Build same-commit import-OFF')):assert s['conclusion']==('success' if desktop else 'skipped'),(j['name'],n,s['conclusion'])
  if n.startswith('Evidence NOT uploaded'):assert s['conclusion']=='skipped'
for suffix,d in [('jobs',jobs),('annotations',anns),('info',{k:info.get(k) for k in ['id','name','head_sha','head_branch','event','status','conclusion','html_url','created_at','updated_at','run_started_at','run_attempt']})]:(p/f'run-{run}-{suffix}.json').write_text(json.dumps(d,indent=2)+'\n')
print('All12 finalization/uploads succeeded; two desktop L3/gate steps succeeded, ten explicitly skipped')
