import React from 'react'
import CopyButton from './ui/CopyButton'

export default function CommandCard({
  item,
  onOpen,
  query = '',
  done = false,
  onToggleDone,
}) {
  const q = String(query || '')
    .trim()
    .toLowerCase()
  const hi = text => {
    const s = String(text || '')
    if (!q) return s
    const i = s.toLowerCase().indexOf(q)
    if (i < 0) return s
    return (
      <>
        {s.slice(0, i)}
        <span className="bg-yellow-400/30 text-yellow-200 rounded px-0.5">
          {s.slice(i, i + q.length)}
        </span>
        {s.slice(i + q.length)}
      </>
    )
  }
  const hasDeep = !!(
    item.details ||
    (item.examples && item.examples.length) ||
    item.tutorial
  )
  return (
    <div className="group rounded-2xl border border-slate-700/70 bg-slate-900/70 transition p-3 flex items-start justify-between gap-3">
      <div>
        <div className="flex items-center gap-2">
          <div className="font-semibold text-slate-100 tracking-tight">
            {hi(item.keys)}
          </div>
          <span
            className={
              'px-2 py-0.5 rounded text-[10px] border ' +
              (hasDeep
                ? 'border-emerald-400 text-emerald-200 bg-emerald-500/10'
                : 'border-slate-600 text-slate-400 bg-slate-800/40')
            }
          >
            {hasDeep ? 'Deep info' : 'Basic'}
          </span>
        </div>
        <div className="text-slate-300 text-sm">{hi(item.desc)}</div>
        {item.plugin && (
          <div className="mt-1 text-[11px] text-slate-400">
            [{item.pluginName}]
          </div>
        )}
        <div className="mt-2 flex flex-wrap gap-2">
          {hasDeep ? (
            <button
              onClick={() => onOpen(item)}
              className="px-3 py-1.5 rounded-lg border border-cyan-300 text-cyan-50 bg-cyan-500/20 hover:bg-cyan-500/30 text-xs shadow-[0_0_0_2px_rgba(34,211,238,.15)]"
              title="More info and examples"
            >
              Details & Examples
            </button>
          ) : (
            <span className="text-xs text-slate-500">No extra details</span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={e => {
            e.stopPropagation()
            onToggleDone && onToggleDone()
          }}
          className={
            'px-2 py-1 rounded border text-xs ' +
            (done
              ? 'border-emerald-400 text-emerald-200 bg-emerald-500/10'
              : 'border-slate-600 text-slate-300')
          }
          aria-pressed={done}
          title={done ? 'Mark as not done' : 'Mark as done'}
        >
          {done ? '✓ Done' : 'Mark'}
        </button>
        <CopyButton text={item.keys} />
      </div>
    </div>
  )
}
