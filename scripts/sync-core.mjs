import {parseSbr,parseSportfondsen} from './parsers.mjs';
import {validateSchedule} from '../src/schedule.mjs';
import {dateInRotterdam} from '../src/agenda.mjs';
export async function synchronize({pools,previous,fetchHtml,now=new Date()}) {
  const checkedAt=now.toISOString(),today=dateInRotterdam(now),sources=[],sessions=[];
  for(let i=0;i<pools.length;i+=2)await Promise.all(pools.slice(i,i+2).map(async pool=>{
    if(pool.adapter==='pending'){
      sources.push({poolId:pool.id,status:'pending',checkedAt:null,count:0,closedDates:[],message:'Roosterkoppeling nog niet beschikbaar; bekijk het bronrooster'});return;
    }
    try{
      const html=await fetchHtml(pool);
      const parsed=(pool.adapter==='sbr'?parseSbr:parseSportfondsen)(html,pool,today);
      // An empty parser result is not proof of an empty timetable or a closure.
      if(!parsed.length)throw new Error('Geen herkenbaar rooster; eerdere gegevens blijven bewaard');
      const closedDates=[...new Set(parsed.filter(s=>/^gesloten$/i.test(s.title.trim())).map(s=>s.date))];
      const rows=parsed.filter(s=>!/^gesloten$/i.test(s.title.trim()));sessions.push(...rows);
      sources.push({poolId:pool.id,status:rows.length?'ok':'closed',closedDates,checkedAt,count:rows.length,message:rows.length?(pool.adapter==='sbr'?'Gedateerd bronrooster':'Standaardweek; uitzonderingen controleren'):`Sluitingsmeldingen voor ${closedDates.length} dagen in het bronrooster`});
    }catch(error){
      const old=previous?.sources.find(s=>s.poolId===pool.id),rows=previous?.sessions.filter(s=>s.poolId===pool.id)||[];sessions.push(...rows);
      sources.push({poolId:pool.id,status:'error',checkedAt:old?.checkedAt||null,closedDates:old?.closedDates||[],count:rows.length,message:`Verversen mislukt: ${String(error.message).slice(0,300)}`});
    }
  }));
  const success=sources.some(s=>['ok','closed'].includes(s.status));
  if(!success&&!previous)throw new Error('Geen roosterbron bereikbaar en geen vorige gegevens beschikbaar');
  return validateSchedule({generatedAt:success?checkedAt:previous.generatedAt,attemptedAt:checkedAt,timezone:'Europe/Amsterdam',registrySource:'https://www.rotterdamzwemt.nl/',sources:sources.sort((a,b)=>a.poolId.localeCompare(b.poolId)),sessions:sessions.sort((a,b)=>a.date.localeCompare(b.date)||a.start.localeCompare(b.start)||a.id.localeCompare(b.id))},pools);
}
