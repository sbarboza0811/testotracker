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