import pathlib,subprocess,tempfile,tarfile,io,os,json,collections
root=pathlib.Path('/workspace/coach-core-review77'); scratch=pathlib.Path('/workspace/scratch/review77')
base='efc9116cf93c5d235b0b2edeb4d7be03a4e73cdc'; accepted='efc9116cf93c5d235b0b2edeb4d7be03a4e73cdc'
tmp=pathlib.Path(tempfile.mkdtemp(prefix='runtime-membership-',dir='/workspace/scratch'))
tarfile.open(fileobj=io.BytesIO(subprocess.check_output(['git','archive',base,'e2e'],cwd=root))).extractall(tmp,filter='data')
(tmp/'e2e/node_modules').symlink_to(root/'e2e/node_modules',target_is_directory=True)
cli=str(root/'e2e/node_modules/@playwright/test/cli.js')
def listing(folder,bucket=None,grep=None):
 env=dict(os.environ)
 for k in ['E2E_BUCKET','E2E_GREP','E2E_SKIP_FIREFOX','E2E_SKIP_PHONE']:env.pop(k,None)
 if bucket:env['E2E_BUCKET']=bucket
 if grep:env['E2E_GREP']=grep
 p=subprocess.run(['node',cli,'test','-c','playwright.config.ts','--list','--pass-with-no-tests','--reporter=json'],cwd=folder/'e2e',env=env,capture_output=True,text=True)
 if p.returncode:raise RuntimeError(p.stderr[:500]+p.stdout[-500:])
 data=json.loads(p.stdout); out=[]
 def walk(s,parents):
  for spec in s.get('specs',[]):
   for test in spec['tests']:out.append((test['projectName'],spec['file'],spec['line'],' / '.join(parents+[spec['title']])))
  for child in s.get('suites',[]):walk(child,parents+[child['title']])
 for s in data['suites']:walk(s,[])
 return out
old=listing(tmp); new=listing(root)
assert sorted(old)==sorted(new)
buckets={b:listing(root,b) for b in ['acceptance','diagnostic','obsolete-fault-model']}
union=[t for v in buckets.values() for t in v]
assert collections.Counter(new)==collections.Counter(union) and len(union)==len(set(union))
report={'base':base,'accepted_ci_base':accepted,'head':subprocess.check_output(['git','rev-parse','HEAD'],cwd=root,text=True).strip(),'base_equals_head_membership':True,'complete_nonoverlapping_buckets':True,'project_counts':dict(collections.Counter(t[0] for t in new)),'bucket_counts':{b:dict(collections.Counter(t[0] for t in v)) for b,v in buckets.items()},'dispatch_counts':{},'test_identities':new}
for grep in ['D10-08[a-d]','D10-']:
 vals={b:listing(root,b,grep) for b in buckets}
 report['dispatch_counts'][grep]={b:dict(collections.Counter(t[0] for t in v)) for b,v in vals.items()}
(scratch/'membership.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps({k:v for k,v in report.items() if k!='test_identities'},indent=2))
