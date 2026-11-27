import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const source=readFileSync(new URL('../scripts/sw-template.js',import.meta.url),'utf8').replace('__BASE_PATH__','/').replace('__CACHE_VERSION__','test').replace('__PRECACHE__','["/index.html","/schedule.json","/app.js"]');
function setup(fetcher,base='/'){
 const handlers={},stored=new Map();const cache={match:async key=>stored.get(typeof key==='string'?key:new URL(key.url).pathname)?.clone(),put:async(key,response)=>stored.set(key,response.clone()),addAll:async()=>{}};
 const self={addEventListener:(name,fn)=>handlers[name]=fn,location:{origin:'https://test.example'},clients:{claim:async()=>{}}};
 vm.runInNewContext(source.replace("const BASE='/';","const BASE="+JSON.stringify(base)+";"),{self,caches:{open:async()=>cache,keys:async()=>[]},fetch:fetcher,URL,Response,Headers,Promise,Error});
 return {handlers,stored,request:async path=>{let promise;handlers.fetch({request:new Request('https://test.example'+path),respondWith:p=>{promise=p;}});return promise;}};
}
test('Service worker vraagt nieuw rooster op en bewaart dit voor offline',async()=>{
 let fetched=false;const body={generatedAt:'2026-11-26T12:00:00Z',sources:[],sessions:[]};const sw=setup(async()=>{fetched=true;return new Response(JSON.stringify(body),{headers:{'Content-Type':'application/json'}});});
 assert.equal((await (await sw.request('/schedule.json')).json()).generatedAt,body.generatedAt);assert.equal(fetched,true);assert.ok(sw.stored.has('/schedule.json'));
});
test('Offline rooster houdt zijn ophaaldatum en krijgt offline markering',async()=>{
 const sw=setup(async()=>{throw new Error('offline');});sw.stored.set('/schedule.json',new Response('{"generatedAt":"2026-11-25T12:00:00Z"}',{headers:{'Content-Type':'application/json'}}));
 const response=await sw.request('/schedule.json');assert.equal(response.headers.get('X-Zwemstad-Offline'),'1');assert.equal((await response.json()).generatedAt,'2026-11-25T12:00:00Z');
});
test('Een HTML-foutpagina vervangt de offline roosterreserve niet',async()=>{
 const sw=setup(async()=>new Response('<html>fout</html>',{headers:{'Content-Type':'text/html'}}));sw.stored.set('/schedule.json',new Response('{"saved":true}',{headers:{'Content-Type':'application/json'}}));assert.equal((await (await sw.request('/schedule.json')).json()).saved,true);
});

test('GitHub-projectpad gebruikt eigen rooster en blijft buiten andere websites',async()=>{
 const sw=setup(async()=>new Response(JSON.stringify({generatedAt:'2026-11-27T09:00:00Z',sources:[],sessions:[]}),{headers:{'Content-Type':'application/json'}}),'/zwemstad/');
 assert.equal((await sw.request('/zwemstad/schedule.json')).status,200);
 assert.ok(sw.stored.has('/zwemstad/schedule.json'));assert.equal(await sw.request('/ander-project/schedule.json'),undefined);
});
