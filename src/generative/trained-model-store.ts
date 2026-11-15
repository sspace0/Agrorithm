export interface ModelPart { url:string; bytes:number; sha256:string; }
export interface ModelFile { path:string; bytes:number; sha256:string; parts:ModelPart[]; }
export interface TrainedModelManifest { schema:1; model:string; trainingRun:string; totalBytes:number; license:string; files:ModelFile[]; }
export interface ModelDownloadProgress { file:string; loaded:number; total:number; status:string; }

const hashPattern=/^[a-f0-9]{64}$/;
export function parseTrainedManifest(value:unknown):TrainedModelManifest {
  if(!value||typeof value!=="object")throw Error("Model manifest is missing.");
  const manifest=value as TrainedModelManifest;
  if(manifest.schema!==1||!manifest.model||!Array.isArray(manifest.files)||manifest.files.length>30)throw Error("Unsupported model manifest.");
  const seen=new Set<string>();let total=0;
  for(const file of manifest.files){
    if(!file.path||file.path.includes("..")||file.path.startsWith("/")||seen.has(file.path)||!Number.isSafeInteger(file.bytes)||file.bytes<=0||file.bytes>110000000||!hashPattern.test(file.sha256)||!Array.isArray(file.parts))throw Error("Invalid model file entry.");
    seen.add(file.path);let bytes=0;
    for(const part of file.parts){if(!part.url||part.url.includes("..")||part.url.startsWith("/")||part.url.includes(":")||!Number.isSafeInteger(part.bytes)||part.bytes<=0||part.bytes>8388608||!hashPattern.test(part.sha256))throw Error("Invalid model part entry.");bytes+=part.bytes;}
    if(bytes!==file.bytes)throw Error("Model part sizes do not match the file.");total+=file.bytes;
  }
  if(total!==manifest.totalBytes||total>180000000)throw Error("Model total is invalid or exceeds the supported download size.");
  return manifest;
}
const checksum=async(bytes:Uint8Array)=>[...new Uint8Array(await crypto.subtle.digest("SHA-256",bytes.buffer as ArrayBuffer))].map(value=>value.toString(16).padStart(2,"0")).join("");

/** Assemble verified static parts in the inference worker, keeping each Git blob small. */
export async function createTrainedModelCache(manifestURL:string,cacheName:string,onProgress:(progress:ModelDownloadProgress)=>void) {
  const response=await fetch(manifestURL);
  if(!response.ok)throw Error("The trained model manifest is unavailable. Use the documented helper instead.");
  const manifest=parseTrainedManifest(await response.json()),base=new URL(".",manifestURL);
  const cache=typeof caches!=="undefined"?await caches.open(cacheName).catch(()=>null):null;
  const inFlight=new Map<string,Promise<Response>>();
  const match=async(key:string|Request)=>{
    const requestURL=new URL(typeof key==="string"?key:key.url,base);
    const file=manifest.files.find(entry=>requestURL.pathname.endsWith("/"+entry.path));
    if(!file)return undefined;
    if(inFlight.has(file.path))return (await inFlight.get(file.path)!).clone();
    const prepare=(async()=>{
      const buffer=new Uint8Array(file.bytes);let offset=0;
      for(const part of file.parts){
        const url=new URL(part.url,base);
        if(url.origin!==base.origin||!url.pathname.startsWith(base.pathname))throw Error("Model part escaped its static directory.");
        let bytes:Uint8Array|undefined;
        const cached=await cache?.match(url.href);
        if(cached){const candidate=new Uint8Array(await cached.arrayBuffer());if(candidate.byteLength===part.bytes&&await checksum(candidate)===part.sha256)bytes=candidate;}
        if(!bytes){
          const partResponse=await fetch(url.href);
          if(!partResponse.ok)throw Error(`Model part unavailable (${partResponse.status}). The documented helper still works.`);
          const chunks:Uint8Array[]=[];let loaded=0;const reader=partResponse.body?.getReader();
          if(reader){for(;;){const next=await reader.read();if(next.done)break;chunks.push(next.value);loaded+=next.value.byteLength;onProgress({file:file.path,loaded:offset+loaded,total:file.bytes,status:"Downloading"});if(loaded>part.bytes)throw Error("Model part exceeds its recorded size.");}}
          else{const chunk=new Uint8Array(await partResponse.arrayBuffer());chunks.push(chunk);loaded=chunk.byteLength;}
          bytes=new Uint8Array(loaded);let index=0;for(const chunk of chunks){bytes.set(chunk,index);index+=chunk.byteLength;}
          if(bytes.byteLength!==part.bytes||await checksum(bytes)!==part.sha256)throw Error("Model part checksum failed. Clear the model cache and retry.");
          if(cache)await cache.put(url.href,new Response(bytes.buffer as ArrayBuffer)).catch(()=>{});
        }
        buffer.set(bytes,offset);offset+=bytes.byteLength;onProgress({file:file.path,loaded:offset,total:file.bytes,status:"Preparing verified parts"});
      }
      if(await checksum(buffer)!==file.sha256)throw Error("Assembled model checksum failed.");
      return new Response(buffer.buffer as ArrayBuffer,{headers:{"Content-Type":file.path.endsWith(".json")?"application/json":"application/octet-stream"}});
    })();
    inFlight.set(file.path,prepare);
    try{return (await prepare).clone();}finally{inFlight.delete(file.path);}
  };
  return {manifest,match,put:async()=>{}};
}
