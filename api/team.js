import crypto from 'node:crypto';

const cookieName='wa_staff';
const b64=v=>Buffer.from(v).toString('base64url');
const safeEqual=(a,b)=>{const x=Buffer.from(String(a)),y=Buffer.from(String(b));return x.length===y.length&&crypto.timingSafeEqual(x,y);};
function ownerSession(req){
 const raw=(req.headers.cookie||'').split(';').map(v=>v.trim()).find(v=>v.startsWith('wa_admin='))?.slice(9);
 if(!raw||!process.env.ADMIN_SESSION_SECRET)return false;
 const [payload,signature]=raw.split('.');
 if(!payload||!signature||!safeEqual(signature,crypto.createHmac('sha256',process.env.ADMIN_SESSION_SECRET).update(payload).digest('base64url')))return false;
 try{return JSON.parse(Buffer.from(payload,'base64url').toString()).exp>Date.now();}catch{return false;}
}
function staffToken(req){return (req.headers.cookie||'').split(';').map(v=>v.trim()).find(v=>v.startsWith(cookieName+'='))?.slice(cookieName.length+1)||'';}
function setStaffCookie(res,value,maxAge=60*60*8){res.setHeader('Set-Cookie',cookieName+'='+value+'; HttpOnly; Secure; SameSite=Strict; Path=/api/team; Max-Age='+maxAge);}
async function auth(path,options={}){
 const url=process.env.SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!url||!key)throw new Error('Supabase is not configured.');
 const r=await fetch(url.replace(/\/$/,'')+path,{...options,headers:{apikey:key,Authorization:'Bearer '+key,'Content-Type':'application/json',...(options.headers||{})}});
 const raw=await r.text();let data=null;try{data=raw?JSON.parse(raw):null}catch{}
 if(!r.ok)throw new Error(data?.msg||data?.message||data?.error_description||'Team request failed ('+r.status+').');
 return data;
}
async function member(userId){
 const rows=await auth('/rest/v1/team_members?select=user_id,full_name,email,role,active&user_id=eq.'+encodeURIComponent(userId));
 return rows?.[0]||null;
}
async function currentStaff(req){
 const token=staffToken(req);if(!token)return null;
 try{
  const user=await auth('/auth/v1/user',{headers:{Authorization:'Bearer '+token}});
  const m=await member(user.id);return m?.active?m:null;
 }catch{return null;}
}
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 if(req.method!=='POST')return res.status(405).json({error:'Method not allowed'});
 try{
  const body=req.body||{},base=process.env.SUPABASE_URL?.replace(/\/$/,'');
  if(!base||!process.env.SUPABASE_SERVICE_ROLE_KEY)return res.status(503).json({error:'Supabase is not configured.'});
  if(body.action==='login'){
   if(typeof body.email!=='string'||typeof body.password!=='string')return res.status(400).json({error:'Enter email and password.'});
   const r=await fetch(base+'/auth/v1/token?grant_type=password',{method:'POST',headers:{apikey:process.env.SUPABASE_SERVICE_ROLE_KEY,'Content-Type':'application/json'},body:JSON.stringify({email:body.email.trim(),password:body.password})});
   const d=await r.json();if(!r.ok||!d.access_token)return res.status(401).json({error:'Invalid employee login.'});
   const m=await member(d.user.id);if(!m?.active){return res.status(403).json({error:'Your team access is inactive. Contact the owner.'});}
   setStaffCookie(res,d.access_token,Math.min(d.expires_in||28800,28800));
   return res.status(200).json({ok:true,member:m});
  }
  if(body.action==='logout'){setStaffCookie(res,'',0);return res.status(200).json({ok:true});}
  if(body.action==='me'){const m=await currentStaff(req);return m?res.status(200).json({member:m}):res.status(401).json({error:'Please sign in again.'});}
  if(!ownerSession(req))return res.status(401).json({error:'Owner access required.'});
  if(body.action==='list'){
   const rows=await auth('/rest/v1/team_members?select=user_id,full_name,email,role,active,created_at&order=created_at.desc');
   return res.status(200).json({members:rows||[]});
  }
  if(body.action==='create'){
   const {name,email,password,role}=body;
   if(typeof name!=='string'||name.trim().length<2||name.length>100||typeof email!=='string'||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||typeof password!=='string'||password.length<10||password.length>128||!['manager','sales','developer','viewer'].includes(role))return res.status(400).json({error:'Enter a valid name, email, role and password (minimum 10 characters).'});
   const user=await auth('/auth/v1/admin/users',{method:'POST',body:JSON.stringify({email:email.trim(),password,email_confirm:true,user_metadata:{full_name:name.trim()}})});
   try{await auth('/rest/v1/team_members',{method:'POST',headers:{Prefer:'return=minimal'},body:JSON.stringify({user_id:user.id,full_name:name.trim(),email:email.trim(),role,active:true})});}
   catch(e){await auth('/auth/v1/admin/users/'+user.id,{method:'DELETE'}).catch(()=>{});throw e;}
   return res.status(201).json({ok:true,message:'Employee account created.'});
  }
  if(body.action==='set-active'){
   if(typeof body.user_id!=='string'||typeof body.active!=='boolean')return res.status(400).json({error:'Invalid team member update.'});
   const rows=await auth('/rest/v1/team_members?user_id=eq.'+encodeURIComponent(body.user_id),{method:'PATCH',headers:{Prefer:'return=representation'},body:JSON.stringify({active:body.active})});
   if(!body.active)await auth('/auth/v1/admin/users/'+body.user_id,{method:'PUT',body:JSON.stringify({ban_duration:'876000h'})});
   else await auth('/auth/v1/admin/users/'+body.user_id,{method:'PUT',body:JSON.stringify({ban_duration:'none'})});
   return res.status(200).json({ok:true,member:rows?.[0]||null});
  }
  return res.status(400).json({error:'Unknown action.'});
 }catch(e){return res.status(503).json({error:e.message||'Team service unavailable.'});}
}
