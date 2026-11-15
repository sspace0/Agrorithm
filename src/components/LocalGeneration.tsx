import { useCallback, useEffect, useRef, useState } from "react";
import { Download, Square, Trash2 } from "lucide-react";
import type { HelperAnswer } from "../engine/agrorithmHelper";
import { GENERATIVE_MODEL, generationEvidence, validateGeneration } from "../generative/generationPolicy";
import type { LocalGenerationClient } from "../generative/generative-client";
import type { GenerationWorkerEvent } from "../generative/generative-protocol";
import "./local-generation.css";
import ScientificText from "./ScientificText";

export interface GeneratedDraft { state:"pending"|"accepted"|"rejected"; text?:string; reason?:string; seconds?:number; }
export function GeneratedExplanation({draft}:{draft:GeneratedDraft}) {
  return <section className={`agr-generated-explanation generated-${draft.state}`} aria-live="polite"><strong>{draft.state==="pending"?"Generating on this device…":draft.state==="accepted"?"Experimental trained source reading":"Verified answer retained"}</strong>{draft.text&&<p><ScientificText>{draft.text}</ScientificText></p>}{draft.reason&&<p>{draft.reason}</p>}{draft.state==="accepted"&&<small>Check this wording against the source answer below. Calculations are unchanged.</small>}</section>;
}
interface Props { open:boolean; question?:string; answer?:HelperAnswer; onDraft:(draft:GeneratedDraft)=>void; }
type Status = "off"|"loading"|"ready"|"generating"|"error";

export default function LocalGeneration(props:Props) {
  const [status,setStatus]=useState<Status>("off"), [progress,setProgress]=useState<GenerationWorkerEvent|null>(null), [error,setError]=useState(""), [expanded,setExpanded]=useState(false);
  const client=useRef<LocalGenerationClient|null>(null), epoch=useRef(0), latest=useRef(props), previous=useRef<HelperAnswer|null>(null), progressAt=useRef(0);
  useEffect(()=>{latest.current=props;},[props]);
  const stop=useCallback(()=>{epoch.current++;client.current?.dispose();client.current=null;setStatus("off");setProgress(null);},[]);
  useEffect(()=>{if(!props.open)stop();},[props.open,stop]);
  useEffect(()=>()=>{epoch.current++;client.current?.dispose();},[]);

  const generate=useCallback(async(current:Props)=>{
    if(!client.current||!current.answer||!current.question)return;
    const evidence=generationEvidence(current.question,current.answer);
    if(!evidence)return;
    previous.current=current.answer;
    const turn=epoch.current;
    setStatus("generating");setError("");current.onDraft({state:"pending"});
    try {
      const output=await client.current.generate(evidence,event=>{if(turn===epoch.current)setProgress(event);});
      if(turn!==epoch.current)return;
      if(output.type!=="complete")throw Error("The model did not return a complete draft.");
      const validation=validateGeneration(output.text,evidence);
      current.onDraft({...validation,state:validation.accepted?"accepted":"rejected",seconds:output.elapsedMs/1000});
      setStatus("ready");setProgress(null);
    } catch (cause) {
      current.onDraft({state:"rejected",reason:turn!==epoch.current?"Generation stopped. The verified answer remains available.":"This device could not finish the draft. Use the verified answer."});
      if(turn===epoch.current){setError(cause instanceof Error?cause.message:"Generation failed.");setStatus("error");client.current?.dispose();client.current=null;}
    }
  },[]);
  useEffect(()=>{if(status==="ready"&&props.answer&&props.answer!==previous.current)void generate(props);},[props,status,generate]);
  const enable=async()=>{
    const turn=++epoch.current;setStatus("loading");setError("");setProgress(null);
    try {
      const {LocalGenerationClient:Client}=await import("../generative/generative-client");
      if(turn!==epoch.current)return;
      client.current=new Client();
      await client.current.load(event=>{if(turn===epoch.current&&(performance.now()-progressAt.current>100||event.type!=="progress")){progressAt.current=performance.now();setProgress(event);}});
      if(turn!==epoch.current)return;
      setStatus("ready");setExpanded(false);setProgress(null);
    } catch(cause) {
      if(turn!==epoch.current)return;
      setError(cause instanceof Error?cause.message:"The model could not load.");setStatus("error");client.current?.dispose();client.current=null;
    }
  };
  const loading=status==="loading"||status==="generating";
  const download=progress?.type==="progress"?progress:null;
  return <details className="agr-generative-options" open={expanded} onToggle={event=>setExpanded(event.currentTarget.open)}>
    <summary>Local generative explanation <span>{status==="off"?"Optional":status==="loading"?"Loading…":status==="generating"?"Writing…":status==="error"?"Unavailable":"Ready"}</span></summary>
    <div className="agr-generative-settings">
      <p>Optional download: about 120 MB including runtime. Runs in a worker on this device. Questions are not uploaded. Extra memory and processing are needed.</p>
      <p>Fine-tuned locally on NASA-derived records and documented source explanations. Only supported record readings and source statements are shown; broader drafts are blocked. Calculations remain in the verified answer.</p>
      {download&&<div className="agr-generation-progress" role="status"><span>{download.file}</span>{download.total&&download.loaded!==undefined?<><progress max={download.total} value={download.loaded}/><small>{(download.loaded/1e6).toFixed(2)} / {(download.total/1e6).toFixed(2)} MB</small></>:<progress/>}</div>}
      {progress?.type==="tokens"&&<p role="status">Generating locally · {progress.count} tokens · {(progress.elapsedMs/1000).toFixed(1)} s</p>}
      {error&&<p className="agr-generation-error" role="alert">Local generation unavailable. Your source answer still works. {error}</p>}
      <div className="agr-generation-actions">{status==="off"||status==="error"?<button type="button" onClick={()=>void enable()}><Download size={15}/> Enable & download model</button>:<button type="button" onClick={stop}><Square size={14}/>{loading?"Cancel generation / download":"Disable & free memory"}</button>}
        {!loading&&<button type="button" onClick={()=>{stop();if(typeof caches!=="undefined")void caches.delete(GENERATIVE_MODEL.cacheName).then(()=>setError("Downloaded model files were removed from this site's model cache."));}}><Trash2 size={14}/> Remove model cache</button>}</div>
      <div className="agr-generation-links"><a href={GENERATIVE_MODEL.source} target="_blank" rel="noreferrer">Model & limitations</a><a href={GENERATIVE_MODEL.license} target="_blank" rel="noreferrer">Apache 2.0</a></div>
    </div>
  </details>;
}

