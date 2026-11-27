import {categories} from './agenda.mjs';
export const STALE_AFTER_MS=36*60*60*1000;
export function validateSchedule(data,pools) {
  const invalid=()=>{throw new Error('De roostergegevens hebben een onbekend formaat.');};
  const ids=new Set(pools.map(p=>p.id));
  if(!data||data.timezone!=='Europe/Amsterdam'||!Number.isFinite(Date.parse(data.generatedAt))||!Array.isArray(data.sources)||!Array.isArray(data.sessions)||data.sessions.length>50000)invalid();
  const sourceIds=new Set();
  for(const s of data.sources){
    if(!ids.has(s.poolId)||sourceIds.has(s.poolId)||!['ok','closed','empty','error','pending'].includes(s.status)||typeof s.message!=='string'||s.message.length>2000||(s.checkedAt!==null&&!Number.isFinite(Date.parse(s.checkedAt))))invalid();
    if(s.closedDates!==undefined&&(!Array.isArray(s.closedDates)||s.closedDates.some(d=>!/^\d{4}-\d{2}-\d{2}$/.test(d))))invalid();
    sourceIds.add(s.poolId);
  }
  if(sourceIds.size!==ids.size)invalid();
  const eventIds=new Set();
  for(const s of data.sessions){
    if(!ids.has(s.poolId)||typeof s.id!=='string'||eventIds.has(s.id)||!/^\d{4}-\d{2}-\d{2}$/.test(s.date)||!/^([01]\d|2[0-3]):[0-5]\d$/.test(s.start)||!/^([01]\d|2[0-3]):[0-5]\d$/.test(s.end)||s.end<=s.start||typeof s.title!=='string'||!s.title||s.title.length>1000||typeof s.bassin!=='string'||!categories.includes(s.category)||!['dated','weekly'].includes(s.kind)||s.sourceUrl!==pools.find(p=>p.id===s.poolId).url)invalid();
    eventIds.add(s.id);
  }
  return data;
}
export function sourceIsStale(source,now=Date.now()) {return !source?.checkedAt||now-Date.parse(source.checkedAt)>STALE_AFTER_MS;}
export function scheduleHealth(snapshot,now=Date.now()) {
  const connected=snapshot.sources.filter(s=>s.status!=='pending');
  return {errors:connected.filter(s=>s.status==='error').length,stale:connected.some(s=>sourceIsStale(s,now)),connected:connected.length};
}
export async function fetchSchedule(url,pools,fetcher=fetch) {
  const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),15000);
  try{
    const response=await fetcher(url,{cache:'no-store',signal:controller.signal,headers:{Accept:'application/json'}});
    if(!response.ok)throw new Error('Het online rooster is tijdelijk niet bereikbaar.');
    const data=validateSchedule(await response.json(),pools);
    return {data,offline:response.headers.get('X-Zwemstad-Offline')==='1'};
  }finally{clearTimeout(timeout);}
}
