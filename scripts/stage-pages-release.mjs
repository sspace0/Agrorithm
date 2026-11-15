import * as fs from 'node:fs/promises';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const inside=(parent,child)=>{const rel=path.relative(parent,child);return rel!==''&&rel!=='..'&&!rel.startsWith(`..${path.sep}`)&&!path.isAbsolute(rel);};
const git=(args,cwd=ROOT)=>execFileSync('git',args,{cwd,encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
async function regularTree(directory){
  const info=await fs.lstat(directory);
  if(info.isSymbolicLink()||!info.isDirectory())throw Error('Artifact directory must be real');
  for(const entry of await fs.readdir(directory,{withFileTypes:true})){
    const child=path.join(directory,entry.name),info=await fs.lstat(child);
    if(info.isSymbolicLink()||(!info.isDirectory()&&!info.isFile()))throw Error('Artifact links or special files are forbidden');
    if(/^(?:\.git|\.env(?:\..*)?|private-farms)$/i.test(entry.name))throw Error('Private or control files are forbidden in artifacts');
    if(info.isDirectory())await regularTree(child);
  }
}
async function main(){
  if(!process.env.RUNNER_TEMP||!process.env.PAGES_WORKTREE||!process.env.SOURCE_SHA)throw Error('RUNNER_TEMP, PAGES_WORKTREE and SOURCE_SHA are required');
  const temp=await fs.realpath(process.env.RUNNER_TEMP),target=await fs.realpath(process.env.PAGES_WORKTREE);
  if(!inside(temp,target)||(await fs.lstat(process.env.PAGES_WORKTREE)).isSymbolicLink())throw Error('Pages worktree must be a real child of RUNNER_TEMP');
  const control=await fs.lstat(path.join(target,'.git'));
  if(!control.isFile()||control.isSymbolicLink())throw Error('Expected a linked Git worktree control file');
  if(await fs.realpath(git(['rev-parse','--show-toplevel'],target))!==target)throw Error('Unexpected Pages worktree root');
  try{git(['symbolic-ref','-q','HEAD'],target);throw Error('Pages worktree must be detached');}catch(error){if(error.status!==1)throw error;}
  const sourceSha=git(['rev-parse','HEAD']);
  if(!/^[0-9a-f]{40}$/.test(process.env.SOURCE_SHA)||sourceSha!==process.env.SOURCE_SHA)throw Error('Release source SHA differs from actual checkout');
  const deployment=JSON.parse(await fs.readFile(path.join(ROOT,'deployment.config.json'),'utf8'));
  const base=process.env.DEPLOY_BASE||deployment.base;
  if(typeof base!=='string'||!/^\/(?:[A-Za-z0-9_-]+\/)*$/.test(base))throw Error('Invalid deployment base');
  const dist=path.join(ROOT,'dist');await regularTree(dist);
  await fs.access(path.join(dist,'index.html'));
  // Validate every existing artifact subtree before deleting any child. .git is preserved.
  const children=(await fs.readdir(target)).filter(name=>name!=='.git');
  for(const name of children){
    const child=path.join(target,name),info=await fs.lstat(child);
    if(!inside(target,child)||info.isSymbolicLink()||(!info.isDirectory()&&!info.isFile()))throw Error('Unsafe artifact child');
    if(info.isDirectory())await regularTree(child);
  }
  for(const name of children)await fs.rm(path.join(target,name),{recursive:true,force:false});
  for(const name of await fs.readdir(dist))await fs.cp(path.join(dist,name),path.join(target,name),{recursive:true,errorOnExist:true,force:false});
  await fs.writeFile(path.join(target,'.nojekyll'),'');
  await fs.writeFile(path.join(target,'release.json'),JSON.stringify({schema:1,sourceSha,base,preparedAt:new Date().toISOString(),publication:'Prepared artifact branch; a separate authenticated Pages build trigger is required.'},null,2)+'\n');
  console.log(`Staged verified build for source ${sourceSha} at base ${base}.`);
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
