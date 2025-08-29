import React,{useEffect,useMemo,useRef,useState}from'react'
import Stars from './components/Stars'
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

const normalize=s=>s.toLowerCase().replace(/\s+/g,' ').trim()

export default function App(){
  const[q,setQ]=useState('');const[cat,setCat]=useState('All');const[plugins,setPlugins]=useState(true);
  const[dense,setDense]=useState(true);const[practice,setPractice]=useState(true);const[palette,setPalette]=useState(false);
  const[openItem,setOpenItem]=useState(null);
  const inputRef=useRef(null)
  const cats=['All',...data.groups.map(g=>g.category)]
  const ALL=useMemo(()=>data.groups.flatMap(g=>g.items.map(it=>({...it,cat:g.category}))),[])
  const results=useMemo(()=>{const nq=normalize(q);const out=[];for(const g of data.groups){if(cat!=='All'&&g.category!==cat)continue;const items=g.items.filter(it=>(plugins||!it.plugin)&&(!nq||(g.category+' '+it.keys+' '+it.desc+' '+(it.pluginName||'')).toLowerCase().includes(nq)));if(items.length)out.push({title:g.category,items})}return out},[q,cat,plugins])
  useEffect(()=>{const h=e=>{if(e.key==='/'){e.preventDefault();inputRef.current?.focus()}if((e.ctrlKey||e.metaKey)&&e.key==='p'){e.preventDefault();setPlugins(v=>!v)}if((e.ctrlKey||e.metaKey)&&e.key==='c'){e.preventDefault();setDense(v=>!v)}if((e.ctrlKey||e.metaKey)&&e.key==='m'){e.preventDefault();setPractice(v=>!v)}if((e.ctrlKey||e.metaKey)&&e.key==='k'){e.preventDefault();setPalette(true)}};window.addEventListener('keydown',h);return()=>window.removeEventListener('keydown',h)},[])
  const actions=[{title:'Focus search',kbd:'/',run:()=>inputRef.current?.focus()},{title:'Toggle Plugins',kbd:'Ctrl+P',run:()=>setPlugins(v=>!v)},{title:'Toggle Compact',kbd:'Ctrl+C',run:()=>setDense(v=>!v)},{title:'Toggle Practice',kbd:'Ctrl+M',run:()=>setPractice(v=>!v)},...cats.map(c=>({title:`Go to: ${c}`,run:()=>setCat(c)}))]
  const total=results.reduce((n,g)=>n+g.items.length,0)

  // ✅ Count deep items and log (dev only)
  const { deep, total: grandTotal } = countDeep(data.groups);
  if (import.meta.env && import.meta.env.DEV) {
    console.info('[Vim Olympics] Deep items:', deep, 'of', grandTotal);
  }

  const openDetails=(item,opts={})=>setOpenItem({...item,_opts:opts});
  const closeDetails=()=>setOpenItem(null);
  const playgroundRef = useRef(null);
  const sendTutorialToPlayground=(item)=>{
    const api = playgroundRef.current;
    if (!api) return;
    if(item.tutorial?.buffer) api.setBuffer(item.tutorial.buffer);
    if(item.tutorial?.keys) api.sendKeys(item.tutorial.keys);
    setOpenItem(null);
    document.querySelector('#playground-anchor')?.scrollIntoView({behavior:'smooth',block:'start'});
  };

  return(<div className='min-h-screen text-slate-100' style={{background:'linear-gradient(180deg,#020617,#0b1220)'}}>
    <Stars/>
    <Header onPalette={()=>setPalette(true)}/>
    {/* ✅ Visual banner (dev only) */}
    {import.meta.env && import.meta.env.DEV ? (
      <DebugBanner deepCount={deep} total={grandTotal} />
    ) : null}
    <ErrorBoundary>
      <main className={'max-w-7xl mx-auto px-4 py-6 grid grid-cols-1 md:grid-cols-[300px,1fr] gap-6'+(dense?'':' md:gap-8')}>
        <aside className='space-y-4'>
          <div className='rounded-3xl border border-slate-700/70 bg-slate-900/70 p-4'><div className='text-xs uppercase tracking-wide text-slate-300 mb-2'>Search</div>
            <input ref={inputRef} value={q} onChange={e=>setQ(e.target.value)} placeholder='Find keys or actions' className='w-full px-3 py-2 rounded-xl bg-slate-800/80 border border-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-500'/>
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
          {practice&&(<div className='space-y-4'><div className='flex items-center justify-between'><h2 className='text-lg font-semibold tracking-tight text-slate-100 drop-shadow'>Practice Mode</h2><div className='text-slate-300 text-sm'>Quiz and Motion Playground</div></div><Quiz items={ALL} includePlugins={plugins}/><div id="playground-anchor"/><Playground ref={playgroundRef}/></div>)}
          {results.map(group=>(<div key={group.title}><div className='flex items-center justify-between mb-2'><h2 className='text-lg font-semibold tracking-tight text-slate-100 drop-shadow'>{group.title}</h2><div className='text-slate-300 text-sm'>{group.items.length} items</div></div>
            <div className='grid [grid-template-columns:repeat(auto-fit,minmax(240px,1fr))] gap-3'>{group.items.map((it,idx)=>(
              <CommandCard key={idx} item={it} onOpen={openDetails} />
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
