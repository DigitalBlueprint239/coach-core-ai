import {Draft,Scope,Kind} from './model';
export const key=(s:Scope,k:Kind,writer?:string)=>`coachcore:v1:${s.uid}:${s.teamId}:drafts:${k}${writer?':'+writer:''}`;
export function readDraft(s:Scope,k:Kind,storage:Storage=localStorage,writer?:string):Draft|null {
  const raw=storage.getItem(key(s,k,writer));if(!raw)return null;
  const d:Draft=JSON.parse(raw);
  if(!d||!d.scope||typeof d.id!=='string'||!d.id||typeof d.pending!=='boolean'||!d.fields||typeof d.fields!=='object'||Array.isArray(d.fields)
    || !(d.expectedRevision===null||Number.isInteger(d.expectedRevision)&&d.expectedRevision>=0))throw new Error('Invalid recovery envelope. Original retained.');
  if(d.scope.uid!==s.uid||d.scope.teamId!==s.teamId||d.kind!==k||d.writer!==writer)throw new Error('Draft belongs to another scope. It was not loaded.');
  for(const field of k==='plays'?['players','routes']:['periods'])if(d.fields[field]!==undefined&&!Array.isArray(d.fields[field]))throw new Error('Invalid draft list. Original retained.');
  return d;
}
export function writeDraft(d:Draft,storage:Storage=localStorage):void {
  if(storage.getItem(key(d.scope,d.kind,d.writer)))readDraft(d.scope,d.kind,storage,d.writer); // never overwrite a corrupt/foreign envelope.
  storage.setItem(key(d.scope,d.kind,d.writer),JSON.stringify(d));
}
export function scopedDrafts(uid:string,storage:Storage=localStorage):Draft[]{
  const entries:Draft[]=[];for(let i=0;i<storage.length;i++){const name=storage.key(i);if(name?.startsWith(`coachcore:v1:${uid}:`)&&/\:drafts\:(plays|practicePlans)(:[^:]+)?$/.test(name)){
    const d:Draft=JSON.parse(storage.getItem(name)!);if(d.scope.uid!==uid||key(d.scope,d.kind,d.writer)!==name)throw new Error('Invalid recovery envelope.');readDraft(d.scope,d.kind,storage,d.writer);entries.push(d);}}
  return entries;
}
