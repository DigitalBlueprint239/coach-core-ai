import React from 'react';
import {Value,Fields} from './model';
const label=(s:string)=>s.replace(/([A-Z])/g,' $1').replace(/^./,c=>c.toUpperCase());
const template=(name:string):Value=>name==='periods'?{kind:'period',name:'New period',focus:'',durationMinutes:10,drills:[]}
  :name==='drills'?{name:'New drill',durationMinutes:5,setup:'',instructions:'',coachingPoints:[],equipment:[]}
  :name==='activities'?{name:'New activity',durationMinutes:5,instructions:''}:name==='hydrationBreakMinutes'?0:'';
const choices:{[key:string]:string[]}={ageGroup:['6U','8U','10U','12U','14U','HS_JV','HS_VARSITY','ADULT'],skillLevel:['beginner','intermediate','advanced'],contactLevel:['non_contact','limited_contact','full_contact'],kind:['warmup','period','cooldown']};
const kindOf=(v:Value)=>v!==null&&typeof v==='object'&&!Array.isArray(v)&&typeof v.kind==='string'?v.kind:undefined;
// The data-* attributes and classes are layout hooks for the Elite Broadcast stylesheet; DOM order and behaviour are unchanged.
export default function FieldsEditor({value,onChange,path='Plan'}:{value:Value;onChange:(v:Value)=>void;path?:string}){
  const name=path.split('.').pop()!;
  if(Array.isArray(value))return <fieldset data-list={name}><legend>{label(name)}</legend>{value.map((v,i)=><div key={`${path}:${i}`} className="eb-item" data-kind={kindOf(v)}>
    <FieldsEditor value={v} path={`${path}.${i+1}`} onChange={next=>onChange(value.map((old,j)=>j===i?next:old))}/>
    <div className="eb-item-actions"><button disabled={i===0} onClick={()=>{const copy=[...value];[copy[i-1],copy[i]]=[copy[i],copy[i-1]];onChange(copy);}}>Move up</button>
    <button disabled={i===value.length-1} onClick={()=>{const copy=[...value];[copy[i+1],copy[i]]=[copy[i],copy[i+1]];onChange(copy);}}>Move down</button>
    <button onClick={()=>onChange(value.filter((_v,j)=>j!==i))}>Remove item</button></div></div>)}<button className="eb-add" onClick={()=>onChange([...value,template(name)])}>Add {label(name)}</button></fieldset>;
  if(value!==null&&typeof value==='object')return <fieldset data-object={path.split('.').slice(-2,-1)[0]}><legend>{label(name)}</legend>{Object.entries(value).filter(([k])=>!['id','source','aiRequestId'].includes(k)).map(([k,v])=>
    <FieldsEditor key={k} value={v} path={`${path}.${k}`} onChange={next=>onChange({...value,[k]:next} as Fields)}/>)}</fieldset>;
  if(choices[name])return <label data-field={name}>{label(name)}<select aria-label={path} value={String(value)} onChange={e=>onChange(e.target.value)}>{choices[name].map(v=><option key={v}>{v}</option>)}</select></label>;
  if(typeof value==='boolean')return <label data-field={name}>{label(name)}<input aria-label={path} type="checkbox" checked={value} onChange={e=>onChange(e.target.checked)}/></label>;
  return <label data-field={name}>{label(name)}{typeof value==='number'?<input aria-label={path} type="number" value={value} onChange={e=>onChange(Number(e.target.value))}/>
    :<textarea aria-label={path} value={value===null?'':String(value)} onChange={e=>onChange(e.target.value)}/>}</label>;
}
