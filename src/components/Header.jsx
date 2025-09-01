import React from 'react'
export default function Header({ onPalette, progress }) {
  return (
    <header className="sticky top-0 z-10 backdrop-blur border-b border-slate-800/80 neo-header">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3">
        <div className="flex-1">
          <h1 className="text-xl font-bold tracking-tight">
            <span className="chrome-text">Vim Olympics — Arcade</span>
          </h1>
          <p className="text-slate-300 text-sm">
            Search (/) • plugins Ctrl+p • compact Ctrl+c • practice Ctrl+m •
            palette Ctrl+k • print
          </p>
        </div>
        <div className="flex items-center gap-2">
          {progress && (
            <div className="px-2 py-1 rounded-lg border border-emerald-400 text-emerald-200 bg-emerald-500/10 text-xs">
              Progress: <span className="font-semibold">{Math.min(progress.done||0, progress.total||0)}</span> / {progress.total||0}
            </div>
          )}
          <button
            onClick={onPalette}
            className="neo-btn"
          >
            Command palette
          </button>
          <button
            onClick={() => window.print()}
            className="neo-btn"
          >
            Print
          </button>
        </div>
      </div>
    </header>
  )
}
