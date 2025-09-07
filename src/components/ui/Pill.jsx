import React from 'react'
export default function Pill({ active, children, onClick }) {
  return (
    <button
      onClick={onClick}
      className={
        'px-3 py-1.5 rounded-full text-xs font-semibold border backdrop-blur transition ' +
        (active
          ? 'bg-cyan-400/20 text-cyan-200 border-cyan-400 shadow-[inset_0_1px_0_#ecfeff,0_10px_26px_-12px_#22d3ee]'
          : 'bg-slate-800/60 text-slate-200 border-slate-700 hover:bg-slate-700/80 hover:shadow-[0_10px_24px_-14px_#94a3b8]')
      }
    >
      {children}
    </button>
  )
}
