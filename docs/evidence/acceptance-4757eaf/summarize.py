from pathlib import Path
import json, re
root=Path(__file__).resolve().parent/'acceptance-4757eaf-healthy-runs'
summary={'candidate':'4757eaffad31664dae727c34355aca8109fcc63c','runner':'Codex; unchanged Claude-authored acceptance suite','runs':[],'anchors':{},'failures':[]}
def specs(suite):
    yield from suite.get('specs',[])
    for child in suite.get('suites',[]): yield from specs(child)
for run in sorted(root.glob('run-*')):
    file=run/'results.json'
    if not file.exists(): continue
    data=json.loads(file.read_text(encoding='utf-8'))
    row={'run':run.name,'stats':data['stats'],'engines':{}}
    for suite in data.get('suites',[]):
      for spec in specs(suite):
        for test in spec.get('tests',[]):
          engine=test['projectName']; results=test.get('results',[])
          status=results[-1]['status'] if results else 'NOT_RUN'
          counts=row['engines'].setdefault(engine,{})
          counts[status]=counts.get(status,0)+1
          assert len(results)==1, ('unexpected retries',run.name,spec['title'])
          assert results[0].get('retry',0)==0
          if status!='passed':
            summary['failures'].append({'run':run.name,'engine':engine,'title':spec['title'],'status':status,'file':spec.get('file'),'line':spec.get('line')})
          match=re.match(r'^(CC-P[0-9]+b?|CC-L[01]|D10-[0-9]+[a-z]?|E2E-A10)',spec['title'])
          if match:
            key=match.group(0)+':'+engine
            metric=summary['anchors'].setdefault(key,{'passed':0,'failed':0,'other':0})
            metric['passed' if status=='passed' else 'failed' if status in ['failed','timedOut'] else 'other']+=1
    summary['runs'].append(row)
(root/'summary.json').write_text(json.dumps(summary,indent=2)+'\n',encoding='utf-8',newline='\n')
print(json.dumps({'completedRuns':len(summary['runs']),'runs':summary['runs']},indent=2))
