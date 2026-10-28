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
 const apiKey=Deno.env.get("OPENAI_API_KEY");
 const available=!!apiKey;
 const contentType=request.headers.get("content-type")||"";
 if(contentType.includes("application/json")){
   const payload=await request.json().catch(()=>({}));
   if(payload?.check===true)return answer({ready:available});
   return answer({error:"Formato inválido."},400);
 }
 if(!available)return answer({error:"A transcrição ainda precisa da configuração da chave OPENAI_API_KEY no Supabase.",code:"NOT_CONFIGURED"},503);
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
 body.append("model","gpt-transcribe");
 body.append("response_format","json");
 body.append("prompt","Transcreva fielmente a fala em português do Brasil sobre alimentos, marcas, quantidades e refeições. Preserve nomes e números.");
 let reply:Response;
 try{
   reply=await fetch("https://api.openai.com/v1/audio/transcriptions",{
      method:"POST",headers:{"Authorization":"Bearer "+apiKey},body,
      signal:AbortSignal.timeout(45000)
   });
 }catch{return answer({error:"Não consegui conectar ao serviço de transcrição. Tente novamente."},502)}
 if(!reply.ok){
   if(reply.status===429)return answer({error:"O serviço de transcrição atingiu o limite ou ficou sem créditos."},503);
   if(reply.status===401||reply.status===403)return answer({error:"A chave do serviço de transcrição está inválida. Verifique a configuração no Supabase."},503);
   return answer({error:"O áudio não pôde ser transcrito. Tente novamente."},502);
 }
 let result:any;
 try{result=await reply.json()}catch{return answer({error:"Não consegui ler a transcrição."},502)}
 const transcript=String(result?.text||"").trim().slice(0,550);
 if(transcript.length<3)return answer({error:"Não consegui identificar uma fala nesta gravação."},422);
 return answer({text:transcript});
});