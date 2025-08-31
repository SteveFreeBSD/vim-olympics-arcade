import React from 'react'

export default function Card({ className = "", children }) {
  return (
    <div className={`rounded-3xl border border-slate-700/70 bg-slate-900/70 p-4 neo-card ${className}`}>
      {children}
    </div>
  );
}
