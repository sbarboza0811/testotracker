'use strict';
(function(){
const VERSION='2.2';
const KEY='mapadocorpo_goals_v2';
const REGIONS=[
 ['cabelo','Cabelo e couro cabeludo','💇','Cabeça','Queda, fios e couro cabeludo'],
 ['pele','Pele do rosto','🧴','Cabeça','Textura, marcas e cuidados'],
 ['olheiras','Olheiras','✨','Cabeça','Área abaixo dos olhos'],
 ['visao','Visão','👁️','Cabeça','Avaliações e correção visual'],
 ['nariz','Nariz e respiração','👃','Cabeça','Respiração e estrutura nasal'],
 ['orelhas','Orelhas','👂','Cabeça','Formato, audição e cuidados'],
 ['dentes','Dentes e sorriso','🦷','Cabeça','Saúde e estética odontológica'],
 ['papada','Papada e queixo','🪞','Cabeça','Região abaixo do queixo'],
 ['pescoco','Pescoço','🌿','Cabeça','Pele e região cervical'],
 ['barba','Barba','🧔','Cabeça','Pelos faciais'],
 ['ombros','Ombros','🧍','Corpo','Alinhamento e mobilidade'],
 ['peitoral','Peitoral','💪','Corpo','Composição corporal'],
 ['bracos','Braços','💪','Corpo','Força e cuidados'],
 ['abdomen','Abdômen e cintura','◎','Corpo','Composição e região abdominal'],
 ['costas','Costas e postura','🧍','Corpo','Postura, mobilidade e coluna'],
 ['pernas','Pernas','🦵','Corpo','Força e condicionamento'],
 ['pes','Pés','👟','Corpo','Apoio, conforto e cuidados']
].map(function(r){return {id:r[0],name:r[1],icon:r[2],group:r[3],description:r[4]};});
const REGION_BY_ID=Object.fromEntries(REGIONS.map(function(r){return [r.id,r]}));
const HEAD=new Set(REGIONS.filter(function(r){return r.group==='Cabeça'}).map(function(r){return r.id}));
const STATUSES={pending:'A avaliar',doing:'Em andamento',done:'Concluído'};
function standardSteps(first){
 return [
 {id:id(),text:first||'Agendar avaliação profissional',done:false},
 {id:id(),text:'Registrar orientação recebida',done:false},
 {id:id(),text:'Acompanhar a evolução',done:false}
 ];
}
function seed(){
 const spec=[
 ['g01','olheiras','Avaliar olheiras','Acompanhamento com dermatologista','Identificar o que pode melhorar na área dos olhos.','pending'],
 ['g02','visao','Avaliar correção da visão','Marcar consulta oftalmológica','Verificar alternativas adequadas à visão.','pending'],
 ['g03','nariz','Melhorar respiração nasal','Marcar avaliação com otorrinolaringologista','Investigar a dificuldade de respirar pelo nariz.','pending'],
 ['g04','orelhas','Avaliar orelhas de abano','Consultar profissional habilitado','Entender possibilidades e cuidados.','pending'],
 ['g05','dentes','Revisar dentes e sorriso','Marcar avaliação odontológica','Organizar os cuidados odontológicos.','pending'],
 ['g06','papada','Avaliar região da papada','Buscar avaliação profissional','Entender as possibilidades para a região do queixo.','pending'],
 ['g07','abdomen','Melhorar composição corporal','Acompanhar hábitos e progresso','Registrar metas e evolução de forma realista.','doing'],
 ['g08','costas','Avaliar minha postura','Observar postura e buscar avaliação se necessário','Acompanhar conforto e mobilidade.','pending']
 ];
 return spec.map(function(s){return {id:s[0],region:s[1],title:s[2],next:s[3],notes:s[4],status:s[5],steps:standardSteps(s[3]),updated:new Date().toISOString()}});
}
function id(){return 'm'+Math.random().toString(36).slice(2,10)+Date.now().toString(36)}
function readStore(){
 try{
  const raw=localStorage.getItem(KEY);
  if(!raw)return seed();
  const o=JSON.parse(raw);
  if(!Array.isArray(o)||o.length>1500)throw Error('Formato inválido');
  return o.filter(function(x){return x&&typeof x.title==='string'&&REGION_BY_ID[x.region]}).map(function(x){
   return {id:String(x.id),region:x.region,title:x.title,next:String(x.next||''),notes:String(x.notes||''),status:STATUSES[x.status]?x.status:'pending',steps:Array.isArray(x.steps)?x.steps.filter(function(s){return typeof s.text==='string'}).map(function(s){return {id:String(s.id),text:s.text,done:!!s.done}}):[],updated:String(x.updated||'')};
  });
 }catch(e){return seed()}
}
let goals=readStore();
let ui={region:'olheiras',goal:goals.find(function(g){return g.region==='olheiras'})?.id||null,view:'body',filter:'all',query:'',editing:null};
const $=function(s){return document.querySelector(s)};
const esc=function(s){return String(s??'').replace(/[&<>"']/g,function(v){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[v]})};
function save(){try{localStorage.setItem(KEY,JSON.stringify(goals));return true}catch(e){toast('Não foi possível salvar neste navegador. Use Backup.');return false}}
function toast(msg){
 const el=$('#toast');el.textContent=msg;el.classList.add('show');
 clearTimeout(toast.timer);toast.timer=setTimeout(function(){el.classList.remove('show')},3300);
}
function region(id){return REGION_BY_ID[id]||REGION_BY_ID.olheiras}
function activeGoal(){
 const current=goals.find(function(g){return g.id===ui.goal&&g.region===ui.region});
 return current||goals.find(function(g){return g.region===ui.region})||null;
}
function syncScene(switchView){
 if(switchView)window.dispatchEvent(new CustomEvent('mapa:view',{detail:{view:ui.view}}));
 window.dispatchEvent(new CustomEvent('mapa:select',{detail:{region:ui.region}}));
 document.querySelectorAll('[data-view]').forEach(function(b){b.classList.toggle('selected',b.dataset.view===ui.view)});
}
function selectRegion(id,chooseView){
 if(!REGION_BY_ID[id])return;
 ui.region=id;
 ui.goal=goals.find(function(g){return g.region===id})?.id||null;
 if(chooseView)ui.view=HEAD.has(id)?'head':(id==='costas'?'back':'body');
 render();syncScene(!!chooseView);
 if(window.innerWidth<=760&&chooseView)$('#detail-panel').scrollIntoView({behavior:'smooth',block:'start'});
}
function selectGoal(id){
 const g=goals.find(function(x){return x.id===id});if(!g)return;
 ui.goal=g.id;ui.region=g.region;ui.view=HEAD.has(g.region)?'head':(g.region==='costas'?'back':'body');
 render();syncScene(true);
 if(window.innerWidth<=760)$('#detail-panel').scrollIntoView({behavior:'smooth',block:'start'});
}
function setView(view){
 if(!['body','head','back'].includes(view))return;
 ui.view=view;syncScene(true);
}
function goalIcon(g){return region(g.region).icon}
function statusBadge(g){return '<span class="status '+(g.status==='doing'?'doing':g.status==='done'?'done':'')+'">'+STATUSES[g.status]+'</span>'}
function renderList(){
 const query=ui.query.trim().toLocaleLowerCase('pt-BR');
 const subset=goals.filter(function(g){
  if(ui.filter==='done'&&g.status!=='done')return false;
  if(ui.filter==='active'&&g.status==='done')return false;
  const r=region(g.region);return !query||(g.title+' '+r.name+' '+g.next).toLocaleLowerCase('pt-BR').includes(query);
 });
 const list=$('#goal-list');
 list.innerHTML=subset.length?subset.map(function(g){
  const r=region(g.region);
  return '<button type="button" class="goal-entry '+(ui.goal===g.id?'current':'')+'" data-goal="'+esc(g.id)+'"><span class="goal-icon">'+r.icon+'</span><span class="goal-copy"><strong>'+esc(g.title)+'</strong><small>'+esc(r.name)+'</small></span>'+statusBadge(g)+'</button>';
 }).join(''):'<div class="empty-list">Nenhum objetivo encontrado. Use + para adicionar.</div>';
 const present=new Set(goals.map(function(g){return g.region}));
 const explore=REGIONS.filter(function(r){return !present.has(r.id)});
 $('#explore-regions').innerHTML=explore.length?explore.map(function(r){return '<button type="button" data-region="'+r.id+'">'+r.icon+' '+esc(r.name)+'</button>'}).join(''):'<small style="color:#8aa094">Todas as regiões disponíveis possuem objetivos.</small>';
 $('#count-active').textContent=String(goals.length);
 $('#count-done').textContent=String(goals.filter(function(g){return g.status==='done'}).length);
 document.querySelectorAll('[data-filter]').forEach(function(b){b.classList.toggle('active',b.dataset.filter===ui.filter)});
}
function renderDetail(){
 const r=region(ui.region);
 const linked=goals.filter(function(g){return g.region===ui.region});
 const g=activeGoal();
 const head='<div class="detail-region"><b>'+esc(r.group.toUpperCase())+' / '+esc(r.name.toUpperCase())+'</b><button type="button" data-action="add-goal">+ Objetivo</button></div><div class="detail-icon">'+r.icon+'</div><h2>'+esc(r.name)+'</h2><p class="description">'+esc(r.description)+'</p>';
 if(!g){
  $('#detail').innerHTML='<div class="detail-inner">'+head+'<div class="detail-empty"><h3>Nenhum objetivo nesta região</h3><p>Você pode registrar aqui algo que deseja avaliar, tratar ou acompanhar. Não significa que um procedimento seja necessário.</p><button class="main-button" data-action="add-goal">+ Adicionar objetivo</button></div></div>';
  return;
 }
 const switcher=linked.length>1?'<div class="selected-goals">'+linked.map(function(x){return '<button type="button" data-goal="'+esc(x.id)+'" class="'+(x.id===g.id?'selected':'')+'">'+esc(x.title)+'</button>'}).join('')+'</div>':'';
 const steps=g.steps.map(function(s,i){
  return '<label class="step"><input type="checkbox" data-step="'+esc(s.id)+'" '+(s.done?'checked':'')+'><span>'+esc(s.text)+'</span></label>';
 }).join('');
 const done=g.steps.filter(function(s){return s.done}).length;
 $('#detail').innerHTML='<div class="detail-inner">'+head+
  switcher+
  '<div class="detail-section"><span class="eyebrow">OBJETIVO SELECIONADO</span><h2 style="font-size:19px;margin:6px 0 10px">'+esc(g.title)+'</h2><label class="eyebrow" for="goal-status">SITUAÇÃO</label><select id="goal-status" class="status-select">'+Object.keys(STATUSES).map(function(k){return '<option value="'+k+'" '+(k===g.status?'selected':'')+'>'+STATUSES[k]+'</option>'}).join('')+'</select></div>'+
  '<div class="detail-section"><h3>Próximo passo</h3><div class="detail-notes">'+esc(g.next||'Definir o que deseja fazer nesta região.')+'</div></div>'+
  '<div class="detail-section"><h3>Meu checklist</h3><p class="sub">'+done+' de '+g.steps.length+' etapas feitas</p>'+steps+'<div class="add-step"><input id="step-text" type="text" maxlength="140" placeholder="Adicionar uma etapa..." aria-label="Nova etapa"><button type="button" data-action="add-step">+</button></div></div>'+
  (g.notes?'<div class="detail-section"><h3>Anotações</h3><div class="detail-notes">'+esc(g.notes)+'</div></div>':'')+
  '<div class="detail-actions"><button class="cancel-button" type="button" data-action="edit-goal">Editar</button><button class="danger-button" type="button" data-action="remove-goal">Excluir</button></div>'+
  '</div>';
}
function render(){renderList();renderDetail()}
function openModal(idOrNull){
 ui.editing=idOrNull||null;
 const g=idOrNull?goals.find(function(x){return x.id===idOrNull}):null;
 $('#dialog-heading').textContent=g?'Editar objetivo':'Adicionar objetivo';
 $('#edit-region').innerHTML=REGIONS.map(function(r){return '<option value="'+r.id+'" '+((g?.region||ui.region)===r.id?'selected':'')+'>'+r.icon+' '+esc(r.name)+'</option>'}).join('');
 $('#edit-title').value=g?.title||'';
 $('#edit-next').value=g?.next||'';
 $('#edit-notes').value=g?.notes||'';
 const dlg=$('#goal-dialog');
 if(typeof dlg.showModal==='function')dlg.showModal();else dlg.setAttribute('open','');
 $('#edit-title').focus();
}
function closeModal(){const dlg=$('#goal-dialog');if(typeof dlg.close==='function')dlg.close();else dlg.removeAttribute('open')}
$('#goal-form').addEventListener('submit',function(e){
 e.preventDefault();
 const title=$('#edit-title').value.trim(),reg=$('#edit-region').value,next=$('#edit-next').value.trim(),notes=$('#edit-notes').value.trim();
 if(!title||!REGION_BY_ID[reg])return;
 let g=ui.editing?goals.find(function(x){return x.id===ui.editing}):null;
 if(g){g.title=title;g.region=reg;g.next=next;g.notes=notes;g.updated=new Date().toISOString();}
 else{g={id:id(),region:reg,title,next,notes,status:'pending',steps:standardSteps(next),updated:new Date().toISOString()};goals.push(g);}
 save();closeModal();selectGoal(g.id);toast('Objetivo salvo no dispositivo.');
});
$('#dialog-close').addEventListener('click',closeModal);$('#dialog-cancel').addEventListener('click',closeModal);
$('#goal-dialog').addEventListener('click',function(e){if(e.target===this)closeModal()});
$('#new-goal').addEventListener('click',function(){openModal(null)});
$('#mobile-new').addEventListener('click',function(){openModal(null)});
$('#goal-search').addEventListener('input',function(e){ui.query=e.target.value;renderList()});
$('#export-btn').addEventListener('click',function(){
 const blob=new Blob([JSON.stringify({app:'mapadocorpo',version:VERSION,exportedAt:new Date().toISOString(),goals},null,2)],{type:'application/json'});
 const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='mapa-do-corpo-backup.json';document.body.appendChild(a);a.click();a.remove();setTimeout(function(){URL.revokeObjectURL(url)},3000);toast('Backup preparado. Guarde o arquivo em local seguro.');
});
$('#import-btn').addEventListener('click',function(){$('#import-file').click()});
$('#import-file').addEventListener('change',async function(e){
 const f=e.target.files?.[0];e.target.value='';if(!f)return;
 try{
  if(f.size>5e6)throw Error('Arquivo muito grande');
  const d=JSON.parse(await f.text());
  if(d.app!=='mapadocorpo'||!Array.isArray(d.goals)||d.goals.length>1500)throw Error('Este arquivo não é um backup do Mapa do Corpo');
  const newGoals=d.goals.filter(function(x){return x&&typeof x.title==='string'&&REGION_BY_ID[x.region]}).map(function(g){return {id:String(g.id),region:g.region,title:g.title.slice(0,110),next:String(g.next||''),notes:String(g.notes||''),status:STATUSES[g.status]?g.status:'pending',steps:Array.isArray(g.steps)?g.steps.filter(function(s){return s&&typeof s.text==='string'}).map(function(s){return {id:String(s.id),text:s.text,done:!!s.done}}):[],updated:new Date().toISOString()}});
  if(!confirm('Restaurar este backup? Os objetivos atuais deste navegador serão substituídos.'))return;
  goals=newGoals;save();ui.goal=goals[0]?.id||null;ui.region=goals[0]?.region||'olheiras';ui.view=HEAD.has(ui.region)?'head':'body';render();syncScene(true);toast('Backup restaurado.');
 }catch(err){toast('Não foi possível restaurar: '+err.message)}
});
document.addEventListener('click',function(e){
 const goal=e.target.closest('[data-goal]');if(goal){selectGoal(goal.dataset.goal);return}
 const regionButton=e.target.closest('[data-region]');if(regionButton){selectRegion(regionButton.dataset.region,true);return}
 const view=e.target.closest('[data-view]');if(view){setView(view.dataset.view);return}
 const filter=e.target.closest('[data-filter]');if(filter){ui.filter=filter.dataset.filter;renderList();return}
 const action=e.target.closest('[data-action]');if(action){
  const g=activeGoal();
  if(action.dataset.action==='add-goal'){openModal(null)}
  if(action.dataset.action==='edit-goal'&&g){openModal(g.id)}
  if(action.dataset.action==='remove-goal'&&g){
   if(!confirm('Excluir este objetivo e seu checklist?'))return;
   goals=goals.filter(function(x){return x.id!==g.id});ui.goal=null;save();render();syncScene(false);toast('Objetivo excluído.');
  }
  if(action.dataset.action==='add-step'&&g){
   const inp=$('#step-text'),txt=inp?.value.trim();if(!txt)return;
   g.steps.push({id:id(),text:txt,done:false});save();render();toast('Etapa adicionada.');
  }
  return;
 }
 const scroll=e.target.closest('[data-scroll]');
 if(scroll){const target={map:'.map-panel',list:'.list-panel',detail:'.detail-panel'}[scroll.dataset.scroll];if(target)$(target)?.scrollIntoView({behavior:'smooth',block:'start'});}
});
document.addEventListener('change',function(e){
 const g=activeGoal();if(!g)return;
 if(e.target.id==='goal-status'){g.status=e.target.value;save();render();toast('Etapa atualizada.');return}
 if(e.target.matches('[data-step]')){
  const s=g.steps.find(function(x){return x.id===e.target.dataset.step});if(!s)return;
  s.done=e.target.checked;save();render();return;
 }
});
$('#reset-camera').addEventListener('click',function(){syncScene(true)});
window.BodyMap={regions:REGIONS,selectRegion:selectRegion,getSelection:function(){return {region:ui.region,view:ui.view}},hasGoal:function(regionId){return goals.some(function(g){return g.region===regionId})}};
render();
setTimeout(function(){
 if(!window.BodyMap3DReady){
  const load=document.getElementById('model-loading'),fallback=document.getElementById('viewer-fallback');
  if(load)load.hidden=true;
  if(fallback)fallback.hidden=false;
 }
},30000);
if('serviceWorker'in navigator&&location.protocol==='https:')navigator.serviceWorker.register('./sw.js').catch(function(){});
})();