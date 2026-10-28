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
   const match=phrase.match(/^(\d+(?:[.,]\d+)?|um|uma|dois|duas|três|tres|quatro|cinco|meio|meia)\s*(quilo(?:grama)?s?|kg|gramas?|g|mililitros?|ml|litros?|latas?|garrafas?|copos?|unidades?|porções?|l)?(?=\s|$)\s*(?:de|do|da|dos|das)?\s*(.*)$/i);
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
let draft=null,requestId=0,recognition=null,inputSlot='',inputText='';
const esc=T.esc,fmt=T.money;
const action=(label,name,variant='small secondary',attrs='')=>U.button(label,name,variant,attrs);
function slotForNow(){
 const hour=new Date().getHours();
 const chosen=hour<11?'cafe':hour<15?'almoco':hour<19?'lanche':'jantar';
 return T.state.mealPlans.some(x=>x.id===chosen)?chosen:T.state.mealPlans[0]?.id;
}
function mealChoices(selected){
 return T.state.mealPlans.map(x=>'<option value="'+esc(x.id)+'" '+(x.id===selected?'selected':'')+'>'+esc(x.name)+'</option>').join('');
}
function open(slot,autoMic=false,text=''){
 requestId++;draft=null;inputSlot=slot||slotForNow();inputText=text;
 U.modal('Registrar alimentação',
 '<div class="capture-intro"><span class="capture-round">🎙</span><h3>O que você comeu?</h3><p>Fale tudo de uma vez. Vou separar os alimentos e calcular as quantidades.</p></div>'+
 '<form data-form="meal-text"><div class="field capture-select"><label>Em qual refeição?</label><select name="slot">'+mealChoices(inputSlot)+'</select></div>'+
 '<div class="capture-action">'+action('🎙 Começar a falar','voice-meal','voice-capture')+'</div>'+
 '<div class="capture-state" id="capture-state" role="status" aria-live="polite">Toque no microfone e fale naturalmente.</div>'+
 '<div class="capture-example">Exemplo: “200 g de patinho, 150 g de arroz e 1 lata de Monster”</div>'+
 '<details class="capture-type" '+(autoMic?'':'open')+'><summary>Prefiro digitar ou corrigir o texto</summary>'+
 '<div class="field"><label>Minha refeição</label><textarea name="description" rows="3" maxlength="550" placeholder="Digite todos os alimentos e as quantidades" required>'+esc(text)+'</textarea></div>'+
 '<button type="submit" class="btn full">Continuar para conferir</button></details></form>'+
 '<p class="micro muted" style="margin-top:12px">Você sempre confirma antes de registrar. O microfone depende do navegador.</p>');
 if(autoMic)listen();
}
function listen(){
 const Speech=window.SpeechRecognition||window.webkitSpeechRecognition;
 const status=document.getElementById('capture-state');
 if(!Speech){
  if(status)status.textContent='O reconhecimento de voz não está disponível neste navegador. Abra “Prefiro digitar” e use o microfone do teclado, se houver.';
  document.querySelector('.capture-type')?.setAttribute('open','');
  U.toast('Use o microfone do teclado ou digite a refeição.');
  return;
 }
 try{recognition?.abort()}catch{}
 const rec=new Speech();recognition=rec;rec.lang='pt-BR';rec.interimResults=false;rec.maxAlternatives=1;rec.continuous=false;
 rec.onstart=()=>{const el=document.getElementById('capture-state');if(el)el.innerHTML='<span class="listening-dot"></span> Ouvindo… fale sua refeição inteira.';};
 rec.onresult=ev=>{
  const value=String(ev.results?.[0]?.[0]?.transcript||'').trim();
  const form=document.querySelector('form[data-form="meal-text"]');
  if(!form||!value)return;
  form.elements.description.value=value;
  inputText=value;inputSlot=form.elements.slot.value;
  form.requestSubmit();
 };
 rec.onerror=ev=>{
  const el=document.getElementById('capture-state');
  if(el)el.textContent='Não consegui reconhecer ('+(ev.error||'erro')+'). Tente novamente ou digite.';
  document.querySelector('.capture-type')?.setAttribute('open','');
 };
 rec.onend=()=>{recognition=null;};
 try{rec.start()}catch(e){if(status)status.textContent='Microfone indisponível. Use o teclado.';document.querySelector('.capture-type')?.setAttribute('open','');}
}
function pick(row){return row.options[row.selected]||null;}
function choosePreferred(row){
 const options=row.options,q=M.norm(row.parsed.term);
 if(!options.length){row.selected=-1;return}
 if(options.length===1){row.selected=0;return}
 const exact=options.map((x,i)=>({i,name:M.norm(x.name)})).filter(x=>x.name===q);
 row.selected=exact.length===1?exact[0].i:-1;
}
function recalc(row){
 const portion=M.amount(row.parsed,pick(row));row.amount=portion.value;row.note=portion.note;
}
function review(){
 if(!draft)return;
 const ready=draft.rows.length>0&&draft.rows.every(r=>pick(r)&&Number(r.amount)>0&&Number(r.amount)<=5000);
 const total=T.sum(draft.rows.map(r=>T.calc(pick(r),r.amount||0)));
 const awaiting=draft.rows.filter(r=>!pick(r)||!(r.amount>0)).length;
 const rows=draft.rows.map((r,i)=>{
  const food=pick(r),values=T.calc(food,r.amount||0);
  const choices=r.options.length>1?'<div class="field"><label>'+(food?'Trocar produto ou versão':'Selecione o produto correto')+'</label><select data-meal-select="'+i+'"><option value="-1" '+(r.selected<0?'selected':'')+'>Escolher produto…</option>'+
    r.options.map((f,j)=>'<option value="'+j+'" '+(j===r.selected?'selected':'')+'>'+esc(f.name+(f.brand?' · '+f.brand:'')+(f.packageQuantity?' · '+f.packageQuantity:''))+'</option>').join('')+'</select></div>':'';
  const issue=r.problem?'<p class="micro" style="color:var(--warn)">'+esc(r.problem)+'</p>':'';
  return '<article class="review-food"><div class="review-food-top"><div class="review-food-number">'+(i+1)+'</div><div class="review-food-name"><strong>'+esc(food?.name||r.parsed.term)+'</strong><small>'+
   (food?(food.brand?esc(food.brand)+' · ':'')+fmt(food.kcal,1)+' kcal/100 '+esc(food.unit||'g'):'Ainda precisa identificar o alimento')+'</small></div>'+
   action('✕','meal-drop','small outline','data-index="'+i+'"')+'</div>'+
   choices+issue+
   (!r.options.length?'<div class="actions">'+action('Buscar outro nome','meal-retry','small secondary','data-index="'+i+'"')+action('Cadastro manual','meal-custom','small outline','data-index="'+i+'"')+'</div>':'')+
   '<div class="review-food-stats"><div class="field"><label>Quantidade ('+esc(food?.unit||'g/ml')+')</label><input type="number" inputmode="decimal" min="1" max="5000" step="1" data-meal-quantity="'+i+'" value="'+(r.amount||'')+'" placeholder="Quantidade"></div>'+
   '<div class="review-energy"><strong>'+fmt(values.kcal)+' kcal</strong><small>P '+fmt(values.p,1)+' · C '+fmt(values.c,1)+' · G '+fmt(values.f,1)+'</small></div></div>'+
   (r.note?'<p class="review-note">'+esc(r.note)+'</p>':'')+
   '</article>';
 }).join('');
 U.modal('Confira sua refeição',
 '<div class="review-head"><div><span class="eyebrow">PASSO FINAL</span><h3>'+draft.rows.length+' alimento(s) identificado(s)</h3><small class="muted">Só falta conferir antes de salvar.</small></div><span class="pill '+(ready?'good':'bad')+'">'+(ready?'Tudo pronto':awaiting+' para revisar')+'</span></div>'+
 '<div class="field"><label>Refeição</label><select data-meal-slot>'+mealChoices(draft.slot)+'</select></div>'+
 rows+
 '<div class="review-total"><div><small>CALORIAS DA REFEIÇÃO</small><h2>'+fmt(total.kcal)+' kcal</h2><span>P '+fmt(total.p,1)+'g · C '+fmt(total.c,1)+'g · G '+fmt(total.f,1)+'g</span></div></div>'+
 '<form data-form="meal-save"><button type="submit" class="btn full review-save" '+(ready?'':'disabled')+'>✓ Salvar refeição</button></form>'+
 (!ready?'<p class="muted small" style="margin-top:9px">Corrija os produtos e quantidades destacados para liberar o salvamento.</p>':'')+
 '<div class="review-footer">'+action('← Corrigir o que falei','meal-back','small secondary')+'</div>');
}
async function analyze(description,slot){
 const parsed=M.parse(description),seq=++requestId;
 inputText=description;inputSlot=slot;
 const body=document.getElementById('modal-body');
 if(body)body.innerHTML='<div class="capture-wait" id="meal-loading"><span class="capture-spinner"></span><h3>Entendendo sua refeição…</h3><p>'+parsed.length+' alimento(s) identificados. Consultando o catálogo quando necessário.</p></div>';
 const rows=parsed.map(item=>{
   const options=M.local(item.term,T.state.foods);
   const row={parsed:item,options,selected:-1,amount:0,note:'',problem:''};
   choosePreferred(row);recalc(row);return row;
 });
 const missing=rows.filter(r=>!r.options.length);
 await Promise.all(missing.slice(0,5).map(async row=>{
  try{
   const found=await C.searchFoods(row.parsed.term);
   if(found.length){row.options=found.slice(0,10);choosePreferred(row);recalc(row);}
   else row.problem='Não encontrei a informação nutricional. Pesquise por nome ou marca.';
  }catch(err){row.problem=err?.message||'Consulta externa indisponível.';}
 }));
 missing.slice(5).forEach(r=>r.problem='Limite de cinco buscas externas por refeição.');
 if(seq!==requestId||!document.getElementById('meal-loading'))return;
 draft={slot,rows,description};review();
}

