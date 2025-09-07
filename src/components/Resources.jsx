import React from 'react'
import resources from '../data/resources.js'
import Card from './ui/Card'

function Section({ title, items }) {
  return (
    <div>
      <h3 className="mt-3 mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
        {title}
      </h3>
      <ul className="space-y-1 text-sm text-slate-200">
        {items.map((it, i) => (
          <li key={i}>
            <a
              href={it.url}
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:no-underline"
            >
              {it.label}
            </a>
            <span className="text-xs text-slate-400 ml-1">({it.type})</span>
            <span className="block text-xs text-slate-400">{it.desc}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default function Resources() {
  return (
    <Card>
      <div className="mb-2 text-sm font-semibold text-slate-300">
        References and Tutorials
      </div>
      <Section title="Beginner" items={resources.beginner} />
      <Section title="Intermediate" items={resources.intermediate} />
      <Section title="Advanced" items={resources.advanced} />
    </Card>
  )
}
