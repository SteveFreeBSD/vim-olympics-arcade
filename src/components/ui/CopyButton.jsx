import React, { useState } from 'react'
export default function CopyButton({ text }) {
  const [copied, setCopied] = useState(false)
  const base =
    'text-xs px-2.5 py-1.5 rounded-xl border transition-all focus:outline-none focus:ring-2 focus:ring-cyan-500'
  const on =
    ' bg-emerald-500/90 text-white border-emerald-300 shadow-[0_10px_30px_-12px_#34d399]'
  const off =
    ' bg-gradient-to-b from-slate-800 to-slate-900 text-slate-200 border-slate-600 hover:from-slate-700 hover:to-slate-800 hover:shadow-[0_8px_24px_-14px_#64748b]'
  return (
    <button
      type="button"
      className={base + (copied ? on : off)}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text)
          setCopied(true)
          setTimeout(() => setCopied(false), 900)
        } catch (e) {
          console.error('Copy failed', e)
        }
      }}
      title="Copy keys"
    >
      {copied ? '✓ Copied' : 'Copy'}
    </button>
  )
}
