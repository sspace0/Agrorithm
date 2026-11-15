/* global self, performance, URL */
import {env,pipeline,TextStreamer} from "@huggingface/transformers";
import runtimeModuleUrl from "../../node_modules/@huggingface/transformers/dist/ort-wasm-simd-threaded.jsep.mjs?url";
import runtimeWasmUrl from "../../node_modules/@huggingface/transformers/dist/ort-wasm-simd-threaded.jsep.wasm?url";
import {GENERATION_MODEL_MANIFEST} from "./model-location";
import {GENERATIVE_MODEL,generationPrompt} from "./generationPolicy";
import {createTrainedModelCache} from "./trained-model-store";
let generator=null,running=false;
env.allowLocalModels=false;env.useBrowserCache=false;
if(env.backends.onnx.wasm){env.backends.onnx.wasm.numThreads=1;env.backends.onnx.wasm.proxy=false;env.backends.onnx.wasm.wasmPaths={mjs:runtimeModuleUrl,wasm:runtimeWasmUrl};}
self.onmessage=async({data})=>{
 if(running){self.postMessage({id:data.id,type:"error",message:"A local model task is already running."});return;}running=true;
 try{
  if(data.type==="load"){
   const started=performance.now(),url=new URL(GENERATION_MODEL_MANIFEST,self.location.origin).href;
   const cache=await createTrainedModelCache(url,GENERATIVE_MODEL.cacheName,event=>self.postMessage({id:data.id,type:"progress",...event}));
   env.customCache=cache;env.useCustomCache=true;env.remoteHost=new URL(".",url).href;env.remotePathTemplate="{revision}/";
   generator??=await pipeline("text2text-generation",GENERATIVE_MODEL.id,{revision:GENERATIVE_MODEL.revision,dtype:"q8",device:"wasm"});
   self.postMessage({id:data.id,type:"ready",loadMs:performance.now()-started,model:cache.manifest.model});
  }else{
   if(!generator)throw Error("Enable the trained model before requesting a generated reading.");
   const started=performance.now();let tokens=0;
   const streamer=new TextStreamer(generator.tokenizer,{skip_prompt:true,callback_function:()=>{},token_callback_function:token=>{tokens+=token.length;self.postMessage({id:data.id,type:"tokens",count:tokens,elapsedMs:performance.now()-started});}});
   const result=await generator(generationPrompt(data.evidence),{max_new_tokens:220,do_sample:false,repetition_penalty:1.0,streamer});
   self.postMessage({id:data.id,type:"complete",text:result[0].generated_text,tokens,elapsedMs:performance.now()-started});
  }
 }catch(error){self.postMessage({id:data.id,type:"error",message:error instanceof Error?error.message:"The local model could not run. The documented helper remains available."});}finally{running=false;}
};

