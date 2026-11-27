(() => {
 const base=new URL('./',document.currentScript.src);
 if('serviceWorker' in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register(new URL('service-worker.js',base),{scope:base.pathname}).then(()=>navigator.serviceWorker.ready).then(()=>{document.documentElement.dataset.zwemstadOffline='ready';window.dispatchEvent(new Event('zwemstad-offline-ready'));}).catch(()=>{}));
 let prompt;
 window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();prompt=event;window.dispatchEvent(new Event('zwemstad-install-ready'));});
 window.zwemstadCanInstall=()=>!!prompt;
 window.zwemstadInstall=async()=>{
  if(!prompt)return false;
  const pending=prompt;prompt=null;await pending.prompt();await pending.userChoice;
  window.dispatchEvent(new Event('zwemstad-install-ready'));return true;
 };
 window.addEventListener('appinstalled',()=>{prompt=null;window.dispatchEvent(new Event('zwemstad-install-ready'));});
})();
