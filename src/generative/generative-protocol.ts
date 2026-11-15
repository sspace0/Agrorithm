import type { GenerationEvidence } from "./generationPolicy";

export type GenerationCommand = { id:number; type:"load" } | { id:number; type:"generate"; evidence:GenerationEvidence };
export type GenerationWorkerEvent =
  | { id:number; type:"progress"; file:string; loaded?:number; total?:number; status:string }
  | { id:number; type:"ready"; loadMs:number }
  | { id:number; type:"tokens"; count:number; elapsedMs:number }
  | { id:number; type:"complete"; text:string; tokens:number; elapsedMs:number }
  | { id:number; type:"error"; message:string };
