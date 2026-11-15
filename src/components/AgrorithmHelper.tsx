import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowUpRight, BookOpen, Database, Leaf, MessageCircle, RefreshCw, Send, Trash2, X } from "lucide-react";
import { asset } from "../config";
import { answerAgrorithmQuestion, HELPER_WELCOME, type HelperAnswer } from "../engine/agrorithmHelper";
import { parseWeatherPatternModel, type WeatherPatternModel } from "../engine/weatherPatterns";
import "./helper.css";

type Message = { id: number; role: "user"; text: string } | { id: number; role: "helper"; answer: HelperAnswer };
const kinds: Record<HelperAnswer["kind"],string> = { welcome:"ON THIS DEVICE", "learned-pattern":"LEARNED HISTORICAL PATTERN", "source-guide":"DOCUMENTED SOURCE GUIDE", "model-details":"TRAINING RECORD", clarification:"CLARIFICATION", scope:"EVIDENCE LIMIT", "model-required":"MODEL PREPARATION", unavailable:"UNAVAILABLE EVIDENCE" };
const suggestions = ["What was July 2023 like?", "How was the model trained?", "Explain irrigation water accounting"];

export default function AgrorithmHelper() {
  const [open,setOpen]=useState(false), [bottom,setBottom]=useState(24), [question,setQuestion]=useState(""), [busy,setBusy]=useState(false), [modelReady,setModelReady]=useState(false), [modelError,setModelError]=useState(false);
  const [messages,setMessages]=useState<Message[]>([{id:0,role:"helper",answer:HELPER_WELCOME}]);
  const dialog=useRef<HTMLDialogElement>(null), trigger=useRef<HTMLButtonElement>(null), input=useRef<HTMLInputElement>(null), log=useRef<HTMLDivElement>(null), id=useRef(1), model=useRef<WeatherPatternModel|null>(null), pending=useRef<Promise<WeatherPatternModel>|null>(null), abort=useRef<AbortController|null>(null), alive=useRef(true);
  useEffect(()=>{
    let frame=0;
    const locate=()=>{
      cancelAnimationFrame(frame);
      frame=requestAnimationFrame(()=>{
        let offset=24;
        const width=trigger.current?.getBoundingClientRect().width||160, height=58, right=innerWidth-24, left=right-width;
        const obstacles=[...document.querySelectorAll(".step-footer,.model-toolbar,.map-zoom")].map(el=>el.getBoundingClientRect()).filter(r=>r.width>0&&r.height>0&&r.bottom>0&&r.top<innerHeight&&r.right>left&&r.left<right);
        for(let pass=0;pass<obstacles.length+1;pass++)for(const r of obstacles){const top=innerHeight-offset-height,bottom=innerHeight-offset;if(top<r.bottom+10&&bottom>r.top-10)offset=Math.max(offset,innerHeight-r.top+12);}
        setBottom(Math.max(24,Math.min(innerHeight-90,offset)));
      });
    };
    locate();addEventListener("resize",locate);addEventListener("hashchange",locate);addEventListener("scroll",locate,{passive:true});
    void document.fonts.ready.then(locate);
    return ()=>{cancelAnimationFrame(frame);removeEventListener("resize",locate);removeEventListener("hashchange",locate);removeEventListener("scroll",locate);};
  },[]);
  const loadModel=useCallback(()=>{
    if (model.current) return Promise.resolve(model.current);
    if (pending.current) return pending.current;
    abort.current=new AbortController();setModelError(false);
    pending.current=fetch(asset("data/weather-patterns.json"),{signal:abort.current.signal}).then(response=>{if(!response.ok)throw Error("Historical model unavailable");return response.json();}).then(value=>{
      const result=parseWeatherPatternModel(value);model.current=result;if(alive.current)setModelReady(true);return result;
    }).catch(error=>{if(alive.current&&!abort.current?.signal.aborted)setModelError(true);throw error;}).finally(()=>{pending.current=null;});
    return pending.current;
  },[]);
  useEffect(()=>{alive.current=true;return()=>{alive.current=false;abort.current?.abort();};},[]);
  useEffect(()=>{
    if(open){if(!dialog.current?.open)dialog.current?.showModal();input.current?.focus();void loadModel().catch(()=>{});}
    else if(dialog.current?.open){dialog.current.close();trigger.current?.focus({preventScroll:true});}
  },[open,loadModel]);
  useEffect(()=>{
    const viewport=window.visualViewport;
    if(!open||!viewport)return;
    const resize=()=>{dialog.current?.style.setProperty("--helper-height",`${viewport.height}px`);dialog.current?.style.setProperty("--helper-top",`${viewport.offsetTop}px`);};
    resize();viewport.addEventListener("resize",resize);viewport.addEventListener("scroll",resize);
    return()=>{viewport.removeEventListener("resize",resize);viewport.removeEventListener("scroll",resize);};
  },[open]);
  useEffect(()=>{
    if(open&&log.current){
      const latest=log.current.lastElementChild;
      if(latest)log.current.scrollTop+=latest.getBoundingClientRect().top-log.current.getBoundingClientRect().top-18;
    }
  },[messages,busy,open]);
  const ask=async(text:string)=>{
    const value=text.trim();if(!value||busy)return;
    setQuestion("");setMessages(previous=>[...previous,{id:id.current++,role:"user",text:value}]);setBusy(true);
    let answer=answerAgrorithmQuestion(value,model.current);
    if(answer.kind==="model-required"){
      try{answer=answerAgrorithmQuestion(value,await loadModel());}
      catch{answer={kind:"unavailable",title:"The learned record could not load.",text:"Historical-month answers need the bundled model file. The documented source guide still works; try a water, soil or satellite question, or retry loading the model.",links:[{label:"Open the source guide",href:"#/help"}]};}
    }
    if(alive.current){setMessages(previous=>[...previous,{id:id.current++,role:"helper",answer}]);setBusy(false);input.current?.focus();}
  };
  const triggerButton=<button ref={trigger} className="agr-helper-trigger" style={{bottom:`max(${bottom}px, calc(20px + env(safe-area-inset-bottom)))`}} type="button" aria-label="Ask Agrorithm" title="Ask Agrorithm" aria-haspopup="dialog" aria-controls="agrorithm-helper-panel" aria-expanded={open} onClick={()=>setOpen(true)}><span className="agr-helper-orb" aria-hidden="true"><img src={asset("images/agrorithm-o.png")} alt=""/><MessageCircle size={12}/></span><span className="agr-helper-trigger-label">Ask Agrorithm</span></button>;
  return <>
    {triggerButton}
    <dialog ref={dialog} id="agrorithm-helper-panel" className="agr-helper-dialog" aria-labelledby="agr-helper-title" aria-describedby="agr-helper-description" onCancel={()=>setOpen(false)} onClose={()=>{setOpen(false);trigger.current?.focus({preventScroll:true});}} onClick={e=>{const r=e.currentTarget.getBoundingClientRect();if(e.target===e.currentTarget&&(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom))setOpen(false);}}>
      <div className="agr-helper-shell">
        <header className="agr-helper-header"><div className="agr-helper-mark" aria-hidden="true"><img src={asset("images/agrorithm-o.png")} alt=""/></div><div><span className="eyebrow">THE FIELD CONVERSATION</span><h2 id="agr-helper-title">Ask Agrorithm</h2></div><button type="button" aria-label="Close Agrorithm helper" onClick={()=>setOpen(false)}><X size={21}/></button></header>
        <p className="agr-helper-description" id="agr-helper-description">Historical pattern model + documented source guide. Questions stay in this browser session.</p>
        <div className="agr-helper-record"><Database size={14}/><span>{modelReady?"NASA POWER model ready · 2018–2024":modelError?"Source guide ready · model unavailable":"Preparing the bundled historical model…"}</span>{modelError&&<button type="button" aria-label="Retry historical model" onClick={()=>void loadModel().catch(()=>{})}><RefreshCw size={15}/></button>}</div>
        <div className="agr-helper-log" ref={log} role="log" aria-live="polite" aria-relevant="additions" aria-label="Agrorithm conversation">{messages.map(message=>message.role==="user"?<article className="agr-helper-user" key={message.id}><span className="eyebrow">YOUR QUESTION</span><p>{message.text}</p></article>:<article className="agr-helper-answer" key={message.id}><span className="agr-helper-answer-kind">{message.answer.kind==="learned-pattern"?<Database size={13}/>:<BookOpen size={13}/>} {kinds[message.answer.kind]}</span><h3>{message.answer.title}</h3><p>{message.answer.text}</p>{message.answer.facts&&<ul>{message.answer.facts.map(fact=><li key={fact}>{fact}</li>)}</ul>}<div className="agr-helper-links">{message.answer.links.map(link=><a key={link.href+link.label} href={link.href} {...(link.href.startsWith("https:")?{target:"_blank",rel:"noreferrer"}:{})} onClick={()=>{if(link.href.startsWith("#"))setOpen(false);}}>{link.label}<ArrowUpRight size={14}/></a>)}</div></article>)}{busy&&<p className="agr-helper-busy" role="status"><Leaf size={15}/> Reading the bundled historical record…</p>}</div>
        <div className="agr-helper-suggestions" aria-label="Suggested questions">{suggestions.map(prompt=><button type="button" key={prompt} disabled={busy} onClick={()=>void ask(prompt)}><MessageCircle size={14}/>{prompt}</button>)}</div>
        <form className="agr-helper-form" onSubmit={e=>{e.preventDefault();void ask(question);}}><label htmlFor="agr-helper-question">Your question</label><div><input ref={input} id="agr-helper-question" value={question} onChange={e=>setQuestion(e.target.value)} maxLength={600} placeholder="Ask about July 2023, water, soil…" autoComplete="off"/><button type="submit" disabled={busy||!question.trim()} aria-label="Send question"><Send size={18}/></button></div></form>
        <footer className="agr-helper-footer"><span>Session only · no farm recommendation</span><button type="button" disabled={busy} onClick={()=>setMessages([{id:id.current++,role:"helper",answer:HELPER_WELCOME}])}><Trash2 size={13}/> Clear conversation</button></footer>
      </div>
    </dialog>
  </>;
}