function customForm(i){
 const row=draft?.rows[i];if(!row)throw Error('Alimento não encontrado na refeição.');
 const qty=M.amount(row.parsed,{unit:'g'}).value||100;
 U.modal('Cadastrar alimento sem sair da refeição',
 '<p class="muted small">Se não houver resultado na busca, informe os valores nutricionais do rótulo ou de uma fonte confiável. Este alimento entrará no catálogo ao salvar a refeição.</p>'+
 '<form data-form="meal-custom"><input type="hidden" name="index" value="'+i+'">'+
 '<div class="field"><label>Nome do alimento</label><input name="name" maxlength="100" required value="'+esc(row.parsed.term)+'"></div>'+
 '<div class="formgrid"><div class="field"><label>Unidade</label><select name="unit"><option value="g">Gramas (g)</option><option value="ml">Mililitros (ml)</option></select></div>'+
 '<div class="field"><label>Quantidade consumida</label><input type="number" name="amount" min="1" max="5000" step="1" required value="'+qty+'"></div></div>'+
 '<p class="muted small" style="margin:7px 0 12px">Informações por 100 g ou por 100 ml:</p>'+
 '<div class="formgrid">'+[['kcal','Calorias (kcal)'],['p','Proteína (g)'],['c','Carboidratos (g)'],['f','Gorduras (g)'],['fiber','Fibras (g)']].map(([key,label])=>
 '<div class="field"><label>'+label+'</label><input name="'+key+'" type="number" min="0" max="5000" step=".1" required placeholder="Valor do rótulo"></div>').join('')+'</div>'+
 '<button class="btn full" type="submit">Adicionar à prévia</button></form>');
}
async function retry(i){
 if(!draft?.rows[i])return;
 const row=draft.rows[i],name=prompt('Busque pelo nome exato e marca do produto:',row.parsed.term);
 if(!name?.trim())return;
 const seq=++requestId;U.toast('Buscando alimento…');
 try{
  const found=await C.searchFoods(name.trim());
  if(seq!==requestId)return;
  row.options=found.slice(0,10);row.problem=found.length?'':'Não encontrei o produto. Você pode excluir este item e cadastrar manualmente.';
  choosePreferred(row);recalc(row);review();
 }catch(err){row.problem=err?.message||'Falha na pesquisa.';review();}
}
window.TTMealOpen=(mode='speak',slot)=>open(slot,mode==='speak');
document.addEventListener('click',event=>{
 const btn=event.target.closest('button[data-action]');if(!btn)return;
 const a=btn.dataset.action;
 try{
  if(a==='meal-speak'){open(btn.dataset.slot,true);return}
  if(a==='meal-text'){open(btn.dataset.slot,false);return}
  if(a==='voice-meal'){listen();return}
  if(a==='meal-back'){open(draft?.slot,false,draft?.description||inputText);return}
  if(a==='meal-drop'&&draft){draft.rows.splice(Number(btn.dataset.index),1);review();return}
  if(a==='meal-retry'){retry(Number(btn.dataset.index)).catch(U.error);return}
  if(a==='meal-custom'){customForm(Number(btn.dataset.index));return}
 }catch(err){U.error(err);}
});
document.addEventListener('change',event=>{
 const el=event.target;if(!draft)return;
 if(el.matches('[data-meal-select]')){
  const row=draft.rows[Number(el.dataset.mealSelect)];
  if(!row)return;row.selected=Number(el.value);recalc(row);review();
 }else if(el.matches('[data-meal-quantity]')){
  const row=draft.rows[Number(el.dataset.mealQuantity)];
  if(!row)return;row.amount=Number(el.value);row.note='';review();
 }else if(el.matches('[data-meal-slot]'))draft.slot=el.value;
});
document.addEventListener('submit',async event=>{
 const form=event.target,kind=form.dataset.form;
 if(!['meal-text','meal-save','meal-custom'].includes(kind))return;
 event.preventDefault();
 try{
  if(kind==='meal-custom'){
   const fd=new FormData(form),i=Number(fd.get('index')),r=draft?.rows[i];
   if(!r)throw Error('Alimento não encontrado.');
   const name=String(fd.get('name')||'').trim();
   const unit=String(fd.get('unit')||'g'),amount=Number(fd.get('amount'));
   if(!name||name.length>100||!['g','ml'].includes(unit)||!(amount>0&&amount<=5000))throw Error('Confira o nome e a quantidade.');
   const food={id:'manual:'+T.id(),name,unit,source:'Manual'};
   for(const k of ['kcal','p','c','f','fiber']){
    const raw=String(fd.get(k)||'');
    const value=Number(raw);
    if(!raw.trim()||!Number.isFinite(value)||value<0||value>5000)throw Error('Confira os valores do rótulo.');
    food[k]=value;
   }
   r.options=[food];r.selected=0;r.amount=amount;r.problem='';r.note='Valores informados manualmente. Confira o rótulo.';
   review();
  }else if(kind==='meal-text'){
   const values=new FormData(form);
   await analyze(String(values.get('description')||''),String(values.get('slot')||''));
  }else{
   if(!draft?.rows.length)throw Error('Inclua ao menos um alimento.');
   const items=draft.rows.map(r=>({food:pick(r),amount:r.amount}));
   const registered=T.addMealBatch(U.date,draft.slot,items);
   draft=null;requestId++;U.close();U.toast('✓ '+registered.length+' alimentos salvos na refeição!');
   U.go('diario');
  }
 }catch(err){U.error(err);}
});
})();