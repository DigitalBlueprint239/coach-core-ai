#!/usr/bin/env python3
"""Original synthetic route diagram. No footage, AI, external assets or people."""
from PIL import Image, ImageDraw, ImageFont
from pathlib import Path
import subprocess, hashlib, json
root=Path(__file__).resolve().parents[2]
out=root/'public/film-a0'; out.mkdir(parents=True,exist_ok=True)
font=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',14)
small=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',11)
w,h,fps,seconds=640,360,15,8
frames=[]
for n in range(fps*seconds):
 im=Image.new('RGB',(w,h),'#102c25'); d=ImageDraw.Draw(im)
 for x in range(40,620,54): d.line((x,65,x,312),fill='#527969',width=1)
 d.line((310,65,310,312),fill='#e7cc67',width=2)
 d.text((18,12),'SYNTHETIC FOOTBALL • OUT ROUTE',font=font,fill='white')
 d.text((18,35),'Diagram only • no athletes • illustrative timing, not game analysis',font=small,fill='#d2e3da')
 offense=[(285,y) for y in [155,175,195,215,235]]+[(250,195),(218,218),(282,85),(282,285),(290,115),(290,263)]
 defense=[(333,y) for y in [150,176,200,225]]+[(370,165),(370,220),(395,85),(395,285),(440,120),(440,250),(450,195)]
 for x,y in offense: d.ellipse((x-6,y-6,x+6,y+6),fill='#f8fafc')
 for x,y in defense: d.line((x-5,y-5,x+5,y+5),fill='#87b9ed',width=2); d.line((x-5,y+5,x+5,y-5),fill='#87b9ed',width=2)
 # Highlighted receiver runs right, then breaks toward the top sideline.
 t=max(0,min(1,(n/fps-1)/5)); x=282+min(t/.65,1)*105; y=85-max(0,(t-.65)/.35)*20
 d.line((282,85,387,85,387,65),fill='#fbbf24',width=3)
 d.ellipse((x-7,y-7,x+7,y+7),fill='#fbbf24')
 d.text((405,70),'Mark the break',font=small,fill='#fbbf24')
 d.text((18,329),f'Demo clock {n/fps:04.1f}s   •   Suggested mark: 3.5–6.0s',font=font,fill='white')
 frames.append(im.tobytes())
raw=b''.join(frames)
formats=[('out-route.mp4',['-c:v','libx264','-profile:v','baseline','-pix_fmt','yuv420p','-crf','24','-movflags','+faststart']),('out-route.webm',['-c:v','libvpx','-b:v','350k','-pix_fmt','yuv420p'])]
manifest={'id':'synthetic-out-route-v1','durationMs':8000,'width':w,'height':h,'fps':fps,'frames':fps*seconds,'source':'Original deterministic Pillow diagram; no people, footage, AI, or third-party visual assets.','generator':'scripts/film-a0/generate-sample.py','toolchain':{'ffmpeg':subprocess.check_output(['ffmpeg','-version'],text=True).splitlines()[0],'pillow':__import__('PIL').__version__},'files':[]}
for name,args in formats:
 subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-f','rawvideo','-pixel_format','rgb24','-video_size',f'{w}x{h}','-framerate',str(fps),'-i','pipe:0','-an',*args,'-map_metadata','-1','-threads','1','-fflags','+bitexact','-flags','+bitexact',str(out/name)],input=raw,check=True)
 data=(out/name).read_bytes(); manifest['files'].append({'name':name,'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest()})
(out/'sample.json').write_text(json.dumps(manifest,indent=2)+'\n')
(root/'src/features/film-analyzer/demo/sample.json').write_text(json.dumps(manifest,indent=2)+'\n')
print(json.dumps(manifest,indent=2))
