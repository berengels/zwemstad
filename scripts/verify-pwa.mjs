import {readFile,access} from 'node:fs/promises';
import assert from 'node:assert/strict';
import getBasePath from './base-path.cjs';
const base=getBasePath()+'/';
const dist=new URL('../dist/',import.meta.url);
const manifest=JSON.parse(await readFile(new URL('manifest.webmanifest',dist),'utf8'));
assert.equal(manifest.display,'standalone');assert.equal(manifest.start_url,base);
for(const icon of manifest.icons){const png=await readFile(new URL(icon.src.slice(base.length),dist));assert.equal(png.readUInt32BE(16),Number(icon.sizes.split('x')[0]));}
const html=await readFile(new URL('index.html',dist),'utf8');
for(const file of ['/manifest.webmanifest','/pwa.js','/icons/icon-180.png']){assert.ok(html.includes(base+file.slice(1)));await access(new URL(file.slice(1),dist));}
const worker=await readFile(new URL('service-worker.js',dist),'utf8');assert.ok(!worker.includes('__PRECACHE__'));assert.ok(worker.includes('X-Zwemstad-Offline'));
assert.ok((await readFile(new URL('_headers',dist),'utf8')).includes('/schedule.json\n  Cache-Control: no-store'));
console.log('PWA gecontroleerd: manifest, PNG-iconen, service worker, offline markering en cache-instellingen.');
