import subprocess,json,pathlib,concurrent.futures,sys
repo='DigitalBlueprint239/coach-core-ai'; folder=pathlib.Path('/workspace/scratch/review78-r3')
for run in map(int,sys.argv[1:]):
 info=json.loads(subprocess.check_output(['gh','api',f'repos/{repo}/actions/runs/{run}']))
 assert info['head_sha']=='d14aa7bb9ec4442c3acca26b127b17f4194cbd64'
 assert info['status']=='completed'
 jobs=json.loads(subprocess.check_output(['gh','api',f'repos/{repo}/actions/runs/{run}/jobs?per_page=100']))['jobs']
 assert len(jobs)==12
 def getannotations(j):
  data=json.loads(subprocess.check_output(['gh','api',j['check_run_url'].replace('https://api.github.com/','')+'/annotations?per_page=100']))
  return {'job':j['name'],'job_id':j['id'],'annotations':[{k:a.get(k) for k in ['annotation_level','title','message']} for a in data if a.get('title','').startswith(('E2E','Release-')) and not a['title'].startswith('E2E emulator log')]}
 with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool: annotations=list(pool.map(getannotations,jobs))
 for j in jobs:
  for step in j['steps']:
   n=step['name']
   if n.startswith(('Reporter self-checks','Evidence self-checks','Release-build proof','Finalize evidence','Run actions/upload-artifact')):assert step['conclusion']=='success',(j['name'],n,step['conclusion'])
   if n.startswith('Evidence NOT uploaded'):assert step['conclusion']=='skipped'
 for suffix,data in [('jobs',jobs),('annotations',annotations),('info',{k:info.get(k) for k in ['id','name','head_sha','head_branch','event','status','conclusion','html_url','created_at','updated_at','run_started_at','run_attempt']})]:
  (folder/f'run-{run}-{suffix}.json').write_text(json.dumps(data,indent=2)+'\n')
 print(run, info['conclusion'],len(jobs),'jobs;',sum(len(a['annotations']) for a in annotations),'retained relevant annotations')
 for a in annotations:
  print(a['job'],[(x['title'],x['annotation_level']) for x in a['annotations'] if 'selected' in x['title'] or 'passed /' in x['title']])
