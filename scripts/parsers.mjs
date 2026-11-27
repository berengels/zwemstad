import {load} from 'cheerio';
import {createHash} from 'node:crypto';
import {addDays,classify} from '../src/agenda.mjs';
const months=['januari','februari','maart','april','mei','juni','juli','augustus','september','oktober','november','december'];
const weekdays=['zondag','maandag','dinsdag','woensdag','donderdag','vrijdag','zaterdag'];
const english=['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
export function session(pool,date,start,end,title,bassin,kind) {
  if(/^gesloten$/i.test(title.trim())&&start==='00:00'&&end==='00:00')end='23:59';
  if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(start)||!/^([01]\d|2[0-3]):[0-5]\d$/.test(end)||end<=start)return null;
  const id=createHash('sha256').update([pool.id,date,start,end,title,bassin].join('|')).digest('hex').slice(0,18);
  return {id,poolId:pool.id,date,start,end,title,bassin,category:classify(title),kind,sourceUrl:pool.url};
}
export function parseSbr(html,pool,today) {
  const $=load(html),result=[];
  $('.block-roster__day').each((_,day)=>{
    const label=$(day).find('.block-roster__title').text().trim().toLowerCase();
    const m=label.match(/(zondag|maandag|dinsdag|woensdag|donderdag|vrijdag|zaterdag)\s+(\d{1,2})\s+(\w+)(?:\s+(\d{4}))?/);
    if(!m)return;
    const year=Number(today.slice(0,4));
    const choices=[year-1,year,year+1].map(y=>`${y}-${String(months.indexOf(m[3])+1).padStart(2,'0')}-${m[2].padStart(2,'0')}`);
    const date=choices.find(d=>d>=addDays(today,-7)&&d<=addDays(today,21)&&(!m[4]||d.startsWith(m[4]))&&weekdays[new Date(d+'T12:00:00Z').getUTCDay()]===m[1]);
    if(!date)return;
    $(day).find('.block-roster__program-item').each((_,item)=>{
      const t=$(item).find('.block-roster__program-item-time').text().match(/(\d{2}:\d{2})\s*[-–]\s*(\d{2}:\d{2})/);
      if(!t)return;
      const row=session(pool,date,t[1],t[2],$(item).find('.block-roster__program-item-activity').text().trim(),$(item).find('.block-roster__program-item-location').text().trim(),'dated');
      if(row)result.push(row);
    });
  });
  return [...new Map(result.map(s=>[s.id,s])).values()];
}
export function parseSportfondsen(html,pool,today) {
  const $=load(html),raw=$('#__NEXT_DATA__').text();
  if(!raw)throw new Error('Roosterstructuur niet herkend');
  const extra=JSON.parse(raw).props?.pageProps?.extraPageProps;
  const rows=extra?.scheduleData?.timeSlots;
  if(!Array.isArray(rows))throw new Error('Geen uitleesbaar rooster gevonden');
  if(extra.unusualopeninghours?.hideOpeningHours)return [];
  const result=[];
  for(let i=0;i<7;i++) {
    const date=addDays(today,i),day=english[new Date(date+'T12:00:00Z').getUTCDay()];
    for(const row of rows.filter(r=>r.dayValue===day)) {
      if(row.unusualOpeningTimes)continue;
      const a=row.activitySchedule?.activity;if(!a?.title)continue;
      // These multi-sport venues also publish bowling, fitness and gym sessions.
      if(!/zwem|aqua|swim|floatfit|fifty.?fit|piyochi|borstcrawl|snorkel|zeemeermin|seniorenfit/i.test(a.title))continue;
      const s=session(pool,date,row.startTime,row.endTime,a.title,'','weekly');if(s)result.push(s);
    }
  }
  return [...new Map(result.map(s=>[s.id,s])).values()];
}
