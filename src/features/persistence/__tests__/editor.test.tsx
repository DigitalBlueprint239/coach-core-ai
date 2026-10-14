import React,{useState} from 'react';
import {render,screen,fireEvent} from '@testing-library/react';
import FieldsEditor from '../FieldsEditor';
import {Value,Fields} from '../model';
test('coach edits full drill content and reorders activities without dropping fields',()=>{
 const original:Fields={name:'Plan',notes:'All notes',periods:[{name:'Skills',kind:'period',durationMinutes:30,focus:'Routes',drills:[{name:'Mesh',durationMinutes:10,setup:'Pairs',instructions:'Cross',coachingPoints:['Eyes'],equipment:['cones']}]}],hydrationBreakMinutes:[10,20]};
 let result:Value=original;function Demo(){const [v,setV]=useState<Value>(original);return <FieldsEditor value={v} onChange={n=>{result=n;setV(n);}}/>;}
 render(<Demo/>);fireEvent.change(screen.getByLabelText('Plan.periods.1.drills.1.instructions'),{target:{value:'Edited instructions'}});
 fireEvent.change(screen.getByLabelText('Plan.notes'),{target:{value:'Detailed notes'}});
 expect((result as Fields).periods).toEqual([{...(original.periods as Fields[])[0],drills:[{name:'Mesh',durationMinutes:10,setup:'Pairs',instructions:'Edited instructions',coachingPoints:['Eyes'],equipment:['cones']}]}]);
 expect((result as Fields).notes).toBe('Detailed notes');expect((result as Fields).hydrationBreakMinutes).toEqual([10,20]);
});
