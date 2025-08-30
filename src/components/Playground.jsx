import React, { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react'

function makeBuffer() {
  return [
    'The quick brown fox jumps over the lazy dog.',
    'Vim motions build speed like scales on a banjo.',
    'Practice little and often; clarity comes with rhythm.',
  ]
}

const Playground = forwardRef(function Playground(_, ref) {
  const [buf, setBuf] = useState(makeBuffer())
  const [row, setRow] = useState(0)
  const [col, setCol] = useState(0)
  const [pending, setPending] = useState('')
  const areaRef = useRef(null)

  // Recorder state
  const [recording, setRecording] = useState(false)
  const [recorded, setRecorded] = useState([]) // array of op strings like "3w", "gg", "x"
  const [startBuf, setStartBuf] = useState([])
  const [label, setLabel] = useState('New lesson')

  useEffect(() => {
    areaRef.current?.focus()
  }, [])
  const clamp = (c) =>
    Math.max(0, Math.min(c, Math.max(0, (buf[row] || '').length - 1)))
  const wordF = () => {
    const s = buf[row] || ''
    let i = col + 1
    while (i < s.length && /[A-Za-z0-9_]/.test(s[i])) i++
    while (i < s.length && /\\W/.test(s[i])) i++
    setCol(clamp(i))
  }
  const wordB = () => {
    const s = buf[row] || ''
    let i = Math.max(0, col - 1)
    while (i > 0 && /\\W/.test(s[i])) i--
    while (i > 0 && /[A-Za-z0-9_]/.test(s[i - 1])) i--
    setCol(clamp(i))
  }
  // move to end of previous word (Vim 'ge')
  const wordEndB = () => {
    const s = buf[row] || ''
    let i = Math.max(0, col - 1)
    // skip whitespace to the left
    while (i > 0 && /\W/.test(s[i])) i--
    // if we're in a word, walk to its start then to its end
    if (/[A-Za-z0-9_]/.test(s[i])) {
      let j = i
      while (j > 0 && /[A-Za-z0-9_]/.test(s[j - 1])) j--
      let k = j
      while (k + 1 < s.length && /[A-Za-z0-9_]/.test(s[k + 1])) k++
      i = k
    }
    setCol(clamp(i))
  }

  // move to end of current/next word (like Vim 'e')
  const wordEndF = () => {
    const s = buf[row] || ''
    // If we're on whitespace, skip forward to the next word first
    let i = Math.min(Math.max(0, col), Math.max(0, s.length - 1))
    while (i < s.length && /\W/.test(s[i])) i++
    // Now advance to the end of this word
    while (i + 1 < s.length && /[A-Za-z0-9_]/.test(s[i + 1])) i++
    setCol(clamp(i))
  }

  const reset = () => {
    setBuf(makeBuffer())
    setRow(0)
    setCol(0)
    setPending('')
  }

  // Helpers to represent buffer with a '|' cursor marker
  const bufferWithCursor = () => {
    return buf.map((ln, r) => {
      if (r !== row) return ln.replace('|', '')
      const clean = ln.replace('|', '')
      const i = Math.max(0, Math.min(col, Math.max(0, clean.length)))
      return clean.slice(0, i) + '|' + (clean[i] || '') + clean.slice(i + 1)
    })
  }

  // exposed controls (via ref)
  const setBuffer = (lines) => {
    const safe = Array.isArray(lines) ? lines.slice(0, 200) : []
    setBuf(safe.length ? safe.map((s) => String(s)) : makeBuffer())
    // set cursor to first '|' if present
    let r = 0,
      c = 0
    for (let i = 0; i < safe.length; i++) {
      const idx = String(safe[i]).indexOf('|')
      if (idx >= 0) {
        r = i
        c = idx
        break
      }
    }
    setRow(r)
    setCol(c)
    setPending('')
  }
  const sendKeys = async (keys) => {
    areaRef.current?.focus()
    const press = (k) => onKey({ key: k, preventDefault: () => {} })
    for (const seq of keys || []) {
      const m = /^([0-9]+)?(.+)$/.exec(seq)
      const count = m && m[1] ? parseInt(m[1], 10) : 1
      const op = m ? m[2] : seq
      for (let i = 0; i < count; i++) {
        if (op === 'gg') {
          press('g')
          press('g')
        } else if (op.length === 1) {
          press(op)
        }
      }
      await new Promise((r) => setTimeout(r, 80))
    }
  }

  useImperativeHandle(ref, () => ({ setBuffer, sendKeys }))

  // record an operation like "3w" or "gg"
  const recordOp = (op, countStr = '') => {
    if (!recording) return
    const label = `${countStr}${op}`
    setRecorded((list) => list.concat([label]))
  }

  const onKey = (e) => {
    const k = e.key
    if (
      [
        'ArrowLeft',
        'ArrowRight',
        'ArrowUp',
        'ArrowDown',
        'PageUp',
        'PageDown',
        'Home',
        'End',
      ].includes(k)
    )
      e.preventDefault()
    if (/^[0-9]$/.test(k)) {
      setPending((p) => p + k)
      return
    }
    const countStr = pending && pending !== 'g' ? pending : '' // if pending is 'g' we handle below
    const run = (fn, op) => {
      const cnt = Math.max(1, parseInt(countStr || '1', 10))
      for (let i = 0; i < cnt; i++) fn()
      recordOp(op, countStr)
      setPending('')
    }

    if (k === 'h') return run(() => setCol((c) => clamp(c - 1)), 'h')
    if (k === 'l') return run(() => setCol((c) => clamp(c + 1)), 'l')
    if (k === 'j')
      return run(() => setRow((r) => Math.min(buf.length - 1, r + 1)), 'j')
    if (k === 'k') return run(() => setRow((r) => Math.max(0, r - 1)), 'k')

    if (k === '0') {
      setCol(0)
      recordOp('0', '')
      setPending('')
      return
    }
    if (k === '$') {
      setCol(Math.max(0, (buf[row] || '').length - 1))
      recordOp('$', '')
      setPending('')
      return
    }

    if (k === 'w') return run(wordF, 'w')
    // 'e' or 'ge' depending on pending 'g'
    if (k === 'e') {
      if (pending === 'g') return run(wordEndB, 'ge')
      return run(wordEndF, 'e')
    }

    if (k === 'b') return run(wordB, 'b')

    if (k === 'g') {
      // potential gg
      if (pending === 'g') {
        setRow(0)
        setCol(0)
        setPending('')
        recordOp('gg', '')
        return
      }
      setPending('g')
      return
    }
    if (k === 'G') {
      setRow(buf.length - 1)
      setCol(0)
      recordOp('G', '')
      setPending('')
      return
    }

    if (k === 'x') {
      const s = buf[row] || ''
      const i = clamp(col)
      if (i >= s.length) return
      const ns = s.slice(0, i) + s.slice(i + 1)
      const nb = [...buf]
      nb[row] = ns
      setBuf(nb)
      setCol(Math.min(i, Math.max(0, ns.length - 1)))
      recordOp('x', '')
      setPending('')
      return
    }
    if (k === 'u') {
      reset()
      recordOp('u', '')
      return
    }
  }

  // Recorder controls
  const startRec = () => {
    setRecorded([])
    setStartBuf(bufferWithCursor())
    setRecording(true)
  }
  const stopRec = () => setRecording(false)
  const clearRec = () => {
    setRecorded([])
    setStartBuf(bufferWithCursor())
  }

  const makeLessonJson = () => {
    return {
      keys: recorded[0] || '',
      desc: label || 'Lesson',
      tutorial: {
        buffer: startBuf.length ? startBuf : bufferWithCursor(),
        steps: recorded.map((op) => ({
          do: `Press ${op}`,
          expect: 'Observe cursor movement or edit',
        })),
        keys: recorded,
      },
    }
  }
  const copyJson = async () => {
    try {
      const s = JSON.stringify(makeLessonJson(), null, 2)
      await navigator.clipboard.writeText(s)
      alert('Lesson JSON copied to clipboard.')
    } catch (e) {
      console.error(e)
      alert('Copy failed. Check browser permissions.')
    }
  }
  const downloadJson = () => {
    const s = JSON.stringify(makeLessonJson(), null, 2)
    const blob = new Blob([s], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    const ts = new Date().toISOString().replace(/[:.]/g, '-')
    a.href = url
    a.download = `lesson-${ts}.json`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="rounded-3xl border border-slate-700/70 bg-slate-950/70 shadow-[inset_0_1px_0_rgba(255,255,255,.06),0_50px_120px_-60px_rgba(236,72,153,.35)]">
      <div className="flex flex-col gap-2 border-b border-slate-800/70 bg-gradient-to-b from-slate-900/80 to-slate-950/80 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="text-sm text-slate-300">
            Motion Playground{' '}
            <span className="text-slate-500">
              (hjkl, 0, $, w, b, e, ge, gg, G, x, u)
            </span>
          </div>
          <div className="flex items-center gap-2">
            {recording ? (
              <button
                onClick={stopRec}
                className="px-3 py-1.5 rounded-xl border border-rose-500 bg-rose-500/10 text-rose-100"
              >
                Stop
              </button>
            ) : (
              <button
                onClick={startRec}
                className="px-3 py-1.5 rounded-xl border border-emerald-500 bg-emerald-500/10 text-emerald-100"
              >
                Start Recording
              </button>
            )}
            <button
              onClick={reset}
              className="px-3 py-1.5 rounded-xl border border-slate-600"
            >
              Reset
            </button>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span
            className={
              'inline-flex items-center gap-1 px-2 py-0.5 rounded border ' +
              (recording
                ? 'border-rose-400 text-rose-200 bg-rose-500/10'
                : 'border-slate-600 text-slate-300')
            }
          >
            <span
              className={
                'inline-block w-2 h-2 rounded-full ' +
                (recording ? 'bg-rose-400 animate-pulse' : 'bg-slate-500')
              }
            ></span>
            {recording ? 'Recording' : 'Idle'}
          </span>
          <span className="text-slate-400">Captured: {recorded.length}</span>
          <input
            className="px-2 py-1 rounded bg-slate-900/70 border border-slate-700 text-slate-200"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Lesson title"
          />
          <button
            onClick={clearRec}
            className="px-2 py-1 rounded border border-slate-600 text-slate-200"
          >
            Clear
          </button>
          <button
            onClick={copyJson}
            className="px-2 py-1 rounded border border-cyan-500 text-cyan-100 bg-cyan-500/10"
          >
            Copy JSON
          </button>
          <button
            onClick={downloadJson}
            className="px-2 py-1 rounded border border-cyan-500 text-cyan-100 bg-cyan-500/10"
          >
            Download JSON
          </button>
        </div>
        {!!recorded.length && (
          <div className="text-[11px] text-slate-400">
            Keys: {recorded.join(' ')}
          </div>
        )}
      </div>

      <div
        tabIndex={0}
        ref={areaRef}
        onKeyDown={onKey}
        className="p-4 font-mono text-[13px] leading-6 outline-none"
      >
        {buf.map((ln, r) => (
          <div
            key={r}
            className={'whitespace-pre ' + (r === row ? 'bg-slate-900/60' : '')}
          >
            <span className="opacity-40 select-none w-8 inline-block text-right mr-2">
              {String(r + 1).padStart(2, ' ')}
            </span>
            {r === row ? (
              <>
                <span>{ln.slice(0, col).replace('|', '')}</span>
                <span className="rounded-sm px-0.5 bg-cyan-400 text-slate-900">
                  {ln.replace('|', '')[col] || ' '}
                </span>
                <span>{ln.replace('|', '').slice(col + 1)}</span>
              </>
            ) : (
              <span>{ln.replace('|', '')}</span>
            )}
          </div>
        ))}
        <div className="mt-3 text-xs text-slate-400">
          Click and use hjkl, 0, $, w, b, gg, G. Counts like 3w work. Press
          Start Recording to capture a lesson.
        </div>
      </div>
    </div>
  )
})

export default Playground
