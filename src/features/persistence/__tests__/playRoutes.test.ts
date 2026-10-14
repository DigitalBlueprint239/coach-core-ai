import {routesForView,routesForStorage} from '../playRoutes';
import {Fields,Value} from '../model';
test('legacy path alias renders and stores unchanged without adding or losing fields',()=>{
 const original:Value[]=[{id:'r',playerId:'p',path:[{x:10.125,y:20}],type:'pass',timing:2,color:'#abcdef'}];
 expect(routesForStorage(routesForView(original),original)).toEqual(original);
});
test('editing legacy geometry changes path while retaining timing/color and modern points shape',()=>{
 const original:Value[]=[{id:'r',playerId:'p',path:[{x:10.125,y:20}],type:'pass',timing:2,color:'#abcdef'}];
 const view=routesForView(original) as Fields[];view[0]={...view[0],points:[{x:30.25,y:40}]};
 expect(routesForStorage(view,original)).toEqual([{...original[0] as Fields,path:[{x:30.25,y:40}]}]);
 const modern:Value[]=[{id:'new',points:[{x:10,y:20}],type:'custom'}];expect(routesForStorage(modern,[])).toEqual(modern);
});
