import React,{useEffect,useMemo,useRef,useState}from'react'
export default function CommandPalette({open,onClose,actions}){
  const[q,setQ]=useState('');const boxRef=useRef(null);
  useEffect(()=>{if(open)setTimeout(()=>boxRef.current?.focus(),10);else setQ('')},[open]);
  const filtered=useMemo(()=>{const s=q.toLowerCase();return actions.filter(a=>!s||a.title.toLowerCase().includes(s))},[q,actions]);
  if(!open)return null;
  return(<div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" onClick={onClose}>
    <div className="max-w-xl mx-auto mt-24" onClick={e=>e.stopPropagation()}>
      <div className="rounded-2xl border border-slate-700 bg-slate-900/95 shadow-[0_40px_120px_-30px_rgba(2,132,199,.5)]">
        <input ref={boxRef} value={q} onChange={e=>setQ(e.target.value)} placeholder="Type to search commands…" className="w-full px-4 py-3 bg-transparent border-b border-slate-700 focus:outline-none text-slate-100"/>
        <div className="max-h-80 overflow-auto">
          {filtered.map((a,i)=>(<button key={i} onClick={()=>{a.run();onClose();}} className="w-full text-left px-4 py-2 hover:bg-slate-800/70 flex items-center justify-between">
            <span className="text-slate-100">{a.title}</span>{a.kbd&&<kbd className="text-xs text-slate-300">{a.kbd}</kbd>}
          </button>))}
          {!filtered.length&&<div className="px-4 py-3 text-slate-400">No matches</div>}
        </div>
      </div>
    </div>
  </div>)
}
