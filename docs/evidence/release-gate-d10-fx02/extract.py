import zipfile,json,re,hashlib,pathlib,argparse
parser=argparse.ArgumentParser(description='Read-only redacted extraction; no network or browser replay.')
parser.add_argument('--fx',required=True)
parser.add_argument('--d10',required=True)
parser.add_argument('--output',required=True)
args=parser.parse_args()
OUT=pathlib.Path(args.output);OUT.mkdir(parents=True,exist_ok=True)
FX=pathlib.Path(args.fx);D10=pathlib.Path(args.d10)
assert hashlib.sha256(FX.read_bytes()).hexdigest()=='dcc5b745bff5f31d8ff7659a89dc038dcb6633785b7c447e32286f028382cbb0','Unexpected FX02 source'
def clean(s):
 s=re.sub(r'[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}', '[EMAIL REDACTED]',s)
 s=re.sub(r'eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+','[TOKEN REDACTED]',s)
 s=re.sub(r'(?i)(oobCode|apiKey|access_token|refresh_token|id_token)=([^&\s"<>]+)',r'\1=[REDACTED]',s)
 return s
attrs={'id','class','role','type','name','disabled','aria-label','aria-hidden','hidden','tabindex','checked','autocomplete','placeholder'}
def records(path):
 with zipfile.ZipFile(path) as z:
  return [(n,[json.loads(l) for l in z.read(n).decode().splitlines()]) for n in z.namelist() if n.endswith('.trace')]
def decoded_snaps(rows):
 groups={}
 for r in rows:
  if r.get('type')!='frame-snapshot':continue
  s=r['snapshot'];g=groups.setdefault(s['frameId'],[]);g.append(s);i=len(g)-1
  def nodes(x):
   out=[]
   def visit(n):
    if isinstance(n,str):out.append(n)
    elif isinstance(n,list) and n and isinstance(n[0],str):
     for c in n[2:]:visit(c)
     out.append(n)
   visit(x['html']);return out
  def resolve(n,idx):
   if isinstance(n,str):return n
   if isinstance(n,list) and not n:return ''
   if isinstance(n,list) and n and isinstance(n[0],list):
    ref=idx-n[0][0];return resolve(nodes(g[ref])[n[0][1]],ref)
   if isinstance(n,list):return [n[0],n[1] if len(n)>1 else {},*[resolve(c,idx) for c in n[2:]]]
   return n
  yield s,resolve(s['html'],i)
def sanitize(n):
 if isinstance(n,str):return clean(n)
 if not isinstance(n,list) or not n:return ''
 if n[0] in ['SCRIPT','STYLE','HEAD','LINK','META']:return ''
 return [n[0],{k:clean(str(v)) for k,v in n[1].items() if k in attrs},*[sanitize(c) for c in n[2:]]]
def text(n):
 if isinstance(n,str):return n
 return ' '.join(text(c) for c in n[2:]) if isinstance(n,list) else ''
def write(name,obj):(OUT/name).write_text(json.dumps(obj,indent=2,ensure_ascii=True)+'\n',encoding='utf-8')
for _,rows in records(FX):
 logs=[{k:r[k] for k in ['time','message']} for r in rows if r.get('type')=='log' and r.get('callId')=='fcwl@56']
 if logs:write('fx02-action-log.json',{'sourceSha256':hashlib.sha256(FX.read_bytes()).hexdigest(),'callId':'fcwl@56','logs':logs})
 for s,tree in decoded_snaps(rows):
  if s.get('callId')=='fcwl@56' and s.get('phase')=='before':
   write('fx02-before-dom.json',{'sourceSha256':hashlib.sha256(FX.read_bytes()).hexdigest(),'callId':s['callId'],'phase':s['phase'],'timestamp':s['timestamp'],'redaction':'attribute allowlist; no input values, URLs, scripts, styles, headers or bodies; emails/tokens redacted','dom':sanitize(tree)})
for _,rows in records(D10):
 snapshots=[];actions=[]
 for s,tree in decoded_snaps(rows):
  if 30090<s['timestamp']<30200:
   snapshots.append({'callId':s.get('callId'),'phase':s.get('phase'),'time':s['timestamp'],'bodyText':text(sanitize(tree))})
 for r in rows:
  if r.get('type') in ['before','after'] and (30040<r.get('startTime',0)<30140 or 30040<r.get('endTime',0)<30140):
   item={k:r[k] for k in ['type','callId','method','startTime','endTime'] if k in r}
   if 'params' in r:
    item['operation']=clean(str(r['params'].get('selector',r['params'].get('expression',''))))[:220]
   actions.append(item)
 if snapshots:write('d10-return-timeline.json',{'traceSha256':hashlib.sha256(D10.read_bytes()).hexdigest(),'actions':actions,'snapshots':snapshots})
print('Redacted FX02 logs/DOM and D10 timeline written')

census=[]
for _,rows in records(FX):
 for snap,tree in decoded_snaps(rows):
  if snap.get('isMainFrame') and 109000<snap['timestamp']<162600:
   buttons=[]
   def visit(n):
    if isinstance(n,list):
     if n[0]=='BUTTON' and text(n)=='Email me a sign-in link':buttons.append({'disabled': 'disabled' in n[1]})
     for c in n[2:]:visit(c)
   visit(tree)
   census.append({'time':snap['timestamp'],'callId':snap.get('callId'),'phase':snap.get('phase'),'emailLinkButtons':buttons})
write('fx02-snapshot-census.json',census)
