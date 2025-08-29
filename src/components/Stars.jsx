import React from 'react'
export default function Stars(){
  return (
    <div aria-hidden className="fixed inset-0 -z-10 pointer-events-none">
      <div className="absolute inset-0 opacity-60" style={{backgroundImage:
        `radial-gradient(2px 2px at 20% 30%, #38bdf8 40%, transparent 41%),
         radial-gradient(1.5px 1.5px at 60% 10%, #a78bfa 40%, transparent 41%),
         radial-gradient(1.8px 1.8px at 80% 70%, #22d3ee 40%, transparent 41%),
         radial-gradient(1.2px 1.2px at 35% 80%, #f472b6 40%, transparent 41%)`}}/>
      <div className="absolute inset-0 animate-[drift_30s_linear_infinite]" style={{background:
        "radial-gradient(1000px 500px at -10% -10%, rgba(34,211,238,.10), transparent 60%), radial-gradient(900px 450px at 110% -10%, rgba(236,72,153,.10), transparent 60%)"}}/>
      <style>{`@keyframes drift{0%{transform:translate3d(0,0,0)}100%{transform:translate3d(-40px,-20px,0)}}`}</style>
    </div>
  )
}
