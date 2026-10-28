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
const NUMBER_WORDS={
 'zero':0,'um':1,'uma':1,'dois':2,'duas':2,'tres':3,'quatro':4,'cinco':5,'seis':6,'sete':7,'oito':8,'nove':9,
 'dez':10,'onze':11,'doze':12,'treze':13,'quatorze':14,'catorze':14,'quinze':15,'dezesseis':16,'dezessete':17,'dezoito':18,'dezenove':19,
 'vinte':20,'trinta':30,'quarenta':40,'cinquenta':50,'sessenta':60,'setenta':70,'oitenta':80,'noventa':90,
 'cem':100,'cento':100,'duzentos':200,'duzentas':200,'trezentos':300,'trezentas':300,'quatrocentos':400,'quinhentos':500,'quinhentas':500,'seiscentos':600,'setecentos':700,'oitocentos':800,'novecentos':900,'mil':1000,'meio':0.5,'meia':0.5
};
const NUMBER_PATTERN=Object.keys(NUMBER_WORDS).sort((a,b)=>b.length-a.length).join('|');
function numericalSpeech(s){
 const expression=new RegExp('\\b('+NUMBER_PATTERN+')(?:\\s+e\\s+('+NUMBER_PATTERN+'))?(?:\\s+e\\s+('+NUMBER_PATTERN+'))?\\b','gi');
 return s.replace(expression,(whole,...groups)=>{
  const words=groups.slice(0,3).filter(Boolean).map(x=>String(x).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase());
  if(words.length>3||!words.length)return whole;
  let total=0;
  for(const word of words){const value=NUMBER_WORDS[word];if(value===undefined)return whole;total+=value;}
  return total>0&&total<=5000?String(total):whole;
 });
}
const COMMON_FOOD_WORDS=new Set("arroz feijao frango carne patinho bife ovo omelete pao banana mamao pera maca laranja abacaxi melancia morango uva abacate aveia granola iogurte leite queijo manteiga requeijao presunto macarrao batata batata-doce mandioca mandioquinha peixe salmao tilapia atum sardinha camarao tomate alface cenoura pepino brocolis abobrinha couve beterraba repolho lentilha grao-de-bico ervilha amendoim castanha nozes azeite oleo chocolate bolo biscoito bolacha tapioca cuscuz pizza lasanha hamburguer sanduiche suco cafe cha refrigerante agua monster toddynho whey creatina albumina arroz-integral feijao-carioca feijao-preto".split(" "));
const NOISE=/\b(?:ahn|ah|eh|hã|hum|tipo|assim|entao|entendi|falei|repeti|falando|queria|acho|sei|qual|aquele|aquela|isso|isso|voce|vocês|ta|tá|né|pra|para|sobre|quantidade|comida|alimento)\b/gi;
function likelyFood(name,foods){
 const t=norm(name);
 if(!t||t.length<3||t.split(' ').length>5)return false;
 if(COMMON_FOOD_WORDS.has(t))return true;
 if(t.split(' ').some(x=>COMMON_FOOD_WORDS.has(x)))return true;
 return local(name,foods).length>0;
}
function parse(transcript,foods=[]){
 if(typeof transcript!=='string'||transcript.trim().length<3||transcript.length>550)throw Error('Descreva uma refeição de até 550 caracteres.');
 const spoken=numericalSpeech(transcript.replace(/\btrês\b/gi,'tres'))
  .replace(/(\d),(\d)/g,'$1.$2')
  .replace(/\s+(?:e|mais)\s+(?=(?:(?:comi|tomei|bebi)\s+)?\d+(?:\.\d+)?\b)/gi,', ');
 const pieces=spoken.split(/[,;\n]+/).map(x=>x.trim()).filter(Boolean);
 if(pieces.length>30)throw Error('A fala está muito longa. Tente uma refeição de cada vez.');
 const results=[];let correction=false;
 const quantity=/^(\d+(?:\.\d+)?)\s*(kg|quilos?|quilogramas?|gramas?|g|mililitros?|ml|litros?|latas?|garrafas?|copos?|unidades?|por[cç][oõ]es?|l)?(?=\s|$)\s*(?:de|da|do|dos|das)?\s*(.*)$/i;
 const trailing=/^(.*?)\s+(\d+(?:\.\d+)?)\s*(kg|gramas?|g|mililitros?|ml|litros?|latas?|garrafas?|copos?|unidades?)$/i;
 const unitOf=value=>{const u=norm(value||'');
  return /^(kg|quilo)/.test(u)?'kg':/^g$|^grama/.test(u)?'g':/^(ml|mililitro)/.test(u)?'ml':/^l$|^litro/.test(u)?'l':/^lata/.test(u)?'lata':/^garrafa/.test(u)?'garrafa':/^copo/.test(u)?'copo':/^unidade/.test(u)?'unidade':/^porc/.test(u)?'porcao':'';
 };
 for(const original of pieces){
  let part=original.replace(/^(?:e|mais)\s+/i,'').trim();
  if(/^(?:n[aã]o|quer dizer|na verdade|corrigindo|ali[aá]s)\s*[,.:!]*$/i.test(part)){correction=true;continue}
  if(/^(?:n[aã]o|quer dizer|na verdade|corrigindo|ali[aá]s)\b/i.test(part)){correction=true;part=part.replace(/^(?:n[aã]o|quer dizer|na verdade|corrigindo|ali[aá]s)\b[\s,:]*/i,'');}
  part=clean(part.replace(NOISE,' '));
  let match=part.match(quantity),term=part,qty=null,unit='';
  if(match){
   qty=Number(match[1]);unit=unitOf(match[2]);term=clean(match[3]);
  }else{
   match=part.match(trailing);
   if(match){term=clean(match[1]);qty=Number(match[2]);unit=unitOf(match[3]);}
  }
  // Repeated names caused by hesitations ("arroz, arroz" or "arroz arroz").
  const tokens=term.split(/\s+/);const collapsed=[];
  for(const token of tokens){if(!collapsed.length||norm(collapsed[collapsed.length-1])!==norm(token))collapsed.push(token)}
  term=clean(collapsed.join(' '));
  if(!term&&correction&&results.length&&qty!==null){term=results[results.length-1].term;}
  if(!likelyFood(term,foods)){if(qty!==null)correction=false;continue;}
  if(qty===null){if(correction&&results.length){results[results.length-1].term=term;}correction=false;continue;}
  if(!Number.isFinite(qty)||qty<=0||qty>5000){correction=false;continue;}
  const idx=results.findIndex(x=>norm(x.term)===norm(term));
  if(correction){
   if(idx>=0){results[idx]={term,qty,unit,original};}
   else if(results.length){results[results.length-1]={term,qty,unit,original};}
   else results.push({term,qty,unit,original});
  }else if(idx>=0&&results[idx].unit===unit){
   results[idx].qty+=qty;
   results[idx].original+=', '+original;
  }else results.push({term,qty,unit,original});
  correction=false;
  if(results.length>12)throw Error('Registre até 12 alimentos por vez.');
 }
 return results;
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
let audioRecorder=null,micStream=null,audioParts=[],audioTimer=null,skipAudio=false,captureToken=0;
function captureStatus(message,kind=''){
 const el=document.getElementById('capture-state');
 if(el){el.textContent=message;el.dataset.status=kind;}
}
function captureButtons(recording){
 const start=document.querySelector('[data-action="voice-record-start"]'),stop=document.querySelector('[data-action="voice-record-stop"]');
 if(start)start.hidden=!!recording;
 if(stop){stop.hidden=!recording;stop.disabled=false;}
}
function releaseMicrophone(){
 if(audioTimer){clearTimeout(audioTimer);audioTimer=null;}
 if(micStream){micStream.getTracks().forEach(track=>track.stop());micStream=null;}
 audioRecorder=null;
 captureButtons(false);
}
function cancelAudio(){
 captureToken++;skipAudio=true;
 const recorder=audioRecorder;
 if(recorder&&recorder.state!=='inactive'){try{recorder.stop()}catch{}}
 releaseMicrophone();
}
function open(slot,autoMic=false,text=''){
 cancelAudio();
 requestId++;draft=null;inputSlot=slot||slotForNow();inputText=text;
 U.modal('Registrar refeição por áudio',
 '<div class="capture-intro"><span class="capture-round">🎙</span><h3>Grave sua refeição</h3><p>Fale os alimentos e as quantidades. O TestoTrack transcreve o áudio e mostra tudo antes de salvar.</p></div>'+
 '<form data-form="meal-text"><div class="field capture-select"><label>Refeição</label><select name="slot">'+mealChoices(inputSlot)+'</select></div>'+
 '<div class="capture-action">'+action('🎙 Gravar áudio','voice-record-start','voice-capture')+
 action('■ Parar e transcrever','voice-record-stop','voice-capture','hidden')+'</div>'+
 '<div class="capture-state" id="capture-state" role="status" aria-live="polite">Toque em Gravar áudio e permita o acesso ao microfone.</div>'+
 '<div class="capture-example">Ex.: “Comi 200 gramas de patinho, 150 gramas de arroz e tomei um Monster”</div>'+
 '<details class="capture-type" '+(autoMic?'':'open')+'><summary>Ou digitar a refeição, se preferir</summary>'+
 '<div class="field"><label>O que consumi</label><textarea name="description" rows="3" maxlength="550" placeholder="Escreva os alimentos e quantidades" required>'+esc(text)+'</textarea></div>'+
 '<button type="submit" class="btn full">Analisar alimentos</button></details></form>'+
 '<p class="micro muted" style="margin-top:12px">O áudio será enviado para transcrição somente após você parar a gravação. A gravação não é armazenada no diário.</p>');
 if(autoMic)startAudio().catch(error=>captureStatus(error.message||'Não foi possível gravar o áudio.','error'));
}
async function startAudio(){
 if(audioRecorder&&audioRecorder.state==='recording')return;
 const token=++captureToken;skipAudio=false;
 if(!navigator.mediaDevices?.getUserMedia||!window.MediaRecorder){
  throw new Error('Este navegador não permite gravar áudio diretamente. Abra o TestoTrack no Chrome atualizado.');
 }
 if(!C?.checkTranscription||!C?.transcribeAudio)throw new Error('O serviço de voz ainda não está disponível. Atualize o aplicativo.');
 captureStatus('Conectando ao serviço de transcrição…');
 await C.checkTranscription();
 if(token!==captureToken)return;
 captureStatus('Solicitando acesso ao microfone…');
 let stream;
 try{stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true}})}
 catch(error){throw new Error(error?.name==='NotAllowedError'?'Permissão do microfone negada. Autorize o microfone para este site nas configurações do navegador.':'Não consegui abrir o microfone. Verifique as permissões do navegador.');}
 if(token!==captureToken){stream.getTracks().forEach(t=>t.stop());return;}
 const supported=['audio/webm;codecs=opus','audio/webm','audio/mp4','audio/wav'].find(t=>MediaRecorder.isTypeSupported(t));
 if(!supported){stream.getTracks().forEach(t=>t.stop());throw new Error('Formato de gravação de áudio incompatível com este navegador.');}
 micStream=stream;audioParts=[];
 let recorder;
 try{recorder=new MediaRecorder(stream,{mimeType:supported})}
 catch(error){releaseMicrophone();throw new Error('Não foi possível iniciar a gravação neste navegador.');}
 audioRecorder=recorder;
 recorder.ondataavailable=event=>{if(event.data?.size>0)audioParts.push(event.data)};
 recorder.onerror=()=>{skipAudio=true;captureStatus('Houve um erro durante a gravação. Tente novamente.','error');releaseMicrophone()};
 recorder.onstop=async()=>{
  const cancelled=skipAudio||captureToken!==token;
  const parts=audioParts.slice();const mime=recorder.mimeType||supported;
  releaseMicrophone();
  if(cancelled)return;
  const blob=new Blob(parts,{type:mime});
  if(blob.size<800){captureStatus('O áudio ficou vazio. Grave outra vez.','error');return;}
  if(blob.size>4*1024*1024){captureStatus('Gravação muito grande. Grave no máximo um minuto.','error');return;}
  captureStatus('Transcrevendo seu áudio…');
  try{
   const transcript=await C.transcribeAudio(blob);
   if(token!==captureToken)return;
   const form=document.querySelector('form[data-form="meal-text"]');
   if(!form)return;
   form.elements.description.value=transcript;
   inputText=transcript;inputSlot=form.elements.slot.value;
   captureStatus('Entendi: “'+transcript.slice(0,150)+'”');
   await analyze(transcript,inputSlot);
  }catch(error){if(token===captureToken){captureStatus(error?.message||'Falha na transcrição. Tente outra vez.','error');document.querySelector('.capture-type')?.setAttribute('open','');}}
 };
 try{recorder.start(500)}
 catch(error){releaseMicrophone();throw new Error('Não foi possível iniciar a gravação.');}
 captureButtons(true);
 captureStatus('● Gravando… fale sua refeição e toque em “Parar e transcrever”.','recording');
 audioTimer=setTimeout(()=>{if(recorder.state==='recording')stopAudio();},60000);
}
function stopAudio(){
 if(!audioRecorder||audioRecorder.state!=='recording')return;
 captureStatus('Processando gravação…');
 const stop=document.querySelector('[data-action="voice-record-stop"]');
 if(stop)stop.disabled=true;
 try{audioRecorder.stop()}catch{releaseMicrophone();captureStatus('Não consegui finalizar a gravação. Tente novamente.','error');}
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
 '<div class="review-head"><div><span class="eyebrow">PASSO FINAL</span><h3>'+draft.rows.length+' item(ns) para conferir</h3><small class="muted">Confira os alimentos e as quantidades antes de salvar.</small></div><span class="pill '+(ready?'good':'bad')+'">'+(ready?'Tudo pronto':awaiting+' para revisar')+'</span></div>'+
 (draft.warning?'<p class="warning small">'+esc(draft.warning)+'</p>':'')+
 '<div class="field"><label>Refeição</label><select data-meal-slot>'+mealChoices(draft.slot)+'</select></div>'+
 rows+
 '<div class="review-total"><div><small>CALORIAS DA REFEIÇÃO</small><h2>'+fmt(total.kcal)+' kcal</h2><span>P '+fmt(total.p,1)+'g · C '+fmt(total.c,1)+'g · G '+fmt(total.f,1)+'g</span></div></div>'+
 '<form data-form="meal-save"><button type="submit" class="btn full review-save" '+(ready?'':'disabled')+'>✓ Salvar refeição</button></form>'+
 (!ready?'<p class="muted small" style="margin-top:9px">Corrija os produtos e quantidades destacados para liberar o salvamento.</p>':'')+
 '<div class="review-footer">'+action('← Corrigir o que falei','meal-back','small secondary')+'</div>');
}
function plausibleProducts(term,products){
 const key=M.norm(term).split(' ').filter(word=>word.length>=3);
 if(!key.length)return[];
 return (Array.isArray(products)?products:[]).filter(p=>{
  const text=M.norm((p?.name||'')+' '+(p?.brand||''));
  return key.every(w=>text.split(' ').some(t=>t===w||t===w+'s'));
 });
}
async function analyze(description,slot){
 const seq=++requestId;
 inputText=description;inputSlot=slot;
 const body=document.getElementById('modal-body');
 if(body)body.innerHTML='<div class="capture-wait" id="meal-loading"><span class="capture-spinner"></span><h3>Conferindo os alimentos e as quantidades…</h3><p>Ignorando repetições, interrupções e palavras que não são alimentos.</p></div>';
 let parsed=[],warning='';
 try{
   if(!C?.parseMeal)throw Error('Análise inteligente indisponível.');
   parsed=await C.parseMeal(description);
 }catch(err){
   parsed=M.parse(description,T.state.foods);
   warning='Análise inteligente indisponível. Usei somente alimentos conhecidos com quantidades explícitas. Confira o resultado.';
 }
 if(seq!==requestId)return;
 if(!Array.isArray(parsed)||!parsed.length){
   U.modal('Nenhum alimento confiável identificado',
    '<p class="muted small">Não encontrei alimentos e quantidades suficientes nesta fala. Palavras soltas e gaguejos são ignorados para evitar registros errados.</p>'+
    '<p class="muted small" style="margin:12px 0">Tente: “100 gramas de arroz e 50 gramas de feijão”.</p>'+
    action('← Falar ou corrigir novamente','meal-rewrite','full secondary'));
   return;
 }
 const valid=parsed.filter(item=>item&&typeof item.term==='string'&&item.term.trim().length>=3).slice(0,12);
 const rows=valid.map(item=>{
   const options=M.local(item.term,T.state.foods);
   const row={parsed:item,options,selected:-1,amount:0,note:'',problem:''};
   choosePreferred(row);recalc(row);return row;
 });
 const missing=rows.filter(row=>!row.options.length);
 await Promise.all(missing.slice(0,5).map(async row=>{
   try{
     const found=plausibleProducts(row.parsed.term,await C.searchFoods(row.parsed.term));
     if(found.length){
       row.options=found.slice(0,10);choosePreferred(row);recalc(row);
     }else row.problem='Não encontrei um alimento confiável no catálogo. Confirme manualmente ou remova este item.';
   }catch(err){row.problem='Não foi possível confirmar no catálogo externo: '+(err?.message||'serviço indisponível');}
 }));
 missing.slice(5).forEach(row=>row.problem='Limite de cinco buscas externas por refeição.');
 if(seq!==requestId||!document.getElementById('meal-loading'))return;
 draft={slot,rows,description,warning};review();
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
window.addEventListener('pagehide',cancelAudio);
document.addEventListener('visibilitychange',()=>{if(document.hidden)cancelAudio()});
document.addEventListener('click',event=>{
 const btn=event.target.closest('button[data-action], [data-action="close"]');if(!btn)return;
 const a=btn.dataset.action;
 try{
  if(a==='close'){cancelAudio();return}
  if(a==='meal-speak'){open(btn.dataset.slot,true);return}
  if(a==='meal-text'){open(btn.dataset.slot,false);return}
  if(a==='voice-record-start'){startAudio().catch(error=>captureStatus(error.message||'Falha ao iniciar gravação.','error'));return}
  if(a==='voice-record-stop'){stopAudio();return}
  if(a==='meal-back'){open(draft?.slot,false,draft?.description||inputText);return}
  if(a==='meal-rewrite'){open(inputSlot,false,inputText);return}
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