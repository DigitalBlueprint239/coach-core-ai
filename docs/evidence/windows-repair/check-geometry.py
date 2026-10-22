from pathlib import Path
import json
r=Path(__file__).parent
for engine in ['chromium','firefox']:
 f=[json.loads((r/f'{engine}-preset-{i}.json').read_text()) for i in range(4)]
 for p in f:
  a=p['players'];assert len(a)==11 and len({v['id'] for v in a})==11;assert len({(v['x'],v['y']) for v in a})==11
  assert all(0<v['x']<600 and 0<v['y']<300 for v in a);assert p['routes']==[]
 shotgun,iform,over,base=[p['players'] for p in f]
 assert sum(p['y']==190 for p in shotgun)==7 and sum(p['y']>190 for p in shotgun)==4
 assert sum(p['position'] in ['X','Z','H','Y'] for p in shotgun)==4 and sum(p['position']=='RB' for p in shotgun)==1
 assert next(p for p in shotgun if p['position']=='QB')['y']==240
 assert [(p['x'],p['y']) for p in iform if p['position'] in ['C','QB','FB','TB']]==[(300,190),(300,198),(300,230),(300,260)]
 assert next(p for p in iform if p['position']=='TE')['x']==360
 assert sum(p['y']==190 for p in iform)==7
 assert [(p['x'],p['y']) for p in over[:4]]==[(250,180),(291,180),(330,180),(370,180)]
 assert [p['position'] for p in over[4:7]]==['W','M','S']
 assert [(p['x'],p['y']) for p in base[:3]]==[(250,180),(300,180),(350,180)]
 assert sum(p['position']=='OLB' for p in base)==2 and sum(p['position']=='ILB' for p in base)==2
 for p in [over,base]:assert sum(v['position'] in ['CB','FS','SS'] for v in p)==4
 print(engine,'PASS: independent counts, distinct alignment anchors, seven offensive LOS markers, under-center axis/depth, Over weak1/strong3, Base5-0-5, defensive personnel, bounds')
