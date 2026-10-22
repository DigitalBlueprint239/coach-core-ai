"""Build a deterministic Windows repair ZIP from the emulator-only CRA artifact.
No local export, credentials, dependencies, or operator runtime data are included.
"""
from pathlib import Path
import zipfile,json,hashlib,subprocess,shutil,os
root=Path(__file__).resolve().parent.parent
out=Path(os.environ.get('REPAIR_PACKAGE_OUT','/workspace/CoachCore-Windows-Repair-2026.10.22-r1.zip'))
stage=out.parent/'windows-repair-package';shutil.rmtree(stage,ignore_errors=True);stage.mkdir()
base=root/'docs/evidence/windows-main-local/CoachCore-Main-Local-Windows.zip'
with zipfile.ZipFile(base) as z:
 for n in z.namelist():
  p=Path(n)
  if p.is_absolute() or '..' in p.parts:raise ValueError('Unsafe baseline archive')
  if not n.startswith('app/') and n!='package-manifest.json':z.extract(n,stage)
shutil.copytree(root/'e2e/.app-build',stage/'app')
for n in ['start.cjs','update.cjs','UPDATE-EXISTING.cmd']:
 shutil.copyfile(root/'tools/windows-main-demo'/n,stage/n)
shutil.copyfile(root/'tools/windows-main-demo/REPAIR-READ-ME.txt',stage/'READ-ME-FIRST.txt')
shutil.copyfile(root/'docs/WINDOWS_REPAIR.md',stage/'README.md')
sha=subprocess.check_output(['git','rev-parse','HEAD'],cwd=root,text=True).strip()
(stage/'VERSION.txt').write_text('Coach Core Windows local repair 2026.10.22-r1\nApplication source: '+sha+'\n')
(stage/'app/local-version.json').write_text(json.dumps({'version':'2026.10.22-r1','source':sha,'project':'demo-coach-core-e2e','ai':False,'filmBackend':False},indent=2)+'\n')
evidence=root/'docs/evidence/windows-repair'
if (evidence/'REPORT.md').exists():
 (stage/'verification').mkdir();shutil.copyfile(evidence/'REPORT.md',stage/'verification/REPORT.md')
 screenshots=stage/'verification/screenshots';screenshots.mkdir()
 for p in evidence.glob('*.png'):shutil.copyfile(p,screenshots/p.name)
files=[{'path':p.relative_to(stage).as_posix(),'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in sorted(stage.rglob('*')) if p.is_file()]
manifest={'version':'2026.10.22-r1','applicationSource':sha,'baselineApplicationSource':'0dc94c4c6121aa379fb3e612b7d738a140f56ec6','configuration':{'project':'demo-coach-core-e2e','emulators':True,'legacyImport':False,'ai':False,'filmBackend':False},'files':files}
(stage/'package-manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
with zipfile.ZipFile(out,'w',zipfile.ZIP_DEFLATED,compresslevel=9) as z:
 for p in sorted(stage.rglob('*')):
  if p.is_file():
   n=p.relative_to(stage).as_posix();assert not set(Path(n).parts)&{'.local-state','node_modules','.cli-config'}
   info=zipfile.ZipInfo(n,(2026,10,22,0,0,0));info.compress_type=zipfile.ZIP_DEFLATED;info.external_attr=0o100644<<16;z.writestr(info,p.read_bytes())
print(json.dumps({'path':str(out),'bytes':out.stat().st_size,'sha256':hashlib.sha256(out.read_bytes()).hexdigest(),'source':sha,'files':len(files)+1},indent=2))
