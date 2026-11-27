export const categories = ['Alles','Banenzwemmen','Vrij zwemmen','Aquasport','Baby & peuter','Zwemles','Overig'];
export function classify(t) {
  if (/baby|peuter|ouder.*kind/i.test(t)) return 'Baby & peuter';
  if (/zwemles|zwem-?abc|diploma|zwemvaardigheid|schoolzwem|abc intensief/i.test(t)) return 'Zwemles';
  if (/banen|trimzwem/i.test(t)) return 'Banenzwemmen';
  if (/vrijzwem|vrij zwem|gezin|recreatief|oefenuur/i.test(t)) return 'Vrij zwemmen';
  if (/aqua|floatfit|fifty|swimr|piyochi|borstcrawl/i.test(t)) return 'Aquasport';
  return 'Overig';
}
export function dateInRotterdam(now=new Date()) {
  const p=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Amsterdam',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now);
  return ['year','month','day'].map(k=>p.find(x=>x.type===k).value).join('-');
}
export function addDays(date,n) {const d=new Date(`${date}T12:00:00Z`);d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10);}
export function offset(date) {
  const p=new Intl.DateTimeFormat('en-US',{timeZone:'Europe/Amsterdam',timeZoneName:'shortOffset'}).formatToParts(new Date(`${date}T12:00:00Z`));
  const m=p.find(p=>p.type==='timeZoneName').value.match(/GMT([+-])(\d+)(?::(\d+))?/);
  return m?`${m[1]}${m[2].padStart(2,'0')}:${m[3]||'00'}`:'+00:00';
}
export function filterSessions(sessions,f,pools,now=new Date()) {
  const q=f.query.trim().toLocaleLowerCase('nl');
  return sessions.filter(s=>{
    const p=pools.find(p=>p.id===s.poolId);
    return p&&s.date===f.date&&(f.category==='Alles'||s.category===f.category)&&(!f.poolIds.length||f.poolIds.includes(s.poolId))&&(!f.favoritesOnly||f.favoriteIds.includes(s.poolId))&&s.start>=f.from&&(!f.upcomingOnly||Date.parse(`${s.date}T${s.start}:00${offset(s.date)}`)>=now.getTime())&&`${s.title} ${p.name} ${p.area}`.toLocaleLowerCase('nl').includes(q);
  }).sort((a,b)=>a.start.localeCompare(b.start)||a.poolId.localeCompare(b.poolId)||a.title.localeCompare(b.title));
}
