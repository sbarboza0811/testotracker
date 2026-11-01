(()=>{
'use strict';
const T=window.TT,U=window.TTUI,C=window.TTCloud;
if(!T||!U||!C)return;
const esc=T.esc,num=T.money;
let recorder=null,stream=null,parts=[],recordTimer=null,token=0,mode='new',spoken='',items=[];
function release(){
 if(recordTimer){clearTimeout(recordTimer);recordTimer=null;}
 if(stream){stream.getTracks().forEach(track=>track.stop());stream=null}
 recorder=null;
}
function cancel(){
 token++;
 if(recorder&&recorder.state==='recording'){try{recorder.stop()}catch{}}
 release();
}
function setStatus(text,error=false){
 const el=document.getElementById('activity-status');
 if(el){el.textContent=text;el.className='activity-status'+(error?' bad':'')}
}
function profile(){
 const p=T.state.config.profile||{},weight=T.weightOn(U.date);
 const fields='<div class="energy-profile-grid">'+
 '<div class="field"><label>Peso (kg)</label><input name="weight" type="number" inputmode="decimal" step="0.1" min="20" max="400" value="'+esc(weight||'')+'" required></div>'+
 '<div class="field"><label>Altura (cm)</label><input name="height" type="number" inputmode="numeric" min="110" max="230" value="'+esc(p.heightCm||'')+'" required></div>'+
 '<div class="field"><label>Idade (anos)</label><input name="age" type="number" inputmode="numeric" min="16" max="110" value="'+esc(p.age||'')+'" required></div>'+
 '<div class="field"><label>Sexo para a equação</label><select name="sex" required><option value="" '+(!p.sex?'selected':'')+'>Selecionar</option><option value="male" '+(p.sex==='male'?'selected':'')+'>Masculino</option><option value="female" '+(p.sex==='female'?'selected':'')+'>Feminino</option></select></div></div>';
 U.modal('Meu metabolismo','<p class="muted small">Estes dados são usados para estimar o gasto energético de repouso pela fórmula Mifflin–St Jeor e o gasto adicional dos exercícios. Não são compartilhados com o Groq.</p>'+
 '<form data-form="energy-profile">'+fields+'<button class="btn full" type="submit" style="margin-top:14px">Salvar e calcular</button></form>'+
 '<p class="muted micro" style="margin-top:12px">Se houver um peso mais recente registrado em Evolução, ele será utilizado nos cálculos. A estimativa não substitui medição metabólica.</p>');
}
function open(){
 cancel();spoken='';items=[];mode='new';
 U.modal('Registrar treino por voz','<section class="activity-capture"><div class="activity-mic-icon">🎙</div><h3>Conte o treino que fez</h3>'+
 '<p>Diga atividades, minutos e intensidade. Se falar séries e repetições, estimarei o tempo utilizado.</p>'+
 '<button type="button" data-action="activity-start" class="btn full activity-record">🎙 Começar a gravar</button>'+
 '<button type="button" data-action="activity-stop" class="btn full activity-record danger" hidden>■ Parar e analisar</button>'+
 '<div id="activity-status" class="activity-status">Exemplo: “Fiz 45 minutos de musculação e 30 minutos de esteira moderada”.</div></section>'+
 '<details class="activity-manual"><summary>Prefiro digitar</summary><form data-form="activity-text">'+
 '<div class="field"><label>Descreva seu treino</label><textarea name="description" rows="3" maxlength="550" required placeholder="Fiz 40 minutos de musculação e 20 de bicicleta"></textarea></div>'+
 '<button class="btn full" type="submit">Analisar treino</button></form></details>'+
 '<p class="muted micro" style="margin-top:13px">A gravação é enviada para transcrição após você parar; o áudio não fica salvo no diário.</p>');
}
async function start(){
 if(!navigator.mediaDevices?.getUserMedia||!window.MediaRecorder)throw Error('Gravação não disponível. Abra o aplicativo no Chrome atualizado.');
 const now=++token;
 setStatus('Verificando a transcrição…');
 await C.checkTranscription();
 if(now!==token)return;
 setStatus('Solicitando o microfone…');
 let mic=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true}});
 if(now!==token){mic.getTracks().forEach(t=>t.stop());return;}
 const mime=['audio/webm;codecs=opus','audio/webm','audio/mp4','audio/wav'].find(t=>MediaRecorder.isTypeSupported(t));
 if(!mime){mic.getTracks().forEach(t=>t.stop());throw Error('Seu navegador não suporta este formato de áudio.');}
 stream=mic;parts=[];
 const current=new MediaRecorder(mic,{mimeType:mime});recorder=current;
 current.ondataavailable=e=>{if(e.data?.size)parts.push(e.data)};
 current.onerror=()=>{setStatus('A gravação falhou. Tente novamente.',true);release()};
 current.onstop=async()=>{
   const chunks=parts.slice(),valid=now===token,mimetype=current.mimeType||mime;
   release();if(!valid)return;
   const blob=new Blob(chunks,{type:mimetype});
   if(blob.size<800||blob.size>4*1024*1024){setStatus('Gravação vazia ou muito longa. Tente novamente.',true);return;}
   setStatus('Transcrevendo e identificando atividades…');
   try{
    const transcript=await C.transcribeAudio(blob);
    if(now!==token)return;
    await analyze(transcript,now);
   }catch(e){if(now===token)setStatus(e.message||'Não consegui transcrever.',true)}
 };
 current.start(500);
 const begin=document.querySelector('[data-action="activity-start"]'),stop=document.querySelector('[data-action="activity-stop"]');
 if(begin)begin.hidden=true;if(stop)stop.hidden=false;
 setStatus('● Gravando… conte o que você fez, depois toque em Parar.');
 recordTimer=setTimeout(()=>{if(current.state==='recording')finish()},60000);
}
function finish(){
 if(!recorder||recorder.state!=='recording')return;
 setStatus('Processando o áudio…');
 const stop=document.querySelector('[data-action="activity-stop"]');
 if(stop)stop.disabled=true;
 try{recorder.stop()}catch(e){release();setStatus('Não consegui finalizar a gravação.',true)}
}
async function analyze(description,current=token){
 spoken=String(description||'').trim().slice(0,550);
 if(spoken.length<4)throw Error('Descreva uma atividade física.');
 U.modal('Analisando seu treino','<div class="capture-wait"><span class="capture-spinner"></span><h3>Interpretando as atividades…</h3><p>Calculando duração e intensidade sem duplicar exercícios.</p></div>');
 let extracted;
 try{extracted=await C.parseExercise(spoken);}
 catch(e){if(current===token)U.modal('Não consegui analisar o treino','<p class="muted small">'+esc(e.message||'Falha na interpretação')+'</p>'+
 '<button type="button" class="btn full" data-action="activity-voice">Tentar novamente</button>');return;}
 if(current!==token)return;
 const kinds=T.ACTIVITY_MET||{};
 items=(Array.isArray(extracted)?extracted:[]).filter(x=>x&&kinds[x.kind]&&['leve','moderada','intensa'].includes(x.intensity))
   .map(x=>({name:String(x.name||x.kind).slice(0,90),kind:x.kind,minutes:Math.max(0,Math.min(480,Math.round(Number(x.minutes)||0))),intensity:x.intensity,assumed:!!x.assumed})).slice(0,12);
 if(!items.length){U.modal('Não encontrei exercícios','<p class="muted small">Fale atividades que você fez, como “30 minutos de caminhada e 40 de musculação”. Não foi salvo nenhum registro.</p>'+
 '<button type="button" class="btn full" data-action="activity-voice">Falar novamente</button>');return;}
 preview();
}
function preview(){
 const e=T.dayEnergy(U.date);
 const weight=e.weight;
 const allValid=items.length>0&&items.every(x=>x.minutes>=1&&x.minutes<=480);
 const total=weight?items.reduce((a,x)=>a+T.exerciseActiveKcal(weight,x.minutes,T.metFor(x.kind,x.intensity)),0):null;
 const rows=items.map((x,i)=>{
  const kcal=weight&&x.minutes?T.exerciseActiveKcal(weight,x.minutes,T.metFor(x.kind,x.intensity)):null;
  const intensityText={leve:'Leve',moderada:'Moderada',intensa:'Intensa'}[x.intensity];
  return '<div class="activity-preview-row"><div class="activity-preview-head"><div><strong>'+esc(x.name)+'</strong><small>'+esc(intensityText)+(x.assumed?' · tempo estimado':' · duração informada')+'</small></div>'+
  '<button type="button" class="btn small outline" data-action="activity-remove" data-index="'+i+'" aria-label="Remover '+esc(x.name)+'">✕</button></div>'+
  '<div class="activity-preview-values"><div class="field"><label>Minutos</label><input type="number" inputmode="numeric" min="1" max="480" data-exercise-minutes="'+i+'" value="'+(x.minutes||'')+'" placeholder="Informar"></div>'+
  '<strong>'+(kcal===null?'—':num(kcal))+' <small>kcal extras</small></strong></div></div>';
 }).join('');
 U.modal('Conferir gasto do treino','<p class="muted small">Atividades reconhecidas. Valores aproximados baseados nos METs do Compêndio de 2024. Não contam o repouso duas vezes.</p>'+
 '<div class="activity-spoken">“'+esc(spoken)+'”</div>'+rows+
 '<div class="activity-totals"><div><small>GASTO EXTRA ESTIMADO</small><strong>'+(total===null?'—':num(total)+' kcal')+'</strong></div><div><small>GASTO DE REPOUSO / DIA</small><strong>'+(e.resting===null?'—':num(e.resting)+' kcal')+'</strong></div></div>'+
 (!weight||e.resting===null?'<div class="activity-profile-warning"><p>Preencha peso, altura, idade e sexo para calcular calorias.</p>'+
 '<button class="btn small secondary" type="button" data-action="energy-profile">Informar meus dados</button></div>':'')+
 '<p class="muted micro" style="margin:10px 0">Só some exercícios não registrados anteriormente. Outros movimentos do dia e efeito térmico dos alimentos não estão incluídos.</p>'+
 '<form data-form="activity-save"><button class="btn full" type="submit" '+(allValid?'':'disabled')+'>Salvar treino</button></form>'+
 '<button class="btn full secondary activity-again" type="button" data-action="activity-voice">Refazer fala</button>');
}
document.addEventListener('click',event=>{
 const btn=event.target.closest('button[data-action], [data-action="close"]');if(!btn)return;
 const a=btn.dataset.action;
 if(a==='close'){cancel();return}
 if(a==='activity-voice'){open();return}
 if(a==='energy-profile'){profile();return}
 if(a==='activity-start'){btn.disabled=true;start().catch(e=>{btn.disabled=false;setStatus(e.message||'Não consegui abrir o microfone.',true)});return}
 if(a==='activity-stop'){finish();return}
 if(a==='activity-remove'){items.splice(Number(btn.dataset.index),1);if(items.length)preview();else open();return}
 if(a==='activity-delete'){
  if(!confirm('Excluir esta atividade do diário?'))return;
  T.removeActivity(U.date,btn.dataset.id);U.toast('Atividade excluída.');return;
 }
});
document.addEventListener('change',event=>{
 const el=event.target;if(!el.matches?.('[data-exercise-minutes]'))return;
 const i=Number(el.dataset.exerciseMinutes);
 if(!items[i])return;
 items[i].minutes=Math.max(0,Math.min(480,Math.round(Number(el.value)||0)));
 items[i].assumed=false;preview();
});
document.addEventListener('submit',async event=>{
 const form=event.target;if(!['activity-text','activity-save','energy-profile'].includes(form.dataset.form))return;
 event.preventDefault();
 try{
  if(form.dataset.form==='activity-text'){
   const value=String(new FormData(form).get('description')||'');
   await analyze(value,token);return;
  }
  if(form.dataset.form==='activity-save'){
   if(!items.length||items.some(x=>x.minutes<1))throw Error('Informe a duração das atividades antes de salvar.');
   const saved=T.saveActivities(U.date,items,spoken);
   cancel();items=[];spoken='';U.close();U.go('treinar');U.toast(saved.length+' atividade(s) registradas.');return;
  }
  if(form.dataset.form==='energy-profile'){
   const f=new FormData(form),weight=Number(f.get('weight')),height=Number(f.get('height')),age=Number(f.get('age')),sex=String(f.get('sex')||'');
   if(!Number.isFinite(weight)||weight<20||weight>400||height<110||height>230||age<16||age>110||!['male','female'].includes(sex))throw Error('Confira peso, altura, idade e sexo.');
   T.state.config.profile={weightKg:weight,heightCm:height,age,sex};
   T.save();if(items.length&&spoken)preview();else U.close();U.toast('Metabolismo estimado atualizado.');
  }
 }catch(err){U.error(err)}
});
window.addEventListener('pagehide',cancel);
window.TTActivityOpen=open;
window.TTEnergyProfileOpen=profile;
})();