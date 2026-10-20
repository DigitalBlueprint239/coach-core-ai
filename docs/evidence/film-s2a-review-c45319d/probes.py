#!/usr/bin/env python3
# Review-only probes; no implementation/assertion changes. Arguments: checkout artifact.
import pathlib,subprocess,json,sys,collections
root=pathlib.Path(sys.argv[1]).resolve(); art=pathlib.Path(sys.argv[2]).resolve()
ff=art/'out/bin/ffmpeg'; fp=art/'out/bin/ffprobe'; fx=root/'tools/ffmpeg/fixtures/frozen'
report={}
p=subprocess.run([str(fp),'-v','error','-select_streams','v','-show_entries','frame=best_effort_timestamp_time','-of','json',str(fx/'s3-vfr.mp4')],capture_output=True,text=True,timeout=20)
frames=json.loads(p.stdout)['frames']; pts=[float(f['best_effort_timestamp_time']) for f in frames]
deltas=collections.Counter(round(b-a,5) for a,b in zip(pts,pts[1:]))
report['vfr']={'frames':len(pts),'deltas':dict(deltas),'actuallyVariable':len(deltas)>1}
try: json.loads((art/'provenance/build.json').read_text());report['buildJson']={'valid':True}
except ValueError as e:report['buildJson']={'valid':False,'error':str(e)}
p=subprocess.run(['node','-e','console.log(JSON.stringify(process.argv.slice(1)))','--disable-everything'],capture_output=True,text=True,timeout=10)
report['flagsSerialization']={'exit':p.returncode,'stderr':p.stderr.strip()}
report['fixtures']={}
for name in ['s4-hevc.mp4','s5-truncated.mp4','s5-spoofed.mp4','s5-empty.mp4','s9-wrong-container.webm']:
 p=subprocess.run([str(fp),'-v','error','-show_format','-show_streams','-of','json',str(fx/name)],capture_output=True,text=True,timeout=20)
 d=subprocess.run([str(ff),'-v','error','-xerror','-i',str(fx/name),'-f','null','-'],capture_output=True,text=True,timeout=20)
 report['fixtures'][name]={'probeExit':p.returncode,'decodeExit':d.returncode,'decodeError':d.stderr[-600:]}
print(json.dumps(report,indent=2))
