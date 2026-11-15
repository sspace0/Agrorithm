import { createHash, randomUUID } from 'node:crypto';
import * as fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const PREFIX='public/data/nasa-helper-model/parts/';
const REMOTE='https://fieldshift-jt1.spacetime24.chatgpt.site/data/nasa-helper-model/parts/';
const SPEC=path.join(ROOT,'.github/trained-reader-release.json');
const manifestFile=path.join(ROOT,'public/data/nasa-helper-model/manifest.json');
const sha256=data=>createHash('sha256').update(data).digest('hex');
const gitBlobSha=data=>createHash('sha1').update(`blob ${data.length}\0`).update(data).digest('hex');
const inside=(parent,child)=>{const rel=path.relative(parent,child);return rel!==''&&!rel.startsWith(`..${path.sep}`)&&rel!=='..'&&!path.isAbsolute(rel);};
function validatePart(part){
  if(typeof part.path!=='string'||!part.path.startsWith(PREFIX)||!(/^[A-Za-z0-9][A-Za-z0-9_.-]*\.bin$/).test(part.path.slice(PREFIX.length)))throw Error('Invalid model part path');
  if(!Number.isSafeInteger(part.bytes)||part.bytes<1||part.bytes>8*1024*1024)throw Error('Invalid model part size');
  if(!/^[0-9a-f]{64}$/.test(part.sha256)||!/^[0-9a-f]{40}$/.test(part.gitBlobSha))throw Error('Invalid model part digest');
}
async function safeParents(relative){
  const target=path.resolve(ROOT,relative);
  if(!inside(ROOT,target))throw Error('Model part escaped checkout');
  let current=ROOT;
  for(const segment of relative.split('/').slice(0,-1)){
    current=path.join(current,segment);
    try{await fs.mkdir(current);}catch(error){if(error.code!=='EEXIST')throw error;}
    const info=await fs.lstat(current);
    if(info.isSymbolicLink()||!info.isDirectory())throw Error('Model part parent must be a real directory');
  }
  if(!inside(await fs.realpath(ROOT),await fs.realpath(path.dirname(target))))throw Error('Model part parent escaped checkout');
  try{const info=await fs.lstat(target);if(info.isSymbolicLink()||!info.isFile())throw Error('Model part must be a regular file');}catch(error){if(error.code!=='ENOENT')throw error;}
  return target;
}
function verify(data,part){
  if(data.length!==part.bytes||sha256(data)!==part.sha256||gitBlobSha(data)!==part.gitBlobSha)throw Error(`Model integrity mismatch: ${path.basename(part.path)}`);
}
async function main(){
  const manifestBytes=await fs.readFile(manifestFile);
  const manifest=JSON.parse(manifestBytes);
  const entries=manifest.files.flatMap(file=>file.parts.map(part=>({path:PREFIX+part.url.replace(/^parts\//,''),bytes:part.bytes,sha256:part.sha256})));
  if(process.argv.includes('--write-spec')){
    const parts=[];
    for(const entry of entries){
      // Compute the spec from the actual local bytes, then cross-check runtime metadata.
      const target=await safeParents(entry.path),data=await fs.readFile(target);
      const part={...entry,gitBlobSha:gitBlobSha(data)};
      validatePart(part);verify(data,part);parts.push(part);
    }
    const spec={schema:1,model:manifest.model,trainingRun:manifest.trainingRun,remoteBase:REMOTE,modelManifestSha256:sha256(manifestBytes),partCount:parts.length,totalBytes:parts.reduce((sum,p)=>sum+p.bytes,0),parts};
    await fs.writeFile(SPEC,JSON.stringify(spec,null,2)+'\n');
    console.log(`Pinned ${parts.length} actual model parts (${spec.totalBytes} bytes).`);
    return;
  }
  const spec=JSON.parse(await fs.readFile(SPEC,'utf8'));
  if(spec.schema!==1||spec.remoteBase!==REMOTE||spec.model!==manifest.model||spec.modelManifestSha256!==sha256(manifestBytes)||spec.partCount!==entries.length||spec.parts?.length!==entries.length)throw Error('Release specification does not match the runtime model manifest');
  const expected=new Map(entries.map(part=>[part.path,part]));
  const seen=new Set();
  for(const part of spec.parts){
    validatePart(part);
    const entry=expected.get(part.path);
    if(seen.has(part.path)||!entry||entry.bytes!==part.bytes||entry.sha256!==part.sha256)throw Error('Release part differs from runtime manifest');
    seen.add(part.path);
  }
  if(spec.totalBytes!==spec.parts.reduce((sum,p)=>sum+p.bytes,0)||spec.totalBytes!==manifest.totalBytes)throw Error('Release total bytes differ');
  let cursor=0,downloaded=0,existing=0;
  async function worker(){
    while(cursor<spec.parts.length){
      const part=spec.parts[cursor++];
      let target=await safeParents(part.path);
      try{verify(await fs.readFile(target),part);existing++;continue;}catch(error){if(error.code!=='ENOENT'&&!error.message.startsWith('Model integrity mismatch:'))throw error;}
      if(process.argv.includes('--verify-local'))throw Error(`Missing or mismatched local model part: ${path.basename(part.path)}`);
      const response=await fetch(REMOTE+path.basename(part.path),{redirect:'error',signal:AbortSignal.timeout(60000)});
      if(!response.ok||!response.body)throw Error(`Model part download failed (${response.status}): ${path.basename(part.path)}`);
      const chunks=[];let length=0;
      for await(const chunk of response.body){length+=chunk.length;if(length>part.bytes)throw Error('Model response exceeded pinned size');chunks.push(chunk);}
      const data=Buffer.concat(chunks);verify(data,part);
      target=await safeParents(part.path);
      const temporary=path.join(path.dirname(target),`.trained-part-${randomUUID()}.tmp`);
      try{await fs.writeFile(temporary,data,{flag:'wx',mode:0o644});await safeParents(part.path);await fs.rename(temporary,target);}finally{await fs.rm(temporary,{force:true});}
      downloaded++;
    }
  }
  await Promise.all(Array.from({length:4},worker));
  console.log(`Verified ${spec.parts.length} model parts (${spec.totalBytes} bytes): ${downloaded} downloaded, ${existing} already present.`);
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
