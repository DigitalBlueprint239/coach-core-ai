import React from 'react';
import {Fields,RecordData} from './model';
export function download(value:unknown,name='coaching-draft.json'){
  const url=URL.createObjectURL(new Blob([JSON.stringify(value,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download=name;a.click();URL.revokeObjectURL(url);
}
export function Recovery({remote,fields,onReload,onCopy}:{remote:RecordData;fields:Fields;onReload:()=>void;onCopy:()=>void}){
  return <section role="alertdialog" aria-label="Conflicting edits"><h3>This was changed elsewhere</h3><p>Your unsaved work is preserved. Choose how to recover it.</p>
    <button onClick={()=>{if(window.confirm('Replace your current draft with the server version? Export first if you want both.'))onReload();}}>Reload remote</button>
    <button onClick={onCopy}>Keep my version as a copy</button><button onClick={()=>download({fields,remoteRevision:remote.revision})}>Export my version</button></section>;
}
