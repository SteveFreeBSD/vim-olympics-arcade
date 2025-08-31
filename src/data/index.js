// Merged data loader — dedupe categories and items
// Loads all JSON files in ./sections and merges by category.

const modules = import.meta.glob('./sections/*.json', { eager: true })

function normalizeModule(mod) {
  // Support either default export or plain object
  const g = mod && mod.default ? mod.default : mod
  return {
    category: g?.category || 'Misc',
    items: Array.isArray(g?.items) ? g.items : [],
  }
}

function mergeGroups(rawGroups) {
  const map = new Map()
  for (const g0 of rawGroups) {
    const g = normalizeModule(g0)
    const cat = g.category
    const current = map.get(cat) || {
      category: cat,
      items: [],
      _sig: new Set(),
    }
    for (const it of g.items) {
      const sig = `${it.keys || ''}__${it.desc || ''}__${it.pluginName || ''}`
      if (!current._sig.has(sig)) {
        current._sig.add(sig)
        current.items.push(it)
      }
    }
    map.set(cat, current)
  }
  // Strip helper fields and return sorted by category name
  const groups = Array.from(map.values()).map(({ category, items }) => ({
    category,
    items,
  }))
  return groups.sort((a, b) => a.category.localeCompare(b.category))
}

const raw = Object.values(modules)
export const groups = mergeGroups(raw)

// Optional tips (leave your existing tips if you have them)
export const tips = [
  { text: 'Prefix motions with counts (e.g., 4j).' },
  { text: 'Use vimtutor for 30 minutes to build muscle memory.' },
]

// Helpful console diagnostic
; (function(){
  const deep = groups.reduce((n,g)=> n + g.items.filter(it => it.details || (it.examples && it.examples.length) || it.tutorial).length, 0);
  const total = groups.reduce((n,g)=> n + g.items.length, 0);
  console.info('[Vim Olympics] Groups:', groups.length, 'Items:', total, 'Deep items:', deep);
})();

export default { groups, tips }
