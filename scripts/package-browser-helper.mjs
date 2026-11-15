/* global process, console */
import {readFile,writeFile,mkdir} from "node:fs/promises";
import {resolve,join,sep,basename} from "node:path";
import {createHash} from "node:crypto";

const [sourceArg,metadataArg,targetArg]=process.argv.slice(2);
if(!sourceArg||!metadataArg||!targetArg)throw Error("Usage: node scripts/package-browser-helper.mjs SOURCE_DIR MANIFEST_JSON OUTPUT_DIR");
const source=resolve(sourceArg),target=resolve(targetArg),metadata=JSON.parse(await readFile(metadataArg,"utf8"));
const sha=bytes=>createHash("sha256").update(bytes).digest("hex"),files=[];
await mkdir(join(target,"parts"),{recursive:true});
for(const [path,record] of Object.entries(metadata.files)){
 const input=resolve(source,path);if(!input.startsWith(source+sep))throw Error("Source file escaped its directory.");
 const bytes=await readFile(input);if(bytes.length!==record.bytes||sha(bytes)!==record.sha256)throw Error("Source checksum mismatch: "+path);
 const parts=[];
 for(let offset=0,index=0;offset<bytes.length;offset+=4194304,index++){
  const part=bytes.subarray(offset,Math.min(bytes.length,offset+4194304)),name=path.replaceAll("/","--")+"."+String(index).padStart(3,"0")+".bin";
  await writeFile(join(target,"parts",name),part);parts.push({url:"parts/"+name,bytes:part.length,sha256:sha(part)});
 }
 files.push({path,bytes:bytes.length,sha256:record.sha256,parts});
}
const manifest={schema:1,model:metadata.model,trainingRun:metadata.trainingRun,base:metadata.base,baseRevision:metadata.revision,license:metadata.license,totalBytes:files.reduce((sum,file)=>sum+file.bytes,0),files};
await writeFile(join(target,"manifest.json"),JSON.stringify(manifest,null,2)+"\n");
console.log(JSON.stringify({directory:basename(target),files:files.length,parts:files.reduce((sum,file)=>sum+file.parts.length,0),bytes:manifest.totalBytes,maxPartBytes:Math.max(...files.flatMap(file=>file.parts.map(part=>part.bytes)))}));
