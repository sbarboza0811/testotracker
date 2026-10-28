(()=>{
'use strict';
const T=window.TT;
const SB_URL='https://efcjhktuihnldrddrtat.supabase.co';
const KEY='sb_publishable_KWR6qKDnvelXNfmoXeJrjQ_Kh4DzkUI';
let sb=null,user=null,rev=0,remoteAvailable=false,busy=false,blocked=false,timer=null,lastError='',initialized=false;
const ownerKey=T.KEY+'-owner',revKey=uid=>T.KEY+'-rev-'+uid,enabledKey=uid=>T.KEY+'-enabled-'+uid;
function authUser(){return user}
function isEnabled(){return !!user&&localStorage.getItem(enabledKey(user.id))==='yes'}
function state(){return{connected:!!user,email:user?.email||'',enabled:isEnabled(),revision:rev,blocked,busy,error:lastError,available:!!sb,remoteAvailable}}
function signal(){window.dispatchEvent(new CustomEvent('tt:cloud'))}
function status(text,kind=''){const el=T.$('sync-badge');if(el){el.textContent=text;el.className='sync-badge '+kind}signal()}
async function init(){
 if(initialized)return;initialized=true;
 if(!window.supabase?.createClient){lastError='Biblioteca de autenticação indisponível. Verifique a internet.';status('Somente local','warn');return}
 sb=window.supabase.createClient(SB_URL,KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
 sb.auth.onAuthStateChange((event,session)=>{
   const changed=session?.user?.id!==user?.id;user=session?.user||null;
   if(changed){blocked=false;rev=0;remoteAvailable=false;signal();if(user)queueMicrotask(()=>connect().catch(e=>{lastError=e.message;status('Erro na nuvem','warn')}))}
 });
 try{const {data,error}=await sb.auth.getSession();if(error)throw error;user=data?.session?.user||null;if(user)await connect();else status('Local','')}catch(e){lastError=e.message;status('Local (offline)','warn')}
 signal()
}
async function connect(){
 if(!sb||!user)return;status('Verificando…');
 const uid=user.id,owner=localStorage.getItem(ownerKey);
 const {data,error}=await sb.from('testotrack_v3').select('payload,revision,updated_at').eq('user_id',uid).maybeSingle();
 if(error){lastError=error.message;status('Erro na nuvem','warn');return}
 rev=Number(data?.revision||0);remoteAvailable=!!data;
 const localEdited=T.dirty,anotherOwner=owner&&owner!==uid;
 if(data&&!localEdited&&!anotherOwner){
   T.replaceFromCloud(data.payload);localStorage.setItem(ownerKey,uid);localStorage.setItem(revKey(uid),String(rev));localStorage.setItem(enabledKey(uid),'yes');blocked=false;status('Sincronizado','ok');return;
 }
 if(data&&(localEdited||anotherOwner)){
   blocked=true;lastError='Há registros locais e na nuvem. Escolha qual versão manter antes de sincronizar.';status('Resolver dados','warn');return;
 }
 if(!data){
   if(anotherOwner){blocked=true;lastError='Este aparelho possui dados associados a outra conta. Escolha se deseja enviá-los.';status('Verificar conta','warn');return}
   // Do not upload until the user activates the connection.
   blocked=false;localStorage.setItem(ownerKey,uid);status('Conectar rotina','warn');return;
 }
 status('Conectado','ok')
}
async function login(email,password,create){
 if(!sb){await init();if(!sb)throw Error(lastError||'Biblioteca não disponível')}
 if(!email||password.length<6)throw Error('Informe e-mail e senha de pelo menos 6 caracteres.');
 const options={emailRedirectTo:'https://sbarboza0811.github.io/testotracker/'};
 const {data,error}=create?await sb.auth.signUp({email,password,options}):await sb.auth.signInWithPassword({email,password});
 if(error)throw error;
 if(data.session){user=data.session.user;await connect();return 'Conta conectada.'}
 return 'Cadastro solicitado. Verifique seu e-mail e clique no link de confirmação; depois faça login.'
}
async function logout(){
 if(!sb)return;const {error}=await sb.auth.signOut();if(error)throw error;
 user=null;rev=0;remoteAvailable=false;blocked=false;status('Local');signal()
}
async function push(force=false){
 if(!user||!sb)throw Error('Faça login primeiro.');
 if(!navigator.onLine)throw Error('Sem internet. Os registros continuam salvos neste aparelho.');
 if((blocked||!isEnabled())&&!force)throw Error(blocked?'Resolva a divergência entre os dados antes de enviar.':'Ative a sincronização primeiro.');
 if(busy)return;
 busy=true;status('Enviando…');
 try{
   const uid=user.id,body=structuredClone(T.state),serialized=JSON.stringify(body);
   let result;
   if(rev===0){
     result=await sb.from('testotrack_v3').insert({user_id:uid,payload:body,revision:1,updated_at:new Date().toISOString()}).select('revision').maybeSingle();
   }else{
     result=await sb.from('testotrack_v3').update({payload:body,revision:rev+1,updated_at:new Date().toISOString()}).eq('user_id',uid).eq('revision',rev).select('revision').maybeSingle();
   }
   if(result.error)throw result.error;
   if(!result.data){blocked=true;throw Error('Outra versão foi salva antes. Baixe ou resolva o conflito antes de substituir registros.')}
   rev=Number(result.data.revision);remoteAvailable=true;blocked=false;lastError='';
   localStorage.setItem(revKey(uid),String(rev));localStorage.setItem(ownerKey,uid);
   if(JSON.stringify(T.state)===serialized)T.setClean();
   status('Sincronizado','ok');
 }catch(e){lastError=e.message;status('Pendente','warn');throw e}
 finally{busy=false;signal();if(T.dirty&&!blocked&&isEnabled()&&navigator.onLine)schedule()}
}
async function enable(){
 if(!user)throw Error('Faça login primeiro.');
 if(blocked)throw Error('Resolva o conflito antes de ativar.');
 localStorage.setItem(enabledKey(user.id),'yes');
 await push(true);
}
function schedule(){
 if(!isEnabled()||blocked||!user)return;
 clearTimeout(timer);timer=setTimeout(()=>{if(!busy)push().catch(e=>{console.warn('Sincronização pendente',e.message)})},1800);
}
async function download(){
 if(!user||!sb)throw Error('Faça login primeiro');
 const {data,error}=await sb.from('testotrack_v3').select('payload,revision').eq('user_id',user.id).maybeSingle();
 if(error)throw error;if(!data)throw Error('Sua conta ainda não possui dados salvos na nuvem.');
 if(!confirm('Substituir os dados deste aparelho pelos dados da nuvem? Exporte um backup antes caso queira guardar esta versão.'))return;
 T.replaceFromCloud(data.payload);rev=Number(data.revision);blocked=false;remoteAvailable=true;lastError='';
 localStorage.setItem(ownerKey,user.id);localStorage.setItem(revKey(user.id),String(rev));localStorage.setItem(enabledKey(user.id),'yes');
 status('Sincronizado','ok');signal();
}
async function backupRemote(){
 if(!user||!sb)throw Error('Faça login primeiro.');
 const {data,error}=await sb.from('testotrack_v3').select('payload,revision').eq('user_id',user.id).maybeSingle();
 if(error)throw error;if(!data?.payload)throw Error('A nuvem ainda não tem dados nesta conta.');
 const blob=new Blob([JSON.stringify(data.payload,null,2)],{type:'application/json'});
 const u=URL.createObjectURL(blob),a=document.createElement('a');a.href=u;a.download='testotrack-nuvem-v3-'+T.today()+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(u),500);
 return true;
}
async function overwriteCloud(){
 if(!user||!sb)throw Error('Faça login primeiro');
 if(!confirm('Substituir deliberadamente os dados da nuvem pelos dados deste aparelho? A versão atual da nuvem será perdida. Exporte um backup dela antes.'))return;
 const {data,error}=await sb.from('testotrack_v3').select('revision').eq('user_id',user.id).maybeSingle();
 if(error)throw error;
 rev=Number(data?.revision||0);blocked=false;localStorage.setItem(enabledKey(user.id),'yes');
 await push(true)
}
async function importLegacyCloud(){
 if(!sb||!user)throw Error('Faça login para importar seu histórico da nuvem.');
 const {data,error}=await sb.from('user_snapshots').select('payload').eq('user_id',user.id).maybeSingle();
 if(error)throw error;
 if(!data?.payload)throw Error('Não encontrei um backup da versão 2.1 nesta conta.');
 if(!confirm('Importar seu histórico antigo da nuvem para o TestoTrack 3.0? A versão 2.1 será preservada.'))return;
 T.importLegacy(data.payload);
 return true;
}
async function searchFoods(query){
 if(!sb)await init();
 if(!sb||!user)throw Error('Faça login no Supabase em Ajustes para pesquisar alimentos na internet.');
 if(!navigator.onLine)throw Error('Sem internet. Os alimentos já cadastrados continuam disponíveis.');
 const {data,error}=await sb.functions.invoke('testotrack-food-search',{body:{query}});
 if(error)throw Error('Pesquisa externa indisponível. Tente novamente em instantes.');
 if(data?.error)throw Error(String(data.error));
 return Array.isArray(data?.products)?data.products:[];
}

async function speechError(error, fallback){
 if(error?.context?.json){
  try{const data=await error.context.json();if(data?.error)return new Error(String(data.error));}catch(e){if(e instanceof Error&&e.message&&!/json|unexpected/i.test(e.message))return e;}
 }
 return new Error(fallback||error?.message||"Não foi possível transcrever o áudio.");
}
async function checkTranscription(){
 if(!sb)await init();
 if(!sb||!user)throw Error('Entre na sua conta em Ajustes para usar o microfone do TestoTrack.');
 if(!navigator.onLine)throw Error('A transcrição precisa de internet.');
 const {data,error}=await sb.functions.invoke('testotrack-transcribe',{body:{check:true}});
 if(error)throw await speechError(error,'Serviço de voz indisponível. Tente novamente.');
 if(!data?.ready)throw new Error('A voz gratuita ainda precisa de uma chave Groq Free. Cadastre GROQ_API_KEY nos segredos do Supabase.');
 return true;
}
async function parseMeal(transcript){
 if(!sb)await init();
 if(!sb||!user)throw Error('Faça login em Ajustes para identificar os alimentos com precisão.');
 if(!navigator.onLine)throw Error('A análise inteligente precisa de internet.');
 if(typeof transcript!=='string'||transcript.trim().length<3||transcript.length>550)throw Error('A transcrição deve ter entre 3 e 550 caracteres.');
 const {data,error}=await sb.functions.invoke('testotrack-transcribe',{body:{parse:transcript.trim()}});
 if(error)throw await speechError(error,'Não consegui interpretar os alimentos agora.');
 if(!Array.isArray(data?.items))throw Error('A resposta da análise de alimentos foi inválida.');
 return data.items.filter(x=>x&&typeof x.term==='string'&&x.term.length<90).slice(0,12);
}
async function estimateFoods(names){
 if(!sb)await init();
 if(!sb||!user)throw Error('Entre na sua conta para estimar alimentos automaticamente.');
 if(!navigator.onLine)throw Error('Sem internet para estimativa de alimentos.');
 const items=[...new Set((Array.isArray(names)?names:[]).map(x=>String(x||'').trim()).filter(x=>x.length>=3&&x.length<=70))].slice(0,5);
 if(!items.length)return [];
 const {data,error}=await sb.functions.invoke('testotrack-transcribe',{body:{nutrition:items}});
 if(error)throw await speechError(error,'Não foi possível estimar os alimentos.');
 if(!Array.isArray(data?.foods))throw Error('Estimativa nutricional inválida.');
 return data.foods;
}
async function transcribeAudio(audio){
 if(!sb)await init();
 if(!sb||!user)throw Error('Entre na sua conta em Ajustes para transcrever o áudio.');
 if(!navigator.onLine)throw Error('Conecte-se à internet para transcrever o áudio.');
 if(!(audio instanceof Blob)||audio.size<800||audio.size>4*1024*1024)throw Error('Gravação vazia ou maior que 4 MB.');
 const form=new FormData();
 const type=(audio.type||'audio/webm').split(';')[0];
 const ext=type==='audio/mp4'?'mp4':type==='audio/wav'?'wav':'webm';
 form.append('audio',audio,'refeicao.'+ext);
 const {data,error}=await sb.functions.invoke('testotrack-transcribe',{body:form});
 if(error)throw await speechError(error,'Falha na transcrição. Tente gravar novamente.');
 if(!data?.text||typeof data.text!=='string')throw new Error('Não consegui identificar palavras na gravação.');
 return data.text.trim();
}

window.addEventListener('tt:change',schedule);
window.addEventListener('online',()=>{if(user){if(blocked)status('Resolver dados','warn');else if(isEnabled())schedule();else status('Conectado','ok')}});
window.TTCloud={init,login,logout,state,user:authUser,searchFoods,checkTranscription,transcribeAudio,parseMeal,estimateFoods,enable,push,download,overwriteCloud,backupRemote,connect,importLegacyCloud};
})();