export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 if(req.method!=='GET')return res.status(405).json({error:'Method not allowed'});
 const url=process.env.SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!url||!key)return res.status(200).json({settings:{}});
 try{
  const r=await fetch(url.replace(/\/$/,'')+'/rest/v1/site_settings?select=key,value',{headers:{apikey:key,Authorization:'Bearer '+key}});
  if(!r.ok)return res.status(503).json({error:'Content unavailable'});
  const rows=await r.json(),settings={};for(const row of rows)settings[row.key]=row.value;
  return res.status(200).json({settings});
 }catch{return res.status(503).json({error:'Content unavailable'});}
}
