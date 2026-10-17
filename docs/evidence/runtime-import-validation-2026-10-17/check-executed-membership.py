import pathlib,json,re,collections
p=pathlib.Path('/workspace/scratch/runtime-validation'); m=json.loads((p/'membership.json').read_text()); a=json.loads((p/'runtime-archive-verification.json').read_text());summary=[]
for row in a:
 match=re.fullmatch(r'e2e-results-(acceptance|diagnostic|obsolete-fault-model)-(.*)-61448f0feee198a8796f4077f32a52f7b863f90d',row['name']); assert match
 bucket,project=match.groups();repeat=10 if row['run']==39079505765 else 1; grep=r'D10-08[a-d]' if repeat==10 else r'D10-'
 expected=collections.Counter({(x[0],x[1],x[2]):repeat for x in m['test_identities'] if x[0]==project and re.search(grep,x[3]) and bucket=='acceptance'})
 actual=collections.Counter()
 for t in row['tests']:
  assert t['status']=='expected' and len(t['executions'])==1
  for r in t['executions']:
   assert r['status']=='passed' and r['retry']==0
   actual[(t['project'],t['file'],t['line'])]+=1
 assert actual==expected,(row['name'],actual,expected)
 assert row['test_exit']=='exit=0'
 assert row['stats']['unexpected']==row['stats']['skipped']==row['stats']['flaky']==0
 assert row['result_config']['workers']==1 and row['result_config']['fullyParallel']==False
 selected=next(x for x in row['result_config']['projects'] if x['name']==project)
 assert (selected['retries'],selected['timeout'])==(0,60000)
 if expected: assert selected['repeatEach']==repeat
 else: assert selected['repeatEach'] in [1,repeat]
 summary.append({'run':row['run'],'bucket':bucket,'project':project,'selected_unique_tests':len(expected),'executions':sum(actual.values()),'identity_and_repetition_match':True,'retry_timeout_workers_match':True,'requested_repeat':repeat,'json_project_repeatEach':selected['repeatEach'],'all_passed':True})
(p/'executed-membership-verification.json').write_text(json.dumps(summary,indent=2)+'\n')
for run in [39079505765,39079835692]:
 vals=[x for x in summary if x['run']==run];print(run,len(vals),'jobs',sum(x['executions'] for x in vals),'passing executions',sum(x['executions']==0 for x in vals),'genuinely empty jobs')
