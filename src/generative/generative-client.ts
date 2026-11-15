import type { GenerationEvidence } from "./generationPolicy";
import type { GenerationCommand, GenerationWorkerEvent } from "./generative-protocol";

export class LocalGenerationClient {
  private worker:Worker;
  private nextId = 1;
  private requests = new Map<number,{resolve:(event:GenerationWorkerEvent)=>void;reject:(error:Error)=>void;progress?:(event:GenerationWorkerEvent)=>void;timer:ReturnType<typeof setTimeout>}>();
  constructor() {
    this.worker = new Worker(new URL("./generative-worker.js",import.meta.url),{type:"module"});
    this.worker.onmessage = ({data}:MessageEvent<GenerationWorkerEvent>) => {
      const request = this.requests.get(data.id);
      if (!request) return;
      if (data.type === "progress" || data.type === "tokens") { request.progress?.(data); return; }
      clearTimeout(request.timer); this.requests.delete(data.id);
      if (data.type === "error") request.reject(new Error(data.message));
      else request.resolve(data);
    };
    this.worker.onerror = () => this.dispose("The browser could not start the local language model. The source answer still works.");
  }
  private request(command:Omit<GenerationCommand,"id">,progress:((event:GenerationWorkerEvent)=>void)|undefined,timeout:number) {
    const id = this.nextId++;
    return new Promise<GenerationWorkerEvent>((resolve,reject)=>{
      const timer = setTimeout(()=>this.dispose("The local model took too long. Use the verified answer or try again on a faster device."),timeout);
      this.requests.set(id,{resolve,reject,progress,timer});
      this.worker.postMessage({...command,id});
    });
  }
  load(progress:(event:GenerationWorkerEvent)=>void) { return this.request({type:"load"},progress,480000); }
  generate(evidence:GenerationEvidence,progress?:(event:GenerationWorkerEvent)=>void) { return this.request({type:"generate",evidence} as Omit<GenerationCommand,"id">,progress,120000); }
  dispose(message="Local generation cancelled. The verified source answer remains available.") {
    this.worker.terminate();
    for (const request of this.requests.values()) { clearTimeout(request.timer); request.reject(new Error(message)); }
    this.requests.clear();
  }
}
