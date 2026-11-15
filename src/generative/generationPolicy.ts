import { GUIDE } from "../data/guide";
import type { HelperAnswer } from "../engine/agrorithmHelper";

export const GENERATIVE_MODEL={id:"agrorithm/nasa-source-explainer",revision:"v2",dtype:"q8" as const,weightBytes:97894525,cacheName:"agrorithm-trained-explainer-v2",source:"https://huggingface.co/google/flan-t5-small",license:"https://www.apache.org/licenses/LICENSE-2.0"};
export interface GenerationEvidence {question:string;passage:string;mode:"weather"|"guide";label:string;expected:string[];}
export interface GenerationValidation {accepted:boolean;text?:string;reason?:string;}
const normal=(value:string)=>value.replace(/\s+/g," ").replace(/[−–]/g,"-").replace(/°\s*C/g,"C").trim().toLowerCase();
const decimal=(value:string)=>Number(value).toFixed(2);

/** Restrict the trained generator to auditable record readings and canonical source passages. */
export function generationEvidence(question:string,answer:HelperAnswer):GenerationEvidence|null {
  if(answer.kind==="learned-pattern"&&answer.context?.month&&answer.facts){
    const all=answer.facts.join(" "),temperature=all.match(/Mean daily minimum ([+-]?\d+(?:\.\d+)?) °C; mean daily maximum ([+-]?\d+(?:\.\d+)?) °C/),rain=all.match(/Monthly precipitation ([+-]?\d+(?:\.\d+)?) mm; ([+-]?\d+(?:\.\d+)?)%/),coverage=all.match(/Coverage (\d+)\/(\d+) complete days/);
    if(!temperature||!rain||!coverage||coverage[1]!==coverage[2])return null;
    const month=answer.context.month,field=/\bmin(?:imum)?\b/i.test(question)?"minimum":/\bmax(?:imum)?|temperature\b/i.test(question)?"maximum":"precipitation";
    const value=field==="minimum"?decimal(temperature[1]):field==="maximum"?decimal(temperature[2]):decimal(rain[1]),unit=field==="precipitation"?"mm":"C";
    const passage=`Source: NASA POWER historical daily point record. Point 32.1 N, 73 E. Month ${month}. Complete days ${coverage[1]}. Mean daily minimum ${decimal(temperature[1])} C. Mean daily maximum ${decimal(temperature[2])} C. Total precipitation ${decimal(rain[1])} mm. Days below 1 mm rain ${decimal(rain[2])}%. Regional grid, not a field sensor. Not a forecast.`;
    const reading=`${month}, NASA POWER recorded ${field} ${value} ${unit}. This is regional historical data, not a forecast.`;
    return {mode:"weather",label:`NASA POWER ${field==="precipitation"?"monthly precipitation":`mean daily ${field}`} reading`,question:`Read this historical card and tell me the ${field} value for ${month}.`,passage,expected:[`In ${reading}`,`For ${reading}`]};
  }
  if(answer.kind!=="source-guide")return null;
  const entry=GUIDE.find(item=>item.title===answer.title||answer.sections?.some(section=>section.title===item.title));
  if(!entry)return null;
  return {mode:"guide",label:entry.title,question:`Please explain: ${entry.title}`,passage:`Source: src/data/guide.ts, topic ${entry.id}. ${entry.answer}`,expected:[entry.answer]};
}
export function generationPrompt(evidence:GenerationEvidence){return "Answer using only the source. Keep the source numbers, units and limits. Say unknown when the evidence is missing.\nSource: "+evidence.passage+"\nQuestion: "+evidence.question+"\nAnswer:";}

/** Numeric vocabulary alone cannot detect swapped units or reversed caveats. Match supported claims. */
export function validateGeneration(raw:string,evidence:GenerationEvidence):GenerationValidation {
  const text=raw.trim(),reject=(reason:string):GenerationValidation=>({accepted:false,reason});
  if(text.length<35||text.length>3000||/https?:|www\.|\bdoi\b/i.test(text))return reject("The generated reading could not be verified against this source.");
  const value=normal(text);
  if(evidence.mode==="weather"){
    if(!evidence.expected.some(expected=>normal(expected)===value))return reject("The reading did not preserve the exact date, field, value, unit and historical limit. Use the verified answer.");
  }else{
    const source=normal(evidence.expected[0]);
    const sentences=text.split(/(?<=[.!?])\s+(?=[A-Z])/).map(sentence=>normal(sentence));
    let position=0;
    if(!sentences.length||sentences.some(sentence=>!/[.!?]$/.test(sentence))||sentences.join(" ")!==value)return reject("The source explanation was incomplete or unsupported.");
    for(const sentence of sentences){const index=source.indexOf(sentence,position);if(index<0)return reject("The draft changed a source statement or its units. The verified explanation is retained.");position=index+sentence.length;}
    if(/\b(?:cannot|unknown|not|illustrative|provisional)\b/i.test(source)&&!/\b(?:cannot|unknown|not|illustrative|provisional)\b/i.test(value))return reject("The draft omitted a source limitation.");
  }
  const clarified=evidence.mode==="weather"?text.replace(/recorded (minimum|maximum)/,"recorded mean daily $1"):text;
  const shown=clarified.replace(/(?<![\w.])-?\d+\.\d{3,}(?![\w.])/g,match=>String(Number(Number(match).toFixed(2))));
  return {accepted:true,text:shown};
}
