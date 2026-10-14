import React from 'react';
import {render,screen,waitFor,act} from '@testing-library/react';
import Dashboard,{datedPlans} from './Dashboard';
import {cloud} from '../features/persistence/gateway';
import type {RecordData} from '../features/persistence/model';
let mockTeam:{id:string;ownerId:string;name:string}|null={id:'team-a',ownerId:'coach',name:'Alpha'};
jest.mock('../hooks/useAuth',()=>({useAuth:()=>({user:{uid:'coach',email:'coach@example.test'},loading:false,logout:jest.fn()})}));
jest.mock('../contexts/TeamContext',()=>({useTeam:()=>({currentTeam:mockTeam,loading:false})}));
jest.mock('../features/persistence/gateway',()=>({cloud:{list:jest.fn()}}));
jest.mock('../features/persistence/DraftSignOut',()=>()=>null);
jest.mock('../features/practice-planner/PracticePlanner',()=>()=> <p>Existing practice workflow</p>);
jest.mock('./SmartPlaybook/SmartPlaybook',()=>()=> <p>Existing playbook workflow</p>);
jest.mock('./TeamManagement',()=>({TeamManagement:()=> <p>Existing teams workflow</p>}));
const record=(id:string,date:string):RecordData=>({id,revision:1,fields:{name:id,date},createdAt:'',updatedAt:''});
beforeEach(()=>{mockTeam={id:'team-a',ownerId:'coach',name:'Alpha'};jest.clearAllMocks();});
test('dated plans reject invalid calendar dates and never invent a time',()=>{
  expect(datedPlans([record('valid','2026-10-14'),record('bad','2026-02-30'),record('missing','')])).toEqual([{id:'valid',title:'valid',date:'2026-10-14',kind:'plan'}]);
});
test('a delayed old-team response never appears in a new workspace',async()=>{
  let resolveOld!:(records:RecordData[])=>void;
  (cloud.list as jest.Mock).mockImplementationOnce(()=>new Promise(resolve=>{resolveOld=resolve;})).mockResolvedValueOnce([]);
  const {rerender}=render(<Dashboard/>);
  await waitFor(()=>expect(cloud.list).toHaveBeenCalledWith({uid:'coach',teamId:'team-a'},'practicePlans'));
  mockTeam={id:'team-b',ownerId:'coach',name:'Bravo'};rerender(<Dashboard/>);
  await waitFor(()=>expect(cloud.list).toHaveBeenCalledWith({uid:'coach',teamId:'team-b'},'practicePlans'));
  await act(async()=>resolveOld([record('Alpha private plan','2026-10-14')]));
  expect(screen.queryByText('Alpha private plan')).not.toBeInTheDocument();
});
test('no-team and non-owned teams do not query practice data',()=>{
  mockTeam=null;const {rerender}=render(<Dashboard/>);expect(cloud.list).not.toHaveBeenCalled();
  mockTeam={id:'other-team',ownerId:'other-coach',name:'Other'};rerender(<Dashboard/>);expect(cloud.list).not.toHaveBeenCalled();
});
