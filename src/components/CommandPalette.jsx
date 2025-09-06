import React, { useEffect, useMemo, useRef, useState } from 'react'
export default function CommandPalette({ open, onClose, actions }) {
  const [q, setQ] = useState('')
  const boxRef = useRef(null)
  const prevFocusRef = useRef(null)
  const containerRef = useRef(null)
  const [sel, setSel] = useState(0)
  useEffect(() => {
    if (open) {
      prevFocusRef.current = document.activeElement
      setTimeout(() => boxRef.current?.focus(), 10)
    } else {
      setQ('')
      setSel(0)
      if (
        prevFocusRef.current &&
        typeof prevFocusRef.current.focus === 'function'
      ) {
        try {
          prevFocusRef.current.focus()
        } catch {}
      }
    }
  }, [open])
  const filtered = useMemo(() => {
    const s = q.toLowerCase()
    return actions.filter(a => !s || a.title.toLowerCase().includes(s))
  }, [q, actions])
  useEffect(() => {
    if (sel >= filtered.length) setSel(Math.max(0, filtered.length - 1))
  }, [filtered, sel])
  if (!open) return null
  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      onKeyDown={e => {
        if (e.key === 'Escape') {
          e.preventDefault()
          onClose()
        }
      }}
    >
      <div
        className="max-w-xl mx-auto mt-24"
        ref={containerRef}
        onClick={e => e.stopPropagation()}
      >
        <div className="rounded-2xl border border-slate-700 bg-slate-900/95 shadow-[0_40px_120px_-30px_rgba(2,132,199,.5)]">
          <input
            ref={boxRef}
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Type to search commands…"
            aria-label="Command palette search"
            className="w-full px-4 py-3 bg-transparent border-b border-slate-700 focus:outline-none text-slate-100"
            onKeyDown={e => {
              if (e.key === 'ArrowDown') {
                e.preventDefault()
                setSel(s => Math.min(filtered.length - 1, s + 1))
              }
              if (e.key === 'ArrowUp') {
                e.preventDefault()
                setSel(s => Math.max(0, s - 1))
              }
              if (e.key === 'Enter') {
                e.preventDefault()
                const a = filtered[sel]
                if (a) {
                  a.run()
                  onClose()
                }
              }
              if (e.key === 'Escape') {
                e.preventDefault()
                onClose()
              }
            }}
          />
          <ul
            className="max-h-80 overflow-auto"
            role="listbox"
            aria-activedescendant={String(sel)}
          >
            {filtered.map((a, i) => (
              <li
                key={i}
                onClick={() => {
                  a.run()
                  onClose()
                }}
                id={String(i)}
                role="option"
                aria-selected={i === sel}
                tabIndex={0}
                className={
                  'w-full text-left px-4 py-2 flex items-center justify-between cursor-pointer ' +
                  (i === sel ? 'bg-slate-800/70' : 'hover:bg-slate-800/50')
                }
              >
                <span className="text-slate-100">{a.title}</span>
                {a.kbd && <kbd className="text-xs text-slate-300">{a.kbd}</kbd>}
              </li>
            ))}
            {!filtered.length && (
              <li
                className="px-4 py-3 text-slate-400"
                role="option"
                aria-selected={false}
              >
                No matches
              </li>
            )}
          </ul>
        </div>
      </div>
    </div>
  )
}
