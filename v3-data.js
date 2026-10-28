(()=>{
'use strict';
const KEY='testotrack-v3-local-v1',LEGACY_KEY='testotrack-data-v1';
const $=id=>document.getElementById(id);
const pad=n=>String(n).padStart(2,'0');
const date=d=>[d.getFullYear(),pad(d.getMonth()+1),pad(d.getDate())].join('-');
const parse=s=>new Date(Number(s.slice(0,4)),Number(s.slice(5,7))-1,Number(s.slice(8,10)),12);
const addDay=(s,n)=>{const d=parse(s);d.setDate(d.getDate()+n);return date(d)};
const today=()=>date(new Date());
const fmt=s=>parse(s).toLocaleDateString('pt-BR',{day:'2-digit',month:'short',weekday:'short'});
const n=(x,def=0)=>Number.isFinite(Number(x))?Number(x):def;
const id=()=>crypto.randomUUID?.()||'id-'+Date.now()+'-'+Math.random().toString(36).slice(2);
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=(x,digits=0)=>n(x).toLocaleString('pt-BR',{maximumFractionDigits:digits});
const FOOD_BASE=[
['ovo','Ovo inteiro',143,12.6,.7,9.5,0],['arroz','Arroz branco cozido',128,2.5,28.1,.2,.3],
['frango','Peito de frango grelhado',165,31,0,3.6,0],['patinho','Patinho grelhado',174,27,0,7,0],
['pao','Pão integral',247,13,41,4.2,7],['banana','Banana',89,1.1,22.8,.3,2.6],
['aveia','Aveia em flocos',389,16.9,66.3,6.9,10.6],['mamao','Mamão',43,.5,10.8,.3,1.7],
['batata','Batata cozida',87,1.9,20.1,.1,1.8],['pepino','Pepino',15,.7,3.6,.1,.5],
['azeite','Azeite',884,0,0,100,0],['leite','Leite sem lactose desnatado',35,3.4,5.1,.1,0],
['whey','Whey isolado (exemplo)',380,83,5,3,0],['pera','Pera',57,.4,15.2,.1,3.1],
['queijo','Queijo sem lactose (exemplo)',285,21,2,21,0],['amendoim','Amendoim',567,25.8,16.1,49.2,8.5],
['macarrao','Macarrão cozido',158,5.8,30.9,.9,1.8],['atum','Atum em água',116,26,0,.8,0]
];
const FOODS=FOOD_BASE.map(f=>({id:f[0],name:f[1],kcal:f[2],p:f[3],c:f[4],f:f[5],fiber:f[6]}));
const SLOTS=[['cafe','Café da manhã','09:00'],['almoco','Almoço','13:00'],['lanche','Lanche','17:00'],['jantar','Jantar','21:00']];
const MEAL_TEMPLATES={
 emagrecer:{goals:{calories:2100,protein:160,carbs:235,fat:58},meals:[
 [['ovo',120],['pao',80],['mamao',150]],
 [['arroz',180],['frango',170],['pepino',120],['azeite',10]],
 [['whey',35],['banana',120],['aveia',35]],
 [['arroz',150],['patinho',170],['pepino',150],['azeite',8]]]},
 manter:{goals:{calories:2500,protein:160,carbs:330,fat:60},meals:[
 [['ovo',120],['pao',110],['banana',110]],
 [['arroz',230],['frango',170],['pepino',120],['azeite',10]],
 [['whey',35],['banana',120],['aveia',70]],
 [['arroz',220],['patinho',170],['pepino',150],['azeite',8]]]},
 ganhar:{goals:{calories:2800,protein:170,carbs:345,fat:82},meals:[
 [['ovo',150],['pao',120],['banana',120]],
 [['arroz',260],['frango',190],['pepino',120],['azeite',15]],
 [['whey',40],['banana',130],['aveia',80],['amendoim',20]],
 [['arroz',220],['patinho',190],['pepino',150],['azeite',12]]]}
};
const EXERCISES={
 A:[['Supino reto',3,'8–12',90],['Supino inclinado',3,'8–12',90],['Desenvolvimento',3,'8–12',90],['Elevação lateral',3,'12–15',60],['Tríceps na polia',3,'10–15',60]],
 B:[['Puxada alta',3,'8–12',90],['Remada baixa',3,'8–12',90],['Remada unilateral',3,'10–12',75],['Rosca direta',3,'8–12',60],['Rosca martelo',3,'10–12',60]],
 C:[['Agachamento',3,'8–12',120],['Leg press',3,'10–12',120],['Cadeira extensora',3,'12–15',75],['Mesa flexora',3,'10–15',75],['Panturrilha',3,'12–15',60],['Abdominal',3,'12–20',60]],
 D:[['Levantamento terra romeno',3,'8–12',120],['Afundo',3,'10–12',90],['Elevação lateral',3,'12–15',60],['Puxada alta',3,'8–12',90],['Abdominal',3,'12–20',60]]
};
const SUPPLEMENT_BASE=[
{id:'creatina',name:'Creatina',dose:'3–5 g (referência geral)',time:'13:00',enabled:false,notes:'Desempenho muscular; não é tratamento para baixa testosterona.'},
{id:'whey-s',name:'Whey protein',dose:'Porção conforme meta de proteína',time:'17:00',enabled:false,notes:'Complemento alimentar; conferir lactose e rótulo.'},
{id:'beta',name:'Beta-alanina',dose:'Definir individualmente',time:'13:00',enabled:false,notes:'Benefício depende do exercício; pode causar formigamento.'},
{id:'citrulina',name:'Citrulina',dose:'Definir individualmente',time:'11:30',enabled:false,notes:'Evidência para desempenho ainda variável.'},
{id:'vitd',name:'Vitamina D',dose:'Conforme avaliação profissional',time:'09:00',enabled:false,notes:'Evitar uso de doses elevadas sem avaliação.'},
{id:'magnesio',name:'Magnésio',dose:'Conforme necessidade',time:'21:00',enabled:false,notes:'Não é um elevador comprovado de testosterona em pessoas sem deficiência.'}
];
function mealPreset(key='emagrecer'){return SLOTS.map((m,i)=>({id:m[0],name:m[1],time:m[2],items:MEAL_TEMPLATES[key].meals[i].map(([foodId,grams])=>({foodId,grams}))}))}
function routinePreset(split='ABC'){return Object.fromEntries(Object.entries(EXERCISES).map(([letter,ex])=>[letter,ex.map((e,i)=>({id:letter+'-'+i,name:e[0],sets:e[1],reps:e[2],rest:e[3]}))]))}
function emptyDay(){return {foods:[],water:[],supplements:{},sleep:null,measures:{},workout:null,cardio:[],tasks:{},notes:'',energy:null,libido:null}}
function fresh(){
 return {version:3,config:{goals:{...MEAL_TEMPLATES.emagrecer.goals,water:2500,sleep:8},diet:'emagrecer',split:'ABC',planStart:today(),trainingDays:[1,2,4,5],routine:'treino',times:{wake:'07:00',bed:'22:30'},measureDay:0,reminders:false},
 foods:structuredClone(FOODS),mealPlans:mealPreset('emagrecer'),workoutPlans:routinePreset(),supplements:structuredClone(SUPPLEMENT_BASE),days:{},exams:[],legacyImported:false};
}
function normalize(obj){
 const d=fresh();if(!obj||typeof obj!=='object')return d;
 if(obj.config&&typeof obj.config==='object')d.config={...d.config,...obj.config,goals:{...d.config.goals,...obj.config.goals},times:{...d.config.times,...obj.config.times}};
 for(const name of ['foods','mealPlans','supplements','exams'])if(Array.isArray(obj[name]))d[name]=obj[name];
 if(obj.workoutPlans&&typeof obj.workoutPlans==='object')d.workoutPlans=obj.workoutPlans;
 if(obj.days&&typeof obj.days==='object'&&!Array.isArray(obj.days))d.days=obj.days;
 d.legacyImported=!!obj.legacyImported;return d;
}
let state;try{state=normalize(JSON.parse(localStorage.getItem(KEY)))}catch{state=fresh()}
let dirty=false;
try{dirty=localStorage.getItem(KEY+'-dirty')==='1'}catch{}
function save(){
 try{localStorage.setItem(KEY,JSON.stringify(state));localStorage.setItem(KEY+'-dirty','1');dirty=true}catch(e){if(window.TT?.toast)TT.toast('Não foi possível salvar neste aparelho.')}
 window.dispatchEvent(new CustomEvent('tt:change'));
}
function setClean(){dirty=false;localStorage.setItem(KEY+'-dirty','0')}
function day(s){if(!state.days[s])state.days[s]=emptyDay();return state.days[s]}
function dayRead(s){return state.days[s]||emptyDay()}
function foodById(fid){return state.foods.find(x=>x.id===fid)}
function calc(food,grams){const m=n(grams)/100;return {kcal:n(food?.kcal)*m,p:n(food?.p)*m,c:n(food?.c)*m,f:n(food?.f)*m,fiber:n(food?.fiber)*m}}
function sum(items){return items.reduce((a,b)=>{for(const k of ['kcal','p','c','f','fiber'])a[k]+=n(b[k]);return a},{kcal:0,p:0,c:0,f:0,fiber:0})}
function getMacros(s){return sum(dayRead(s).foods)}
function foodsForSlot(s,slot){return dayRead(s).foods.filter(x=>x.slot===slot)}
function plannedMacros(slot){const plan=state.mealPlans.find(x=>x.id===slot);return sum((plan?.items||[]).map(it=>calc(foodById(it.foodId),it.grams)))}
function addFood(s,slot,foodId,grams){const f=foodById(foodId);if(!f)throw Error('Alimento não encontrado');day(s).foods.push({id:id(),slot,foodId,name:f.name,grams:n(grams),...calc(f,grams),at:new Date().toISOString()});save()}
function registerPlan(s,slot){const plan=state.mealPlans.find(x=>x.id===slot);if(!plan)throw Error('Refeição não encontrada');if(foodsForSlot(s,slot).length)throw Error('Essa refeição já tem registros.');for(const it of plan.items){const f=foodById(it.foodId);if(f)day(s).foods.push({id:id(),slot,foodId:it.foodId,name:f.name,grams:n(it.grams),...calc(f,it.grams),at:new Date().toISOString()})}save()}
function removeFood(s,eid){day(s).foods=day(s).foods.filter(x=>x.id!==eid);save()}
function water(s,ml){day(s).water.push({id:id(),ml:n(ml),at:new Date().toISOString()});save()}
function waterTotal(s){return dayRead(s).water.reduce((a,b)=>a+n(b.ml),0)}
function waterUndo(s){day(s).water.pop();save()}
function setSupplement(s,sid,value){day(s).supplements[sid]=!!value;save()}
function setMeasure(s,field,value){day(s).measures[field]=value===''?null:n(value);save()}
function setSleep(s,bed,wake,hours,quality,awakenings){day(s).sleep={bed,wake,hours:n(hours),quality:n(quality),awakenings:n(awakenings)};save()}
function slots(){return state.mealPlans.map(x=>x.id)}
function workoutLetters(){return state.config.split.split('')}
function isTraining(s){const d=parse(s).getDay();return state.config.trainingDays.includes(d)&&state.config.routine!=='viagem'}
function workoutLetter(s){
 const letters=workoutLetters();let date0=state.config.planStart||today();
 if(s<date0)date0=s;
 let count=0;for(let d=date0;d<=s;d=addDay(d,1)){if(state.config.trainingDays.includes(parse(d).getDay()))count++}
 return letters[(Math.max(1,count)-1)%letters.length];
}
function workoutFor(s){return state.workoutPlans[workoutLetter(s)]||[]}
function lastSet(exerciseId,exceptDate){
 const dates=Object.keys(state.days).filter(x=>x<exceptDate).sort().reverse();
 for(const d of dates){const entries=state.days[d]?.workout?.sets||[];const found=[...entries].reverse().find(x=>x.exerciseId===exerciseId&&x.done);if(found)return found}
 return null
}
function workoutStart(s){const d=day(s);if(d.workout)return;d.workout={letter:workoutLetter(s),started:new Date().toISOString(),finished:null,sets:[]};save()}
function workoutSet(s,exerciseId,setNo,weight,reps,done=true){
 workoutStart(s);const w=day(s).workout;const ix=w.sets.findIndex(x=>x.exerciseId===exerciseId&&x.setNo===setNo);
 const x={exerciseId,setNo,weight:n(weight),reps:n(reps),done};if(ix>=0)w.sets[ix]=x;else w.sets.push(x);save()
}
function workoutFinish(s){workoutStart(s);day(s).workout.finished=new Date().toISOString();save()}
function cardioAdd(s,minutes,type,distance){day(s).cardio.push({id:id(),minutes:n(minutes),type,distance:n(distance),at:new Date().toISOString()});save()}
function taskStatus(s,task){const d=dayRead(s);if(d.tasks?.[task.id])return d.tasks[task.id];
 if(task.type==='meal'&&foodsForSlot(s,task.ref).length)return'done';
 if(task.type==='water'&&waterTotal(s)>0)return'done';
 if(task.type==='workout'&&d.workout?.finished)return'done';
 if(task.type==='sleep'&&d.sleep)return'done';
 if(task.type==='measure'&&Object.values(d.measures||{}).some(v=>v!==null&&v!==''))return'done';
 if(task.type==='supplement'&&d.supplements?.[task.ref])return'done';
 return'pending';
}
function schedule(s){
 const tasks=[];
 const push=(id,time,label,type,ref)=>tasks.push({id,time,label,type,ref});
 push('water','07:00','Primeira água do dia','water');
 for(const meal of state.mealPlans)push('meal-'+meal.id,meal.time,meal.name,'meal',meal.id);
 if(isTraining(s))push('workout','12:00','Treino '+workoutLetter(s),'workout',workoutLetter(s));
 for(const sup of state.supplements.filter(x=>x.enabled))push('supp-'+sup.id,sup.time,sup.name+' · '+sup.dose,'supplement',sup.id);
 push('sleep',state.config.times.bed||'22:30','Preparar para dormir','sleep');
 if(parse(s).getDay()===n(state.config.measureDay))push('measure','07:30','Atualizar medidas corporais','measure');
 return tasks.sort((a,b)=>a.time.localeCompare(b.time));
}
function taskSet(s,id,status){day(s).tasks[id]=status;save()}
function applyDiet(key){if(!MEAL_TEMPLATES[key])return;state.config.diet=key;const keep={water:state.config.goals.water,sleep:state.config.goals.sleep};state.config.goals={...MEAL_TEMPLATES[key].goals,...keep};state.mealPlans=mealPreset(key);save()}
function applySplit(key){if(!['AB','ABC','ABCD'].includes(key))return;state.config.split=key;state.config.planStart=today();save()}
function exportJson(){const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'});const href=URL.createObjectURL(blob);const a=document.createElement('a');a.href=href;a.download='testotrack-v3-'+today()+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(href),500)}
function importJson(obj){if(obj?.version!==3||!obj.days||!obj.config||!obj.mealPlans||!obj.workoutPlans)throw Error('Este não é um backup do TestoTrack 3.0');state=normalize(obj);save()}
function replaceFromCloud(obj){if(obj?.version!==3)throw Error('Formato de dados inválido');state=normalize(obj);localStorage.setItem(KEY,JSON.stringify(state));setClean();window.dispatchEvent(new CustomEvent('tt:loaded'))}
function legacyAvailable(){try{const d=JSON.parse(localStorage.getItem(LEGACY_KEY));return d&&typeof d==='object'&&d.days&&d.settings?d:null}catch{return null}}
function importLegacy(raw){
 const x=raw||legacyAvailable();if(!x)throw Error('Nenhum histórico anterior encontrado');
 for(const [d,old] of Object.entries(x.days||{})){
   if(!/^\d{4}-\d{2}-\d{2}$/.test(d))continue;
   const record=day(d);
   if(old.sleep!==null&&old.sleep!==undefined&&!record.sleep)record.sleep={bed:'',wake:'',hours:n(old.sleep),quality:0,awakenings:0};
   if(old.weight!=null&&record.measures.weight==null)record.measures.weight=n(old.weight);
   if(old.waist!=null&&record.measures.waist==null)record.measures.waist=n(old.waist);
   if(old.protein!=null&&record.legacyProtein==null)record.legacyProtein=n(old.protein);
   if(old.energy!=null&&record.energy==null)record.energy=n(old.energy);
   if(old.libido!=null&&record.libido==null)record.libido=n(old.libido);
   if(old.notes&&!record.notes)record.notes=String(old.notes);
   if(old.habits&&!record.legacyHabits)record.legacyHabits=old.habits;
 }
 for(const exam of x.labs||[]){if(!state.exams.some(e=>e.date===exam.date&&n(e.value)===n(exam.value)))state.exams.push({id:id(),date:exam.date,value:n(exam.value),notes:String(exam.notes||'')})}
 state.legacyImported=true;save();
}
function current(){return state}
function setState(s){state=normalize(s);save()}
window.TT={KEY,LEGACY_KEY,$,today,date,parse,addDay,fmt,n,id,esc,money,FOODS,SLOTS,MEAL_TEMPLATES,SUPPLEMENT_BASE,EXERCISES,fresh,normalize,get state(){return state},get dirty(){return dirty},day,dayRead,save,setClean,setState,replaceFromCloud,foodById,calc,sum,getMacros,foodsForSlot,plannedMacros,addFood,registerPlan,removeFood,water,waterTotal,waterUndo,setSupplement,setMeasure,setSleep,slots,workoutLetters,isTraining,workoutLetter,workoutFor,lastSet,workoutStart,workoutSet,workoutFinish,cardioAdd,taskStatus,schedule,taskSet,applyDiet,applySplit,exportJson,importJson,importLegacy,legacyAvailable};
})();
