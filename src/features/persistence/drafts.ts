import {Draft,Scope,Kind} from './model';
export const key=(s:Scope,k:Kind)=>`coachcore:v1:${s.uid}:${s.teamId}:drafts:${k}`;
export function readDraft(s:Scope,k:Kind,storage:Storage=localStorage):Draft|null {
  const raw=storage.getItem(key(s,k));if(!raw)return null;
  const d:Draft=JSON.parse(raw);if(d.scope.uid!==s.uid||d.scope.teamId!==s.teamId||d.kind!==k)throw new Error('Draft belongs to another scope. It was not loaded.');return d;
}
export function writeDraft(d:Draft,storage:Storage=localStorage):void {
  if(storage.getItem(key(d.scope,d.kind)))readDraft(d.scope,d.kind,storage); // never overwrite a corrupt/foreign envelope.
  storage.setItem(key(d.scope,d.kind),JSON.stringify(d));
}
export function scopedDrafts(uid:string,storage:Storage=localStorage):Draft[]{
  const entries:Draft[]=[];for(let i=0;i<storage.length;i++){const name=storage.key(i);if(name?.startsWith(`coachcore:v1:${uid}:`)&&/\:drafts\:(plays|practicePlans)$/.test(name)){
    const d:Draft=JSON.parse(storage.getItem(name)!);if(d.scope.uid!==uid||key(d.scope,d.kind)!==name)throw new Error('Invalid recovery envelope.');entries.push(d);}}
  return entries;
}
