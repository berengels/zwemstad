import {useCallback,useEffect,useRef,useState} from 'react';
import {Platform} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import seed from '../data/schedule.json';
import pools from '../data/pools.json';
import {fetchSchedule,validateSchedule} from './schedule.mjs';
export function useSchedule(){
 const [snapshot,setSnapshot]=useState(seed);
 const [dataState,setDataState]=useState<'loading'|'live'|'offline'|'error'>('loading');
 const busy=useRef(false),mounted=useRef(true);
 const refresh=useCallback(async()=>{
  if(Platform.OS!=='web'||busy.current)return;
  busy.current=true;setDataState('loading');
  try{
   const {data,offline}=await fetchSchedule(new URL('./schedule.json',document.baseURI).href,pools);
   if(!mounted.current)return;
   setSnapshot(current=>Date.parse(data.generatedAt)>=Date.parse(current.generatedAt)?data:current);
   setDataState(offline?'offline':'live');
   // Storage failure should not make a successful network refresh look like a failure.
   await AsyncStorage.setItem('zwemstad.schedule.v1',JSON.stringify(data)).catch(()=>{});
  }catch{if(mounted.current)setDataState(typeof navigator!=='undefined'&&!navigator.onLine?'offline':'error');}
  finally{busy.current=false;}
 },[]);
 useEffect(()=>{
  mounted.current=true;
  AsyncStorage.getItem('zwemstad.schedule.v1').then(raw=>{
   if(raw&&mounted.current){const data=validateSchedule(JSON.parse(raw),pools);setSnapshot(current=>Date.parse(data.generatedAt)>Date.parse(current.generatedAt)?data:current);}
  }).catch(()=>{});
  void refresh();
  const interval=setInterval(()=>void refresh(),5*60*1000);
  const visible=()=>{if(document.visibilityState==='visible')void refresh();};
  const offline=()=>setDataState('offline');
  if(Platform.OS==='web'){
   window.addEventListener('online',refresh);window.addEventListener('offline',offline);document.addEventListener('visibilitychange',visible);
  }
  return()=>{mounted.current=false;clearInterval(interval);if(Platform.OS==='web'){window.removeEventListener('online',refresh);window.removeEventListener('offline',offline);document.removeEventListener('visibilitychange',visible);}};
 },[refresh]);
 return {snapshot,dataState,refresh};
}
