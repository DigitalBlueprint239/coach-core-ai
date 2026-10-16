import {createOnly,AlreadyCreated} from '../createOnly';
import {auth} from '../../../firebase';
jest.mock('../../../firebase',()=>({auth:{app:{options:{projectId:'demo-coach-core-e2e'}},currentUser:{}}}));
beforeEach(()=>{Object.assign(auth,{currentUser:{uid:'A',isAnonymous:false,getIdToken:async()=>'synthetic-emulator-token'}});
  Object.defineProperty(globalThis,'fetch',{configurable:true,value:jest.fn(async()=>({ok:true,status:200}))});});
test('create commit is conditional, scoped, exact and uses server-time transforms',async()=>{
 await createOnly({uid:'A',teamId:'T'},'plays','new',{name:'Mesh',players:[{id:'p',x:10.125,y:20}],routes:[]});
 const request=JSON.parse((fetch as jest.Mock).mock.calls[0][1].body);expect(request.writes[0].currentDocument).toEqual({exists:false});
 expect(request.writes[0].update.fields).toMatchObject({teamId:{stringValue:'T'},createdBy:{stringValue:'A'},revision:{integerValue:'1'}});
 expect(request.writes[0].updateTransforms).toEqual([{fieldPath:'createdAt',setToServerValue:'REQUEST_TIME'},{fieldPath:'updatedAt',setToServerValue:'REQUEST_TIME'}]);
 expect(request.writes[0].update.fields.players.arrayValue.values[0].mapValue.fields.x).toEqual({doubleValue:10.125});
});
test('existing document is not overwritten; retry must verify an authorized read',async()=>{
 (fetch as jest.Mock).mockResolvedValueOnce({ok:false,status:409,json:async()=>({error:{status:'ALREADY_EXISTS'}})});
 await expect(createOnly({uid:'A',teamId:'T'},'plays','same',{name:'Mesh'})).rejects.toBeInstanceOf(AlreadyCreated);
});
test('server authorization rejection is not reclassified as a conflict',async()=>{
 (fetch as jest.Mock).mockResolvedValueOnce({ok:false,status:403,json:async()=>({error:{status:'PERMISSION_DENIED'}})});
 await expect(createOnly({uid:'A',teamId:'T'},'plays','same',{name:'Mesh'})).rejects.toThrow('Team access denied');
});
