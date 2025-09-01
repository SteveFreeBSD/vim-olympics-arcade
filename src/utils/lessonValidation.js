// Basic validation and sanitization for imported lesson JSON
// Returns a sanitized lesson object { keys, desc, tutorial: { buffer, steps, keys } }
// or throws an Error with a human-friendly message.

const clamp = (n, min, max) => Math.max(min, Math.min(max, n))
const toStr = (v) => (v == null ? '' : String(v))

export function sanitizeLesson(input) {
  if (!input || typeof input !== 'object') throw new Error('Root must be a JSON object')

  const out = {}
  if (typeof input.keys === 'string') out.keys = toStr(input.keys).slice(0, 100)
  if (typeof input.desc === 'string') out.desc = toStr(input.desc).slice(0, 200)

  if (!input.tutorial || typeof input.tutorial !== 'object') {
    throw new Error('Missing tutorial object')
  }
  const t = input.tutorial
  const tout = {}

  // buffer: up to 200 lines, each max 1000 chars
  const rawBuf = Array.isArray(t.buffer) ? t.buffer : []
  const maxLines = 200
  const maxCols = 1000
  const safeBuf = []
  for (let i = 0; i < Math.min(rawBuf.length, maxLines); i++) {
    const s = toStr(rawBuf[i]).slice(0, maxCols)
    // strip control characters except \t
    safeBuf.push(s.replace(/[\x00-\x08\x0B-\x1F\x7F]/g, ''))
  }
  if (!safeBuf.length) throw new Error('tutorial.buffer must be a non-empty array of strings')
  tout.buffer = safeBuf

  // steps: optional, cap 100, each with do/expect up to 200 chars
  if (Array.isArray(t.steps)) {
    const safeSteps = []
    const maxSteps = 100
    for (let i = 0; i < Math.min(t.steps.length, maxSteps); i++) {
      const s = t.steps[i] || {}
      const step = {
        do: toStr(s.do).slice(0, 200),
        expect: toStr(s.expect).slice(0, 200),
      }
      safeSteps.push(step)
    }
    if (safeSteps.length) tout.steps = safeSteps
  }

  // keys: array of short op strings, cap 300 entries, each up to 16 chars
  if (Array.isArray(t.keys)) {
    const maxKeys = 300
    const safeKeys = []
    for (let i = 0; i < Math.min(t.keys.length, maxKeys); i++) {
      const k = toStr(t.keys[i]).slice(0, 16)
      // drop obviously invalid overly long or empty strings
      if (!k) continue
      safeKeys.push(k)
    }
    if (safeKeys.length) tout.keys = safeKeys
  }

  out.tutorial = tout
  return out
}

export default sanitizeLesson

