import {readFile} from 'node:fs/promises';
import {scheduleHealth} from '../src/schedule.mjs';
const data=JSON.parse(await readFile(new URL('../data/schedule.json',import.meta.url),'utf8'));
const health=scheduleHealth(data);
console.log(JSON.stringify(health));
if(health.errors||health.stale){console.error('Een of meer bronnen zijn niet actueel. Controleer de Actions-log en de bronpagina’s.');process.exitCode=1;}
