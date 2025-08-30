import React, { useEffect, useMemo, useState } from 'react'
const sample = a => a[Math.floor(Math.random() * a.length)]
const norm = s => s.toLowerCase().replace(/\s+/g, ' ').trim()
export default function Quiz({ items, includePlugins = true }) {
  const pool = useMemo(
    () => items.filter(it => includePlugins || !it.plugin),
    [items, includePlugins],
  )
  const [mode, setMode] = useState('keys->desc')
  const [q, setQ] = useState(null)
  const [input, setInput] = useState('')
  const [seen, setSeen] = useState(0)
  const [streak, setStreak] = useState(0)
  const [best, setBest] = useState(() => {
    try { return parseInt(localStorage.getItem('quiz.best')||'0',10) || 0 } catch { return 0 }
  })
  const [last, setLast] = useState(null)
  useEffect(() => {
    if (!q && pool.length) setQ(sample(pool))
  }, [q, pool])
  const next = () => {
    setQ(sample(pool))
    setInput('')
    setLast(null)
  }
  const check = () => {
    if (!q) return
    const expected = (mode === 'keys->desc' ? q.desc : q.keys).toLowerCase()
    const given = norm(input)
    const ok = expected.includes(given) || given.includes(expected)
    setSeen(s => s + 1)
    setStreak(s => {
      const s2 = ok ? s + 1 : 0
      if (s2 > best) {
        setBest(s2)
        try { localStorage.setItem('quiz.best', String(s2)) } catch{}
      }
      return s2
    })
    setLast({ ok, expected: mode === 'keys->desc' ? q.desc : q.keys })
  }
  return (
    <div className="rounded-3xl border border-slate-700/70 bg-slate-900/70 p-5 space-y-4 shadow-[inset_0_1px_0_rgba(255,255,255,.06),0_30px_80px_-40px_rgba(34,211,238,.35)]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-slate-300 flex items-center gap-2">
          <span>Mode</span>
          <select
            value={mode}
            onChange={e => setMode(e.target.value)}
            className="ml-1 bg-slate-800/80 border border-slate-700 rounded px-2 py-1 text-sm"
          >
            <option value="keys->desc">Keys → What does it do?</option>
            <option value="desc->keys">Action → What keys?</option>
          </select>
        </div>
        <div className="flex items-center gap-4 text-sm text-slate-300">
          <div>
            Seen <span className="font-semibold text-slate-100">{seen}</span>
          </div>
          <div>
            Streak{' '}
            <span className="font-semibold text-emerald-400">{streak}</span>
          </div>
          <div>
            Best <span className="font-semibold text-cyan-300">{best}</span>
          </div>
        </div>
      </div>
      {q && (
        <div className="rounded-2xl border border-slate-700 bg-gradient-to-b from-slate-900 to-slate-950 p-4">
          <div className="text-slate-400 text-sm">
            {mode === 'keys->desc'
              ? 'What does this do?'
              : 'What keys do this?'}
          </div>
          <div className="text-xl font-bold text-slate-100 mt-1 tracking-tight">
            {mode === 'keys->desc' ? q.keys : q.desc}
          </div>
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') check()
            if (e.key === 'Escape') next()
          }}
          className="flex-1 min-w-[240px] px-3 py-2 rounded-xl bg-slate-800/80 border border-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-500"
          placeholder={
            mode === 'keys->desc' ? 'Describe the action' : 'Type the keys'
          }
        />
        <button
          onClick={check}
          className="px-4 py-2 rounded-xl border border-cyan-400 text-cyan-100 bg-cyan-500/10 hover:bg-cyan-500/20"
        >
          Check
        </button>
        <button
          onClick={next}
          className="px-4 py-2 rounded-xl border border-slate-600 hover:bg-slate-800"
        >
          Next
        </button>
      </div>
      {last && (
        <div
          className={
            'rounded-xl border p-3 ' +
            (last.ok
              ? 'border-emerald-400/60 bg-emerald-500/10 text-emerald-200'
              : 'border-rose-400/60 bg-rose-500/10 text-rose-200')
          }
        >
          {last.ok ? (
            'Correct — on tempo.'
          ) : (
            <>
              Not quite. Expected{' '}
              <span className="font-semibold text-slate-100">
                {last.expected}
              </span>
            </>
          )}
        </div>
      )}
    </div>
  )
}
