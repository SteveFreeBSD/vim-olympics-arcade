import React from 'react'
export default function Header({ onPalette }) {
  return (
    <header className="sticky top-0 z-10 backdrop-blur border-b border-slate-800/80 bg-slate-900/60">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3">
        <div className="flex-1">
          <h1 className="text-xl font-bold tracking-tight drop-shadow">
            Vim Olympics — Arcade
          </h1>
          <p className="text-slate-300 text-sm">
            Search (/) • plugins Ctrl+p • compact Ctrl+c • practice Ctrl+m •
            palette Ctrl+k • print
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onPalette}
            className="px-3 py-1.5 rounded-xl border border-slate-600 bg-slate-800"
          >
            Command palette
          </button>
          <button
            onClick={() => window.print()}
            className="px-3 py-1.5 rounded-xl border border-slate-600 bg-slate-800"
          >
            Print
          </button>
        </div>
      </div>
    </header>
  )
}
