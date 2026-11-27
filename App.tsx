import React, {useEffect, useState} from 'react';
import {View,Text,Pressable,ScrollView,TextInput,StyleSheet,Modal,Linking,useWindowDimensions,Platform} from 'react-native';
import {SafeAreaProvider,SafeAreaView} from 'react-native-safe-area-context';
import {StatusBar} from 'expo-status-bar';
import {Ionicons} from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import pools from './data/pools.json';
import initialSnapshot from './data/schedule.json';
import {useSchedule} from './src/useSchedule';
import {scheduleHealth,sourceIsStale} from './src/schedule.mjs';
import {categories,addDays,dateInRotterdam,filterSessions} from './src/agenda.mjs';

// Wasp-inspired dark palette.
const C={bg:'#242424',panel:'#191919',raised:'#2A2A2A',line:'#3D3D3D',text:'#FAF2D6',muted:'#BDAE93',accent:'#F8C537',active:'#7A5C14',warning:'#D49335',onAccent:'#1A2023'};
const mono=Platform.select({web:'ui-monospace, SFMono-Regular, Menlo, monospace',ios:'Menlo',default:'monospace'});
type Session=typeof initialSnapshot.sessions[number];
type Source={poolId:string;status:string;checkedAt:string|null;closedDates?:string[];count:number;message:string};
type IconName=React.ComponentProps<typeof Ionicons>['name'];
type Tab='Agenda'|'Zwembaden'|'Bewaard';
const tabs:{title:Tab;icon:IconName}[]=[{title:'Agenda',icon:'calendar-outline'},{title:'Zwembaden',icon:'water-outline'},{title:'Bewaard',icon:'bookmark-outline'}];
const fmt=(date:string,options:Intl.DateTimeFormatOptions)=>new Intl.DateTimeFormat('nl-NL',{...options,timeZone:'Europe/Amsterdam'}).format(new Date(date+'T12:00:00Z'));
const stamp=(date?:string|null)=>date?new Intl.DateTimeFormat('nl-NL',{timeZone:'Europe/Amsterdam',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}).format(new Date(date)):'—';
function Icon({name,size=18,color=C.muted}:{name:IconName;size?:number;color?:string}){return <Ionicons name={name} size={size} color={color}/>;}
function IconButton({label,icon,onPress,active=false}:{label:string;icon:IconName;onPress:()=>void;active?:boolean}){
 return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{selected:active}} onPress={onPress} style={({pressed})=>[s.iconButton,active&&s.iconOn,pressed&&s.pressed]}><Icon name={icon} color={active?C.accent:C.muted}/></Pressable>;
}
function Button({title,onPress,selected=false,icon}:{title:string;onPress:()=>void;selected?:boolean;icon?:IconName}){
 return <Pressable accessibilityRole="button" accessibilityState={{selected}} onPress={onPress} style={({pressed})=>[s.button,selected&&s.buttonOn,pressed&&s.pressed]}>{icon&&<Icon name={icon} size={16} color={selected?C.accent:C.muted}/>}<Text style={[s.buttonText,selected&&s.activeText]}>{title}</Text></Pressable>;
}
function FilterPanel({poolIds,togglePool,from,setFrom,upcoming,setUpcoming,reset,hideHeader=false}:{hideHeader?:boolean;poolIds:string[];togglePool:(id:string)=>void;from:string;setFrom:(v:string)=>void;upcoming:boolean;setUpcoming:(v:boolean)=>void;reset:()=>void}){
 return <View style={s.filters}>
  {!hideHeader&&<View style={s.between}><Text style={s.sectionLabel}>Filters</Text><IconButton label="Wis filters" icon="refresh-outline" onPress={reset}/></View>}
  <Text style={s.filterLabel}>Begintijd</Text>
  <View style={s.wrap}>{['00:00','07:00','12:00','17:00','20:00'].map(t=><Button key={t} title={t==='00:00'?'Hele dag':t} selected={from===t} onPress={()=>setFrom(t)}/>)}</View>
  <Pressable accessibilityRole="switch" accessibilityState={{checked:upcoming}} onPress={()=>setUpcoming(!upcoming)} style={[s.between,s.switchRow]}><Text style={s.bodyText}>Nog te beginnen</Text><Icon name={upcoming?'toggle':'toggle-outline'} color={upcoming?C.accent:C.muted} size={28}/></Pressable>
  <View style={[s.between,{marginTop:20,marginBottom:8}]}><Text style={s.filterLabel}>Zwembaden</Text><Text style={s.meta}>{poolIds.length?`${poolIds.length} / ${pools.length}`:'Alle'}</Text></View>
  {pools.map(p=><Pressable key={p.id} accessibilityRole="checkbox" accessibilityLabel={p.name} accessibilityState={{checked:poolIds.includes(p.id)}} onPress={()=>togglePool(p.id)} style={({pressed})=>[s.poolCheck,poolIds.includes(p.id)&&s.poolCheckOn,pressed&&s.pressed]}><Icon name={poolIds.includes(p.id)?'checkbox':'square-outline'} color={poolIds.includes(p.id)?C.accent:C.muted} size={17}/><Text style={[s.poolCheckText,poolIds.includes(p.id)&&s.activeText]}>{p.name}</Text></Pressable>)}
 </View>;
}
export default function App(){return <SafeAreaProvider><Main/></SafeAreaProvider>;}
function Main(){
 const {snapshot,dataState,refresh}=useSchedule();
 const {width}=useWindowDimensions(),wide=width>=1000;
 const [canInstall,setCanInstall]=useState(false),[installInfo,setInstallInfo]=useState(false),[offlineReady,setOfflineReady]=useState(false);
 const [now,setNow]=useState(new Date()),[tab,setTab]=useState<Tab>('Agenda'),[date,setDate]=useState(dateInRotterdam()),[category,setCategory]=useState('Alles'),[query,setQuery]=useState(''),[poolIds,setPoolIds]=useState<string[]>([]),[from,setFrom]=useState('00:00'),[upcoming,setUpcoming]=useState(false),[favorites,setFavorites]=useState<string[]>([]),[loaded,setLoaded]=useState(false),[filterOpen,setFilterOpen]=useState(false),[detail,setDetail]=useState<Session|null>(null),[sourcesOpen,setSourcesOpen]=useState(false),[storageError,setStorageError]=useState(false);
 const today=dateInRotterdam(now);
 useEffect(()=>setDate(current=>current<today?today:current),[today]);
 useEffect(()=>{
  AsyncStorage.getItem('zwemstad.favorites').then(v=>{if(v){const parsed=JSON.parse(v);if(Array.isArray(parsed))setFavorites(parsed.filter(x=>typeof x==='string'&&pools.some(p=>p.id===x)));}}).catch(()=>setStorageError(true)).finally(()=>setLoaded(true));
  const interval=setInterval(()=>setNow(new Date()),60000);return()=>clearInterval(interval);
 },[]);
 useEffect(()=>{if(loaded)AsyncStorage.setItem('zwemstad.favorites',JSON.stringify(favorites)).catch(()=>setStorageError(true));},[favorites,loaded]);
 useEffect(()=>{
  if(Platform.OS!=='web')return;
  const update=()=>{setCanInstall(Boolean((window as any).zwemstadCanInstall?.()));setOfflineReady(document.documentElement.dataset.zwemstadOffline==='ready');};
  update();window.addEventListener('zwemstad-install-ready',update);window.addEventListener('zwemstad-offline-ready',update);
  return()=>{window.removeEventListener('zwemstad-install-ready',update);window.removeEventListener('zwemstad-offline-ready',update);};
 },[]);
 const install=async()=>{if(Platform.OS==='web'&&canInstall)await (window as any).zwemstadInstall?.();else setInstallInfo(true);};
 const toggleFavorite=(id:string)=>setFavorites(v=>v.includes(id)?v.filter(x=>x!==id):[...v,id]);
 const togglePool=(id:string)=>setPoolIds(v=>v.includes(id)?v.filter(x=>x!==id):[...v,id]);
 const reset=()=>{setCategory('Alles');setQuery('');setPoolIds([]);setFrom('00:00');setUpcoming(false);};
 const rows=filterSessions(snapshot.sessions,{date,category,query,poolIds,from,upcomingOnly:upcoming,favoritesOnly:tab==='Bewaard',favoriteIds:favorites},pools,now) as Session[];
 const health=scheduleHealth(snapshot,now.getTime());
 const source=(id:string):Source|undefined=>snapshot.sources.find(x=>x.poolId===id);
 const sourceStatus=(id:string)=>{
  const data=source(id);
  if(!data||data.status==='pending')return 'Niet gekoppeld';
  if(data.status==='error')return 'Bronfout';
  if(sourceIsStale(data,now.getTime()))return 'Verouderd';
  if(data.closedDates?.includes(date))return 'Gesloten';
  if(data.status==='closed')return 'Geen momenten';
  return pools.find(p=>p.id===id)?.adapter==='sportfondsen'?'Standaardweek':'Dagrooster';
 };
 const openUrl=(url:string)=>{Linking.openURL(url).catch(()=>{if(Platform.OS==='web')alert('Bron niet bereikbaar.');});};
 const filterCount=poolIds.length+(category!=='Alles'?1:0)+(from!=='00:00'?1:0)+(upcoming?1:0);
 const notice=storageError?'Favorieten niet opgeslagen':dataState==='offline'?'Offline · opgeslagen roosters':dataState==='error'?'Verversen mislukt · opgeslagen roosters':health.stale?'Verouderde brongegevens':health.errors?'Bron niet bijgewerkt':null;
 const closeDetails=()=>{setDetail(null);setSourcesOpen(false);setInstallInfo(false);};
 const filterProps={poolIds,togglePool,from,setFrom,upcoming,setUpcoming,reset};
 return <SafeAreaView style={s.root} edges={['top','left','right']}><StatusBar style="light"/>
  <View style={[s.header,{paddingHorizontal:wide?24:12}]}>
   <Pressable accessibilityRole="button" accessibilityLabel="Zwemstad start" onPress={()=>setTab('Agenda')} style={s.logo}><Icon name="water-outline" color={C.accent} size={20}/><Text style={s.wordmark}>Zwemstad</Text></Pressable>
   {wide&&<View style={s.tabs}>{tabs.map(t=><Pressable key={t.title} accessibilityRole="tab" accessibilityState={{selected:tab===t.title}} onPress={()=>setTab(t.title)} style={[s.tab,tab===t.title&&s.tabOn]}><Icon name={t.icon} color={tab===t.title?C.accent:C.muted} size={17}/><Text style={[s.tabText,tab===t.title&&s.selectedText]}>{t.title}</Text></Pressable>)}</View>}
   <View style={s.row}>
    <Pressable accessibilityRole="button" accessibilityLabel={`Bronnen: ${health.connected} van ${pools.length} gekoppeld`} onPress={()=>setSourcesOpen(true)} style={s.sourceButton}><Text style={s.sourceCount}>{health.connected}/{pools.length}</Text><Icon name="server-outline" size={16}/></Pressable>
    <IconButton label={dataState==='loading'?'Roosters ophalen':'Ververs roosters'} icon="refresh-outline" active={dataState==='loading'} onPress={()=>void refresh()}/>
    <IconButton label={canInstall?'Installeer Zwemstad':'Op je beginscherm'} icon="download-outline" onPress={()=>void install()}/>
   </View>
  </View>
  {notice&&<Pressable accessibilityRole="button" onPress={()=>setSourcesOpen(true)} style={s.notice}><Icon name="warning-outline" color={C.warning} size={16}/><Text accessibilityLiveRegion="polite" style={s.noticeText}>{notice}</Text></Pressable>}
  <View style={s.workspace}>
   {wide&&tab!=='Zwembaden'&&<ScrollView style={s.sidebar} contentContainerStyle={{paddingBottom:24}}><FilterPanel {...filterProps}/></ScrollView>}
   <ScrollView style={s.main} contentContainerStyle={[s.mainContent,{paddingHorizontal:wide?32:16,paddingBottom:wide?32:100}]} keyboardShouldPersistTaps="handled">
    {tab==='Zwembaden'?<>
     <View style={s.listHeader}><Text style={s.listTitle}>Zwembaden</Text><Text style={s.meta}>{pools.length}</Text></View>
     {pools.map(p=><View key={p.id} style={s.poolRow}>
      <View style={{flex:1,gap:5}}><Text style={s.poolName}>{p.name}</Text><Text style={s.meta}>{p.area} · {p.operator}</Text><Text style={[s.meta,source(p.id)?.status==='pending'&&{color:C.warning}]}>{sourceStatus(p.id)}</Text></View>
      <View style={s.poolActions}><IconButton label={`Agenda ${p.name}`} icon="calendar-outline" onPress={()=>{setPoolIds([p.id]);setTab('Agenda');}}/><IconButton label={`Bronrooster ${p.name}`} icon="open-outline" onPress={()=>openUrl(p.url)}/><IconButton label={`${favorites.includes(p.id)?'Verwijder':'Bewaar'} ${p.name}`} icon={favorites.includes(p.id)?'bookmark':'bookmark-outline'} active={favorites.includes(p.id)} onPress={()=>toggleFavorite(p.id)}/></View>
     </View>)}
    </>:<>
     <View style={s.toolbar}><View style={s.search}><Icon name="search-outline" size={18}/><TextInput accessibilityLabel="Zoek activiteit, zwembad of wijk" placeholder="Zoeken" placeholderTextColor={C.muted} selectionColor={C.accent} value={query} onChangeText={setQuery} style={s.searchInput}/>{!!query&&<IconButton label="Wis zoekopdracht" icon="close" onPress={()=>setQuery('')}/>}</View>{!wide&&<Button title={filterCount?`Filters · ${filterCount}`:'Filters'} icon="options-outline" onPress={()=>setFilterOpen(true)}/>}</View>
     <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.categoryList}>{categories.map(c=><Button key={c} title={c} selected={category===c} onPress={()=>setCategory(c)}/>)}</ScrollView>
     <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.dateList}>{Array.from({length:14},(_,i)=>addDays(today,i)).map((d,i)=><Pressable key={d} accessibilityRole="button" accessibilityLabel={fmt(d,{weekday:'long',day:'numeric',month:'long'})} accessibilityState={{selected:date===d}} onPress={()=>setDate(d)} style={[s.date,date===d&&s.dateOn]}><Text style={[s.dayLabel,date===d&&s.activeText]}>{i===0?'Vandaag':i===1?'Morgen':fmt(d,{weekday:'short'})}</Text><Text style={[s.dayNumber,date===d&&s.activeText]}>{Number(d.slice(-2))}</Text><Text style={[s.month,date===d&&s.activeText]}>{fmt(d,{month:'short'})}</Text></Pressable>)}</ScrollView>
     <View style={s.listHeader}><Text style={s.listTitle}>{fmt(date,{weekday:'long',day:'numeric',month:'long'})}</Text><Text accessibilityLabel={`${rows.length} zwemmomenten`} style={s.resultCount}>{rows.length}</Text></View>
     {!rows.length&&<View style={s.empty}><Icon name={tab==='Bewaard'&&!favorites.length?'bookmark-outline':'calendar-outline'} color={C.muted} size={24}/><Text style={s.meta}>{tab==='Bewaard'&&!favorites.length?'Geen bewaarde zwembaden':'Geen momenten'}</Text><Button title={tab==='Bewaard'&&!favorites.length?'Zwembaden':'Wis filters'} onPress={tab==='Bewaard'&&!favorites.length?()=>setTab('Zwembaden'):reset}/></View>}
     {rows.map(row=>{const p=pools.find(p=>p.id===row.poolId)!;const old=sourceIsStale(source(p.id),now.getTime());return <View key={row.id} style={s.agendaRow}>
      <View style={s.times}><Text style={s.start}>{row.start}</Text><Text style={s.end}>{row.end}</Text></View>
      <Pressable accessibilityRole="button" accessibilityLabel={`${row.title}, ${p.name}, ${row.start} tot ${row.end}`} onPress={()=>setDetail(row)} style={s.event}><Text style={s.activity}>{row.title}</Text><Text style={s.location}>{p.name}</Text><Text style={s.meta}>{row.bassin||p.area}</Text>{(row.kind==='weekly'||old||source(p.id)?.status==='error')&&<View style={s.tags}>{row.kind==='weekly'&&<Text style={s.tag}>Standaardweek</Text>}{old&&<Text style={s.warningTag}>Verouderd</Text>}{source(p.id)?.status==='error'&&<Text style={s.warningTag}>Bronfout</Text>}</View>}</Pressable>
      <IconButton label={`${favorites.includes(p.id)?'Verwijder':'Bewaar'} ${p.name}`} icon={favorites.includes(p.id)?'bookmark':'bookmark-outline'} active={favorites.includes(p.id)} onPress={()=>toggleFavorite(p.id)}/>
     </View>})}
     <View style={s.updated}><Icon name="time-outline" size={14}/><Text style={s.meta}>{stamp(snapshot.generatedAt)}</Text></View>
    </>}
   </ScrollView>
  </View>
  {!wide&&<SafeAreaView edges={['bottom']} style={s.mobileNav}><View style={s.mobileTabs}>{tabs.map(t=><Pressable key={t.title} accessibilityRole="tab" accessibilityLabel={t.title} accessibilityState={{selected:tab===t.title}} onPress={()=>setTab(t.title)} style={[s.mobileTab,tab===t.title&&s.mobileTabOn]}><Icon name={t.icon} color={tab===t.title?C.accent:C.muted} size={20}/><Text style={[s.mobileTabText,tab===t.title&&s.selectedText]}>{t.title}</Text></Pressable>)}</View></SafeAreaView>}
  <Modal visible={filterOpen} animationType="slide" onRequestClose={()=>setFilterOpen(false)}><SafeAreaView style={s.filterModal}><View style={s.modalHeader}><Text style={s.modalTitle}>Filters</Text><View style={s.row}><IconButton label="Wis filters" icon="refresh-outline" onPress={reset}/><IconButton label="Sluit filters" icon="close" onPress={()=>setFilterOpen(false)}/></View></View><ScrollView><FilterPanel {...filterProps} hideHeader/></ScrollView><View style={{padding:16}}><Button title={`Toon ${rows.length}`} selected onPress={()=>setFilterOpen(false)}/></View></SafeAreaView></Modal>
  <Modal visible={!!detail||sourcesOpen||installInfo} transparent animationType="fade" onRequestClose={closeDetails}><View style={s.scrim}><SafeAreaView style={s.sheet}><View style={s.modalHeader}><Text style={s.modalTitle}>{installInfo?'Installeren':sourcesOpen?'Bronnen':'Zwemmoment'}</Text><IconButton label="Sluit details" icon="close" onPress={closeDetails}/></View><ScrollView contentContainerStyle={s.sheetContent}>
   {installInfo?<>
    <View style={s.installRow}><Icon name="logo-apple" size={20}/><View style={s.event}><Text style={s.bodyText}>iPhone / iPad</Text><Text style={s.meta}>Safari · Delen · Zet op beginscherm</Text></View></View>
    <View style={s.installRow}><Icon name="logo-android" size={20}/><View style={s.event}><Text style={s.bodyText}>Android</Text><Text style={s.meta}>Chrome · Menu · App installeren</Text></View></View>
    {offlineReady&&<Text style={s.tag}>Offline beschikbaar</Text>}
   </>:sourcesOpen?<>
    <View style={[s.between,{paddingBottom:12}]}><Text style={s.meta}>{health.connected} / {pools.length} gekoppeld</Text><Text style={s.meta}>4× per dag</Text></View>
    {pools.map(p=><Pressable accessibilityRole="link" accessibilityLabel={`Bronrooster ${p.name}`} key={p.id} onPress={()=>openUrl(p.url)} style={s.sourceRow}><View style={s.event}><Text style={s.bodyText}>{p.name}</Text><Text style={s.meta}>{sourceStatus(p.id)} · {stamp(source(p.id)?.checkedAt)}</Text></View><Icon name="open-outline" size={16}/></Pressable>)}
   </>:detail&&<>
    <Text style={s.detailTitle}>{detail.title}</Text><Text style={s.detailTime}>{fmt(detail.date,{weekday:'long',day:'numeric',month:'long'})} · {detail.start}–{detail.end}</Text><Text style={s.poolName}>{pools.find(p=>p.id===detail.poolId)?.name}</Text>{!!detail.bassin&&<Text style={s.meta}>{detail.bassin}</Text>}
    <View style={s.tags}><Text style={s.tag}>{detail.category}</Text>{detail.kind==='weekly'&&<Text style={s.tag}>Standaardweek</Text>}{sourceIsStale(source(detail.poolId),now.getTime())&&<Text style={s.warningTag}>Verouderde bron</Text>}</View>
    <Text style={[s.meta,{marginVertical:20}]}>{stamp(source(detail.poolId)?.checkedAt)}</Text><View style={s.wrap}><Button title="Bronrooster" icon="open-outline" onPress={()=>openUrl(detail.sourceUrl)}/><Button title={favorites.includes(detail.poolId)?'Bewaard':'Bewaren'} icon={favorites.includes(detail.poolId)?'bookmark':'bookmark-outline'} selected={favorites.includes(detail.poolId)} onPress={()=>toggleFavorite(detail.poolId)}/></View>
   </>}
  </ScrollView></SafeAreaView></View></Modal>
 </SafeAreaView>;
}
const s=StyleSheet.create({
 root:{flex:1,backgroundColor:C.bg},header:{height:56,backgroundColor:C.panel,borderBottomWidth:1,borderColor:C.line,flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:12},logo:{flexDirection:'row',alignItems:'center',gap:9,minHeight:44},wordmark:{fontSize:18,fontWeight:'600',color:C.text},row:{flexDirection:'row',alignItems:'center',gap:2},between:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8},wrap:{flexDirection:'row',flexWrap:'wrap',gap:6},pressed:{opacity:.65},iconButton:{width:40,height:40,borderRadius:4,alignItems:'center',justifyContent:'center'},iconOn:{backgroundColor:C.active},tabs:{flexDirection:'row',height:'100%'},tab:{flexDirection:'row',alignItems:'center',gap:8,paddingHorizontal:22,borderBottomWidth:2,borderBottomColor:'transparent'},tabOn:{backgroundColor:C.bg,borderBottomColor:C.accent},tabText:{fontSize:14,color:C.muted},selectedText:{color:C.accent},activeText:{color:C.text},sourceButton:{flexDirection:'row',alignItems:'center',gap:6,minHeight:40,paddingHorizontal:6},sourceCount:{fontFamily:mono,fontSize:12,color:C.muted},workspace:{flex:1,flexDirection:'row'},sidebar:{width:264,flexGrow:0,backgroundColor:C.panel,borderRightWidth:1,borderColor:C.line},main:{flex:1},mainContent:{paddingTop:20,maxWidth:1260,width:'100%',alignSelf:'center'},filters:{padding:16},sectionLabel:{fontSize:16,fontWeight:'600',color:C.text},filterLabel:{fontSize:14,fontWeight:'500',color:C.muted,marginBottom:10,marginTop:14},switchRow:{marginTop:18,paddingVertical:8,borderBottomWidth:1,borderBottomColor:C.line},bodyText:{fontSize:15,color:C.text,lineHeight:23},button:{flexDirection:'row',alignItems:'center',justifyContent:'center',gap:7,minHeight:40,borderWidth:1,borderColor:C.line,borderRadius:4,backgroundColor:C.panel,paddingHorizontal:12,paddingVertical:7},buttonOn:{backgroundColor:C.active,borderColor:C.accent},buttonText:{fontSize:14,color:C.muted},poolCheck:{flexDirection:'row',alignItems:'center',gap:9,minHeight:42,paddingHorizontal:8,paddingVertical:9,borderRadius:3},poolCheckOn:{backgroundColor:C.active},poolCheckText:{fontSize:14,lineHeight:20,color:C.muted,flex:1},toolbar:{flexDirection:'row',alignItems:'center',gap:8},search:{flex:1,minHeight:42,backgroundColor:C.panel,borderWidth:1,borderColor:C.line,borderRadius:4,paddingLeft:12,flexDirection:'row',alignItems:'center',gap:9},searchInput:{flex:1,minWidth:0,fontSize:16,color:C.text,paddingVertical:10,paddingRight:8},categoryList:{gap:6,paddingTop:12,paddingBottom:18},dateList:{gap:6,paddingBottom:20},date:{minWidth:76,paddingHorizontal:10,paddingVertical:10,alignItems:'center',gap:4,borderWidth:1,borderColor:C.line,borderRadius:4,backgroundColor:C.panel},dateOn:{borderColor:C.accent,backgroundColor:C.active},dayLabel:{fontSize:13,color:C.muted},dayNumber:{fontFamily:mono,fontSize:23,color:C.text,fontWeight:'500'},month:{fontSize:12,color:C.muted},listHeader:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:12,borderBottomWidth:1,borderColor:C.line,paddingBottom:14},listTitle:{fontSize:18,fontWeight:'600',color:C.accent},resultCount:{fontSize:14,color:C.muted,fontFamily:mono},meta:{fontSize:13,color:C.muted,lineHeight:20},agendaRow:{flexDirection:'row',alignItems:'flex-start',gap:14,paddingVertical:19,borderBottomWidth:1,borderColor:C.line},times:{width:58,paddingTop:2,gap:6},start:{fontFamily:mono,fontSize:16,color:C.accent,fontWeight:'500'},end:{fontFamily:mono,fontSize:13,color:C.muted},event:{flex:1,minWidth:0,gap:4},activity:{fontSize:17,fontWeight:'600',color:C.text,lineHeight:23},location:{fontSize:14,color:C.text,lineHeight:21},tags:{flexDirection:'row',flexWrap:'wrap',alignItems:'center',gap:6,marginTop:7},tag:{fontSize:12,color:C.muted,backgroundColor:C.panel,borderWidth:1,borderColor:C.line,borderRadius:3,paddingHorizontal:7,paddingVertical:3,alignSelf:'flex-start',overflow:'hidden'},warningTag:{fontSize:12,color:C.warning,borderWidth:1,borderColor:C.warning,borderRadius:3,paddingHorizontal:7,paddingVertical:3,overflow:'hidden'},updated:{flexDirection:'row',alignItems:'center',gap:7,paddingVertical:18},empty:{paddingVertical:42,alignItems:'center',gap:14},poolRow:{flexDirection:'row',alignItems:'flex-start',gap:10,paddingVertical:18,borderBottomWidth:1,borderColor:C.line},poolName:{fontSize:18,color:C.text,fontWeight:'500',lineHeight:25},poolActions:{flexDirection:'row',alignItems:'center'},mobileNav:{backgroundColor:C.panel,borderTopWidth:1,borderColor:C.line},mobileTabs:{flexDirection:'row'},mobileTab:{flex:1,alignItems:'center',justifyContent:'center',gap:5,paddingVertical:11,borderTopWidth:2,borderTopColor:'transparent'},mobileTabOn:{borderTopColor:C.accent},mobileTabText:{fontSize:12,color:C.muted},notice:{flexDirection:'row',alignItems:'center',gap:8,backgroundColor:C.panel,paddingHorizontal:16,paddingVertical:10,borderBottomWidth:1,borderColor:C.warning},noticeText:{fontSize:13,color:C.warning,flex:1,lineHeight:20},filterModal:{flex:1,backgroundColor:C.panel},modalHeader:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:12,paddingHorizontal:18,paddingVertical:8,borderBottomWidth:1,borderColor:C.line},modalTitle:{fontSize:16,fontWeight:'600',color:C.accent},scrim:{flex:1,backgroundColor:'#000000AA',justifyContent:'center',alignItems:'center',padding:16},sheet:{width:'100%',maxWidth:560,maxHeight:'88%',backgroundColor:C.bg,borderRadius:6,borderWidth:1,borderColor:C.line},sheetContent:{padding:20},installRow:{flexDirection:'row',gap:14,alignItems:'flex-start',paddingVertical:16},sourceRow:{flexDirection:'row',alignItems:'center',gap:10,paddingVertical:12,borderBottomWidth:1,borderColor:C.line},detailTitle:{fontSize:25,fontWeight:'600',color:C.accent,lineHeight:32,marginBottom:12},detailTime:{fontFamily:mono,fontSize:14,color:C.muted,lineHeight:23,marginBottom:24}
});
