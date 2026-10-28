(function(){
'use strict';
const T=window.TT,U=window.TTUI,C=window.TTCloud,esc=T.esc,num=T.money;
const btn=U.button;
let externalResults=[],searchSerial=0;
const field=(label,name,value,type,extra)=>'<div class="field"><label>'+esc(label)+'</label><input type="'+(type||'text')+'" name="'+name+'" value="'+esc(value??'')+'" '+(extra||'')+'></div>';
function setDate(s){const i=document.getElementById('selected-date');if(i){i.value=s;i.dispatchEvent(new Event('change',{bubbles:true}))}}
function err(x){U.error(x)}
function foodModal(slot){
 const plans=T.state.mealPlans,items=T.state.foods;
 const chosen=slot||plans[0]?.id||'cafe';
 externalResults=[];searchSerial++;
 U.modal('Adicionar alimento',
 '<form data-form="food"><div class="field"><label>Refeição</label><select name="slot">'+plans.map(x=>'<option value="'+esc(x.id)+'" '+(x.id===chosen?'selected':'')+'>'+esc(x.name)+'</option>').join('')+'</select></div>'+
 '<div class="field"><label>Alimento do meu catálogo</label><select name="foodId">'+items.map(x=>'<option value="'+esc(x.id)+'">'+esc(x.name)+' · '+num(x.kcal)+' kcal/100 '+esc(x.unit||'g')+'</option>').join('')+'</select></div>'+
 field('Quantidade (g ou ml, conforme alimento)','grams',100,'number','min="1" max="5000" step="1" required')+
 '<button type="submit" class="btn full">Adicionar ao diário</button></form>'+
 '<div class="hr"></div><form data-form="food-search"><div class="field"><label>Buscar produto novo (nome ou marca)</label><input name="query" autocomplete="off" maxlength="80" placeholder="Ex.: Monster Energy 500 ml" required></div>'+
 '<div class="actions"><button class="btn" type="submit">Buscar na internet</button><button class="btn secondary" type="button" data-action="voice-food-search">🎤 Ditar nome</button></div></form>'+
 '<div id="external-food-results" aria-live="polite"><p class="muted small">A consulta usa Open Food Facts e requer login. Confira o rótulo antes de registrar.</p></div>'+
 '<div class="hr"></div>'+btn('Cadastrar alimento manualmente','new-food','small secondary'));
}
async function searchExternalFoods(query){
 const box=document.getElementById('external-food-results');if(!box)return;
 const serial=++searchSerial;box.textContent='Buscando produtos...';
 try{
  const products=await C.searchFoods(query);
  if(serial!==searchSerial||!box.isConnected)return;
  externalResults=products;
  if(!products.length){box.textContent='Não encontrei produtos com informações nutricionais completas. Tente uma marca ou nome mais específico.';return}
  box.innerHTML='<p class="muted small">'+products.length+' resultado(s). Escolha a versão correta do produto.</p>'+
    products.map((p,i)=>'<div class="listrow"><div class="content"><b>'+esc(p.name)+'</b><small>'+esc(p.brand||'Marca não informada')+' · '+esc(p.packageQuantity||'Embalagem não informada')+'</small><small>'+num(p.kcal,1)+' kcal/100 '+esc(p.unit)+' · P '+num(p.p,1)+' g · C '+num(p.c,1)+' g · G '+num(p.f,1)+' g</small></div>'+
    btn('Selecionar','external-food-select','small secondary','data-index="'+i+'"')+'</div>').join('');
 }catch(ex){if(serial===searchSerial&&box.isConnected)box.textContent=ex.message||'Erro na pesquisa.'}
}
function externalFoodModal(index){
 const product=externalResults[index];if(!product)throw Error('Selecione um resultado válido.');
 const plans=T.state.mealPlans,chosen=document.querySelector('form[data-form="food"] select[name="slot"]')?.value||plans[0]?.id||'cafe';
 const match=String(product.packageQuantity||'').match(/(\d+(?:[.,]\d+)?)\s*(ml|g)\b/i);
 const amount=match?Number(match[1].replace(',','.')):100;
 U.modal('Confirmar produto',
 '<p><b>'+esc(product.name)+'</b> · '+esc(product.brand||'')+'</p><p class="muted small">Fonte: Open Food Facts · '+esc(product.packageQuantity||'Sem tamanho informado')+' · '+num(product.kcal,1)+' kcal/100 '+esc(product.unit)+'</p>'+
 '<form data-form="external-food">'+field('Índice do resultado','index',index,'hidden','required')+
 '<div class="field"><label>Refeição</label><select name="slot">'+plans.map(x=>'<option value="'+esc(x.id)+'" '+(x.id===chosen?'selected':'')+'>'+esc(x.name)+'</option>').join('')+'</select></div>'+
 field('Quantidade consumida ('+product.unit+')','amount',Math.min(5000,Math.max(1,amount)),'number','min="1" max="5000" step="1" required')+
 '<p class="muted small">Confira a versão do produto, a porção e a tabela nutricional. Os dados podem estar incompletos ou desatualizados.</p>'+
 '<button type="submit" class="btn full">Registrar e salvar no meu catálogo</button></form>');
}
function dictationFoodName(){
 const Speech=window.SpeechRecognition||window.webkitSpeechRecognition;
 if(!Speech)throw Error('Ditado indisponível neste navegador. Use a busca por texto.');
 const recognition=new Speech();recognition.lang='pt-BR';recognition.interimResults=false;recognition.maxAlternatives=1;
 recognition.onresult=ev=>{const query=String(ev.results?.[0]?.[0]?.transcript||'').trim();
 const form=document.querySelector('form[data-form="food-search"]');
 if(form&&query){form.elements.query.value=query;form.requestSubmit();}
 };
 recognition.onerror=ev=>U.toast('Não consegui ouvir: '+(ev.error||'erro')+'. Digite o produto na busca.');
 recognition.start();U.toast('Fale o nome do produto.');
}
function newFoodModal(){
 U.modal('Novo alimento (por 100 g)','<form data-form="new-food">'+field('Nome','name','','text','required maxlength="80"')+'<div class="formgrid">'+[['kcal','Calorias (kcal)'],['p','Proteínas (g)'],['c','Carboidratos (g)'],['f','Gorduras (g)'],['fiber','Fibras (g)']].map(([k,l])=>field(l,k,0,'number','min="0" max="9999" step="0.1" required')).join('')+'</div><p class="muted small" style="margin:12px 0">Informe os valores do rótulo ou de uma tabela nutricional confiável, sempre por 100 g.</p><button type="submit" class="btn full">Salvar alimento</button></form>')
}
function mealDetail(slot){
 const plan=T.state.mealPlans.find(x=>x.id===slot),list=T.foodsForSlot(U.date,slot);
 U.modal(plan?.name||'Refeição',list.length?list.map(x=>'<div class="listrow"><div class="content"><b>'+esc(x.name)+'</b><small>'+num(x.grams)+' '+esc(x.unit||'g')+' · '+num(x.kcal)+' kcal · P '+num(x.p,1)+' g</small></div>'+btn('Excluir','delete-food','small danger','data-entry="'+esc(x.id)+'"')+'</div>').join('')+btn('Adicionar mais um alimento','add-food','small secondary','data-slot="'+esc(slot)+'"'):'<p class="muted small">Ainda sem registros nesta refeição.</p>'+btn('Adicionar alimento','add-food','small secondary','data-slot="'+esc(slot)+'"'));
}
function waterModal(){U.modal('Adicionar água','<form data-form="water">'+field('Quantidade (ml)','ml',350,'number','min="1" max="5000" required')+'<button class="btn full">Registrar água</button></form>')}
function sleepModal(){
 const sleep=T.dayRead(U.date).sleep||{};
 U.modal('Registrar sono','<form data-form="sleep"><div class="formgrid">'+field('Dormi às','bed',sleep.bed||'23:00','time','required')+field('Acordei às','wake',sleep.wake||'07:00','time','required')+field('Duração (horas, opcional)','hours',sleep.hours??'','number','min="0" max="24" step=".1"')+field('Despertares','awakenings',sleep.awakenings??0,'number','min="0" max="30"')+'</div><div class="field"><label>Qualidade percebida</label><select name="quality">'+[1,2,3,4,5].map(i=>'<option value="'+i+'" '+(i===(sleep.quality||3)?'selected':'')+'>'+i+' / 5</option>').join('')+'</select></div><p class="muted small" style="margin:10px 0">O registro é associado ao dia em que você acordou. Duração é calculada se o campo ficar vazio.</p><button class="btn full">Salvar sono</button></form>');
}
function wellbeingModal(){
 const day=T.dayRead(U.date);
 U.modal('Meu bem-estar','<form data-form="wellbeing"><div class="formgrid"><div class="field"><label>Energia de 1 a 5</label><select name="energy"><option value="">Não registrar</option>'+[1,2,3,4,5].map(x=>'<option value="'+x+'" '+(day.energy===x?'selected':'')+'>'+x+'</option>').join('')+'</select></div><div class="field"><label>Libido de 1 a 5</label><select name="libido"><option value="">Não registrar</option>'+[1,2,3,4,5].map(x=>'<option value="'+x+'" '+(day.libido===x?'selected':'')+'>'+x+'</option>').join('')+'</select></div></div><div class="field"><label>Observações</label><textarea name="notes" maxlength="900" rows="3">'+esc(day.notes||'')+'</textarea></div><p class="muted small">Registros subjetivos para acompanhar hábitos; não servem para estimar hormônios.</p><button class="btn full" style="margin-top:12px">Salvar bem-estar</button></form>');
}
function measureModal(){
 const defs=U.MEASURES,day=T.dayRead(U.date);
 U.modal('Atualizar medidas','<form data-form="measure"><div class="measuregrid">'+defs.map(([key,label,unit])=>field(label+' ('+unit+')',key,day.measures?.[key]??'','number','min="0" max="400" step="0.1"')).join('')+'</div><p class="muted small" style="margin:12px 0">Campos vazios não alteram medidas já registradas. Meça em condições semelhantes para comparar.</p><button class="btn full">Salvar medidas</button></form>');
}
function cardioModal(){U.modal('Registrar cardio','<form data-form="cardio"><div class="field"><label>Atividade</label><select name="type"><option>Caminhada</option><option>Esteira</option><option>Bicicleta</option><option>Corrida</option><option>Elíptico</option><option>Outro</option></select></div><div class="formgrid">'+field('Minutos','minutes',30,'number','min="1" max="600" required')+field('Distância (km, opcional)','distance',0,'number','min="0" max="500" step="0.1"')+'</div><button class="btn full" style="margin-top:12px">Salvar cardio</button></form>')}
function examModal(){U.modal('Exame de testosterona total','<form data-form="exam">'+field('Data do exame','date',U.date,'date','required')+field('Resultado ng/dL','value','','number','min="1" max="3000" step="0.1" required')+field('Observações','notes','','text','maxlength="200"')+'<p class="muted small" style="margin:10px 0">Considere unidades e intervalos de referência do laboratório. Procure avaliação profissional para interpretar resultados.</p><button class="btn full">Salvar exame</button></form>')}

function previewDiet(key){
 const template=T.MEAL_TEMPLATES[key];if(!template)throw Error('Modelo não encontrado.');
 const names={emagrecer:'Emagrecimento',manter:'Manutenção',ganhar:'Hipertrofia'};
 const title=template.label||names[key]||key;
 let totals=[];
 const rows=template.meals.map((meal,i)=>{
   const macros=T.sum(meal.map(([foodId,grams])=>T.calc(T.foodById(foodId),grams)));
   totals.push(macros);
   return '<div class="listrow"><div class="stamp">'+esc(T.SLOTS[i]?.[2]||'')+'</div><div class="content"><b>'+esc(T.SLOTS[i]?.[1]||'Refeição')+'</b><small>'+esc(meal.map(([foodId,grams])=>(T.foodById(foodId)?.name||foodId)+' · '+grams+' g').join(' | '))+'</small><small>'+num(macros.kcal)+' kcal · P '+num(macros.p)+' g · C '+num(macros.c)+' g · G '+num(macros.f)+' g</small></div></div>';
 }).join('');
 const all=T.sum(totals);
 U.modal(title,'<p class="small muted">'+esc(template.description||'Cardápio de referência personalizável.')+'</p><div class="grid3" style="margin:14px 0"><div class="measurebox"><span>Calorias estimadas</span><strong>'+num(all.kcal)+' kcal</strong></div><div class="measurebox"><span>Proteína</span><strong>'+num(all.p)+' g</strong></div><div class="measurebox"><span>Carboidratos</span><strong>'+num(all.c)+' g</strong></div></div>'+rows+'<p class="muted small" style="margin:12px 0">Valores estimados por porção. Carnes e arroz considerados após o preparo. Confirme os rótulos do whey e dos alimentos.</p>'+btn('Aplicar este cardápio','apply-diet','full','data-key="'+esc(key)+'"'));
}
function editMeals(slot){
 const meal=T.state.mealPlans.find(x=>x.id===(slot||T.state.mealPlans[0].id));
 const rows=(meal?.items||[]).map((item,i)=>{
  const food=T.foodById(item.foodId);
  return '<div class="listrow"><div class="content"><b>'+esc(food?.name||'Alimento')+'</b><small>'+num(item.grams)+' g · '+num(T.calc(food,item.grams).kcal)+' kcal</small></div>'+btn('Editar','edit-meal-item','small secondary','data-slot="'+esc(meal.id)+'" data-i="'+i+'"')+btn('Remover','remove-meal-item','small outline','data-slot="'+esc(meal.id)+'" data-i="'+i+'"')+'</div>';
 }).join('');
 U.modal('Editar dieta e horários','<div class="chipbar">'+T.state.mealPlans.map(x=>btn(x.name,'edit-meals','small '+(x.id===meal?.id?'':'secondary'),'data-slot="'+esc(x.id)+'"')).join('')+'</div><form data-form="meal-time"><input type="hidden" name="slot" value="'+esc(meal.id)+'">'+field('Horário','time',meal.time,'time','required')+'<button class="btn small" type="submit">Salvar horário</button></form><div class="divider-title">Alimentos planejados</div>'+rows+'<div style="margin-top:12px">'+btn('+ Adicionar alimento ao modelo','add-meal-item','small secondary','data-slot="'+esc(meal.id)+'"')+'</div>');
}
function editMealItem(slot,index){
 const meal=T.state.mealPlans.find(x=>x.id===slot),it=index===null?null:meal?.items[index];
 U.modal(it?'Editar porção':'Adicionar alimento ao modelo','<form data-form="meal-item"><input type="hidden" name="slot" value="'+esc(slot)+'"><input type="hidden" name="index" value="'+(index===null?-1:index)+'"><div class="field"><label>Alimento</label><select name="foodId">'+T.state.foods.map(f=>'<option value="'+esc(f.id)+'" '+(it?.foodId===f.id?'selected':'')+'>'+esc(f.name)+'</option>').join('')+'</select></div>'+field('Porção (g)','grams',it?.grams??100,'number','min="1" max="5000" required')+'<button class="btn full">Salvar</button></form>');
}
function editWorkout(){
 const letter=U.trainLetter||T.dayRead(U.date).workout?.letter||T.workoutLetter(U.date);
 const list=T.state.workoutPlans[letter]||[];
 U.modal('Editar treinos '+T.state.config.split,'<div class="chipbar">'+T.workoutLetters().map(x=>btn('Treino '+x,'edit-workout','small '+(x===letter?'':'secondary'),'data-letter="'+x+'"')).join('')+'</div><div class="divider-title">Ficha '+esc(letter)+'</div>'+list.map((ex,i)=>'<div class="listrow"><div class="content"><b>'+esc(ex.name)+'</b><small>'+ex.sets+' séries · '+esc(ex.reps)+' rep · '+ex.rest+' s</small></div>'+btn('Editar','exercise-form','small secondary','data-letter="'+letter+'" data-index="'+i+'"')+btn('×','remove-exercise','small outline','data-letter="'+letter+'" data-index="'+i+'"')+'</div>').join('')+'<div class="actions" style="margin-top:13px">'+btn('+ Exercício','exercise-form','small','data-letter="'+letter+'" data-index="-1"')+'</div>');
}
function exerciseModal(letter,index){
 const ex=index<0?null:T.state.workoutPlans[letter]?.[index];
 U.modal(ex?'Editar exercício':'Adicionar exercício','<form data-form="exercise"><input type="hidden" name="letter" value="'+letter+'"><input type="hidden" name="index" value="'+index+'">'+field('Nome do exercício','name',ex?.name||'','text','required maxlength="100"')+'<div class="formgrid">'+field('Séries','sets',ex?.sets??3,'number','min="1" max="15" required')+field('Repetições / alvo','reps',ex?.reps||'8–12','text','required maxlength="20"')+field('Descanso (segundos)','rest',ex?.rest??90,'number','min="15" max="600" required')+'</div><button class="btn full" style="margin-top:12px">Salvar exercício</button></form>');
}
function supplementModal(sid){
 const s=T.state.supplements.find(x=>x.id===sid);
 U.modal(s?'Editar suplemento':'Novo suplemento','<form data-form="supplement"><input type="hidden" name="id" value="'+esc(sid||'')+'">'+field('Nome','name',s?.name||'','text','required maxlength="80"')+field('Dose/descrição (não é prescrição)','dose',s?.dose||'','text','maxlength="120"')+field('Horário','time',s?.time||'13:00','time','required')+'<div class="field"><label>Frequência</label><select name="days"><option value="all" '+((s?.days||'all')==='all'?'selected':'')+'>Todos os dias</option><option value="training" '+(s?.days==='training'?'selected':'')+'>Somente nos dias de musculação</option></select></div>'+field('Observações','notes',s?.notes||'','text','maxlength="180"')+'<label class="pill"><input type="checkbox" name="enabled" '+(s?.enabled?'checked':'')+'> Incluir na rotina</label><div style="margin-top:12px"><button class="btn full">Salvar suplemento</button></div></form>');
}
function taskOpen(id){
 const task=T.schedule(U.date).find(x=>x.id===id);if(!task)return;
 if(task.type==='meal'||task.type==='water'||task.type==='supplement'){U.go('diario');return}
 if(task.type==='workout'){U.go('treinar');return}
 if(task.type==='measure'){measureModal();return}
 if(task.type==='sleep'){sleepModal();return}
}
function taskComplete(taskId){
 const d=U.date,task=T.schedule(d).find(x=>x.id===taskId);
 if(!task)throw Error('Atividade não encontrada.');
 if(T.taskStatus(d,task)==='done'){U.toast('Esta atividade já está concluída.');return}
 if(task.type==='meal'){
  const plan=T.state.mealPlans.find(x=>x.id===task.ref);
  if(!plan)throw Error('Refeição não encontrada.');
  const mealList=plan.items.map(x=>(T.foodById(x.foodId)?.name||x.foodId)+' · '+num(x.grams)+' g').join('\n');
  if(!confirm('Registrar como consumida a refeição planejada?\n\n'+mealList+'\n\nSe comeu quantidades diferentes, cancele e registre pelo Diário.'))return;
  T.registerPlan(d,task.ref);
  U.toast('Refeição registrada e atividade concluída.');
  return
 }
 if(task.type==='water'){
  const inserted=T.water(d,250);
  U.toast(inserted?'250 ml registrados · atividade concluída.':'Essa quantidade já foi registrada agora.');
  return
 }
 if(task.type==='sleep'){T.taskSet(d,task.id,'done');U.toast('Rotina noturna marcada como concluída. O sono pode ser registrado ao acordar.');return}
 if(task.type==='supplement'){
  T.setSupplement(d,task.ref,true);
  U.toast('Suplemento marcado como tomado.');
  return
 }
 taskOpen(taskId)
}
async function cloudAction(action){
 if(action==='cloud-enable'){await C.enable();U.toast('Dados enviados. Sincronização automática ativa.')}
 if(action==='cloud-download'){T.exportJson();await C.download();U.toast('Dados da nuvem carregados.')}
 if(action==='cloud-backup'){await C.backupRemote();U.toast('Backup da nuvem baixado.')}
 if(action==='cloud-overwrite'){T.exportJson();try{await C.backupRemote()}catch(e){if(!/ainda não tem dados/i.test(e.message))throw e}await C.overwriteCloud();U.toast('Nuvem atualizada.')}
 if(action==='cloud-logout'){await C.logout();U.toast('Sessão encerrada. Dados locais mantidos.')}
 U.render()
}
document.addEventListener('click',async ev=>{
 const b=ev.target.closest('button[data-action], [data-action="close"]');if(!b)return;
 const a=b.dataset.action;if(!a)return;
 try{
 const d=U.date;
 if(a==='close'){U.close();return}
 if(a==='prev'){setDate(T.addDay(d,-1));return}
 if(a==='next'){setDate(T.addDay(d,1));return}
 if(a==='models'){U.go('modelos');return}
 if(a==='settings'){U.go('ajustes');return}
 if(a==='evolution'){U.go('evolucao');return}
 if(a==='task'){taskOpen(b.dataset.task);return}
 if(a==='task-complete'){taskComplete(b.dataset.task);return}
 if(a==='task-reset'){T.taskSet(d,b.dataset.task,'pending');U.toast('Atividade reaberta.');return}
 if(a==='skip'){const task=b.dataset.task;T.taskSet(d,task,T.dayRead(d).tasks?.[task]==='skipped'?'pending':'skipped');return}
 if(a==='water'){const inserted=T.water(d,Number(b.dataset.ml));if(inserted)U.close();U.toast(inserted?'Água registrada!':'Esta mesma quantidade já foi registrada há poucos segundos.');return}
 if(a==='undo-water'){if(T.dayRead(d).water.length)T.waterUndo(d);return}
 if(a==='remove-water'){if(confirm('Excluir este registro de água?')){T.waterRemove(d,b.dataset.entry);U.toast('Registro de água excluído.')}return}
 if(a==='register-meal'){T.registerPlan(d,b.dataset.slot);U.toast('Refeição registrada com os itens planejados.');return}
 if(a==='add-food'){foodModal(b.dataset.slot);return}
 if(a==='external-food-select'){externalFoodModal(Number(b.dataset.index));return}
 if(a==='voice-food-search'){dictationFoodName();return}
 if(a==='new-food'){newFoodModal();return}
 if(a==='meal-detail'){mealDetail(b.dataset.slot);return}
 if(a==='delete-food'){T.removeFood(d,b.dataset.entry);U.close();U.toast('Item removido.');return}
 if(a==='water-form'){waterModal();return}
 if(a==='sleep-form'){sleepModal();return}
 if(a==='measure-form'){measureModal();return}
 if(a==='wellbeing-form'){wellbeingModal();return}
 if(a==='cardio-form'){cardioModal();return}
 if(a==='exam-form'){examModal();return}
 if(a==='choose-workout'){U.trainLetter=b.dataset.letter;U.render();return}
 if(a==='start-workout'){T.workoutStart(d);T.day(d).workout.letter=b.dataset.letter;T.save();U.toast('Treino iniciado!');return}
 if(a==='finish-workout'){if(confirm('Finalizar a sessão de treino?'))T.workoutFinish(d);return}
 if(a==='preview-diet'){previewDiet(b.dataset.key);return}
 if(a==='apply-diet'){if(confirm('Substituir o cardápio planejado por este modelo? As refeições já registradas e as dietas salvas serão mantidas.')){T.applyDiet(b.dataset.key);U.close();U.go('diario');U.toast('Dieta aplicada. Você já pode editar os alimentos e as porções.')}return}
 if(a==='save-diet'){const name=prompt('Nome da dieta personalizada:', 'Minha dieta');if(name){T.saveDiet(name);U.toast('Modelo de dieta salvo.')}return}
 if(a==='apply-saved-diet'){if(confirm('Aplicar este modelo de dieta? Registros anteriores serão mantidos.')){T.applySavedDiet(b.dataset.key);U.toast('Dieta personalizada aplicada.')}return}
  if(a==='apply-split'){if(confirm('Aplicar nova divisão de treinos? Seu histórico de séries será mantido.')){T.applySplit(b.dataset.key);U.toast('Modelo de treino aplicado.')}return}
 if(a==='apply-routine'){T.day(d).routine=b.dataset.key;T.save();U.toast('Modelo aplicado somente a esta data.');return}
 if(a==='edit-meals'){editMeals(b.dataset.slot);return}
 if(a==='edit-meal-item'){editMealItem(b.dataset.slot,Number(b.dataset.i));return}
 if(a==='add-meal-item'){editMealItem(b.dataset.slot,null);return}
 if(a==='remove-meal-item'){const meal=T.state.mealPlans.find(x=>x.id===b.dataset.slot);meal.items.splice(Number(b.dataset.i),1);T.save();editMeals(meal.id);return}
 if(a==='edit-workout'){if(b.dataset.letter)U.trainLetter=b.dataset.letter;editWorkout();return}
 if(a==='exercise-form'){exerciseModal(b.dataset.letter,Number(b.dataset.index));return}
 if(a==='remove-exercise'){const list=T.state.workoutPlans[b.dataset.letter];if(confirm('Remover este exercício da ficha?')){list.splice(Number(b.dataset.index),1);T.save();editWorkout()}return}
 if(a==='edit-supplement'){supplementModal(b.dataset.sid);return}
 if(a==='new-supplement'){supplementModal('');return}
 if(a==='stop-rest'){window.TTRestEnd=0;U.render();U.toast('Descanso encerrado');return}
 if(a==='toggle-reminders'){
  if(!T.state.config.reminders&&'Notification' in window&&Notification.permission==='default')await Notification.requestPermission();
  T.state.config.reminders=!T.state.config.reminders;T.save();
  U.toast(T.state.config.reminders?'Lembretes ativados enquanto o app estiver aberto.':'Lembretes desativados.');
  return
 }
 if(a==='export'){T.exportJson();return}
 if(a==='import'){document.getElementById('backup-file')?.click();return}
 if(a==='migrate-cloud'){T.exportJson();const success=await C.importLegacyCloud();if(success)U.toast('Histórico anterior importado sem apagar a versão 2.1.');return}
 if(a==='migrate'){const old=T.legacyAvailable();if(!old)throw Error('Nenhum histórico da versão anterior encontrado neste aparelho.');if(!confirm('Importar dados de sono, peso, cintura, energia e exames da versão 2.1? Seus dados originais permanecerão intactos.'))return;T.importLegacy(old);U.toast('Histórico importado.');return}
 if(a.startsWith('cloud-')){await cloudAction(a);return}
 }catch(ex){err(ex)}
});
document.addEventListener('change',ev=>{
 const t=ev.target;
 try{
 if(t.id==='selected-date'&&/^\d{4}-\d{2}-\d{2}$/.test(t.value)){U.date=t.value;U.render();return}
 if(t.matches('[data-supplement]')){T.setSupplement(U.date,t.dataset.supplement,t.checked);return}
 if(t.matches('[data-enable-supplement]')){const s=T.state.supplements.find(x=>x.id===t.dataset.enableSupplement);if(s){s.enabled=t.checked;T.save()}return}
 }catch(ex){err(ex)}
});
document.addEventListener('submit',async ev=>{
 const form=ev.target;if(!form.dataset.form)return;
 ev.preventDefault();const fd=new FormData(form),v=k=>String(fd.get(k)||''),n=k=>Number(v(k).replace(',','.'));
 try{
 const d=U.date;
 if(form.dataset.form==='food'){T.addFood(d,v('slot'),v('foodId'),n('grams'));U.close();U.toast('Alimento registrado.')}
 else if(form.dataset.form==='food-search'){await searchExternalFoods(v('query'))}
 else if(form.dataset.form==='external-food'){const p=externalResults[n('index')];if(!p)throw Error('Produto não encontrado.');T.addExternalFood(d,v('slot'),p,n('amount'));U.close();U.toast('Produto registrado e salvo no catálogo.')}
 else if(form.dataset.form==='new-food'){const f={id:T.id(),name:v('name').trim(),kcal:n('kcal'),p:n('p'),c:n('c'),f:n('f'),fiber:n('fiber')};if(!f.name)throw Error('Nome obrigatório');T.state.foods.push(f);T.save();foodModal()}
 else if(form.dataset.form==='water'){const inserted=T.water(d,n('ml'));if(inserted)U.close();U.toast(inserted?'Água registrada.':'Esta mesma quantidade já foi registrada há poucos segundos.')}
 else if(form.dataset.form==='sleep'){let hours=n('hours');if(!v('hours')){const [bh,bm]=v('bed').split(':').map(Number),[wh,wm]=v('wake').split(':').map(Number);hours=((wh*60+wm-bh*60-bm+1440)%1440)/60}T.setSleep(d,v('bed'),v('wake'),hours,n('quality'),n('awakenings'));U.close();U.toast('Sono registrado.')}
 else if(form.dataset.form==='wellbeing'){const day=T.day(d);day.energy=v('energy')?n('energy'):null;day.libido=v('libido')?n('libido'):null;day.notes=v('notes').slice(0,900);T.save();U.close();U.toast('Bem-estar salvo.')}
 else if(form.dataset.form==='protocol'){T.state.config.protocolStart=v('protocolStart');T.save();U.toast('Data do protocolo atualizada.')}
 else if(form.dataset.form==='measure'){for(const [k] of U.MEASURES){if(v(k)!=='')T.day(d).measures[k]=n(k)}T.save();U.close();U.toast('Medidas salvas.')}
 else if(form.dataset.form==='cardio'){T.cardioAdd(d,n('minutes'),v('type'),n('distance'));U.close();U.toast('Cardio registrado.')}
 else if(form.dataset.form==='exam'){T.state.exams.push({id:T.id(),date:v('date'),value:n('value'),notes:v('notes')});T.save();U.close();U.toast('Exame registrado.')}
 else if(form.dataset.form==='meal-time'){const meal=T.state.mealPlans.find(x=>x.id===v('slot'));meal.time=v('time');T.save();editMeals(meal.id);}
 else if(form.dataset.form==='meal-item'){const meal=T.state.mealPlans.find(x=>x.id===v('slot'));const it={foodId:v('foodId'),grams:n('grams')};if(n('index')<0)meal.items.push(it);else meal.items[n('index')]=it;T.save();editMeals(meal.id)}
 else if(form.dataset.form==='exercise'){const letter=v('letter'),index=n('index'),old=T.state.workoutPlans[letter]?.[index];const it={id:old?.id||T.id(),name:v('name'),sets:n('sets'),reps:v('reps'),rest:n('rest')};if(index<0)T.state.workoutPlans[letter].push(it);else T.state.workoutPlans[letter][index]=it;T.save();U.trainLetter=letter;editWorkout()}
 else if(form.dataset.form==='supplement'){const id=v('id')||T.id();const it={id,name:v('name'),dose:v('dose'),time:v('time'),days:v('days'),notes:v('notes'),enabled:fd.has('enabled')};const ix=T.state.supplements.findIndex(x=>x.id===id);if(ix<0)T.state.supplements.push(it);else T.state.supplements[ix]=it;T.save();U.close()}
 else if(form.dataset.form==='settings'){
 const c=T.state.config;for(const k of ['calories','protein','carbs','fat','water','sleep']){if(n(k)<=0)throw Error('Informe metas maiores que zero.');c.goals[k]=n(k)}
 c.planStart=v('planStart')||T.today();c.measureDay=n('measureDay');c.trainingDays=[0,1,2,3,4,5,6].filter(i=>fd.has('train'+i));c.times.wake=v('wake');c.times.workout=v('workout');c.times.bed=v('bed');T.save();U.toast('Configurações atualizadas.')
 }
 else if(form.dataset.form==='set'){
 const exc=form.dataset.exercise,index=Number(form.dataset.index);T.workoutSet(d,exc,index,n('weight'),n('reps'));U.toast('Série registrada!');const letter=T.dayRead(d).workout?.letter||T.workoutLetter(d);const ex=T.state.workoutPlans[letter]?.find(x=>x.id===exc);window.TTRestEnd=Date.now()+(ex?.rest||90)*1000;U.render();
 }
 else if(form.dataset.form==='login'){const method=ev.submitter?.value||'signin';const result=await C.login(v('email'),v('password'),method==='signup');U.toast(result);U.render()}
 }catch(ex){err(ex)}
});
document.addEventListener('change',async ev=>{
 if(ev.target.id!=='backup-file')return;
 const file=ev.target.files[0];if(!file)return;
 try{if(file.size>4_000_000)throw Error('Backup muito grande.');const obj=JSON.parse(await file.text());if(!confirm('Restaurar este backup? Os dados locais serão substituídos. Exporte seu backup atual se necessário.'))return;T.importJson(obj);U.toast('Backup restaurado.')}catch(ex){err(ex)}finally{ev.target.value=''}
});
})();
