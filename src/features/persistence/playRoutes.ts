import {Value,Fields} from './model';
export function routesForView(value:Value|undefined):Value[]{
  if(!Array.isArray(value))return [];
  return value.map(v=>{const r=v as Fields;return Array.isArray(r.path)&&r.points===undefined?{...r,points:r.path}:r;});
}
export function routesForStorage(view:Value[],original:Value|undefined):Value[]{
  const paths=new Set(Array.isArray(original)?original.filter(v=>v&&typeof v==='object'&&!Array.isArray(v)&&v.path!==undefined&&v.points===undefined).map(v=>(v as Fields).id):[]);
  return view.map(v=>{const r=v as Fields;if(!paths.has(r.id))return r;const {points,...rest}=r;return {...rest,path:points};});
}
