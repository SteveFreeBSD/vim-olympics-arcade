import React from'react'
export default function Toggle({label,checked,onChange}){
  return(<label className="flex items-center gap-2 cursor-pointer select-none">
    <input type="checkbox" className="toggle" checked={checked} onChange={e=>onChange(e.target.checked)}/>
    {label?<span className="text-sm text-slate-100 drop-shadow">{label}</span>:null}
    <style>{`.toggle{appearance:none;width:2.8rem;height:1.4rem;background:linear-gradient(145deg,#1f2937,#0f172a);border:1px solid #334155;border-radius:9999px;position:relative;outline:none;box-shadow:inset 0 2px 6px rgba(0,0,0,.6),0 2px 8px rgba(0,0,0,.3)}.toggle:checked{background:linear-gradient(145deg,#06b6d4,#0ea5e9)}.toggle:after{content:'';width:1.2rem;height:1.2rem;background:radial-gradient(circle at 30% 30%,#fff,#d1d5db);border-radius:9999px;position:absolute;top:.1rem;left:.1rem;box-shadow:0 2px 6px rgba(0,0,0,.5), inset 0 0 6px rgba(255,255,255,.7);transition:transform .2s}.toggle:checked:after{transform:translateX(1.4rem)}`}</style>
  </label>)
}
