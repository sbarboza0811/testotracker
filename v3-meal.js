(function(){
'use strict';
const stop=/\b(?:eu|hoje|comi|consumi|tomei|bebi|almocei|jantei|coloquei|adicionei|também|ainda|por favor)\b/gi;
const wordNums={um:1,uma:1,dois:2,duas:2,tres:3,quatro:4,cinco:5,meio:.5,meia:.5};
function norm(value){
 return String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()
 .replace(/[^a-z0-9 ]/g,' ').split(/\s+/).filter(Boolean)
 .map(x=>x.length>3&&x.endsWith('s')&&!x.endsWith('ss')?x.slice(0,-1):x).join(' ');
}
function clean(s){
 return String(s||'').replace(stop,' ').replace(/^\s*(?:no|na)\s+(?:cafe(?:\s+da\s+manha)?|almoco|lanche|jantar)\s*/i,' ')
 .replace(/^\s*(?:de|do|da|dos|das|o|a)\s+/i,'').replace(/\s+/g,' ').replace(/^[\s.]+|[\s.]+$/g,'').trim();
}
function parse(transcript){
 if(typeof transcript!=='string'||transcript.trim().length<3||transcript.length>550)throw Error('Descreva uma refeição de até 550 caracteres.');
 const source=transcript.replace(/\b(?:e|mais)\s+(?=(?:(?:comi|tomei|bebi|consumi|coloquei|adicionei)\s+)?(?:\d+(?:[.,]\d+)?|um|uma|dois|duas|três|tres|quatro|cinco|meio|meia)\b)/gi,', ')
   .replace(/\s+(?:e|mais)\s+(?=(?:\d+(?:[.,]\d+)?|um|uma|dois|duas)\b)/gi,', ');
 const parts=source.split(/[,;\n]+/).map(x=>x.trim()).filter(Boolean);
 if(parts.length>12)throw Error('Registre no máximo 12 alimentos por vez.');
 return parts.map(raw=>{
   const phrase=clean(raw);
   const match=phrase.match(/^(\d+(?:[.,]\d+)?|um|uma|dois|duas|três|tres|quatro|cinco|meio|meia)\s*(quilo(?:grama)?s?|kg|gramas?|g|mililitros?|ml|litros?|latas?|garrafas?|copos?|unidades?|porções?|l)?\s*(?:de|do|da|dos|das)?\s*(.*)$/i);
   let qty=null,unit='',name=phrase;
   if(match){
      qty=wordNums[norm(match[1])]??Number(match[1].replace(',','.'));
      name=clean(match[3]);const u=norm(match[2]||'');
      unit=/^(kg|quilo)/.test(u)?'kg':/^g$|^grama/.test(u)?'g':/^(ml|mililitro)/.test(u)?'ml':/^l$|^litro/.test(u)?'l':/^(lata|garrafa|copo|unidade|porc)/.test(u)?u.split(' ')[0]:'';
   }
   name=name.replace(/\s+(?:de|da|do)\s+\d+(?:[.,]\d+)?\s*(?:ml|g)\s*$/i,'').trim();
   if(!name||name.length>95)throw Error('Não foi possível interpretar "'+raw.slice(0,65)+'".');
   return {term:name,qty,unit,original:raw};
 });
}
function local(term,foods){
 const q=norm(term);
 if(!q)return[];
 const scores=(Array.isArray(foods)?foods:[]).map(f=>{
  const nm=norm(f.name);
  const score=nm===q?100:nm.startsWith(q+' ')?85:nm.includes(' '+q+' ')?64:nm.endsWith(' '+q)?62:q.split(' ').every(w=>nm.split(' ').includes(w))?48:0;
  return {food:f,score};
 }).filter(o=>o.score>=48).sort((a,b)=>b.score-a.score||a.food.name.length-b.food.name.length).slice(0,8);
 return scores.map(o=>o.food);
}
function amount(item,food){
 if(!food)return{value:0,note:'Escolha primeiro o alimento.'};
 const qty=Number(item?.qty),u=item?.unit||'';
 if(!Number.isFinite(qty)||qty<=0)return{value:0,note:'Informe a quantidade consumida.'};
 if(u==='kg')return{value:qty*1000,note:''};
 if(u==='l')return{value:qty*1000,note:food.unit==='ml'?'':'Confirme a unidade na embalagem.'};
 if(u==='g'||u==='ml')return{value:qty,note:u!==(food.unit||'g')?'Confirme se a unidade está correta.':''};
 if(qty>=10&&!u)return{value:qty,note:'Sem unidade informada: confira a quantidade.'};
 const tag=norm(item.term);
 const known={'ovo':50,'banana':100,'pera':150,'pao':50,'fatia de pao':25};
 if(!u&&qty>1&&qty<=9&&!known[tag])return{value:0,note:'Quantidade em unidades sem tamanho informado. Insira g ou ml.'};
 const pack=String(food.packageQuantity||'').match(/(\d+(?:[.,]\d+)?)\s*(ml|g|cl|l|kg)\b/i);
 if(pack){const mult={ml:1,g:1,cl:10,l:1000,kg:1000}[pack[2].toLowerCase()]||1;
   return{value:Math.round(Number(pack[1].replace(',','.'))*mult*qty),note:'Estimativa por embalagem. Confira o que consumiu.'};}
 if(known[tag]&&(!u||u.startsWith('unidade')))return{value:known[tag]*qty,note:'Peso médio estimado por unidade. Ajuste se necessário.'};
 if(u.startsWith('copo'))return{value:200*qty,note:'Estimativa de 200 ml por copo. Ajuste conforme seu copo.'};
 return{value:0,note:'Informe quantos g ou ml consumiu.'};
}
window.TTMeal={parse,local,amount,norm};
})();

