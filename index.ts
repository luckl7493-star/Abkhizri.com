import {createClient} from "npm:@supabase/supabase-js@2";
const H={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type"};
Deno.serve(async req=>{
 if(req.method=="OPTIONS")return new Response("ok",{headers:H});
 const j=(o:any,s=200)=>new Response(JSON.stringify(o),{status:s,headers:{...H,"Content-Type":"application/json"}});
 try{
  const sb=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const{data:{user}}=await sb.auth.getUser((req.headers.get("Authorization")||"").replace("Bearer ",""));
  if(!user)return j({error:"Login zaroori hai"},401);
  const{order_id,rating,comment,image}=await req.json();
  const{data:o}=await sb.from("orders").select("id,status").eq("id",order_id).eq("customer_id",user.id).single();
  if(!o||o.status!="delivered")return j({error:"Order delivered nahi hai"},400);
  const r=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"x-api-key":Deno.env.get("ANTHROPIC_API_KEY")!,"anthropic-version":"2023-06-01","content-type":"application/json"},
   body:JSON.stringify({model:"claude-haiku-5-5",max_tokens:10,messages:[{role:"user",content:[{type:"image",source:{type:"base64",media_type:"image/jpeg",data:image}},
   {type:"text",text:"Does this photo show an Aab-e-Khizri (Cumin Water) product bottle, its logo, or a purchase bill/receipt? Answer only YES or NO."}]}]})});
  const a=await r.json();
  if(!/YES/i.test(a?.content?.[0]?.text||""))return j({ok:false});
  const path=`${user.id}/${order_id}.jpg`;
  await sb.storage.from("reviews").upload(path,Uint8Array.from(atob(image),c=>c.charCodeAt(0)),{contentType:"image/jpeg",upsert:true});
  const{error}=await sb.from("reviews").insert({order_id,customer_id:user.id,rating,comment,photo_path:path});
  if(error)return j({error:error.message},400);
  return j({ok:true});
 }catch(e){return j({error:String(e)},500)}
});
