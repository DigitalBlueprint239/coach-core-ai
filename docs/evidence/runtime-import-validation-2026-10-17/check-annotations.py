import json,re,pathlib,zipfile,hashlib
p=pathlib.Path('/workspace/scratch/runtime-validation'); reports=json.loads((p/'runtime-archive-verification.json').read_text());out=[]
for run in [39079505765,39079835692]:
 annotations=json.loads((p/f'run-{run}-annotations.json').read_text());grep='D10-08[a-d]' if run==39079505765 else 'D10-'
 for j in annotations:
  m=re.fullmatch(r'E2E (acceptance|diagnostic|obsolete-fault-model) \((.*)\)',j['job']);bucket,project=m.groups()
  r=next(x for x in reports if x['run']==run and x['name']==f'e2e-results-{bucket}-{project}-61448f0feee198a8796f4077f32a52f7b863f90d')
  count=sum(len(t['executions']) for t in r['tests']);a=j['annotations']
  report=next(x for x in a if x['title'].startswith(f'E2E {project} [{bucket}]:'))
  assert report['annotation_level']=='notice'
  if not count:
   assert '0 tests selected (empty selection; nothing ran)' in report['title']
   assert all(s in report['message'] for s in [f'project "{project}"',f'bucket "{bucket}"',f'grep "{grep}"','0 executed, 0 passed, 0 failed','not a passing test result'])
  else:assert f'{count} passed / 0 failed / 0 blocked / 0 skipped' in report['title']
  manifest=next(x for x in a if x['title'].startswith('E2E artifact manifest'))
  inventory=next(x for x in a if x['title'].startswith('E2E evidence inventory'))
  release=next(x for x in a if x['title'].startswith('Release-build proof'))
  assert ': 13 passed' in release['title'] and release['annotation_level']=='notice'
  with zipfile.ZipFile(p/f"runtime-{r['id']}.zip") as z:
   h=hashlib.sha256(z.read('test-results/results.json')).hexdigest()[:16]
   assert f'results.json={h}' in manifest['message'] and f'executions_in_results_json={count}' in manifest['message']
   rows=[s for s in z.read('ci-evidence/INVENTORY.sha256').decode().splitlines() if s and not s.startswith('#')]
   assert inventory['message'].startswith(str(len(rows))+' files;') and 'UPLOAD_OK present' in inventory['message']
  assert not any(x['annotation_level']=='failure' for x in a)
  out.append({'run':run,'job':j['job'],'executions':count,'reporter_annotation_matches_results':True,'dispatch_filters_in_empty_annotation':not count,'artifact_manifest_matches_uploaded_results':True,'inventory_annotation_matches_retained_inventory':True,'release_proof_13_passed':True})
(p/'annotation-verification.json').write_text(json.dumps(out,indent=2)+'\n')
print('Verified all',len(out),'jobs: selected/empty annotations, manifest digests/execution counts, inventory and release proof')