(function(){
'use strict';
const T=window.TT,U=window.TTUI,C=window.TTCloud,M=window.TTMeal;
if(!T||!U||!M)return;
let draft=null,requestId=0,recognition=null;
const esc=T.esc,fmt=T.money;
const action=(label,name,extra='')=>U.button(label,name,'small secondary',extra);
function optionHtml(food){return esc(food.name+(food.brand?' · '+food.brand:'')+(food.packageQuantity?' · '+food.packageQuantity:''));}
function start(slot){
 draft=null;requestId++;
 const meals=T.state.mealPlans,chosen=slot||meals[0]?.id;
 U.modal('Registrar refeição por voz ou texto',
 '<p class="muted small">Diga tudo o que comeu e quanto consumiu. Você confere os resultados antes de salvar.</p>'+
 '<form data-form="meal-text"><div class="field"><label>Refeição</label><select name="slot">'+meals.map(x=>'<option value="'+esc(x.id)+'" '+(x.id===chosen?'selected':'')+'>'+esc(x.name)+'</option>').join('')+'</select></div>'+
 '<div class="field"><label>O que você consumiu?</label><textarea name="description" rows="4" maxlength="550" required placeholder="Comi 200 g de patinho, 150 g de arroz e tomei um Monster"></textarea></div>'+
 '<div class="actions"><button type="submit" class="btn">Analisar refeição</button>'+action('🎤 Falar refeição','voice-meal')+'</div></form>'+
 '<p class="muted micro" style="margin-top:12px">O ditado depende do navegador e requer permissão para o microfone. Nenhum alimento é salvo automaticamente.</p>');
}
function dictate(){
 const Speech=window.SpeechRecognition||window.webkitSpeechRecognition;
 if(!Speech)throw Error('Reconhecimento de voz não disponível neste navegador. Use o texto.');
 recognition=new Speech();recognition.lang='pt-BR';recognition.interimResults=false;recognition.maxAlternatives=1;
 recognition.onresult=event=>{
  const phrase=String(event.results?.[0]?.[0]?.transcript||'').trim();
  const f=document.querySelector('form[data-form="meal-text"]');
  if(f&&phrase){f.elements.description.value=phrase;f.requestSubmit();}
 };
 recognition.onerror=ev=>U.toast('Não consegui reconhecer a voz ('+(ev.error||'erro')+'). Digite a refeição.');
 recognition.start();U.toast('Fale sua refeição.');
}
function chosen(row){return row.options[row.selected]||null;}
function refresh(){
 if(!draft)return;
 const meals=T.state.mealPlans;
 const lines=draft.rows.map((r,i)=>{
  const food=chosen(r),calc=T.calc(food,r.amount||0);
  const opts=r.options.map((f,j)=>'<option value="'+j+'" '+(j===r.selected?'selected':'')+'>'+optionHtml(f)+'</option>').join('');
  return '<div class="listrow" style="align-items:flex-start"><div class="content" style="min-width:0">'+
   '<div class="right"><b>'+esc(r.parsed.original)+'</b>'+action('Excluir','meal-drop','data-index="'+i+'"')+'</div>'+
   '<div class="field"><label>Produto identificado</label>'+(r.options.length?
     '<select data-meal-select="'+i+'"><option value="-1" '+(r.selected<0?'selected':'')+'>Escolha a opção correta</option>'+opts+'</select>':
     '<p class="warning small">Não encontrado. Exclua este item e registre-o manualmente.</p>')+'</div>'+
   (r.problem?'<p class="warning small">'+esc(r.problem)+'</p>':'')+
   '<div class="formgrid"><div class="field"><label>Quantidade em '+esc(food?.unit||'g ou ml')+'</label><input type="number" min="1" max="5000" step="1" data-meal-quantity="'+i+'" value="'+(r.amount||'')+'" placeholder="Informe a quantidade"></div>'+
   '<div class="field"><label>Energia</label><div class="kpi">'+fmt(calc.kcal)+' kcal</div></div></div>'+
   (r.note?'<small class="warning">'+esc(r.note)+'</small>':'')+
   (food?'<small>P '+fmt(calc.p,1)+' g · C '+fmt(calc.c,1)+' g · G '+fmt(calc.f,1)+' g</small>':'')+
   '</div></div>';
 }).join('');
 const total=T.sum(draft.rows.map(r=>T.calc(chosen(r),r.amount||0)));
 const ready=draft.rows.length&&draft.rows.every(r=>chosen(r)&&Number(r.amount)>0&&Number(r.amount)<=5000);
 U.modal('Conferir refeição',
 '<p class="muted small">Confira as quantidades e os produtos. Valores nutricionais externos podem conter erros.</p>'+
 '<div class="field"><label>Refeição</label><select data-meal-slot>'+meals.map(x=>'<option value="'+esc(x.id)+'" '+(x.id===draft.slot?'selected':'')+'>'+esc(x.name)+'</option>').join('')+'</select></div>'+
 lines+
 '<section class="panel soft"><b>Total estimado: '+fmt(total.kcal)+' kcal</b><p class="muted small">Proteínas '+fmt(total.p,1)+' g · Carboidratos '+fmt(total.c,1)+' g · Gorduras '+fmt(total.f,1)+' g</p></section>'+
 '<form data-form="meal-save" style="margin-top:12px"><button type="submit" class="btn full" '+(ready?'':'disabled')+'>Salvar '+draft.rows.length+' alimentos de uma vez</button></form>'+
 (!ready?'<p class="warning small" style="margin-top:9px">Selecione todos os produtos e informe as quantidades antes de salvar.</p>':'')+
 '<div style="margin-top:12px">'+action('Recomeçar','meal-reset')+'</div>');
}
async function analyze(text,slot){
 const parsed=M.parse(text),seq=++requestId;
 document.getElementById('modal-body').innerHTML='<p id="meal-loading">Identificando '+parsed.length+' alimentos…</p>';
 const rows=parsed.map(item=>{
  const options=M.local(item.term,T.state.foods);
  const selected=options.length===1?0:-1,portion=M.amount(item,options[selected]);
  return {parsed:item,options,selected,amount:portion.value,note:portion.note,problem:''};
 });
 const unresolved=rows.filter(row=>!row.options.length);
 await Promise.all(unresolved.slice(0,5).map(async row=>{
  try{
   const found=await C.searchFoods(row.parsed.term);
   if(found.length){row.options=found.slice(0,10);row.selected=found.length===1?0:-1;
    const portion=M.amount(row.parsed,chosen(row));row.amount=portion.value;row.note=portion.note;}
   else row.problem='A busca online não encontrou o alimento com nutrientes suficientes.';
  }catch(err){row.problem=err?.message||'Pesquisa externa indisponível.';}
 }));
 unresolved.slice(5).forEach(r=>r.problem='Limite de cinco buscas por refeição. Registre os demais separadamente.');
 if(seq!==requestId||!document.getElementById('meal-loading'))return;
 draft={slot,rows};refresh();
}
document.addEventListener('click',ev=>{
 const b=ev.target.closest('button[data-action]');if(!b)return;
 const a=b.dataset.action;
 try{
  if(a==='meal-text'){start(b.dataset.slot);return;}
  if(a==='voice-meal'){dictate();return;}
  if(a==='meal-reset'){start(draft?.slot);return;}
  if(a==='meal-drop'&&draft){draft.rows.splice(Number(b.dataset.index),1);refresh();return;}
 }catch(err){U.error(err);}
});
document.addEventListener('change',ev=>{
 const t=ev.target;if(!draft)return;
 if(t.matches('[data-meal-select]')){
  const row=draft.rows[Number(t.dataset.mealSelect)];
  if(!row)return;row.selected=Number(t.value);
  const portion=M.amount(row.parsed,chosen(row));
  row.amount=portion.value;row.note=portion.note;refresh();
 }else if(t.matches('[data-meal-quantity]')){
  const row=draft.rows[Number(t.dataset.mealQuantity)];
  if(!row)return;row.amount=Number(t.value);row.note='';refresh();
 }else if(t.matches('[data-meal-slot]'))draft.slot=t.value;
});
document.addEventListener('submit',async ev=>{
 const f=ev.target,kind=f.dataset.form;
 if(kind!=='meal-text'&&kind!=='meal-save')return;
 ev.preventDefault();
 try{
  if(kind==='meal-text'){
   const fd=new FormData(f);
   await analyze(String(fd.get('description')||''),String(fd.get('slot')||''));
  }else{
   if(!draft?.rows.length)throw Error('Nenhum alimento selecionado.');
   const rows=draft.rows.map(r=>({food:chosen(r),amount:r.amount}));
   const saved=T.addMealBatch(U.date,draft.slot,rows);
   draft=null;requestId++;U.close();U.toast(saved.length+' alimentos registrados com sucesso!');
  }
 }catch(err){U.error(err);}
});
})();
