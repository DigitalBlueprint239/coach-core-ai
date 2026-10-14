import React from 'react';

export function Panel({title,eyebrow,action,children,className=''}:{title:string;eyebrow?:string;action?:React.ReactNode;children:React.ReactNode;className?:string}) {
  return <section className={`cc-panel ${className}`} aria-label={title}>
    <div className="cc-panel-heading"><div>{eyebrow&&<p className="cc-eyebrow">{eyebrow}</p>}<h2>{title}</h2></div>{action}</div>{children}
  </section>;
}
export function Action({children,primary=false,...props}:React.ButtonHTMLAttributes<HTMLButtonElement>&{primary?:boolean}) {
  return <button {...props} type="button" className={`cc-action ${primary?'cc-action-primary':''} ${props.className||''}`}>{children}</button>;
}
export function EmptyState({title,children}:{title:string;children:React.ReactNode}) {
  return <div className="cc-empty"><h3>{title}</h3><p>{children}</p></div>;
}
