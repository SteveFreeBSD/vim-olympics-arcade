import React, { useEffect, useMemo, useRef, useState } from 'react'
import Stars from './components/Stars'
import Fuse from 'fuse.js'
import ErrorBoundary from './components/ErrorBoundary'
import Header from './components/Header'
import CommandPalette from './components/CommandPalette'
import Toggle from './components/ui/Toggle'
import Pill from './components/ui/Pill'
import CommandCard from './components/CommandCard'
import CommandModal from './components/CommandModal'
import Quiz from './components/Quiz'
import Playground from './components/Playground'
import data from './data/index.js'

// ✅ Diagnostics imports
import DebugBanner from './components/DebugBanner'
import { countDeep } from './deepCount'

const normalize = s => s.toLowerCase().replace(/\s+/g, ' ').trim()

export default function App() {
  const [q, setQ] = useState('')
  const [cat, setCat] = useState('All')
  const [plugins, setPlugins] = useState(() => {
    try { return JSON.parse(localStorage.getItem('prefs.plugins') || 'true') } catch { return true }
  })
  const [dense, setDense] = useState(() => {
    try { return JSON.parse(localStorage.getItem('prefs.dense') || 'true') } catch { return true }
  })
  const [practice, setPractice] = useState(() => {
    try { return JSON.parse(localStorage.getItem('prefs.practice') || 'true') } catch { return true }
  })
  const [palette, setPalette] = useState(false)
  const [openItem, setOpenItem] = useState(null)
  const inputRef = useRef(null)
  const playRef = useRef(null)
  const cats = ['All', ...data.groups.map(g => g.category)]
  const ALL = useMemo(
    () => data.groups.flatMap(g => g.items.map(it => ({ ...it, cat: g.category }))),
    [],
  )
  const fuse = useMemo(() => new Fuse(ALL, {
    includeScore: true,
    threshold: 0.35,
    ignoreLocation: true,
    keys: [
      { name: 'keys', weight: 0.6 },
      { name: 'desc', weight: 0.3 },
      { name: 'pluginName', weight: 0.1 },
      { name: 'cat', weight: 0.05 },
    ],
  }), [ALL])
  const results = useMemo(() => {
    const nq = normalize(q)
    // No query: keep original grouping and filters
    if (!nq) {
      const out = []
      for (const g of data.groups) {
        if (cat !== 'All' && g.category !== cat) continue
        const items = g.items.filter(it => (plugins || !it.plugin))
        if (items.length) out.push({ title: g.category, items })
      }
      return out
    }
    // Fuzzy search across ALL, then re-group by category
    const matched = fuse
      .search(nq)
      .map(r => r.item)
      .filter(it => (plugins || !it.plugin) && (cat === 'All' || it.cat === cat))
    const map = new Map()
    for (const it of matched) {
      const arr = map.get(it.cat) || []
      arr.push(it)
      map.set(it.cat, arr)
    }
    return Array.from(map.entries()).map(([title, items]) => ({ title, items }))
  }, [q, cat, plugins, fuse])
  useEffect(() => {
    const h = e => {
      if (e.key === '/') {
        e.preventDefault()
        inputRef.current?.focus()
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
        e.preventDefault()
        setPlugins(v => !v)
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
        e.preventDefault()
        setDense(v => !v)
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'm') {
        e.preventDefault()
        setPractice(v => !v)
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        setPalette(true)
      }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [])
  // Load initial state from URL (overrides storage)
  useEffect(() => {
    try {
      const sp = new URL(window.location.href).searchParams
      if (sp.has('q')) setQ(sp.get('q') || '')
      if (sp.has('cat')) setCat(sp.get('cat') || 'All')
      if (sp.has('plugins')) setPlugins(sp.get('plugins') === '1')
      if (sp.has('dense')) setDense(sp.get('dense') === '1')
      if (sp.has('practice')) setPractice(sp.get('practice') === '1')
    } catch {}
  }, [])
  // Reflect state to URL, preserving unrelated params and hash
  useEffect(() => {
    try {
      const url = new URL(window.location.href)
      const sp = new URLSearchParams(url.search)
      // set or clear app-specific params
      if (q) sp.set('q', q); else sp.delete('q')
      if (cat && cat !== 'All') sp.set('cat', cat); else sp.delete('cat')
      sp.set('plugins', plugins ? '1' : '0')
      sp.set('dense', dense ? '1' : '0')
      sp.set('practice', practice ? '1' : '0')
      const qs = sp.toString()
      const next = `${url.pathname}${qs ? '?' + qs : ''}${url.hash}`
      window.history.replaceState(null, '', next)
    } catch {}
  }, [q, cat, plugins, dense, practice])
  useEffect(() => { try { localStorage.setItem('prefs.plugins', JSON.stringify(plugins)) } catch{} }, [plugins])
  useEffect(() => { try { localStorage.setItem('prefs.dense', JSON.stringify(dense)) } catch{} }, [dense])
  useEffect(() => { try { localStorage.setItem('prefs.practice', JSON.stringify(practice)) } catch{} }, [practice])
  const actions = [
    { title: 'Focus search', kbd: '/', run: () => inputRef.current?.focus() },
    { title: 'Toggle Plugins', kbd: 'Ctrl+P', run: () => setPlugins(v => !v) },
    { title: 'Toggle Compact', kbd: 'Ctrl+C', run: () => setDense(v => !v) },
    {
      title: 'Toggle Practice',
      kbd: 'Ctrl+M',
      run: () => setPractice(v => !v),
    },
    ...cats.map(c => ({ title: `Go to: ${c}`, run: () => setCat(c) })),
  ]
  const total = results.reduce((n, g) => n + g.items.length, 0)

  const nlq = useMemo(() => {
    const s = (q || '').toLowerCase()
    if (!s) return []
    const rules = [
      { re: /(delete|remove) to next \)/, out: ['d)'], note: 'delete to )' },
      { re: /(change|replace) (in|inside) (quote|\"|\')/, out: ['ci"', "ci'"], note: 'change inside quotes' },
      { re: /(delete|remove) (in|inside) (quote|\"|\')/, out: ['di"', "di'"], note: 'delete inside quotes' },
      { re: /(go|jump) to (line )?start/, out: ['^', '0'], note: 'start of line' },
      { re: /(go|jump) to (line )?end/, out: ['$'], note: 'end of line' },
      { re: /(next|forward) word/, out: ['w', 'W'], note: 'next word' },
      { re: /(prev|previous|back) word/, out: ['b', 'B'], note: 'previous word' },
      { re: /(yank|copy) line/, out: ['yy'], note: 'yank line' },
      { re: /(paste)/, out: ['p', 'P'], note: 'paste' },
    ]
    const hits = []
    for (const r of rules) if (r.re.test(s)) hits.push(r)
    return hits
  }, [q])

  // ✅ Count deep items and log
  const { deep, total: grandTotal } = countDeep(data.groups);
  console.info('[Vim Olympics] Deep items:', deep, 'of', grandTotal);

  const openDetails=(item,opts={})=>setOpenItem({...item,_opts:opts});
  const closeDetails=()=>setOpenItem(null);
  const sendTutorialToPlayground=(item)=>{
    const api = playRef.current;
    if(!api) return;
    if(item.tutorial?.buffer) api.setBuffer(item.tutorial.buffer);
    if(item.tutorial?.keys) api.sendKeys(item.tutorial.keys);
    setOpenItem(null);
    document.querySelector('#playground-anchor')?.scrollIntoView({behavior:'smooth',block:'start'});
  };

  return(<div className='min-h-screen text-slate-100' style={{background:'linear-gradient(180deg,#020617,#0b1220)'}}>
    <Stars/>
    <Header onPalette={()=>setPalette(true)}/>
    {/* ✅ Visual banner so you know it’s wired */}
    <DebugBanner deepCount={deep} total={grandTotal} />
    <ErrorBoundary>
      <main className={'max-w-7xl mx-auto px-4 py-6 grid grid-cols-1 md:grid-cols-[300px,1fr] gap-6'+(dense?'':' md:gap-8')}>
        <aside className='space-y-4'>
          <div className='rounded-3xl border border-slate-700/70 bg-slate-900/70 p-4'>
            <div className='text-xs uppercase tracking-wide text-slate-300 mb-2'>Search</div>
            <input ref={inputRef} value={q} onChange={e=>setQ(e.target.value)} placeholder='Find keys or actions (try: delete to ) )' className='w-full px-3 py-2 rounded-xl bg-slate-800/80 border border-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-500'/>
            {!!nlq.length && (
              <div className='mt-2 text-xs text-slate-400 space-y-1'>
                <div className='opacity-80'>Suggestions</div>
                <div className='flex flex-wrap gap-1'>
                  {nlq.flatMap((r, i) => r.out.map((k, j) => (
                    <span key={i+'-'+j} className='px-1.5 py-0.5 rounded border border-slate-600 text-slate-200 bg-slate-800/50'>{k}</span>
                  )))}
                </div>
              </div>
            )}
          </div>
          <div className='rounded-3xl border border-slate-700/70 bg-slate-900/70 p-4'><div className='text-xs uppercase tracking-wide text-slate-300 mb-2'>Categories</div>
            <div className='flex flex-wrap gap-2'>{cats.map(c=>(<Pill key={c} active={cat===c} onClick={()=>setCat(c)}>{c}</Pill>))}</div>
          </div>
          <div className='rounded-3xl border border-slate-700/70 bg-slate-900/70 p-4 space-y-3'><div className='text-xs uppercase tracking-wide text-slate-300'>View</div>
            <div className='flex items-center justify-between'><span className='text-sm'>Show plugin extras</span><Toggle label='' checked={plugins} onChange={setPlugins}/></div>
            <div className='flex items-center justify-between'><span className='text-sm'>Compact density</span><Toggle label='' checked={dense} onChange={setDense}/></div>
            <div className='flex items-center justify-between'><span className='text-sm'>Practice mode</span><Toggle label='' checked={practice} onChange={setPractice}/></div>
            <div className='pt-1 text-slate-300 text-xs opacity-80'>Total shown: <span className='text-slate-100 font-medium'>{total}</span></div>
          </div>
          <div className='rounded-3xl border border-slate-700/70 bg-slate-900/70 p-4'><div className='text-xs uppercase tracking-wide text-slate-300 mb-2'>Quick tips</div>
            <ul className='text-sm list-disc ml-5 space-y-1'>{data.tips.map((t,i)=>(<li key={i} className='text-slate-200'>{t.text}</li>))}</ul>
          </div>
        </aside>
        <section className='space-y-8'>
          {practice&&(
            <div className='space-y-4'>
              <div className='flex items-center justify-between'>
                <h2 className='text-lg font-semibold tracking-tight text-slate-100 drop-shadow'>Practice Mode</h2>
                <div className='flex items-center gap-2 text-slate-300 text-sm'>
                  <div>Quiz and Motion Playground</div>
                  <label className='inline-flex items-center gap-2 px-2 py-1 rounded-lg border border-slate-600 cursor-pointer hover:bg-slate-800'>
                    <input type='file' accept='application/json' className='hidden' onChange={async (e)=>{
                      try{
                        const file = e.target.files && e.target.files[0]; if(!file) return;
                        const txt = await file.text();
                        const obj = JSON.parse(txt);
                        if(obj && obj.tutorial){ sendTutorialToPlayground(obj); }
                      }catch(err){ console.error(err); alert('Invalid lesson JSON'); }
                      finally{ e.target.value=''; }
                    }}/>
                    <span className='text-xs'>Import Lesson</span>
                  </label>
                </div>
              </div>
              <Quiz items={ALL} includePlugins={plugins}/>
              <div id="playground-anchor"/>
              <Playground ref={playRef}/>
            </div>
          )}
          {results.map(group=>(<div key={group.title}><div className='flex items-center justify-between mb-2'><h2 className='text-lg font-semibold tracking-tight text-slate-100 drop-shadow'>{group.title}</h2><div className='text-slate-300 text-sm'>{group.items.length} items</div></div>
            <div className='grid [grid-template-columns:repeat(auto-fit,minmax(240px,1fr))] gap-3'>{group.items.map((it,idx)=>(
              <CommandCard key={idx} item={it} onOpen={openDetails} query={q} />
            ))}</div></div>))}
        </section>
      </main>
    </ErrorBoundary>
    <footer className='max-w-7xl mx-auto px-4 pb-6 text-xs text-slate-400'>Press <kbd className='px-1 rounded bg-slate-800 border border-slate-700'>Ctrl</kbd>+<kbd className='px-1 rounded bg-slate-800 border border-slate-700'>k</kbd> for palette • <kbd className='px-1 rounded bg-slate-800 border border-slate-700'>/</kbd> to search • Print for wall chart.</footer>
    <CommandPalette open={palette} onClose={()=>setPalette(false)} actions={actions}/>
    <CommandModal item={openItem} onClose={closeDetails} onSendKeys={sendTutorialToPlayground}/>
    <style>{`@media print{header,aside .rounded-3xl:nth-child(3),footer,.fixed{display:none!important}main{grid-template-columns:1fr!important}.grid{grid-template-columns:1fr 1fr 1fr!important;gap:8px!important}.group{page-break-inside:avoid}body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}`}</style>
  </div>)
}
