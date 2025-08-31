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
  { text: 'Prefix motions with counts (example: `4j`).' },
  { text: 'Use `vimtutor` for 20–30 minutes daily to build muscle memory.' },
  { text: 'Practice without arrow keys (cover them if needed).' },
  { text: 'Learn small chunks (master `hjkl` before moving on).' },
  { text: 'Pair operators with motions (`d`, `y`, `c`) to build grammar.' },
  { text: 'Use `.` to repeat your last change.' },
  { text: 'Undo with `u` and redo with `Ctrl+r` to experiment safely.' },
  { text: 'Try Visual mode to explore motions interactively.' },
  { text: 'Use `:help` (start with `:help w`).' },
  { text: 'Set marks with `ma` and jump back with ``a.' },
  { text: 'Record macros with `qa` and play with `@a`.' },
  { text: 'Break sessions into 5 minutes per skill.' },
  { text: 'Say commands aloud (for example: “delete word”).' },
  { text: 'Short practice sessions beat long marathons.' },
  { text: 'Save often with `:w` before experiments.' },
  { text: 'Use real code instead of placeholder text.' },
  { text: 'Hide the mouse to build Vim habits.' },
  { text: 'Ask yourself which motion is fastest.' },
  { text: 'Focus on accuracy first (speed follows).' },
  { text: 'Celebrate each motion you master.' },
]

// Helpful console diagnostic
; (function(){
  try{
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.MODE !== 'production'){
      const deep = groups.reduce((n,g)=> n + g.items.filter(it => it.details || (it.examples && it.examples.length) || it.tutorial).length, 0);
      const total = groups.reduce((n,g)=> n + g.items.length, 0);
      console.info('[Vim Olympics] Groups:', groups.length, 'Items:', total, 'Deep items:', deep);
    }
  }catch{}
})();

export default { groups, tips }
