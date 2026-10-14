import type { PracticePlanResult } from '../../services/coach-ai-client';
export type Value = string | number | boolean | null | Value[] | {[key:string]:Value};
export type Fields = {[key:string]:Value};
export type Kind = 'plays' | 'practicePlans';
export interface Scope { uid:string; teamId:string }
export interface RecordData { id:string; revision:number|null; fields:Fields; createdAt:string; updatedAt:string }
export interface Draft { scope:Scope; kind:Kind; id:string; expectedRevision:number|null; fields:Fields; pending:boolean;writer?:string }
export const equal = (a:unknown,b:unknown):boolean => {
  const sort=(v:unknown):unknown => Array.isArray(v)?v.map(sort):v && typeof v==='object'
    ? Object.fromEntries(Object.keys(v).sort().map(k=>[k,sort((v as {[key:string]:unknown})[k])])):v;
  return JSON.stringify(sort(a))===JSON.stringify(sort(b));
};
const fail=(s:string):never=>{throw new Error(s);};
const object=(v:Value):Fields=>v && typeof v==='object'&&!Array.isArray(v)?v:fail('Expected an object.');
const list=(v:Value,max:number,label:string):Value[]=>Array.isArray(v)&&v.length<=max?v:fail(`${label}: maximum ${max} items.`);
const text=(v:Value,min:number,max:number,label:string)=>{if(typeof v!=='string'||v.length<min||v.length>max)fail(`${label}: ${min}–${max} characters.`);};
const number=(v:Value,max:number,label:string)=>{if(typeof v!=='number'||!Number.isFinite(v)||v<0||v>max)fail(`${label}: 0–${max}.`);};
export function validate(kind:Kind,f:Fields):void {
  text(f.name,1,kind==='plays'?120:200,'Name');
  const allowed=kind==='plays'?['name','formation','description','routes','players','tags','difficulty','sport','phase','type','localId']
    :['name','date','duration','periods','goals','notes','source','aiRequestId','safetyConsiderations','ageGroup','skillLevel','contactLevel','hydrationBreakMinutes'];
  if(Object.keys(f).some(k=>!allowed.includes(k)))fail('Unsupported fields. Keep/export this draft; no data was removed.');
  if(new TextEncoder().encode(JSON.stringify(f)).length>900000)fail('This document is too large to save safely. Export and split it.');
  if(kind==='plays') {
    if(f.phase!==undefined&&!['offense','defense','special_teams'].includes(String(f.phase)))fail('Choose a valid phase.');
    if(f.type!==undefined)text(f.type,0,40,'Type');
    const players=list(f.players??[],30,'Players'); const ids=new Set<string>();
    players.forEach(v=>{const p=object(v);text(p.id,1,128,'Player ID');if(ids.has(String(p.id)))fail('Duplicate player ID.');ids.add(String(p.id));
      if(!Number.isFinite(p.x)||!Number.isFinite(p.y))fail('Player coordinates must be finite.');});
    list(f.routes??[],60,'Routes').forEach(v=>{const r=object(v);if(!ids.has(String(r.playerId)))fail('Route refers to a missing player.');
      list(r.points??r.path??[],2000,'Route points').forEach(v=>{const p=object(v);if(!Number.isFinite(p.x)||!Number.isFinite(p.y))fail('Invalid route coordinates.');});});
  } else {
    if(f.duration!==undefined)number(f.duration,600,'Duration');
    if(f.notes!==undefined)text(f.notes,0,5000,'Notes');
    if(f.source!==undefined&&!['ai','manual'].includes(String(f.source)))fail('Invalid source.');
    if(f.ageGroup!==undefined&&!['6U','8U','10U','12U','14U','HS_JV','HS_VARSITY','ADULT'].includes(String(f.ageGroup)))fail('Invalid age group.');
    if(f.skillLevel!==undefined&&!['beginner','intermediate','advanced'].includes(String(f.skillLevel)))fail('Invalid skill level.');
    if(f.contactLevel!==undefined&&!['non_contact','limited_contact','full_contact'].includes(String(f.contactLevel)))fail('Invalid contact level.');
    if(f.aiRequestId!==undefined)text(f.aiRequestId,1,64,'AI request ID');
    list(f.hydrationBreakMinutes??[],20,'Hydration breaks').forEach(v=>number(v,240,'Hydration break'));
    list(f.safetyConsiderations??[],20,'Safety').forEach(v=>text(v,0,500,'Safety note'));
    list(f.goals??[],20,'Goals');
    list(f.periods??[],40,'Periods').forEach(v=>{const p=object(v);number(p.durationMinutes??p.duration??0,p.kind==='period'?180:600,'Period duration');
      if(p.activities!==undefined)list(p.activities,10,'Activities').forEach(v=>{const a=object(v);number(a.durationMinutes,60,'Activity duration');});
      if(p.drills!==undefined)list(p.drills,10,'Drills').forEach(v=>{const d=object(v);number(d.durationMinutes??d.duration??0,120,'Drill duration');});});
  }
}
export function planFromResult(result:PracticePlanResult,requestId:string,skillLevel:string,contactLevel:string):Fields {
  const fields={name:result.title,duration:result.totalMinutes,ageGroup:result.ageGroup,skillLevel,contactLevel,source:'ai',aiRequestId:requestId,
    periods:[{kind:'warmup',name:'Warm-up',...result.warmup},...result.periods.map(p=>({kind:'period',...p})),{kind:'cooldown',name:'Cool-down',...result.cooldown}],
    hydrationBreakMinutes:result.hydrationBreakMinutes,safetyConsiderations:result.safetyConsiderations,notes:result.notes} as unknown as Fields;
  validate('practicePlans',fields);return fields;
}
export const emptyPlan:Fields={name:'New practice',date:'',duration:60,ageGroup:'10U',skillLevel:'beginner',contactLevel:'non_contact',source:'manual',goals:[],notes:'',
  periods:[{kind:'warmup',name:'Warm-up',durationMinutes:10,activities:[]},{kind:'period',name:'Skills',focus:'',durationMinutes:40,drills:[]},{kind:'cooldown',name:'Cool-down',durationMinutes:10,activities:[]}],hydrationBreakMinutes:[],safetyConsiderations:[]};
