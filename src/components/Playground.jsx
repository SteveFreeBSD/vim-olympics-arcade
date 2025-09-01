import React,{useEffect,useRef,useState,forwardRef,useImperativeHandle}from'react'

function makeBuffer() {
  return [
    'The quick brown fox jumps over the lazy dog.',
    'Vim motions build speed like scales on a banjo.',
    'Practice little and often; clarity comes with rhythm.',
  ]
}

const Playground = forwardRef(function Playground(_, ref){
  const[buf,setBuf]=useState(makeBuffer());const[row,setRow]=useState(0);const[col,setCol]=useState(0);
  const[pending,setPending]=useState("");const areaRef=useRef(null);
  const [delay,setDelay]=useState(80); // ms between replayed key ops
  const [replaying,setReplaying]=useState("");
  const [insertMode,setInsertMode]=useState(false);
  const [insertFromChange,setInsertFromChange]=useState(false);
  const [insertText,setInsertText]=useState("");
  const [changeCount,setChangeCount]=useState(1);
  const [lastChange,setLastChange]=useState(null); // {kind:'x'|'dw'|'cw'|'p', count:number, text?:string, lines?:string[]}
  const [objPending,setObjPending]=useState(null); // {op:'d'|'c'|'y', kind:'i'|'a', count:number}
  const [marks,setMarks]=useState({}); // { [letter]: {row, col} }
  const [awaitSetMark,setAwaitSetMark]=useState(false);
  const [awaitJumpMark,setAwaitJumpMark]=useState(null); // "'" or "`"
  const [macroRegs,setMacroRegs]=useState({}); // { [letter]: string[] }
  const [recordingReg,setRecordingReg]=useState(null); // letter or '__await__'
  const [replayingMacro,setReplayingMacro]=useState(false);

  // Recorder state
  const [recording, setRecording] = useState(false)
  const [recorded, setRecorded] = useState([]) // array of op strings like "3w", "gg", "x"
  const [startBuf, setStartBuf] = useState([])
  const [label, setLabel] = useState('New lesson')

  useEffect(()=>{areaRef.current?.focus()},[]);
  const clamp=c=>Math.max(0,Math.min(c,Math.max(0,(buf[row]||"").length-1)));
  const firstNonBlank=(s)=>{let i=0;while(i<s.length && /\s/.test(s[i])) i++;return i;}
  const isWordCh = (ch)=>/[A-Za-z0-9_]/.test(ch||'');
  const wordF=()=>{const s=buf[row]||"";let i=col+1;while(i<s.length&&isWordCh(s[i]))i++;while(i<s.length&&/\W/.test(s[i]))i++;setCol(clamp(i));};
  const wordB=()=>{const s=buf[row]||"";let i=Math.max(0,col-1);while(i>0&&/\W/.test(s[i]))i--;while(i>0&&isWordCh(s[i-1]))i--;setCol(clamp(i));};
  const wordE=()=>{const s=buf[row]||"";let i=Math.max(col,0);if(i<s.length-1){if(!isWordCh(s[i])){while(i<s.length&&/\W/.test(s[i]))i++;}while(i<s.length-1&&isWordCh(s[i+1]))i++;}setCol(clamp(i));};
  const wordEBack=()=>{const s=buf[row]||"";let i=Math.max(0,col-1);if(i>0){if(!isWordCh(s[i])){while(i>0 && /\W/.test(s[i])) i--;}
    while(i>0 && isWordCh(s[i-1])) i--; if(i>0) i--; while(i>0 && /\W/.test(s[i])) i--;}
    setCol(clamp(i));
  };
  const bigWordF=()=>{const s=buf[row]||"";let i=col+1;while(i<s.length&&/\S/.test(s[i]))i++;while(i<s.length&&/\s/.test(s[i]))i++;setCol(clamp(i));};
  const bigWordB=()=>{const s=buf[row]||"";let i=Math.max(0,col-1);while(i>0&&/\s/.test(s[i]))i--;while(i>0&&/\S/.test(s[i-1]))i--;setCol(clamp(i));};
  const bigWordE=()=>{const s=buf[row]||"";let i=Math.max(col,0);if(i<s.length-1){if(/\s/.test(s[i])){while(i<s.length&&/\s/.test(s[i]))i++;}while(i<s.length-1&&/\S/.test(s[i+1]))i++;}setCol(clamp(i));};

  const wordBoundsAt=(s,i)=>{let a=i; if(!isWordCh(s[a]) && a>0 && isWordCh(s[a-1])) a=a-1; while(a>0&&isWordCh(s[a-1])) a--; let b=i; while(b<s.length&&isWordCh(s[b])) b++; return [a,b];};
  const awBounds=(s,i)=>{let [a,b]=wordBoundsAt(s,i); while(b<s.length&&/\s/.test(s[b])) b++; return [a,b];};
  const betweenDelims=(s,i,chOpen,chClose, include)=>{ // same line only
    let openIdx=-1, closeIdx=-1;
    for(let k=i;k>=0;k--){ if(s[k]===chOpen){ openIdx=k; break; } }
    for(let k=i;k<s.length;k++){ if(s[k]===chClose){ closeIdx=k; break; } }
    if(openIdx<0||closeIdx<0||closeIdx<=openIdx) return null;
    return include? [openIdx, closeIdx+1] : [openIdx+1, closeIdx];
  };

  // history and register for simple undo/yank/paste
  const [hist,setHist]=useState([]);
  const [reg,setReg]=useState([]); // array of lines for linewise yanks
  const pushHist=()=>setHist(h=>h.concat([{buf:[...buf],row,col}]));
  const undo=()=>setHist(h=>{ if(!h.length){ reset(); return h; } const last=h[h.length-1]; setBuf([...last.buf]); setRow(last.row); setCol(last.col); return h.slice(0,-1); });

  // pending operator / char
  const [awaitChar,setAwaitChar]=useState(null); // {op:'f'|'t'|'F'|'T', count:number}
  const [opPending,setOpPending]=useState(null); // {op:'d'|'c'|'y', count:number}
  const reset=()=>{setBuf(makeBuffer());setRow(0);setCol(0);setPending("")};

  // Helpers to represent buffer with a '|' cursor marker
  const bufferWithCursor = () => {
    return buf.map((ln, r) => {
      if (r !== row) return ln.replace('|', '')
      const clean = ln.replace('|', '')
      const i = Math.max(0, Math.min(col, Math.max(0, clean.length)))
      return clean.slice(0, i) + '|' + (clean[i] || '') + clean.slice(i + 1)
    })
  }

  // expose controls via ref
  const api_setBuffer = (lines) => {
    const safe = Array.isArray(lines) ? lines.slice(0, 200) : [];
    setBuf(safe.length ? safe.map(s=>String(s)) : makeBuffer());
    // set cursor to first '|' if present
    let r = 0,
      c = 0
    for (let i = 0; i < safe.length; i++) {
      const idx = String(safe[i]).indexOf('|')
      if (idx >= 0) {
        r = i
        c = idx
        break
      }
    }
    setRow(r); setCol(c); setPending("");
  };
  const api_sendKeys = async (keys) => {
    areaRef.current?.focus();
    const press = (k) => onKey({ key: k, preventDefault: ()=>{} });
    for (const seq of (keys||[])) {
      const m = /^([0-9]+)?(.+)$/.exec(seq);
      const count = m && m[1] ? parseInt(m[1],10) : 1;
      const op = m ? m[2] : seq;
      for(let i=0;i<count;i++){
        setReplaying(op);
        if(op==="gg"){ press("g"); press("g"); }
        else if(op.length===1){ press(op); }
        await new Promise(r=>setTimeout(r,Math.max(0,delay)));
      }
      setReplaying("");
    }
  };

  useImperativeHandle(ref, () => ({
    setBuffer: api_setBuffer,
    sendKeys: api_sendKeys,
  }), [delay, buf, row, col]);

  // record an operation like "3w" or "gg"
  const recordOp=(op,countStr="")=>{
    if(!recording) return;
    const label = `${countStr}${op}`;
    setRecorded(list=>list.concat([label]));
  };

  const onKey=e=>{
    const k=e.key;if(["ArrowLeft","ArrowRight","ArrowUp","ArrowDown","PageUp","PageDown","Home","End"].includes(k))e.preventDefault();
    // Macro record toggle and capture
    if (k==='q' && !recordingReg){ setRecordingReg('__await__'); return; }
    if (recordingReg==='__await__'){
      if(/^[a-z]$/.test(k)){ setRecordingReg(k); setMacroRegs(m=>({...m,[k]:[]})); }
      else { setRecordingReg(null); }
      return;
    }
    if (recordingReg && !replayingMacro){
      if (k==='q'){ setRecordingReg(null); return; }
      // capture key; continue to process it normally
      setMacroRegs(m=>{ const arr = m[recordingReg] ? [...m[recordingReg]] : []; arr.push(k); return {...m,[recordingReg]:arr}; });
    }

    // Set/jump marks
    if (awaitSetMark){ if(/^[a-z]$/.test(k)){ setMarks(m=>({...m,[k]:{row,col}})); } setAwaitSetMark(false); return; }
    if (awaitJumpMark){ if(/^[a-z]$/.test(k)){ const pos=marks[k]; if(pos){ setRow(pos.row); setCol(clamp(pos.col)); } } setAwaitJumpMark(null); return; }
    // Insert mode typing
    if (insertMode){
      if (k==='Escape') { 
        setInsertMode(false); setPending('');
        if(insertFromChange){ setLastChange({kind:'cw', count: changeCount||1, text: insertText}); setInsertFromChange(false); }
        return; 
      }
      if (k==='Enter'){
        pushHist();
        const s=buf[row]||'';
        const i=Math.max(0, Math.min(col, s.length));
        const nb=[...buf]; nb[row]=s.slice(0,i); nb.splice(row+1,0,s.slice(i));
        setBuf(nb); setRow(row+1); setCol(0);
        return;
      }
      if (k==='Backspace'){
        const s=buf[row]||''; const i=Math.max(0,col-1); if(col>0){
          const nb=[...buf]; nb[row]=s.slice(0,i)+s.slice(i+1); setBuf(nb); setCol(i);
        }
        return;
      }
      if (k.length===1 && !e.ctrlKey && !e.metaKey && !e.altKey){
        const s=buf[row]||''; const i=Math.max(0, Math.min(col, s.length));
        const nb=[...buf]; nb[row]=s.slice(0,i)+k+s.slice(i); setBuf(nb); setCol(i+1);
        if(insertFromChange) setInsertText(t=>t+k);
        return;
      }
      return;
    }
    if (awaitChar && awaitChar.op==='@'){
      const times = Math.max(1, awaitChar.count||1);
      if(/^[a-z]$/.test(k)){
        const seq = macroRegs[k]||[];
        setReplayingMacro(true);
        for(let t=0;t<times;t++){
          for(const key of seq){ if(key==='@' || key==='q') continue; onKey({key, preventDefault:()=>{}}); }
        }
        setReplayingMacro(false);
      }
      setAwaitChar(null); setPending(''); return;
    }
    if(awaitChar){
      const {op,count}=awaitChar; const ch=k;
      const s=buf[row]||""; let target=-1; let i; let times=Math.max(1,count||1);
      if(op==='f' || op==='t'){
        i=col; while(times--){ const idx=s.indexOf(ch, i+1); if(idx<0){ break; } i = idx; target = op==='f'? idx : Math.max(0, idx-1); }
      }else if(op==='F' || op==='T'){
        i=col; while(times--){ const idx=s.lastIndexOf(ch, i-1); if(idx<0){ break; } i = idx; target = op==='F'? idx : Math.min(s.length-1, idx+1); }
      }
      if(target>=0){ setCol(clamp(target)); recordOp(op+ch, String(awaitChar.count||'')); }
      setAwaitChar(null); setPending(""); return;
    }
    if(/^[0-9]$/.test(k)){setPending(p=>p+k);return}
    const countStr=(pending&&pending!=="g")?pending:""; // if pending is 'g' we handle below
    const run=(fn, op)=>{const cnt=Math.max(1,parseInt(countStr||"1",10));for(let i=0;i<cnt;i++)fn();recordOp(op,countStr);setPending("")};

    if(k==="h")return run(()=>setCol(c=>clamp(c-1)),"h");
    if(k==="l")return run(()=>setCol(c=>clamp(c+1)),"l");
    if(k==="j")return run(()=>setRow(r=>Math.min(buf.length-1,r+1)),"j");
    if(k==="k")return run(()=>setRow(r=>Math.max(0,r-1)),"k");

    if (k === '0') {
      setCol(0)
      recordOp('0', '')
      setPending('')
      return
    }
    if (k === '$') {
      setCol(Math.max(0, (buf[row] || '').length - 1))
      recordOp('$', '')
      setPending('')
      return
    }
    if (k === '^') {
      const s = buf[row] || ''
      setCol(firstNonBlank(s))
      recordOp('^', '')
      setPending('')
      return
    }

    if(k==="w")return run(wordF,"w");
    if(k==="b")return run(wordB,"b");
    if(k==="e"){
      if(pending==='g'){ setPending(''); return run(wordEBack,'ge'); }
      return run(wordE,'e');
    }
    if(k==="W")return run(bigWordF,"W");
    if(k==="B")return run(bigWordB,"B");
    if(k==="E")return run(bigWordE,"E");

    if (k === 'g') {
      // potential gg/ge
      if (pending === 'g') {
        setRow(0)
        setCol(0)
        setPending('')
        recordOp('gg', '')
        return
      }
      setPending('g')
      return
    }
    if (k === 'G') {
      setRow(buf.length - 1)
      setCol(0)
      recordOp('G', '')
      setPending('')
      return
    }

    if (k === 'x') {
      pushHist();
      const cnt = Math.max(1, parseInt(countStr||'1',10));
      let nb=[...buf]; let r=row, c=col;
      for(let t=0;t<cnt;t++){
        const s = nb[r] || '';
        const i = Math.max(0, Math.min(c, Math.max(0, s.length-1)));
        if (i >= s.length) break;
        const ns = s.slice(0, i) + s.slice(i + 1);
        nb[r] = ns;
        c = Math.min(i, Math.max(0, ns.length - 1));
      }
      setBuf(nb); setRow(r); setCol(c);
      recordOp('x', countStr); setPending(''); setLastChange({kind:'x', count:cnt}); return;
    }
    if (k === 'u') { undo(); recordOp('u',''); return }

    // f/t/F/T await a character; capture count now
    if (k==='f' || k==='t' || k==='F' || k==='T'){
      setAwaitChar({op:k, count: Math.max(1,parseInt(countStr||'1',10))}); setPending(''); return;
    }
    // Macro replay '@' awaits register
    if (k==='@'){ setAwaitChar({op:'@', count: Math.max(1,parseInt(countStr||'1',10))}); setPending(''); return; }

    // Enter insert mode directly
    if (k==='i' && !opPending){
      setInsertMode(true);
      setInsertFromChange(false);
      setInsertText('');
      setChangeCount(1);
      recordOp('i', countStr);
      setPending('');
      return;
    }

    // Insert variants: a, A, I, o, O
    if (k==='a' && !opPending){
      const s = buf[row]||''; setCol(c=>Math.min((s||'').length, c+1));
      setInsertMode(true); setInsertFromChange(false); setInsertText(''); setChangeCount(1);
      recordOp('a', countStr); setPending(''); return;
    }
    if (k==='A' && !opPending){
      const s = buf[row]||''; setCol(Math.max(0, s.length));
      setInsertMode(true); setInsertFromChange(false); setInsertText(''); setChangeCount(1);
      recordOp('A', countStr); setPending(''); return;
    }
    if (k==='I' && !opPending){
      const s = buf[row]||''; setCol(firstNonBlank(s));
      setInsertMode(true); setInsertFromChange(false); setInsertText(''); setChangeCount(1);
      recordOp('I', countStr); setPending(''); return;
    }
    if (k==='o' && !opPending){
      pushHist(); const nb=[...buf]; nb.splice(row+1,0,''); setBuf(nb); setRow(r=>Math.min(nb.length-1, r+1)); setCol(0);
      setInsertMode(true); setInsertFromChange(false); setInsertText(''); setChangeCount(1);
      recordOp('o', countStr); setPending(''); return;
    }
    if (k==='O' && !opPending){
      pushHist(); const nb=[...buf]; nb.splice(row,0,''); setBuf(nb); setRow(r=>r); setCol(0);
      setInsertMode(true); setInsertFromChange(false); setInsertText(''); setChangeCount(1);
      recordOp('O', countStr); setPending(''); return;
    }

    // Operators: d, c, y with simple motions
    if (k==='d' || k==='c' || k==='y'){
      setOpPending({op:k, count: Math.max(1,parseInt(countStr||'1',10))}); setPending(''); return;
    }
    // Text objects: i?/a?
    if ((k==='i' || k==='a') && opPending){ setObjPending({op: opPending.op, kind:k, count: opPending.count||1}); setOpPending(null); return; }
    if (objPending){
      const {op, kind, count} = objPending; const s = buf[row]||''; let range=null;
      if (k==='w') range = (kind==='a') ? awBounds(s,col) : wordBoundsAt(s,col);
      else if (k==='"') range = betweenDelims(s,col,'"','"', kind==='a');
      else if (k==="'") range = betweenDelims(s,col,"'","'", kind==='a');
      else if (k==='`') range = betweenDelims(s,col,'`','`', kind==='a');
      else if (k===')' || k==='(') range = betweenDelims(s,col,'(',')', kind==='a');
      else if (k===']' || k==='[') range = betweenDelims(s,col,'[',']', kind==='a');
      else if (k==='}' || k==='{') range = betweenDelims(s,col,'{','}', kind==='a');
      else if (k==='>' || k==='<') range = betweenDelims(s,col,'<','>', kind==='a');
      if (range){
        pushHist();
        let nb=[...buf]; const [a,b]=range; const start=Math.max(0,a), end=Math.max(start,Math.min(b,s.length));
        const left = s.slice(0,start), right = s.slice(end);
        if (op==='y'){ /* optional: store register */ setObjPending(null); return; }
        nb[row] = left + right; setBuf(nb); setCol(Math.min(start, Math.max(0,(nb[row]||'').length-1)));
        recordOp(op + kind + k, '');
        if (op==='c'){ setInsertMode(true); setInsertFromChange(true); setInsertText(''); setChangeCount(1); setLastChange(null); }
        else if (op==='d'){ setLastChange({kind:'dw', count:1}); }
      }
      setObjPending(null); return;
    }
    if (k==='w' && opPending){
      const times = Math.max(1, opPending.count||1);
      const op = opPending.op;
      if(op==='d' || op==='c') pushHist();
      let r=row, c=col; let nb=[...buf];
      for(let t=0;t<times;t++){
        const s = nb[r]||''; let i=c; // delete from current to start of next word boundary
        // advance to end of current word, then to start of next
        if(i<s.length && isWordCh(s[i])){ while(i<s.length && isWordCh(s[i])) i++; }
        while(i<s.length && /\W/.test(s[i])) i++;
        const start = Math.min(c, s.length);
        const end = Math.min(i, s.length);
        nb[r] = (s.slice(0,start) + s.slice(end));
        c = Math.min(start, Math.max(0, (nb[r]||'').length-1));
      }
      setBuf(nb); setRow(r); setCol(c);
      recordOp(op+'w', String(opPending.count||''));
      const wasC = (op==='c');
      setOpPending(null);
      if (wasC) { setInsertMode(true); setInsertFromChange(true); setInsertText(''); setChangeCount(times); setLastChange(null); }
      else { setLastChange({kind:'dw', count: times}); }
      return;
    }
    if (k==='y' && opPending && opPending.op==='y'){
      // 'yy' linewise yank with count
      const times = Math.max(1, opPending.count||1);
      const lines = buf.slice(row, Math.min(buf.length, row+times));
      setReg(lines);
      recordOp('yy', String(opPending.count||'')); setOpPending(null); return;
    }
    if (k==='p'){
      if(!reg.length) return;
      pushHist();
      const nb=[...buf]; nb.splice(row+1,0,...reg); setBuf(nb); setRow(Math.min(nb.length-1,row+reg.length)); recordOp('p',''); setPending(''); setLastChange({kind:'p', lines:[...reg]}); return;
    }

    if (k==='*'){
      const cur = buf[row]||'';
      // derive word under cursor
      let a=col, b=col; if(!isWordCh(cur[a])){ if(a>0 && isWordCh(cur[a-1])) a=a-1; else { recordOp('*',''); return; } }
      while(a>0 && isWordCh(cur[a-1])) a--; while(b<cur.length && isWordCh(cur[b])) b++;
      const w = cur.slice(a,b); if(!w) { recordOp('*',''); return; }
      const search = (sr, sc)=>{
        for(let r=sr;r<buf.length;r++){
          const line = buf[r]||''; const from = r===sr? sc : 0; const idx = line.indexOf(w, from);
          if(idx>=0) return {r, c: idx};
        }
        return null;
      }
      const cnt = Math.max(1, parseInt(countStr||'1',10));
      let pos = {r: row, c: col+1};
      for(let t=0;t<cnt;t++){
        const found = search(pos.r, pos.c);
        if(!found){ break; }
        pos = {r: found.r, c: found.c+1}; setRow(found.r); setCol(found.c);
      }
      recordOp('*', countStr); setPending(''); return;
    }
    if (k==='m'){ setAwaitSetMark(true); setPending(''); return; }
    if (k==="'" || k==='`'){ setAwaitJumpMark(k); setPending(''); return; }
    if (k === '.'){
      const ch = lastChange; if(!ch) return;
      if (ch.kind==='x') return onKey({key:'x', preventDefault:()=>{}});
      if (ch.kind==='dw') { setOpPending({op:'d', count: ch.count||1}); return onKey({key:'w', preventDefault:()=>{}}); }
      if (ch.kind==='cw'){
        // delete word then insert stored text
        const times = Math.max(1, ch.count||1);
        pushHist();
        let r=row, c=col; let nb=[...buf];
        for(let t=0;t<times;t++){
          const s = nb[r]||''; let i=c;
          if(i<s.length && isWordCh(s[i])){ while(i<s.length && isWordCh(s[i])) i++; }
          while(i<s.length && /\\W/.test(s[i])) i++;
          const start = Math.min(c, s.length), end = Math.min(i, s.length);
          nb[r] = s.slice(0,start) + s.slice(end);
          c = Math.min(start, Math.max(0, (nb[r]||'').length-1));
        }
        const s2 = nb[r]||''; const i2 = Math.max(0, Math.min(c, s2.length));
        nb[r] = s2.slice(0,i2) + (ch.text||'') + s2.slice(i2);
        setBuf(nb); setRow(r); setCol(i2 + (ch.text||'').length);
        recordOp('.', ''); return;
      }
      if (ch.kind==='p'){ pushHist(); const nb=[...buf]; nb.splice(row+1,0,...(ch.lines||[])); setBuf(nb); setRow(Math.min(nb.length-1,row+(ch.lines?.length||0))); recordOp('.', ''); return; }
      return;
    }
  }

  // Recorder controls
  const startRec = () => {
    setRecorded([])
    setStartBuf(bufferWithCursor())
    setRecording(true)
  }
  const stopRec = () => setRecording(false)
  const clearRec = () => {
    setRecorded([])
    setStartBuf(bufferWithCursor())
  }

  const makeLessonJson = () => {
    return {
      keys: recorded[0] || '',
      desc: label || 'Lesson',
      tutorial: {
        buffer: startBuf.length ? startBuf : bufferWithCursor(),
        steps: recorded.map(op=>({ do: `Press ${op}`, expect: "Observe cursor movement or edit" })),
        keys: recorded
      }
    };
  };
  const copyJson=async()=>{
    try{
      const s = JSON.stringify(makeLessonJson(), null, 2);
      await navigator.clipboard.writeText(s);
      alert("Lesson JSON copied to clipboard.");
    }catch(e){ console.error(e); alert("Copy failed. Check browser permissions."); }
  };
  const downloadJson=()=>{
    const s = JSON.stringify(makeLessonJson(), null, 2);
    const blob = new Blob([s], {type: "application/json"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const ts = new Date().toISOString().replace(/[:.]/g,'-');
    a.href = url;
    a.download = `lesson-${ts}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return(<div className='rounded-3xl border border-slate-700/70 bg-slate-950/70 neo-card'>
      <div className='flex flex-col gap-2 border-b border-slate-800/70 bg-gradient-to-b from-slate-900/80 to-slate-950/80 px-4 py-3'>
        <div className='flex items-center justify-between'>
          <div className='text-sm text-slate-300'>
          Motion Playground <span className='text-slate-500'>(hjkl, 0, ^, $, w/W, e/E, b/B, ge, f/t/F/T, *, gg, G, x (count), dw/cw, yy, p, u, i, a/A/I/o/O, Enter newline, iw/aw, quotes, parens, brackets, braces, angles, marks m '`, macros q/@, . repeat)</span>
          </div>
          <div className='flex items-center gap-3'>
          <label className='flex items-center gap-2 text-xs text-slate-300'>
            <span>Delay</span>
            <input type='range' min='10' max='300' step='10' value={delay} onChange={e=>setDelay(parseInt(e.target.value,10)||80)} className='accent-cyan-400' />
            <span className='tabular-nums w-10 text-slate-400'>{delay}ms</span>
          </label>
          {recording
            ? <button onClick={stopRec} className='px-3 py-1.5 rounded-xl border border-rose-500 bg-rose-500/10 text-rose-100'>Stop</button>
            : <button onClick={startRec} className='px-3 py-1.5 rounded-xl border border-emerald-500 bg-emerald-500/10 text-emerald-100'>Start Recording</button>}
          <button onClick={reset} className='px-3 py-1.5 rounded-xl border border-slate-600'>Reset</button>
        </div>
      </div>
      <div className='flex flex-wrap items-center gap-2 text-xs'>
        <span className={'inline-flex items-center gap-1 px-2 py-0.5 rounded border ' + (recording ? 'border-rose-400 text-rose-200 bg-rose-500/10' : 'border-slate-600 text-slate-300')}>
          <span className={'inline-block w-2 h-2 rounded-full ' + (recording ? 'bg-rose-400 animate-pulse' : 'bg-slate-500')}></span>
          {recording ? 'Recording' : 'Idle'}
        </span>
        {insertMode && (
          <span className='px-2 py-0.5 rounded border border-emerald-400 text-emerald-200 bg-emerald-500/10'>Insert</span>
        )}
        {replaying && (
          <span className='px-2 py-0.5 rounded border border-cyan-400 text-cyan-200 bg-cyan-500/10'>Replaying: {replaying}</span>
        )}
        <span className='text-slate-400'>Captured: {recorded.length}</span>
        <input className='px-2 py-1 rounded bg-slate-900/70 border border-slate-700 text-slate-200' value={label} onChange={e=>setLabel(e.target.value)} placeholder='Lesson title' />
        <button onClick={clearRec} className='px-2 py-1 rounded border border-slate-600 text-slate-200'>Clear</button>
        <button onClick={copyJson} className='px-2 py-1 rounded border border-cyan-500 text-cyan-100 bg-cyan-500/10'>Copy JSON</button>
        <button onClick={downloadJson} className='px-2 py-1 rounded border border-cyan-500 text-cyan-100 bg-cyan-500/10'>Download JSON</button>
      </div>
      {!!recorded.length && (
        <div className='text-[11px] text-slate-400'>
          Keys: {recorded.join(' ')}
        </div>
      )}
    </div>

      <div
        tabIndex={0}
        ref={areaRef}
        onKeyDown={onKey}
        className="p-4 font-mono text-[13px] leading-6 outline-none"
      >
        {buf.map((ln, r) => (
          <div
            key={r}
            className={'whitespace-pre ' + (r === row ? 'bg-slate-900/60' : '')}
          >
            <span className="opacity-40 select-none w-8 inline-block text-right mr-2">
              {String(r + 1).padStart(2, ' ')}
            </span>
            {r === row ? (
              <>
                <span>{ln.slice(0, col).replace('|', '')}</span>
                <span className="rounded-sm px-0.5 bg-cyan-400 text-slate-900">
                  {ln.replace('|', '')[col] || ' '}
                </span>
                <span>{ln.replace('|', '').slice(col + 1)}</span>
              </>
            ) : (
              <span>{ln.replace('|', '')}</span>
            )}
          </div>
        ))}
        <div className="mt-3 text-xs text-slate-400">
          Click and use hjkl, 0, $, w, b, gg, G. Counts like 3w work. Press
          Start Recording to capture a lesson.
        </div>
      </div>
  </div>)
})

export default Playground
