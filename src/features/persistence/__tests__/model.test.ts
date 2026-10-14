import {TextEncoder as NodeTextEncoder} from 'util';
import {validate,emptyPlan,planFromResult,Fields,equal} from '../model';
import {readDraft,writeDraft,scopedDrafts,key} from '../drafts';
import {PracticePlanResult} from '../../../services/coach-ai-client';
beforeEach(()=>{Object.defineProperty(globalThis,'TextEncoder',{value:NodeTextEncoder,configurable:true});localStorage.clear();});
test.each([120,200])('practice title length %i preserves all characters',n=>expect(()=>validate('practicePlans',{...emptyPlan,name:'a'.repeat(n)})).not.toThrow());
test.each([201,5001])('resolved title/notes overflow %i rejected, never truncated',n=>expect(()=>validate('practicePlans',{...emptyPlan,...(n===201?{name:'a'.repeat(n)}:{notes:'n'.repeat(n)})})).toThrow());
test('notes5000 accepted, numeric/enum validation enforced',()=>{expect(()=>validate('practicePlans',{...emptyPlan,notes:'n'.repeat(5000)})).not.toThrow();expect(()=>validate('practicePlans',{...emptyPlan,ageGroup:'invalid'})).toThrow();expect(()=>validate('practicePlans',{...emptyPlan,duration:-1})).toThrow();});
test('AI adapter keeps every activity/drill/property and ordering without invoking AI',()=>{
 const source:PracticePlanResult={title:'Practice',ageGroup:'10U',totalMinutes:60,warmup:{durationMinutes:10,activities:[{name:'Jog',durationMinutes:10,instructions:'Slow'}]},
  periods:[{name:'Skills',focus:'Routes',durationMinutes:40,drills:[{name:'Mesh',durationMinutes:40,setup:'Pairs',instructions:'Cross',coachingPoints:['Eyes','Hands'],equipment:['cones']}]}],
  cooldown:{durationMinutes:10,activities:[{name:'Stretch',durationMinutes:10,instructions:'Gentle'}]},hydrationBreakMinutes:[20,40],safetyConsiderations:['No contact'],notes:'Review'};
 const fields=planFromResult(source,'request-1','beginner','non_contact');const rows=fields.periods as Fields[];
 const roundtrip={title:fields.name,ageGroup:fields.ageGroup,totalMinutes:fields.duration,
  warmup:{durationMinutes:rows[0].durationMinutes,activities:rows[0].activities},periods:rows.slice(1,-1).map(({kind,...p})=>p),
  cooldown:{durationMinutes:rows[2].durationMinutes,activities:rows[2].activities},hydrationBreakMinutes:fields.hydrationBreakMinutes,safetyConsiderations:fields.safetyConsiderations,notes:fields.notes};
 expect(roundtrip).toEqual(source);
});
test('play validates exact fractional coordinates and rejects orphan route',()=>{
 const fields:Fields={name:'Mesh',phase:'special_teams',type:'pass',players:[{id:'p',x:10.125,y:20,number:1,position:'QB'}],routes:[{id:'r',playerId:'p',points:[{x:10.125,y:20}],type:'custom',color:'#fff'}]};
 expect(()=>validate('plays',fields)).not.toThrow();expect(()=>validate('plays',{...fields,players:[]})).toThrow();expect(fields.players).toEqual([{id:'p',x:10.125,y:20,number:1,position:'QB'}]);
});
test('P10/P17 scopes account AND team; another identity cannot load or replay drafts',()=>{
 const a={uid:'A',teamId:'T1'},b={uid:'B',teamId:'T1'};writeDraft({scope:a,kind:'plays',id:'1',expectedRevision:2,fields:{name:'Private'},pending:true});
 expect(readDraft(b,'plays')).toBeNull();expect(readDraft({...a,teamId:'T2'},'plays')).toBeNull();expect(scopedDrafts('B')).toEqual([]);expect(scopedDrafts('A')).toHaveLength(1);
});
test('foreign/corrupt envelope remains byte-identical and is never overwritten',()=>{
 const s={uid:'A',teamId:'T'};const raw=JSON.stringify({scope:{uid:'B',teamId:'T'},kind:'plays'});localStorage.setItem(key(s,'plays'),raw);
 expect(()=>readDraft(s,'plays')).toThrow();expect(()=>writeDraft({scope:s,kind:'plays',id:'1',expectedRevision:0,fields:{},pending:false})).toThrow();expect(localStorage.getItem(key(s,'plays'))).toBe(raw);
});
test('legacy originals and undo history stay outside new draft serialization',()=>{
 localStorage.setItem('smartPlaybook_plays','original');localStorage.setItem('coachcore-playbook','standalone');
 writeDraft({scope:{uid:'A',teamId:'T'},kind:'plays',id:'1',expectedRevision:1,fields:{name:'Mesh',players:[],routes:[]},pending:false});
 expect(localStorage.getItem('smartPlaybook_plays')).toBe('original');expect(localStorage.getItem('coachcore-playbook')).toBe('standalone');expect(equal({a:1,b:2},{b:2,a:1})).toBe(true);
});
