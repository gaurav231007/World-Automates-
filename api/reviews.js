import crypto from 'node:crypto';

const cookieName = 'wa_admin';
const b64 = value => Buffer.from(value).toString('base64url');
const safeEqual = (a,b) => { const x=Buffer.from(String(a)); const y=Buffer.from(String(b)); return x.length===y.length && crypto.timingSafeEqual(x,y); };
function sign(value){return crypto.createHmac('sha256',process.env.ADMIN_SESSION_SECRET).update(value).digest('base64url');}
function setCookie(res,value,maxAge=60*60*8){res.setHeader('Set-Cookie',`${cookieName}=${value}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${maxAge}`);}
function clearCookie(res){setCookie(res,'',0);}
function session(req){
 if(!process.env.ADMIN_SESSION_SECRET)return false;
 // Older deployments used Path=/api/reviews while newer sessions use Path=/api/.
 // Browsers can send both cookies; accept any valid signed session, not just the first.
 const cookies=(req.headers.cookie||'').split(';').map(v=>v.trim()).filter(v=>v.startsWith(cookieName+'='));
 for(const cookie of cookies){
  const raw=cookie.slice(cookieName.length+1);
  const dot=raw.lastIndexOf('.');
  if(dot<=0)continue;
  const payload=raw.slice(0,dot),signature=raw.slice(dot+1);
  if(!safeEqual(signature,sign(payload)))continue;
  try{const data=JSON.parse(Buffer.from(payload,'base64url').toString());if(data.exp>Date.now())return true;}catch{}
 }
 return false;
}
async function db(path,options={}){
 const url=process.env.SUPABASE_URL, key=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!url||!key)throw new Error('Review storage is not configured. Add Supabase environment variables.');
 const response=await fetch(url.replace(/\/$/,'')+'/rest/v1/'+path,{...options,headers:{apikey:key,Authorization:'Bearer '+key,'Content-Type':'application/json',...(options.headers||{})}});
 const body=await response.text();
 if(!response.ok)throw new Error('Review database request failed ('+response.status+').');
 return body?JSON.parse(body):null;
}
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 try{
  if(req.method==='GET'){
   const rows=await db('reviews?select=id,name,rating,title,body,created_at&status=eq.approved&order=created_at.desc&limit=50');
   return res.status(200).json({reviews:rows});
  }
  if(req.method!=='POST')return res.status(405).json({error:'Method not allowed'});
  const body=req.body||{};
  if(body.action==='login'){
   if(!process.env.ADMIN_PASSWORD||!process.env.ADMIN_SESSION_SECRET)return res.status(503).json({error:'Admin login is not configured yet.'});
   if(typeof body.password!=='string'||!safeEqual(body.password,process.env.ADMIN_PASSWORD))return res.status(401).json({error:'Incorrect password.'});
   const payload=b64(JSON.stringify({role:'admin',exp:Date.now()+8*60*60*1000}));
   setCookie(res,payload+'.'+sign(payload));
   return res.status(200).json({ok:true});
  }
  if(body.action==='logout'){clearCookie(res);return res.status(200).json({ok:true});}
  if(body.action==='admin-list'||body.action==='moderate'||body.action==='leads-list'||body.action==='lead-update'||body.action==='content-get'||body.action==='content-save'){
   if(!session(req))return res.status(401).json({error:'Please sign in again.'});
   if(body.action==='content-get'){
    const rows=await db('site_settings?select=key,value');
    const settings={};for(const row of rows||[])settings[row.key]=row.value;
    return res.status(200).json({settings});
   }
   if(body.action==='content-save'){
    if(!body.settings||typeof body.settings!=='object'||Array.isArray(body.settings))return res.status(400).json({error:'Invalid content settings.'});
    const allowed=['announcement','heroEyebrow','heroTitle','heroSummary','statementTitle','statementCopy1','statementCopy2','contactTitle','contactIntro','footerTagline','services'];
    const rows=allowed.filter(k=>body.settings[k]!==undefined).map(key=>({key,value:body.settings[key]}));
    if(rows.some(r=>typeof r.value!=='string'||r.value.length>3000))return res.status(400).json({error:'Content values must be text under 3000 characters.'});
    for(const row of rows)await db('site_settings?on_conflict=key',{method:'POST',headers:{Prefer:'resolution=merge-duplicates,return=minimal'},body:JSON.stringify(row)});
    return res.status(200).json({ok:true,message:'Website content saved.'});
   }
   if(body.action==='leads-list'){
    const rows=await db('leads?select=id,name,email,service,details,status,created_at&order=created_at.desc&limit=100');
    return res.status(200).json({leads:rows});
   }
   if(body.action==='lead-update'){
    if(typeof body.id!=='string'||!/^[0-9]+$/.test(body.id)||!['new','contacted','qualified','closed'].includes(body.status))return res.status(400).json({error:'Invalid lead update.'});
    const rows=await db('leads?id=eq.'+body.id,{method:'PATCH',headers:{Prefer:'return=representation'},body:JSON.stringify({status:body.status})});
    return res.status(200).json({lead:rows?.[0]||null});
   }
   if(body.action==='admin-list'){
    const rows=await db('reviews?select=id,name,email,rating,title,body,status,created_at&order=created_at.desc&limit=100');
    return res.status(200).json({reviews:rows});
   }
   if(typeof body.id!=='string'||!/^\d+$/.test(body.id)||!['approved','rejected','pending'].includes(body.status))return res.status(400).json({error:'Invalid review update.'});
   const rows=await db('reviews?id=eq.'+body.id,{method:'PATCH',headers:{Prefer:'return=representation'},body:JSON.stringify({status:body.status})});
   return res.status(200).json({review:rows?.[0]||null});
  }
  const {name,email,rating,title,review}=body;
  if(typeof name!=='string'||name.trim().length<2||name.length>80)return res.status(400).json({error:'Enter your name (2–80 characters).'});
  if(typeof email!=='string'||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>160)return res.status(400).json({error:'Enter a valid email address.'});
  if(!Number.isInteger(rating)||rating<1||rating>5)return res.status(400).json({error:'Choose a rating from 1 to 5.'});
  if(typeof title!=='string'||title.trim().length<3||title.length>100||typeof review!=='string'||review.trim().length<15||review.length>1500)return res.status(400).json({error:'Add a short title and at least 15 characters of feedback.'});
  const rows=await db('reviews',{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify({name:name.trim(),email:email.trim(),rating,title:title.trim(),body:review.trim(),status:'pending'})});
  return res.status(201).json({ok:true,message:'Thanks! Your review has been submitted for approval.'});
 }catch(error){return res.status(503).json({error:error.message||'Service temporarily unavailable.'});}
}
