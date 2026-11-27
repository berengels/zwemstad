import {readFile,writeFile,mkdir,rename} from 'node:fs/promises';
import {synchronize} from './sync-core.mjs';
const pools=JSON.parse(await readFile(new URL('../data/pools.json',import.meta.url),'utf8'));
const file=new URL('../data/schedule.json',import.meta.url);
let previous;try{previous=JSON.parse(await readFile(file,'utf8'));}catch{}
const cached=process.argv.includes('--cached');
await mkdir(new URL('../.cache/',import.meta.url),{recursive:true});
const snapshot=await synchronize({pools,previous,now:cached?new Date(previous.generatedAt):new Date(),fetchHtml:async pool=>{
  const cache=new URL(`../.cache/${pool.id}.html`,import.meta.url);
  if(cached)return readFile(cache,'utf8');
  const response=await fetch(pool.url,{signal:AbortSignal.timeout(25000),headers:{'User-Agent':'Zwemstad/0.2 (public swimming timetable aggregation)'}});
  if(!response.ok)throw new Error(`Bron geeft HTTP ${response.status}`);
  const html=await response.text();await writeFile(cache,html);return html;
}});
await writeFile(new URL('../data/schedule.next.json',import.meta.url),JSON.stringify(snapshot,null,2)+'\n');
await rename(new URL('../data/schedule.next.json',import.meta.url),file);
for(const s of snapshot.sources)console.log(`${pools.find(p=>p.id===s.poolId).name}: ${s.status}, ${s.count} momenten`);
console.log(`Totaal ${snapshot.sessions.length} momenten. Ophaalronde: ${snapshot.attemptedAt}`);
