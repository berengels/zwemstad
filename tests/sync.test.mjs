import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {synchronize} from '../scripts/sync-core.mjs';
import {fetchSchedule,validateSchedule,scheduleHealth} from '../src/schedule.mjs';
const pools=JSON.parse(readFileSync(new URL('../data/pools.json',import.meta.url)));
const previous=JSON.parse(readFileSync(new URL('../data/schedule.json',import.meta.url)));
const now=new Date('2026-11-26T12:00:00Z');
test('Bronuitval behoudt vorige tijden, sluitingen en werkelijke ophaaltijd',async()=>{
 const data=await synchronize({pools,previous,now,fetchHtml:async()=>{throw new Error('timeout');}});
 assert.equal(data.generatedAt,previous.generatedAt);assert.equal(data.attemptedAt,now.toISOString());assert.deepEqual(data.sessions,previous.sessions.slice().sort((a,b)=>a.date.localeCompare(b.date)||a.start.localeCompare(b.start)||a.id.localeCompare(b.id)));
 for(const s of data.sources.filter(s=>s.status==='error')){const old=previous.sources.find(x=>x.poolId===s.poolId);assert.equal(s.checkedAt,old.checkedAt);assert.deepEqual(s.closedDates,old.closedDates||[]);}
 assert.ok(scheduleHealth(data,now.getTime()).errors>0);
});
test('Een veranderde HTML-structuur wist geen opgeslagen rooster',async()=>{
 const p=pools.find(p=>p.id==='zwemcentrum');const old={...previous,sources:previous.sources.filter(s=>s.poolId===p.id),sessions:previous.sessions.filter(s=>s.poolId===p.id)};
 const data=await synchronize({pools:[p],previous:old,now,fetchHtml:async()=>'<html>Nieuwe website</html>'});
 assert.equal(data.sources[0].status,'error');assert.equal(data.sessions.length,old.sessions.length);
});
test('Eerste import zonder bereikbare bron mislukt expliciet',async()=>{await assert.rejects(synchronize({pools,now,fetchHtml:async()=>{throw new Error('403');}}),/Geen roosterbron/);});
test('Online rooster wordt opgehaald zonder HTTP-cache; offline reserve is herkenbaar',async()=>{
 let options;const result=await fetchSchedule('/schedule.json',pools,async(url,o)=>{options=o;return new Response(JSON.stringify(previous),{headers:{'Content-Type':'application/json','X-Zwemstad-Offline':'1'}});});
 assert.equal(options.cache,'no-store');assert.equal(result.offline,true);assert.equal(result.data.sessions.length,previous.sessions.length);
});
test('Kapotte of vervalste gegevens worden niet als rooster geaccepteerd',async()=>{
 assert.throws(()=>validateSchedule({...previous,sources:[]},pools));
 const bad=structuredClone(previous);bad.sessions[0].sourceUrl='javascript:alert(1)';assert.throws(()=>validateSchedule(bad,pools));
 await assert.rejects(fetchSchedule('/schedule.json',pools,async()=>new Response('not found',{status:404})),/niet bereikbaar/);
});
test('Bronstatus wordt oud op basis van broncontrole, ook bij een recente ophaalronde',()=>{
 const data=structuredClone(previous);data.generatedAt=now.toISOString();data.sources[0].checkedAt='2026-11-20T00:00:00Z';data.sources[0].status='ok';assert.equal(scheduleHealth(data,now.getTime()).stale,true);
});
