import React, { useEffect, useRef } from 'react'

export default function CommandModal({ item, onClose, onSendKeys }) {
  if (!item) return null
  const t = item.tutorial
  const closeRef = useRef(null)
  const containerRef = useRef(null)
  const prevFocusRef = useRef(null)
  useEffect(() => {
    prevFocusRef.current = document.activeElement
    closeRef.current?.focus()
    const trap = (e) => {
      if (e.key !== 'Tab') return
      const root = containerRef.current
      if (!root) return
      const sel = root.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
      const list = Array.from(sel).filter(el => !el.hasAttribute('disabled'))
      if (list.length === 0) return
      const first = list[0]
      const last = list[list.length - 1]
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last.focus() }
      } else {
        if (document.activeElement === last) { e.preventDefault(); first.focus() }
      }
    }
    containerRef.current?.addEventListener('keydown', trap)
    return () => {
      containerRef.current?.removeEventListener('keydown', trap)
      if (prevFocusRef.current && typeof prevFocusRef.current.focus === 'function') {
        try { prevFocusRef.current.focus() } catch {}
      }
    }
  }, [])

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={`Details for ${item.keys}`}
      onClick={onClose}
      onKeyDown={e => { if (e.key === 'Escape') { e.stopPropagation(); onClose() } }}
    >
      <div
        className="max-w-2xl mx-auto mt-16"
        ref={containerRef}
        onClick={e => e.stopPropagation()}
      >
        <div className="rounded-2xl border border-slate-700 bg-slate-900 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-100">
              {item.keys}
            </h3>
            <button
              onClick={onClose}
              className="px-2 py-1 text-sm border border-slate-600 rounded"
              ref={closeRef}
            >
              Close
            </button>
          </div>

          {item.details && (
            <div>
              <div className="text-slate-300 text-sm mb-1">Details</div>
              <div className="text-slate-200">{item.details}</div>
            </div>
          )}

          {item.examples && item.examples.length > 0 && (
            <div>
              <div className="text-slate-300 text-sm mb-1">Examples</div>
              <ul className="space-y-2">
                {item.examples.map((ex, i) => (
                  <li
                    key={i}
                    className="rounded-lg border border-slate-700 p-3 bg-slate-950"
                  >
                    <div className="text-xs text-slate-400 mb-1">
                      {ex.notes || 'Example'}
                    </div>
                    <pre className="text-[12px] leading-5 text-slate-200 whitespace-pre-wrap">
                      Before: {ex.before}
                      After: {ex.after}
                    </pre>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {t && (
            <div>
              <div className="text-slate-300 text-sm mb-1">Tutorial</div>
              <div className="rounded-lg border border-slate-700 p-3 bg-slate-950 space-y-2">
                <div className="text-xs text-slate-400">Starting buffer</div>
                <pre className="text-[12px] leading-5 text-slate-200 whitespace-pre-wrap">
                  {t.buffer && t.buffer.join('\n')}
                </pre>
                {t.steps && t.steps.length > 0 && (
                  <ol className="list-decimal ml-5 text-sm text-slate-200 space-y-1">
                    {t.steps.map((s, i) => (
                      <li key={i}>
                        <span className="font-semibold">{s.do}</span> —{' '}
                        {s.expect}
                      </li>
                    ))}
                  </ol>
                )}
                {t.keys && t.keys.length > 0 && (
                  <div className="pt-1">
                    <button
                      onClick={() => onSendKeys(item)}
                      className="px-3 py-1.5 rounded-lg border border-emerald-400 text-emerald-100 bg-emerald-500/10 hover:bg-emerald-500/20 text-sm"
                      title="Load tutorial into playground and focus it"
                    >
                      Load in Playground
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
