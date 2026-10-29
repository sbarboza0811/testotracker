(function(){
'use strict';
const T=window.TT,C=window.TTCloud;
let tab='hoje',selected=T.today(),trainLetter='',toastTimer=null;
const esc=T.esc,num=T.money;
function toast(message){const box=T.$('toast');box.textContent=message;box.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>box.classList.remove('show'),3200)}
function error(err){console.error(err);toast(err?.message||'Não foi possível salvar.')}
function modal(title,html){T.$('modal-title').textContent=title;T.$('modal-body').innerHTML=html;T.$('modal').classList.remove('hidden');T.$('modal').querySelector('input,select,button')?.focus()}
function close(){T.$('modal').classList.add('hidden')}
function go(name){tab=name;trainLetter='';close();render();window.scrollTo(0,0)}
function button(label,action,cls,attrs){return '<button type="button" class="btn '+(cls||'secondary')+'" data-action="'+action+'" '+(attrs||'')+'>'+esc(label)+'</button>'}
function panel(title,body,tools){return '<section class="panel"><div class="label-row"><h2>'+esc(title)+'</h2>'+(tools||'')+'</div>'+body+'</section>'}
function pct(a,b){return '<div class="progress"><span style="width:'+Math.max(0,Math.min(100,b?100*a/b:0))+'%"></span></div>'}
function stat(label,value,sub,emoji,a,b){return '<div class="panel stat"><div class="topstat"><span class="icon">'+emoji+'</span><span class="label">'+esc(label)+'</span></div><div><div class="num">'+esc(value)+'</div><div class="sub">'+esc(sub)+'</div></div>'+pct(a,b)+'</div>'}
function accordion(title,body,opened=false,subtitle=''){
 if(title==='Minha nuvem')opened=true;
 return '<details class="panel app-accordion"'+(opened?' open':'')+'><summary><span class="accordion-label">'+esc(title)+(subtitle?'<small>'+esc(subtitle)+'</small>':'')+'</span><span class="accordion-chevron">⌄</span></summary><div class="accordion-content">'+body+'</div></details>';
}
function heading(kicker,title,description,showDate=true){
 return '<div class="page-head"><div class="page-head-line"><div><span class="eyebrow">'+esc(kicker)+'</span><h1>'+esc(title)+'</h1>'+(description?'<p class="subline">'+esc(description)+'</p>':'')+'</div></div>'+
 (showDate?'<div class="date-line"><button type="button" data-action="prev" aria-label="Dia anterior">‹</button><input type="date" id="selected-date" aria-label="Data do diário" value="'+selected+'"><button type="button" data-action="next" aria-label="Próximo dia">›</button><span class="small muted">'+esc(T.fmt(selected))+'</span></div>':'')+'</div>';
}
function taskIcon(type){return {water:'💧',meal:'🍽️',workout:'🏋️',supplement:'💊',sleep:'🌙',measure:'📏'}[type]||'✓'}
function taskRow(x){
 const status=T.taskStatus(selected,x),finished=status==='done';
 const primary=finished?button('Ver','task','small secondary','data-task="'+esc(x.id)+'"')
   :status==='skipped'?button('Reativar','skip','small secondary','data-task="'+esc(x.id)+'"')
   :(['water','meal','supplement','sleep'].includes(x.type)?button(x.type==='water'?'+ 250 ml':x.type==='meal'?'Registrar':x.type==='sleep'?'Concluir':'Concluir','task-complete','small','data-task="'+esc(x.id)+'"'):button('Abrir','task','small','data-task="'+esc(x.id)+'"'));
 const secondary=!finished&&status!=='skipped'?button('Ignorar','skip','small outline','data-task="'+esc(x.id)+'"'):'';
 return '<div class="listrow taskrow '+(finished?'done':'')+'"><div class="stamp">'+esc(x.time)+'</div><div class="roundicon">'+taskIcon(x.type)+'</div><div class="content"><b>'+esc(x.label)+'</b><small class="task-quantity">'+esc(T.taskDetail(selected,x))+'</small><span class="pill task-status '+(finished?'good':status==='skipped'?'bad':'')+'">'+(finished?'✓ Feito':status==='skipped'?'Ignorado':'Pendente')+'</span></div><div class="task-actions">'+primary+secondary+'</div></div>';
}
function pageToday(){
 const macros=T.getMacros(selected),goals=T.state.config.goals,day=T.dayRead(selected),water=T.waterTotal(selected),tasks=T.schedule(selected);
 const done=tasks.filter(x=>T.taskStatus(selected,x)==='done').length,upcoming=tasks.find(x=>T.taskStatus(selected,x)==='pending');
 const kcalPct=Math.max(0,Math.min(100,Math.round((macros.kcal/Math.max(1,goals.calories))*100)));
 let html=heading('VISÃO GERAL','Seu dia','O essencial da sua rotina, sem distrações.');
 html+='<section class="dashboard-hero"><div class="dashboard-hero-copy"><span class="eyebrow">REGISTRO MAIS RÁPIDO</span><h2>O que você comeu?</h2><p>Fale os alimentos e as quantidades. O resto é automático.</p></div><div class="dashboard-hero-actions">'+button('🎙 Registrar por voz','meal-speak','voice-main')+button('Digitar','meal-text','voice-alt')+'</div></section>';
 html+='<section class="panel calorie-overview"><div class="calorie-layout"><div><span class="eyebrow">CALORIAS DE HOJE</span><div class="calorie-value">'+num(macros.kcal)+' <small>kcal</small></div><p class="muted small">Meta: '+num(goals.calories)+' kcal</p></div><div class="calorie-ring" style="--ring-progress:'+kcalPct+'%" role="img" aria-label="'+kcalPct+'% da meta calórica"><strong>'+kcalPct+'%</strong></div></div>'+
 pct(macros.kcal,goals.calories)+'<div class="calorie-footer"><span>'+num(Math.max(0,goals.calories-macros.kcal))+' kcal restantes</span>'+button('Ver diário','view-diary','small secondary')+'</div></section>';
 html+='<section class="metric-strip" aria-label="Resumo do dia">'+
 '<div class="mini-metric"><span>PROTEÍNA</span><strong>'+num(macros.p)+' <small>g</small></strong><small>de '+num(goals.protein)+' g</small>'+pct(macros.p,goals.protein)+'</div>'+
 '<div class="mini-metric"><span>ÁGUA</span><strong>'+num(water/1000,1)+' <small>L</small></strong><small>de '+num(goals.water/1000,1)+' L</small>'+pct(water,goals.water)+'</div>'+
 '<div class="mini-metric"><span>TREINO</span><strong>'+(day.workout?.finished?'Feito':T.isTraining(selected)?'Dia '+esc(T.workoutLetter(selected)):'Pausa')+'</strong><small>'+(day.workout?.finished?'Concluído':day.workout?'Em andamento':T.isTraining(selected)?'Programado':'Recuperação')+'</small>'+pct(day.workout?.finished?1:0,1)+'</div></section>';
 html+='<section class="panel quick-actions"><div class="label-row"><h2>Atalhos</h2></div><div class="quick-grid">'+
 button('+ 250 ml de água','water','secondary','data-ml="250"')+
 button('Abrir treino','view-train','secondary')+
 button('Registrar peso','measure-form','secondary')+'</div></section>';
 html+='<section class="panel next-activity"><div class="label-row"><h2>Próxima atividade</h2><span class="pill '+(done===tasks.length?'good':'')+'">'+done+'/'+tasks.length+'</span></div><div class="next-activity-line"><div><strong>'+esc(upcoming?upcoming.label:'Tudo concluído por hoje!')+'</strong><small>'+(upcoming?esc(upcoming.time)+' · '+esc(T.taskDetail(selected,upcoming)):'Suas tarefas estão em dia.')+'</small></div>'+(upcoming?button('Abrir','task','small','data-task="'+esc(upcoming.id)+'"'):button('Evolução','evolution','small secondary'))+'</div></section>';
 html+=accordion('Cronograma completo',tasks.map(taskRow).join(''),false,'Veja e conclua as outras atividades');
 if(T.legacyAvailable()&&!T.state.legacyImported)html+='<div class="tip">Seu histórico antigo está disponível. '+button('Importar','migrate','small secondary')+'</div>';
 return html;
}

function pageDiary(){
 const macros=T.getMacros(selected),goals=T.state.config.goals,water=T.waterTotal(selected),day=T.dayRead(selected);
 let html=heading('ALIMENTAÇÃO','Diário alimentar','Registre sem procurar alimentos um por um.');
 html+='<section class="voice-hero"><div class="voice-hero-copy"><span class="eyebrow">UM TOQUE PARA REGISTRAR</span><h2>Fale sua refeição</h2><p>O app reconhece alimentos, quantidades e calorias. Você só confere antes de salvar.</p></div>'+
 '<div class="voice-hero-actions">'+button('🎙 Falar agora','meal-speak','voice-main')+button('Digitar','meal-text','voice-alt')+'</div>'+
 '<p class="voice-hint">Exemplo: “100 gramas de arroz, 50 de feijão e 2 ovos”</p></section>';
 html+='<section class="diary-highlights"><div class="diary-highlight"><small>CALORIAS</small><strong>'+num(macros.kcal)+' <span>/ '+num(goals.calories)+'</span></strong>'+pct(macros.kcal,goals.calories)+'</div>'+
 '<div class="diary-highlight"><small>PROTEÍNA</small><strong>'+num(macros.p)+' <span>/ '+num(goals.protein)+' g</span></strong>'+pct(macros.p,goals.protein)+'</div></section>';
 const meals=T.state.mealPlans.map(meal=>{
  const entries=T.foodsForSlot(selected,meal.id),actual=T.sum(entries),present=entries.length>0;
  const summary=entries.map(x=>x.name+' · '+num(x.grams)+' '+(x.unit||'g')).join(' • ');
  const planned=meal.items.map(item=>(T.foodById(item.foodId)?.name||'Alimento')+' '+num(item.grams)+' g').join(' · ');
  return '<article class="meal-tile"><div class="meal-tile-top"><div class="meal-meta"><small>'+esc(meal.time)+'</small><h3>'+esc(meal.name)+'</h3><p class="meal-summary">'+(present?esc(summary):'Ainda não registrado')+'</p></div><span class="pill '+(present?'good':'')+'">'+(present?num(actual.kcal)+' kcal':'Pendente')+'</span></div>'+
  '<div class="meal-tile-actions">'+
  (present?button('Ver registros','meal-detail','small secondary','data-slot="'+esc(meal.id)+'"')+
    button('+ Adicionar por voz','meal-speak','small outline','data-slot="'+esc(meal.id)+'"'):
    button('🎙 Registrar','meal-speak','small','data-slot="'+esc(meal.id)+'"'))+
  '</div>'+
  (present?'':'<details class="meal-plan-details"><summary>Usar o cardápio planejado</summary><p class="small muted">'+esc(planned||'Nenhum alimento planejado.')+'</p>'+
    button('Registrar esse plano','register-meal','small secondary','data-slot="'+esc(meal.id)+'"')+'</details>')+
  '</article>';
 }).join('');
 html+=panel('Suas refeições','<div class="meal-tile-list">'+meals+'</div>');
 html+='<section class="panel water-panel"><div class="label-row"><h2>Água</h2><small class="muted">Meta: '+num(goals.water)+' ml</small></div><div class="water-overview"><strong>'+num(water)+' <span>ml</span></strong><div class="water-progress">'+pct(water,goals.water)+'</div></div>'+
 '<div class="actions water-buttons">'+button('+250 ml','water','secondary','data-ml="250"')+button('+500 ml','water','secondary','data-ml="500"')+button('Outro','water-form','secondary')+'</div>'+
 (day.water?.length?'<details class="simple-details"><summary>Ver histórico ('+day.water.length+')</summary><div class="actions" style="margin-top:9px">'+button('Desfazer último','undo-water','small secondary')+'</div>'+day.water.map(x=>'<div class="listrow"><div class="content"><b>'+num(x.ml)+' ml</b><small>'+esc(new Date(x.at).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}))+'</small></div>'+button('Excluir','remove-water','small outline','data-entry="'+esc(x.id)+'"')+'</div>').join('')+'</details>':'')+'</section>';
 html+=accordion('Macros, suplementos e sono',
  '<div class="grid3 macro-mini"><div><b>'+num(macros.p)+' g</b><small>Proteínas</small>'+pct(macros.p,goals.protein)+'</div><div><b>'+num(macros.c)+' g</b><small>Carboidratos</small>'+pct(macros.c,goals.carbs)+'</div><div><b>'+num(macros.f)+' g</b><small>Gorduras</small>'+pct(macros.f,goals.fat)+'</div></div><p class="small muted" style="margin:12px 0">Fibras: '+num(macros.fiber,1)+' g · Valores nutricionais aproximados.</p>'+
  '<div class="hr"></div><div class="label-row"><h3>Suplementos</h3>'+button('Configurar','models','small secondary')+'</div>'+
  (T.state.supplements.filter(x=>x.enabled).map(x=>'<div class="listrow"><div class="content"><b>'+esc(x.name)+'</b><small>'+esc(x.dose)+'</small></div><input type="checkbox" class="check" data-supplement="'+esc(x.id)+'" '+(day.supplements?.[x.id]?'checked':'')+' aria-label="Tomei '+esc(x.name)+'"></div>').join('')||'<p class="small muted">Nenhum suplemento ativo.</p>')+
  '<div class="hr"></div><div class="label-row"><h3>Sono</h3>'+button(day.sleep?'Editar':'Registrar','sleep-form','small secondary')+'</div><p class="small muted">'+(day.sleep?num(day.sleep.hours,1)+' horas registradas':'Ainda não registrado.')+'</p>',false,'Detalhes que você consulta quando precisar');
 html+='<div class="page-footer-link">'+button('Modelos de dieta e refeições','models','small outline')+'</div>';
 return html;
}
function exerciseCard(ex,workout,day){
 const records=workout?.sets?.filter(x=>x.exerciseId===ex.id)||[],last=T.lastSet(ex.id,selected);
 let rows='';
 for(let i=1;i<=ex.sets;i++){
 const rec=records.find(x=>x.setNo===i);
 rows+='<form data-form="set" data-exercise="'+esc(ex.id)+'" data-index="'+i+'" class="listrow"><div class="stamp">S'+i+'</div><div class="field" style="flex:1;margin:0"><label>Carga kg</label><input type="number" step="0.5" min="0" max="500" name="weight" value="'+esc(rec?.weight??last?.weight??'')+'" required '+(workout?.finished?'disabled':'')+'></div><div class="field" style="flex:1;margin:0"><label>Reps</label><input type="number" min="1" max="100" name="reps" value="'+esc(rec?.reps??last?.reps??'')+'" required '+(workout?.finished?'disabled':'')+'></div><button type="submit" class="btn small '+(rec?.done?'secondary':'')+'" '+(workout?.finished?'disabled':'')+'>'+(rec?.done?'✓':'Salvar')+'</button></form>';
 }
 return '<section class="panel"><div class="right"><div><h3>'+esc(ex.name)+'</h3><small>'+ex.sets+' séries · '+esc(ex.reps)+' rep. · '+ex.rest+' s descanso</small></div><span class="pill">'+records.filter(x=>x.done).length+'/'+ex.sets+'</span></div>'+(last?'<p class="muted small" style="margin-top:7px">Última carga: '+num(last.weight,1)+' kg × '+last.reps+' rep.</p>':'')+rows+'</section>';
}
function pageTrain(){
 const day=T.dayRead(selected),workout=day.workout,letter=workout?.letter||trainLetter||T.workoutLetter(selected);
 const exercises=T.state.workoutPlans[letter]||[],totalSets=exercises.reduce((a,x)=>a+Number(x.sets||0),0);
 const complete=workout?.sets?.filter(x=>x.done).length||0;
 let html=heading('ATIVIDADE FÍSICA','Treino','Seu treino e suas séries, tudo num só lugar.');
 html+='<section class="panel workout-hero"><div class="workout-summary"><div><span class="eyebrow">FICHA DO DIA</span><h2>Treino '+esc(letter)+'</h2><p>'+exercises.length+' exercícios · '+totalSets+' séries'+(workout?' · '+complete+' concluídas':'')+'</p></div><span class="pill '+(workout?.finished?'good':'')+'">'+(workout?.finished?'✓ Concluído':workout?'Em andamento':T.isTraining(selected)?'Programado':'Dia livre')+'</span></div>'+
 '<div class="chipbar workout-chips">'+T.workoutLetters().map(x=>'<button type="button" class="chip '+(letter===x?'active':'')+'" data-action="choose-workout" data-letter="'+x+'" '+(workout?'disabled':'')+'>Treino '+x+'</button>').join('')+'</div>'+
 (!workout?button('▶ Iniciar treino','start-workout','full','data-letter="'+letter+'"'):workout.finished?'<div class="workout-complete">✓ Treino concluído. Bom trabalho!</div>':button('✓ Finalizar treino','finish-workout','full'))+
 '</section>';
 if(window.TTRestEnd>Date.now())html+='<section class="panel soft" id="rest-panel"><div class="right"><div><b>⏱ Intervalo entre séries</b><div class="kpi" id="rest-counter">'+Math.ceil((window.TTRestEnd-Date.now())/1000)+' s</div></div>'+button('Encerrar','stop-rest','small secondary')+'</div></section>';
 const cards=exercises.map(ex=>exerciseCard(ex,workout,day)).join('');
 if(workout&&!workout.finished)html+='<div class="section-heading"><h2>Exercícios</h2><span class="pill">'+complete+'/'+totalSets+' séries</span></div><div id="exercise-cards">'+cards+'</div>';
 else html+=accordion('Exercícios da ficha',cards,false,workout?.finished?'Ver o treino que você concluiu':'Ver a lista antes de começar');
 const cardio=day.cardio||[];
 html+=panel('Cardio',(cardio.length?cardio.map(x=>'<div class="listrow"><div class="content"><b>'+esc(x.type)+'</b><small>'+num(x.minutes)+' min'+(x.distance?' · '+num(x.distance,1)+' km':'')+'</small></div></div>').join(''):'<p class="muted small">Nenhum cardio registrado neste dia.</p>')+'<div class="actions" style="margin-top:12px">'+button('+ Registrar cardio','cardio-form','small secondary')+'</div>');
 html+='<div class="page-footer-link">'+button('Editar minha ficha','edit-workout','small outline')+button('Modelos AB / ABC / ABCD','models','small outline')+'</div>';
 return html;
}
const MEASURES=[['weight','Peso','kg'],['waist','Cintura','cm'],['chest','Tórax','cm'],['armR','Braço direito','cm'],['armL','Braço esquerdo','cm'],['forearmR','Antebraço direito','cm'],['forearmL','Antebraço esquerdo','cm'],['hip','Quadril','cm'],['thighR','Coxa direita','cm'],['thighL','Coxa esquerda','cm']];
function measureLast(field){
 const dates=Object.keys(T.state.days).filter(x=>x<=selected).sort().reverse();
 for(const date of dates){const value=T.state.days[date]?.measures?.[field];if(value!==undefined&&value!==null&&value!=='')return value}
 return null
}
function weightGraph(){
 const values=Object.entries(T.state.days).filter(([date,d])=>date<=selected&&d.measures?.weight!=null).sort((a,b)=>a[0].localeCompare(b[0])).slice(-9).map(([date,d])=>({date,weight:Number(d.measures.weight)}));
 if(values.length<2)return '<div class="empty">Registre peso em duas datas para visualizar a tendência.</div>';
 const min=Math.min(...values.map(x=>x.weight)),max=Math.max(...values.map(x=>x.weight)),range=max-min||1;
 return '<div class="bargraph" role="img" aria-label="Gráfico de evolução do peso">'+values.map(x=>'<div class="barcol"><span class="micro">'+num(x.weight,1)+'</span><div class="bar" style="height:'+(25+(x.weight-min)/range*70)+'px"></div><small>'+x.date.slice(5)+'</small></div>').join('')+'</div>';
}
function pageEvolution(){
 const days=Array.from({length:7},(_,i)=>T.addDay(selected,i-6)),logged=days.filter(x=>T.dayRead(x).foods.length);
 const weight=measureLast('weight'),waist=measureLast('waist'),workouts=days.filter(x=>T.dayRead(x).workout?.finished).length;
 let html=heading('SEUS RESULTADOS','Evolução','Acompanhe as mudanças ao longo do tempo.');
 html+='<section class="evolution-stats">'+
 '<div class="evolution-stat"><small>PESO ATUAL</small><strong>'+(weight===null?'—':num(weight,1))+'</strong><span>'+(weight===null?'Sem registro':'kg')+'</span></div>'+
 '<div class="evolution-stat"><small>CINTURA</small><strong>'+(waist===null?'—':num(waist,1))+'</strong><span>'+(waist===null?'Sem registro':'cm')+'</span></div>'+
 '<div class="evolution-stat"><small>TREINOS / 7 DIAS</small><strong>'+workouts+'</strong><span>concluídos</span></div></section>';
 html+='<div class="feature-action">'+button('+ Atualizar medidas','measure-form','full')+'</div>';
 html+=panel('Evolução do peso',weightGraph());
 html+=panel('Resumo dos últimos 7 dias','<div class="weekly-summary"><div><strong>'+logged.length+' / 7</strong><small>dias com alimentação registrada</small></div><div><strong>'+num(days.reduce((a,x)=>a+T.waterTotal(x),0)/7/1000,1)+' L</strong><small>média registrada de água/dia*</small></div></div><p class="muted micro" style="margin-top:12px">* Dias sem registros não representam necessariamente consumo zero.</p>');
 html+=accordion('Todas as medidas corporais','<div class="measuregrid">'+MEASURES.map(x=>'<div class="measurebox"><span>'+esc(x[1])+'</span><strong>'+((measureLast(x[0])===null)?'—':num(measureLast(x[0]),1)+' '+x[2])+'</strong></div>').join('')+'</div>',false,'Braços, peito, quadril e outras medidas');
 const pstart=T.state.config.protocolStart||T.today(),elapsed=Math.floor((T.parse(selected)-T.parse(pstart))/86400000),week=Math.max(1,Math.min(12,Math.floor(elapsed/7)+1));
 const phase=week<=4?'Fundamentos: sono, alimentação e consistência':week<=8?'Consolidar rotina e acompanhar recuperação':'Revisar tendências, evolução e exames';
 const wellbeing=T.dayRead(selected);
 html+=accordion('Acompanhamento de 12 semanas','<div class="line"><div><div class="kpi">Semana '+week+' de 12</div><small>Início: '+esc(pstart)+'</small></div><span class="pill">'+(elapsed<0?'Ainda não iniciado':elapsed>=84?'Ciclo concluído':'Em andamento')+'</span></div><div style="margin:12px 0">'+pct(Math.max(0,Math.min(84,elapsed+1)),84)+'</div><p class="muted small">'+esc(phase)+'</p>'+
 '<div class="hr"></div><div class="grid3"><div><div class="kpi">'+(wellbeing.energy??'—')+'/5</div><small>Energia</small></div><div><div class="kpi">'+(wellbeing.libido??'—')+'/5</div><small>Libido</small></div><div><div class="kpi">'+(wellbeing.notes?'✓':'—')+'</div><small>Anotações</small></div></div>'+
 (wellbeing.notes?'<p class="small muted" style="margin-top:9px">'+esc(wellbeing.notes)+'</p>':'')+
 '<div class="actions" style="margin-top:12px">'+button('Registrar bem-estar','wellbeing-form','small secondary')+'</div>',false,'Energia, bem-estar e hábitos');
 html+=accordion('Exames laboratoriais','<p class="muted small">Registre seus resultados; o aplicativo não estima hormônios a partir de hábitos.</p>'+
 [...T.state.exams].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,8).map(x=>'<div class="listrow"><div class="content"><b>'+esc(x.date)+' · '+num(x.value,1)+' ng/dL</b><small>'+esc(x.notes||'')+'</small></div></div>').join('')+
 '<div class="actions" style="margin-top:12px">'+button('+ Registrar exame','exam-form','small secondary')+'</div>',false,'Resultados e histórico');
 return html;
}
function pageModels(){
 const c=T.state.config;
 let html=heading('PERSONALIZAR','Modelos e dietas','Escolha um plano pronto ou personalize seus hábitos.',false);

 const dietRows=entries=>entries.map(([key,v])=>'<div class="listrow"><div class="content"><b>'+esc(v.label||({emagrecer:'Emagrecimento',manter:'Manutenção',ganhar:'Hipertrofia'}[key]||key))+'</b><small>Meta: '+num(v.goals.calories)+' kcal · P '+v.goals.protein+' g · C '+v.goals.carbs+' g · G '+v.goals.fat+' g</small>'+(v.description?'<small>'+esc(v.description)+'</small>':'')+'</div><div class="actions">'+button('Ver cardápio','preview-diet','small secondary','data-key="'+esc(key)+'"')+button(key===c.diet?'Aplicado':'Aplicar','apply-diet','small '+(key===c.diet?'secondary':''),'data-key="'+esc(key)+'"')+'</div></div>').join('');
 const dietEntries=Object.entries(T.MEAL_TEMPLATES);
 html+=accordion('Minhas dietas · todos os modelos',dietRows(dietEntries)+
  (T.state.savedDiets.length?'<div class="divider-title">Modelos que salvei</div>'+T.state.savedDiets.map(x=>'<div class="listrow"><div class="content"><b>'+esc(x.name)+'</b><small>'+num(x.goals.calories)+' kcal · Minha versão personalizada</small></div>'+button('Aplicar','apply-saved-diet','small','data-key="'+esc(x.id)+'"')+'</div>').join(''):'')+
  '<p class="small muted" style="margin-top:10px">Inclui todas as dietas por objetivo e os cardápios de 2.000, 2.250 e 2.500 kcal com patinho, ovos, sementes de abóbora e castanhas. Esses alimentos não garantem aumento hormonal.</p><div class="actions" style="margin-top:12px">'+button('+ Salvar minha dieta','save-diet','small')+button('Editar cardápio','edit-meals','small secondary')+button('Editar metas','settings','small secondary')+'</div>');
 html+=accordion('Modelos de musculação',['AB','ABC','ABCD'].map(x=>'<div class="listrow"><div class="content"><b>Divisão '+x+'</b><small>Exercícios, séries e repetições personalizáveis</small></div>'+button(x===c.split?'Aplicado':'Aplicar','apply-split','small '+(x===c.split?'secondary':''),'data-key="'+x+'"')+'</div>').join('')+'<div class="actions" style="margin-top:12px">'+button('Editar exercícios','edit-workout','small secondary')+button('Dias da semana','settings','small secondary')+'</div>');
 html+=accordion('Suplementos opcionais','<p class="muted small">Ative somente o que você já utiliza. Horário e quantidade são editáveis; nenhuma dose é prescrição.</p>'+T.state.supplements.map(s=>'<div class="listrow"><div class="content"><b>'+esc(s.name)+'</b><small>'+esc(s.dose)+' · '+esc(s.time)+'</small><small>'+esc(s.notes||'')+'</small></div><label class="small"><input class="check" type="checkbox" data-enable-supplement="'+esc(s.id)+'" '+(s.enabled?'checked':'')+' aria-label="Ativar '+esc(s.name)+'"></label>'+button('Editar','edit-supplement','small secondary','data-sid="'+esc(s.id)+'"')+'</div>').join('')+button('+ Personalizado','new-supplement','small secondary'));
 html+=accordion('Modelos de dia','<div class="actions">'+['treino','descanso','viagem'].map(k=>button(({treino:'Dia normal/treino',descanso:'Dia de descanso',viagem:'Viagem'}[k]),'apply-routine','small '+(c.routine===k?'':'secondary'),'data-key="'+k+'"')).join('')+'</div><p class="muted small" style="margin-top:11px">Os modelos de rotina ajustam o cronograma; as atividades registradas não serão apagadas.</p>');
 return html;
}
function pageSettings(){
 const c=T.state.config,g=c.goals,cloud=C.state();
 let html=heading('PREFERÊNCIAS','Ajustes','Organize metas, horários e seus dados.',false);
 html+=accordion('Modelos de dieta e musculação','<p class="muted small">Escolha entre dietas de 2.000, 2.250 ou 2.500 kcal com os alimentos selecionados, ou use os outros modelos.</p><div style="margin-top:10px">'+button('Abrir modelos de dieta','models','small')+'</div>');
 html+=accordion('Metas e planejamento','<form data-form="settings"><div class="formgrid">'+[['calories','Calorias kcal'],['protein','Proteína g'],['carbs','Carboidratos g'],['fat','Gorduras g'],['water','Água ml'],['sleep','Sono h']].map(([key,label])=>'<div class="field"><label>'+label+'</label><input type="number" min="0" step="'+(key==='sleep'?'0.5':'1')+'" name="'+key+'" value="'+g[key]+'" required></div>').join('')+'<div class="field"><label>Início da sequência de treinos</label><input type="date" name="planStart" value="'+esc(c.planStart)+'"></div><div class="field"><label>Medidas — dia semanal (0=domingo)</label><select name="measureDay">'+['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'].map((d,i)=>'<option value="'+i+'" '+(c.measureDay==i?'selected':'')+'>'+d+'</option>').join('')+'</select></div></div><div class="divider-title">Dias de musculação</div><div class="actions">'+['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'].map((d,i)=>'<label class="pill"><input type="checkbox" name="train'+i+'" '+(c.trainingDays.includes(i)?'checked':'')+'>'+d+'</label>').join('')+'</div><div class="divider-title">Horários</div><div class="formgrid"><div class="field"><label>Primeira água</label><input type="time" name="wake" value="'+esc(c.times.wake)+'"></div><div class="field"><label>Hora da musculação</label><input type="time" name="workout" value="'+esc(c.times.workout||'12:00')+'"></div><div class="field"><label>Preparar para dormir</label><input type="time" name="bed" value="'+esc(c.times.bed)+'"></div></div><button class="btn" style="margin-top:15px" type="submit">Salvar configurações</button></form>');
 html+=accordion('Lembretes opcionais','<p class="muted small">Alertas para atividades pendentes enquanto o aplicativo estiver aberto. Lembretes com o app fechado exigem notificações push, ainda não incluídas.</p><div style="margin-top:12px">'+button(c.reminders?'Desativar lembretes':'Ativar lembretes','toggle-reminders','small '+(c.reminders?'secondary':''))+'</div>');
 html+=accordion('Início do protocolo','<form data-form="protocol"><div class="field"><label>Data de início do acompanhamento de 12 semanas</label><input type="date" name="protocolStart" value="'+esc(c.protocolStart||T.today())+'" required></div><button class="btn small" type="submit">Salvar data</button></form>');
 html+=accordion('Minha nuvem',cloud.available?(cloud.connected?'<div class="tip">Conectado: '+esc(cloud.email)+'</div><p class="small muted" style="margin:12px 0">Status: '+(cloud.blocked?'Conflito entre aparelhos':cloud.enabled?'Sincronização automática ativa':'Sincronização ainda não ativada')+'. Os registros locais sempre são salvos primeiro.</p><div class="actions">'+button('Ativar / enviar','cloud-enable','small')+button('Baixar nuvem','cloud-download','small secondary')+button('Backup da nuvem','cloud-backup','small secondary')+button('Substituir nuvem','cloud-overwrite','small outline')+button('Sair da conta','cloud-logout','small secondary')+'</div>'+(cloud.error?'<p class="warning" style="margin-top:12px">'+esc(cloud.error)+'</p>':''):'<form data-form="login"><div class="field"><label>E-mail</label><input type="email" name="email" required autocomplete="email"></div><div class="field"><label>Senha</label><input type="password" name="password" minlength="6" required autocomplete="current-password"></div><div class="actions"><button class="btn" name="method" value="signin">Entrar</button><button class="btn secondary" name="method" value="signup">Criar conta</button></div></form>'):'<p class="warning">Serviço de autenticação temporariamente indisponível. Os registros locais continuam funcionando.</p>');
 if(cloud.connected)html+=accordion('Migrar registros antigos da nuvem','<p class="muted small">Se você usou o TestoTrack 2.1 em outro aparelho, importe peso, sono e exames da sua conta anterior, sem apagar o histórico original.</p>'+button('Importar dados da versão 2.1','migrate-cloud','small secondary'));
 html+=accordion('Backup e migração','<p class="muted small">Faça cópias antes de trocar de aparelho ou substituir versões.</p><div class="actions" style="margin-top:12px">'+button('Exportar backup JSON','export','small')+button('Importar backup','import','small secondary')+button('Importar versão 2.1','migrate','small secondary')+'</div><input id="backup-file" type="file" accept=".json,application/json" class="hidden"><div class="hr"></div><a href="./legacy.html">Abrir o TestoTrack anterior (v2.1)</a><p class="muted micro" style="margin-top:8px">A migração é opcional e não elimina o histórico da versão anterior.</p>');
 return html;
}
function pageMore(){
 const cloud=C.state();
 let html=heading('PERSONALIZE','Mais','Tudo que você usa de vez em quando.',false);
 html+='<section class="more-list">'+
 '<article class="more-card"><div class="more-card-icon">▦</div><div><h2>Dietas e modelos</h2><p>Cardápios, fichas de musculação e suplementos.</p></div>'+button('Abrir','models','small secondary')+'</article>'+
 '<article class="more-card"><div class="more-card-icon">⚙</div><div><h2>Metas e ajustes</h2><p>Calorias, proteína, horários e notificações.</p></div>'+button('Abrir','settings','small secondary')+'</article>'+
 '<article class="more-card"><div class="more-card-icon">↗</div><div><h2>Meu progresso</h2><p>Medidas corporais, peso e relatórios.</p></div>'+button('Ver','evolution','small secondary')+'</article></section>';
 html+='<section class="panel more-sync"><div class="label-row"><h2>Seus dados</h2><span class="pill '+(cloud.enabled?'good':'')+'">'+(cloud.connected?(cloud.enabled?'Nuvem ativa':'Conta conectada'):'Somente neste aparelho')+'</span></div><p class="muted small">Faça backup ou conecte sua conta para manter os registros sincronizados.</p><div class="actions" style="margin-top:14px">'+button('Conta e backup','settings','small secondary')+button('Exportar dados','export','small outline')+'</div></section>';
 html+='<p class="micro muted more-footnote">TestoTrack · informações nutricionais são estimativas e não substituem acompanhamento profissional.</p>';
 return html;
}
function render(){
 const pages={hoje:pageToday,diario:pageDiary,treinar:pageTrain,evolucao:pageEvolution,mais:pageMore,modelos:pageModels,ajustes:pageSettings};
 T.$('app').innerHTML=(pages[tab]||pageToday)();
 const activeTab=['modelos','ajustes'].includes(tab)?'mais':tab;
 document.querySelectorAll('.bottom-nav [data-go]').forEach(x=>{
   const active=x.dataset.go===activeTab;
   x.classList.toggle('active',active);
   if(active)x.setAttribute('aria-current','page');else x.removeAttribute('aria-current');
 });
 const fab=T.$('fab');
 const hidden=['mais','modelos','ajustes'].includes(tab);
 fab.hidden=hidden;
 fab.textContent=tab==='treinar'?'+':tab==='evolucao'?'+':'🎙';
 const label=tab==='treinar'?'Registrar cardio':tab==='evolucao'?'Atualizar medidas':'Registrar refeição por voz';
 fab.setAttribute('aria-label',label);fab.title=label;
 const status=C.state(),badge=T.$('sync-badge');
 if(status.connected){badge.textContent=status.blocked?'Conflito':status.enabled?'Nuvem':'Conectado';badge.className='sync-badge '+(status.blocked?'warn':status.enabled?'ok':'')}
 else{badge.textContent=status.available?'Local':'Offline';badge.className='sync-badge'}
}
window.TTUI={get date(){return selected},set date(v){selected=v},get tab(){return tab},get trainLetter(){return trainLetter},set trainLetter(v){trainLetter=v},go,render,toast,error,modal,close,MEASURES,button};
T.toast=toast;
document.querySelectorAll('[data-go]').forEach(el=>el.addEventListener('click',()=>go(el.dataset.go)));
T.$('fab').addEventListener('click',()=>{
 if(tab==='treinar'){modal('Registrar cardio', '<div class="stack">'+button('Adicionar atividade','cardio-form','full')+'</div>');return;}
 if(tab==='evolucao'){modal('Atualizar medidas', '<div class="stack">'+button('Registrar medidas','measure-form','full')+'</div>');return;}
 window.TTMealOpen?.('speak');
});
document.addEventListener('click',event=>{
 const btn=event.target.closest('button[data-action]');if(!btn)return;
 if(btn.dataset.action==='view-diary')go('diario');
 if(btn.dataset.action==='view-train')go('treinar');
});
window.addEventListener('tt:change',render);
window.addEventListener('tt:loaded',render);
window.addEventListener('tt:cloud',()=>{if(tab==='ajustes')render()});
setInterval(()=>{const counter=document.getElementById('rest-counter');if(counter){const left=Math.max(0,Math.ceil(((window.TTRestEnd||0)-Date.now())/1000));counter.textContent=left+' s';if(!left){document.getElementById('rest-panel')?.remove();toast('Descanso concluído!')}}},1000);
setInterval(()=>{if(!T.state.config.reminders)return;const now=new Date(),current=T.today(),time=String(now.getHours()).padStart(2,'0')+':'+String(now.getMinutes()).padStart(2,'0');for(const task of T.schedule(current)){if(task.time!==time||T.taskStatus(current,task)!=='pending')continue;const k='testotrack-reminded-'+current+'-'+task.id;if(localStorage.getItem(k))continue;localStorage.setItem(k,'1');if('Notification'in window&&Notification.permission==='granted'){new Notification('TestoTrack: '+task.label,{body:'Atividade planejada para '+task.time,tag:k})}else toast('Lembrete: '+task.label)}},30000);
render();
C.init().catch(error);
if('serviceWorker'in navigator&&location.protocol.startsWith('http'))navigator.serviceWorker.register('./service-worker.js').catch(()=>{});
})();
