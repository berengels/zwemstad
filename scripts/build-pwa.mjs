import {readFile,writeFile,mkdir,readdir,copyFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {deflateSync} from 'node:zlib';
import getBasePath from './base-path.cjs';
const base=getBasePath()+'/';
const root=new URL('../',import.meta.url),dist=new URL('dist/',root);
await mkdir(new URL('icons/',dist),{recursive:true});
// Deterministic vector-based app icon; no remote images or fonts.
function crc32(b){let c=0xffffffff;for(const byte of b){c^=byte;for(let k=0;k<8;k++)c=(c>>>1)^((c&1)?0xedb88320:0);}return (c^0xffffffff)>>>0;}
function chunk(type,data){const t=Buffer.from(type),len=Buffer.alloc(4),crc=Buffer.alloc(4);len.writeUInt32BE(data.length);crc.writeUInt32BE(crc32(Buffer.concat([t,data])));return Buffer.concat([len,t,data,crc]);}
function icon(size){
 const raw=Buffer.alloc((size*4+1)*size);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const xx=(x+.5)*512/size,yy=(y+.5)*512/size;
  let color=[35,75,238];
  if((xx-336)**2+(yy-156)**2<34**2)color=[223,239,145];
  for(const center of [256,316,376]){const wave=center+12*Math.sin((xx-128)*Math.PI/128);if(xx>=128&&xx<=384&&Math.abs(yy-wave)<10)color=[246,245,239];}
  const i=y*(size*4+1)+1+x*4;raw[i]=color[0];raw[i+1]=color[1];raw[i+2]=color[2];raw[i+3]=255;
 }
 const ihdr=Buffer.alloc(13);ihdr.writeUInt32BE(size,0);ihdr.writeUInt32BE(size,4);ihdr[8]=8;ihdr[9]=6;
 return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',ihdr),chunk('IDAT',deflateSync(raw)),chunk('IEND',Buffer.alloc(0))]);
}
for(const size of [180,192,512])await writeFile(new URL(`icons/icon-${size}.png`,dist),icon(size));
const manifest={id:base,name:'Zwemstad · zwemagenda Rotterdam',short_name:'Zwemstad',description:'Vind jouw zwemmoment in Rotterdam. Eén agenda met zwemroosters, filters en favoriete zwembaden.',lang:'nl-NL',start_url:base,scope:base,display:'standalone',background_color:'#F6F5EF',theme_color:'#234BEE',icons:[{src:base+'icons/icon-192.png',sizes:'192x192',type:'image/png',purpose:'any'},{src:base+'icons/icon-512.png',sizes:'512x512',type:'image/png',purpose:'any'},{src:base+'icons/icon-512.png',sizes:'512x512',type:'image/png',purpose:'maskable'}]};
await writeFile(new URL('manifest.webmanifest',dist),JSON.stringify(manifest,null,2));
await copyFile(new URL('data/schedule.json',root),new URL('schedule.json',dist));
await copyFile(new URL('public/pwa.js',root),new URL('pwa.js',dist));
await copyFile(new URL('public/_headers',root),new URL('_headers',dist));
let html=await readFile(new URL('index.html',dist),'utf8');
html=html.replace('<html lang="en">','<html lang="nl">').replace(/<meta name="viewport"[^>]*>/,'<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">');
html=html.replace('</head>',`<meta name="theme-color" content="#234BEE"><meta name="description" content="Alle zwemmomenten in één Rotterdamse zwemagenda."><meta name="apple-mobile-web-app-capable" content="yes"><meta name="apple-mobile-web-app-status-bar-style" content="default"><link rel="manifest" href="${base}manifest.webmanifest"><link rel="apple-touch-icon" href="${base}icons/icon-180.png"><link rel="icon" type="image/png" href="${base}icons/icon-192.png"><script src="${base}pwa.js" defer></script></head>`);
await writeFile(new URL('index.html',dist),html);
async function walk(dir,prefix=''){let paths=[];for(const e of await readdir(dir,{withFileTypes:true})){const path=prefix+e.name;if(e.isDirectory())paths.push(...await walk(new URL(e.name+'/',dir),path+'/'));else paths.push('/'+path);}return paths;}
const files=(await walk(dist)).filter(p=>!['/_headers','/metadata.json','/service-worker.js'].includes(p)&&!p.endsWith('.map'));
const hash=createHash('sha256').update(await readFile(new URL('scripts/sw-template.js',root),'utf8'));
for(const file of files.sort())hash.update(file).update(await readFile(new URL(file.slice(1),dist)));
const version=hash.digest('hex').slice(0,12);
const sw=(await readFile(new URL('scripts/sw-template.js',root),'utf8')).replace('__CACHE_VERSION__',version).replace('__PRECACHE__',JSON.stringify(files.map(file=>base+file.slice(1)))).replace('__BASE_PATH__',base);
await writeFile(new URL('service-worker.js',dist),sw);
await writeFile(new URL('.nojekyll',dist),'');
console.log(`PWA voorbereid: ${files.length} bestanden, versie ${version}`);
