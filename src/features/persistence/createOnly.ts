import {auth} from '../../firebase';
import {Scope,Kind,Fields,Value} from './model';
// Firestore's Web SDK lacks create-with-exists=false. Missing-document reads
// are intentionally denied by owner-only rules, so a read-first create fails.
// REST's atomic precondition permits create without loosening any read rule.
export class AlreadyCreated extends Error {}
function encode(v:Value):unknown {
  if(v===null)return {nullValue:null};if(typeof v==='string')return {stringValue:v};if(typeof v==='boolean')return {booleanValue:v};
  if(typeof v==='number')return Number.isInteger(v)?{integerValue:String(v)}:{doubleValue:v};
  if(Array.isArray(v))return {arrayValue:{values:v.map(encode)}};
  return {mapValue:{fields:Object.fromEntries(Object.entries(v).map(([k,v])=>[k,encode(v)]))}};
}
export async function createOnly(scope:Scope,kind:Kind,id:string,fields:Fields,timestamps:{createdAt?:string;updatedAt?:string}={}):Promise<void>{
  const user=auth.currentUser;if(!user||user.isAnonymous||user.uid!==scope.uid)throw new Error('Account changed.');
  const project=auth.app.options.projectId;if(!project)throw new Error('Firebase project is not configured.');
  const database=`projects/${project}/databases/(default)`;
  const base=process.env.REACT_APP_USE_FIREBASE_EMULATORS==='true'?'http://127.0.0.1:8080':'https://firestore.googleapis.com';
  if(process.env.REACT_APP_USE_FIREBASE_EMULATORS==='true'&&!project.startsWith('demo-'))throw new Error('Emulator requires demo project.');
  const token=await user.getIdToken();if(auth.currentUser?.uid!==scope.uid)throw new Error('Account changed.');
  const payload={...fields,teamId:scope.teamId,createdBy:scope.uid,revision:1};
  const encoded=Object.fromEntries(Object.entries(payload).map(([k,v])=>[k,encode(v)]));
  const transforms=[];
  for(const fieldPath of ['createdAt','updatedAt'] as const){const original=timestamps[fieldPath];
    if(original){if(new Date(original).toISOString()!==original)throw new Error('Invalid original timestamp.');encoded[fieldPath]={timestampValue:original};}
    else transforms.push({fieldPath,setToServerValue:'REQUEST_TIME'});
  }
  const response=await fetch(`${base}/v1/${database}/documents:commit`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify({writes:[{
    update:{name:`${database}/documents/${kind}/${id}`,fields:encoded},
    currentDocument:{exists:false},...(transforms.length?{updateTransforms:transforms}:{}),
  }]})});
  if(!response.ok){const body=await response.json() as {error?:{status?:string}};const code=body.error?.status;
    if(code==='ALREADY_EXISTS'||code==='FAILED_PRECONDITION')throw new AlreadyCreated('Create acknowledgement needs verification.');
    throw new Error(code==='PERMISSION_DENIED'?'Team access denied. Draft retained.':`Create failed (${response.status}); draft retained.`);
  }
}
