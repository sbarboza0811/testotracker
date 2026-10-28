import { createClient } from "npm:@supabase/supabase-js@2.58.0";
const ORIGIN = "https://sbarboza0811.github.io";
const cors = {
  "Access-Control-Allow-Origin": ORIGIN,
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary": "Origin"
};
const limit = new Map<string,{count:number,starts:number}>();
const MAX_BYTES = 4*1024*1024;
function answer(value: unknown,status=200) {
 return new Response(JSON.stringify(value),{status,headers:{...cors,"content-type":"application/json; charset=utf-8","cache-control":"no-store"}});
}
function normalizeTerm(value:string) {
 return value.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9 ]/g," ").replace(/\s+/g," ").trim();
}
async function parseFoodSpeech(transcript:string, key:string, userId:string){
 if(!transcript||transcript.length>550)return answer({error:"A fala deve ter até 550 caracteres."},400);
 if(!acceptUser(userId))return answer({error:"Muitas análises em sequência. Aguarde alguns minutos."},429);
 const instructions = [
 "Você é um extrator extremamente conservador de ALIMENTOS EFETIVAMENTE CONSUMIDOS, em português brasileiro.",
 "Responda APENAS JSON conforme o schema. Extraia alimentos reais, não ideias, perguntas, palavras soltas, nomes de pessoas, frases ou hesitações.",
 "Jamais invente alimento ou quantidade. O nome do alimento precisa estar explícito na fala; use sua forma curta (arroz, feijão, frango, Monster).",
 "Identifique números falados por extenso e a unidade de cada alimento; quantidade 0 e unidade vazia se não informada.",
 "Ignore gaguejos, palavras repetidas, correções incompletas, interjeições, instruções e ruído da transcrição.",
 "NÃO repita um alimento porque o nome foi repetido sem nova quantidade: '100 gramas de arroz, arroz' é um único item 100 g.",
 "Quando uma nova quantidade é dita para o mesmo alimento sem corrigir, SOMe: '100g arroz, mais 50g arroz' => arroz 150 g; '100g arroz e 50g arroz' => arroz 150 g.",
 "Quando a pessoa se corrige com 'não', 'quer dizer', 'na verdade', 'corrigindo', 'aliás', a versão nova substitui a anterior: '100g de arroz, não, 50g de arroz' => arroz 50g.",
 "Se 'arroz, não, feijão' depois de um número, mantenha só o alimento corrigido com a quantidade original.",
 "Não retorne produtos alimentícios que não foram consumidos. Não transforme conversa, dúvida ou frases genéricas em comida.",
 "Exemplos JSON: {\"items\":[{\"name\":\"arroz\",\"quantity\":100,\"unit\":\"g\",\"evidence\":\"100 gramas de arroz\"},{\"name\":\"feijão\",\"quantity\":50,\"unit\":\"g\",\"evidence\":\"50 gramas de feijão\"}]}",
 "Se não for possível reconhecer um alimento, responda {\"items\":[]}."
 ].join(" ");
 let response:Response;
 try{
   response=await fetch("https://api.groq.com/openai/v1/chat/completions",{
     method:"POST",
     headers:{"Authorization":"Bearer "+key,"Content-Type":"application/json"},
     body:JSON.stringify({
       model:"openai/gpt-oss-20b",temperature:0,reasoning_effort:"low",max_completion_tokens:1800,
       messages:[{"role":"system","content":instructions},{"role":"user","content":transcript}],
       response_format:{type:"json_schema",json_schema:{name:"meal_speech",strict:true,schema:{
         type:"object",additionalProperties:false,required:["items"],properties:{
           items:{type:"array",items:{type:"object",additionalProperties:false,
             required:["name","quantity","unit","evidence"],properties:{
               name:{type:"string"},quantity:{type:"number"},unit:{type:"string"},evidence:{type:"string"}
             }
           }}
         }
       }}}
     }),signal:AbortSignal.timeout(22000)
   });
 }catch{return answer({error:"Não consegui interpretar a fala agora. Tente novamente."},502)}
 if(!response.ok){
   if(response.status===429)return answer({error:"A cota gratuita de interpretação atingiu o limite. Aguarde a renovação."},429);
   return answer({error:"Não consegui interpretar os alimentos. Confira a fala e tente novamente."},502);
 }
 let output:any;
 try{output=await response.json()}catch{return answer({error:"A análise retornou dados inválidos."},502)}
 let json:any;
 try{json=JSON.parse(output?.choices?.[0]?.message?.content||"")}catch{return answer({error:"Não foi possível interpretar a resposta da análise."},502)}
 const utterance=normalizeTerm(transcript);
 const tokens=new Set(utterance.split(" ").filter(token=>token.length>=3));
 const allowed=new Set(["g","ml","kg","l","lata","garrafa","copo","unidade","porcao",""]);
 const items=[];
 for(const it of Array.isArray(json?.items)?json.items.slice(0,12):[]){
   const name=String(it?.name||"").trim().slice(0,90);
   const quantity=Number(it?.quantity);
   const unit=normalizeTerm(String(it?.unit||"")).replace("porcao","porcao");
   const evidence=String(it?.evidence||"").trim().slice(0,120);
   const nameTokens=normalizeTerm(name).split(" ").filter(token=>token.length>=3);
   const evidenceTokens=normalizeTerm(evidence).split(" ").filter(token=>token.length>=3);
   if(!nameTokens.length||!nameTokens.some(t=>tokens.has(t)||tokens.has(t+"s"))||!evidenceTokens.some(t=>tokens.has(t)))continue;
   if(!allowed.has(unit)||!Number.isFinite(quantity)||quantity<0||quantity>5000)continue;
   const normName=normalizeTerm(name),normEvidence=normalizeTerm(evidence);
   const previous=items.find((item:any)=>normalizeTerm(item.term)===normName && item.unit===unit);
   if(previous){
     if(!quantity || normalizeTerm(previous.original).includes(normEvidence))continue;
     const isCorrection=/(?:\bnao\b|\bquer dizer\b|\bcorrigindo\b|\bna verdade\b|\balias\b)/.test(normEvidence);
     if(isCorrection){previous.qty=quantity;previous.original=evidence;continue;}
     const hasNewQuantity=/\d|\b(?:um|uma|dois|duas|tres|quatro|cinco|dez|vinte|trinta|cinquenta|cem|cento|duzentos|trezentos)\b/.test(normEvidence);
     if(hasNewQuantity){previous.qty=(Number(previous.qty)||0)+quantity;previous.original+=", "+evidence;}
     continue;
   }
   items.push({term:name,qty:quantity||null,unit,original:evidence||name});
 }
 return answer({items});
}
function acceptUser(id:string) {
 const now=Date.now(),old=limit.get(id);
 const next=old && now-old.starts<600000?{count:old.count+1,starts:old.starts}:{count:1,starts:now};
 limit.set(id,next);
 if(limit.size>1000){for(const [uid,v] of limit){if(now-v.starts>600000)limit.delete(uid)}}
 return next.count<=8;
}
Deno.serve(async (request:Request)=>{
 if(request.method==="OPTIONS")return new Response("ok",{headers:cors});
 if(request.method!=="POST")return answer({error:"Método não permitido."},405);
 const auth=request.headers.get("authorization")||"";
 if(!auth.startsWith("Bearer "))return answer({error:"Entre na sua conta para gravar áudio."},401);
 const supabaseUrl=Deno.env.get("SUPABASE_URL")||"";
 const publishable = Deno.env.get("SUPABASE_ANON_KEY") || (() => {
   try { const keys=JSON.parse(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS")||"{}");return keys.default||""; }
   catch{return "";}
 })();
 if(!supabaseUrl||!publishable)return answer({error:"Autenticação temporariamente indisponível."},503);
 const client=createClient(supabaseUrl,publishable,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:{user},error}=await client.auth.getUser(auth.slice(7));
 if(error||!user||user.is_anonymous)return answer({error:"Sessão inválida. Entre novamente na conta."},401);
 const apiKey=Deno.env.get("GROQ_API_KEY");
 const available=!!apiKey;
 const contentType=request.headers.get("content-type")||"";
 if(contentType.includes("application/json")){
   const payload=await request.json().catch(()=>({}));
   if(payload?.check===true)return answer({ready:available});
   if(typeof payload?.parse==="string"){
     if(!available)return answer({error:"A interpretação gratuita precisa da chave GROQ_API_KEY."},503);
     return await parseFoodSpeech(payload.parse,apiKey,user.id);
   }
   return answer({error:"Formato inválido."},400);
 }
 if(!available)return answer({error:"O plano gratuito de transcrição ainda não está configurado. Crie uma chave Groq Free e cadastre GROQ_API_KEY nos segredos do Supabase.",code:"NOT_CONFIGURED"},503);
 if(!contentType.includes("multipart/form-data"))return answer({error:"Envie uma gravação de áudio."},400);
 const length=Number(request.headers.get("content-length")||0);
 if(length>MAX_BYTES+20000)return answer({error:"Áudio muito grande. Grave no máximo um minuto."},413);
 let form:FormData;
 try{form=await request.formData()}catch{return answer({error:"Arquivo de áudio inválido."},400)}
 const file=form.get("audio");
 if(!(file instanceof File)||!file.size||file.size>MAX_BYTES)return answer({error:"Áudio ausente ou maior que 4 MB."},413);
 const mime=file.type.split(";")[0].toLowerCase();
 const types:Record<string,string>={"audio/webm":"webm","audio/mp4":"mp4","audio/mpeg":"mp3","audio/wav":"wav","audio/x-wav":"wav"};
 const ext=types[mime];
 if(!ext)return answer({error:"Este formato de áudio não é compatível. Atualize o navegador."},415);
 if(!acceptUser(user.id))return answer({error:"Muitas gravações seguidas. Aguarde alguns minutos."},429);
 const body=new FormData();
 body.append("file",new File([file],"refeicao."+ext,{type:mime}));
 body.append("model","whisper-large-v3");
 body.append("language","pt");
 body.append("response_format","json");
 body.append("prompt","Transcreva fielmente a fala em português do Brasil sobre alimentos, marcas, quantidades e refeições. Preserve nomes e números.");
 let reply:Response;
 try{
   reply=await fetch("https://api.groq.com/openai/v1/audio/transcriptions",{
      method:"POST",headers:{"Authorization":"Bearer "+apiKey},body,
      signal:AbortSignal.timeout(45000)
   });
 }catch{return answer({error:"Não consegui conectar ao serviço de transcrição. Tente novamente."},502)}
 if(!reply.ok){
   if(reply.status===429)return answer({error:"Você atingiu o limite gratuito de transcrição. Aguarde a renovação da cota do Groq Free; nenhum pagamento será feito."},503);
   if(reply.status===401||reply.status===403)return answer({error:"Chave gratuita GROQ_API_KEY inválida. Confira o segredo cadastrado no Supabase."},503);
   return answer({error:"O áudio não pôde ser transcrito. Tente novamente."},502);
 }
 let result:any;
 try{result=await reply.json()}catch{return answer({error:"Não consegui ler a transcrição."},502)}
 const transcript=String(result?.text||"").trim().slice(0,550);
 if(transcript.length<3)return answer({error:"Não consegui identificar uma fala nesta gravação."},422);
 return answer({text:transcript});
});