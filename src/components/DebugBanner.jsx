import React from 'react'
export default function DebugBanner({ deepCount, total }) {
  if (deepCount <= 0) return null
  return (
    <div className="mx-4 my-3 rounded-xl border border-emerald-500/40 bg-emerald-500/10 text-emerald-100 px-3 py-2 text-sm">
      Deep content detected: <b>{deepCount}</b> of <b>{total}</b> items have
      Details/Examples/Tutorial.
    </div>
  )
}
