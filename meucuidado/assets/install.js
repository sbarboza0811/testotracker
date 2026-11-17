/* MeuCuidado PWA installer — independent from goals/3D.
   Mirrors the proven MoneyTracker approach: native prompt via
   beforeinstallprompt, service worker registration and update checks. */
(function(root){
'use strict';
const el=document.getElementById('install-btn');
if(!el)return;
let promptEvent=root.__meucuidadoInstallPrompt||null;
const label=el.querySelector('span:last-child');
const matches=selector=>root.matchMedia?.(selector)?.matches;
function isInstalled(){
  return matches('(display-mode: standalone)')||root.navigator.standalone===true;
}
function isEmbeddedAndroid(){
 const ua=navigator.userAgent||'';
 return /Android/i.test(ua)&&(/\bwv\b|ChatGPT|Instagram|FBAN|FBAV|Line\//i.test(ua)||
  (!/Chrome\/\d+/.test(ua)&&!/EdgA\//.test(ua)));
}
function updateButton(){
 const installed=isInstalled();
 const embedded=isEmbeddedAndroid();
 // No pretend install button: show it only when Chrome provides the real prompt.
 el.hidden=installed||(!promptEvent&&!embedded);
 el.disabled=false;
 if(label)label.textContent=embedded&&!promptEvent?'Abrir no Chrome':'Instalar app';
 el.setAttribute('aria-label',embedded&&!promptEvent?'Abrir MeuCuidado no Chrome':'Instalar MeuCuidado no celular');
}
function capture(event){
 event.preventDefault();
 promptEvent=event;
 root.__meucuidadoInstallPrompt=event;
 updateButton();
}
root.addEventListener('beforeinstallprompt',capture);
root.addEventListener('appinstalled',()=>{
 promptEvent=null;root.__meucuidadoInstallPrompt=null;
 updateButton();
});
el.addEventListener('click',()=>{
 if(isInstalled()){updateButton();return;}
 const prompt=promptEvent;
 if(prompt){
  promptEvent=null;root.__meucuidadoInstallPrompt=null;
  // Keep install prompt in the actual click handler; browser requires a user gesture.
  try{
   prompt.prompt();
   Promise.resolve(prompt.userChoice).finally(updateButton).catch(e=>console.warn('PWA install choice:',e));
  }catch(e){console.warn('PWA install prompt refused:',e);updateButton();}
  return;
 }
 if(isEmbeddedAndroid()){
  root.location.href='intent://sbarboza0811.github.io/testotracker/meucuidado/#Intent;scheme=https;package=com.android.chrome;end';
  return;
 }
 // Chromium has not made this app eligible; don't display a dead install button.
 updateButton();
});
updateButton();
// Register and refresh the service worker outside the main application,
// so a runtime error in the 3D or goals logic cannot block installation.
if('serviceWorker'in navigator&&root.location.protocol==='https:'){
 let reloading=false;
 const registrationPromise=navigator.serviceWorker.register('./sw.js',{scope:'./'})
  .catch(err=>{console.warn('MeuCuidado service worker:',err);return null});
 // Reload once when the first SW acquires control, to let Chrome reassess
 // the newly installable page. Avoid reload loops with sessionStorage guard.
 navigator.serviceWorker.addEventListener('controllerchange',()=>{
  if(reloading)return;
  try{
   const key='meucuidado-pwa-controlled-v1';
   if(sessionStorage.getItem(key))return;
   sessionStorage.setItem(key,'1');reloading=true;
   root.location.reload();
  }catch(_){}
 });
 const update=()=>registrationPromise.then(reg=>reg?.update()).catch(()=>{});
 root.addEventListener('focus',update);
 document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')update();});
}
root.MeuCuidadoPWA={isInstalled,canPrompt:()=>!!promptEvent,update: updateButton};
})(window);
