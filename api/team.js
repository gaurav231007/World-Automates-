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
 const rows=await auth('/rest/v1/team_members?select=user_id,full_name,email,role,active,department_id,permissions,departments(name)&user_id=eq.'+encodeURIComponent(userId));
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
  if(body.action==='password-reset-request'){
   if(typeof body.email!=='string'||!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(body.email))return res.status(400).json({error:'Enter your registered email.'});
   const redirect=encodeURIComponent((process.env.PUBLIC_SITE_URL||'https://world-automates-ocp4.vercel.app')+'/staff');
   const r=await fetch(base+'/auth/v1/recover?redirect_to='+redirect,{method:'POST',headers:{apikey:process.env.SUPABASE_SERVICE_ROLE_KEY,'Content-Type':'application/json'},body:JSON.stringify({email:body.email.trim()})});
   if(!r.ok)return res.status(400).json({error:'Could not send reset email. Check Supabase email settings.'});
   return res.status(200).json({ok:true,message:'If this email belongs to an account, a password reset link has been sent.'});
  }
  if(body.action==='password-reset-complete'){
   if(typeof body.access_token!=='string'||typeof body.password!=='string'||body.password.length<10||body.password.length>128)return res.status(400).json({error:'Use a valid reset link and a password of at least 10 characters.'});
   const check=await fetch(base+'/auth/v1/user',{headers:{apikey:process.env.SUPABASE_SERVICE_ROLE_KEY,Authorization:'Bearer '+body.access_token}});
   if(!check.ok)return res.status(401).json({error:'Reset link is invalid or expired. Request a new one.'});
   const changed=await fetch(base+'/auth/v1/user',{method:'PUT',headers:{apikey:process.env.SUPABASE_SERVICE_ROLE_KEY,Authorization:'Bearer '+body.access_token,'Content-Type':'application/json'},body:JSON.stringify({password:body.password})});
   if(!changed.ok)return res.status(400).json({error:'Password could not be changed. Request a new reset link.'});
   return res.status(200).json({ok:true,message:'Password updated. Sign in with your new password.'});
  }
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
  if(body.action==='tasks-list'){
   const staff=ownerSession(req)?null:await currentStaff(req);
   if(!staff&&!ownerSession(req))return res.status(401).json({error:'Please sign in again.'});
   const filter=staff?'&assigned_to=eq.'+encodeURIComponent(staff.user_id):'';
   const rows=await auth('/rest/v1/tasks?select=*,projects(name)&order=created_at.desc'+filter);
   return res.status(200).json({tasks:rows||[]});
  }
  if(body.action==='task-update'){
   const staff=ownerSession(req)?null:await currentStaff(req);
   if(!staff&&!ownerSession(req))return res.status(401).json({error:'Please sign in again.'});
   if(!/^\\d+$/.test(String(body.id))||!['todo','in_progress','blocked','done'].includes(body.status))return res.status(400).json({error:'Invalid task update.'});
   const rows=await auth('/rest/v1/tasks?select=id,assigned_to&id=eq.'+encodeURIComponent(body.id));
   if(!rows?.length)return res.status(404).json({error:'Task not found.'});
   if(staff&&rows[0].assigned_to!==staff.user_id)return res.status(403).json({error:'This task is not assigned to you.'});
   const updated=await auth('/rest/v1/tasks?id=eq.'+encodeURIComponent(body.id),{method:'PATCH',headers:{Prefer:'return=representation'},body:JSON.stringify({status:body.status,updated_at:new Date().toISOString()})});
   return res.status(200).json({task:updated?.[0]||null});
  }
  if(!ownerSession(req))return res.status(401).json({error:'Owner access required.'});
  if(body.action==='list'){
   const rows=await auth('/rest/v1/team_members?select=user_id,full_name,email,role,active,created_at,department_id,permissions,departments(name)&order=created_at.desc');
   return res.status(200).json({members:rows||[]});
  }
  if(body.action==='departments-list'){
   const rows=await auth('/rest/v1/departments?select=id,name,description,created_at&order=name.asc');
   return res.status(200).json({departments:rows||[]});
  }
  if(body.action==='department-create'||body.action==='department-update'){
   if(typeof body.name!=='string'||body.name.trim().length<2||body.name.trim().length>60)return res.status(400).json({error:'Department name must be 2–60 characters.'});
   const payload={name:body.name.trim(),description:String(body.description||'').trim().slice(0,500)};
   if(body.action==='department-create'){
    const rows=await auth('/rest/v1/departments',{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify(payload)});
    return res.status(201).json({department:rows?.[0]||null});
   }
   if(!/^\\d+$/.test(String(body.id)))return res.status(400).json({error:'Choose a valid department.'});
   const rows=await auth('/rest/v1/departments?id=eq.'+encodeURIComponent(body.id),{method:'PATCH',headers:{Prefer:'return=representation'},body:JSON.stringify(payload)});
   return res.status(200).json({department:rows?.[0]||null});
  }
  if(body.action==='member-config'){
   if(typeof body.user_id!=='string'||!body.user_id)return res.status(400).json({error:'Choose an employee.'});
   const permissions=body.permissions&&typeof body.permissions==='object'&&!Array.isArray(body.permissions)?body.permissions:{};
   const allowed=['tasks','projects','enquiries','reviews','website','team'];
   const clean={};for(const key of allowed)clean[key]=permissions[key]===true;
   const departmentId=body.department_id===''||body.department_id==null?null:Number(body.department_id);
   if(departmentId!==null&&!Number.isInteger(departmentId))return res.status(400).json({error:'Invalid department.'});
   const rows=await auth('/rest/v1/team_members?user_id=eq.'+encodeURIComponent(body.user_id),{method:'PATCH',headers:{Prefer:'return=representation'},body:JSON.stringify({department_id:departmentId,permissions:clean})});
   return res.status(200).json({member:rows?.[0]||null});
  }
  if(body.action==='create'){
   const {name,email,password,role}=body;
   const cleanEmail=typeof email==='string'?email.trim().toLowerCase():'';
   const cleanRole=typeof role==='string'?role.trim().slice(0,60):'';
   if(typeof name!=='string'||name.trim().length<2||name.length>100||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)||typeof password!=='string'||password.length<10||password.length>128||cleanRole.length<2)return res.status(400).json({error:'Enter name, valid email, password (10+ characters) and a role.'});
   const existingRows=await auth('/rest/v1/team_members?select=user_id&email=eq.'+encodeURIComponent(cleanEmail));
   if(existingRows?.length)return res.status(409).json({error:'This email is already added as an employee. Edit that employee from the team list instead.'});
   let user,createdNow=false;
   const authUsers=await auth('/auth/v1/admin/users?page=1&per_page=1000');
   const existingUser=(authUsers?.users||[]).find(u=>(u.email||'').toLowerCase()===cleanEmail);
   if(existingUser){user=existingUser;}
   else{user=await auth('/auth/v1/admin/users',{method:'POST',body:JSON.stringify({email:cleanEmail,password,email_confirm:true,user_metadata:{full_name:name.trim()}})});createdNow=true;}
   try{
    await auth('/rest/v1/team_members',{method:'POST',headers:{Prefer:'return=minimal'},body:JSON.stringify({user_id:user.id,full_name:name.trim(),email:cleanEmail,role:cleanRole,active:true,department_id:body.department_id?Number(body.department_id):null,permissions:body.permissions&&typeof body.permissions==='object'?body.permissions:{tasks:true,projects:false,enquiries:false,reviews:false,website:false,team:false}})});
   }catch(e){if(createdNow)await auth('/auth/v1/admin/users/'+user.id,{method:'DELETE'}).catch(()=>{});throw e;}
   return res.status(201).json({ok:true,message:existingUser?'Existing registered email linked to the team. Its current password remains unchanged.':'Employee account created.'});
  }
  if(body.action==='set-active'){
   if(typeof body.user_id!=='string'||typeof body.active!=='boolean')return res.status(400).json({error:'Invalid team member update.'});
   const rows=await auth('/rest/v1/team_members?user_id=eq.'+encodeURIComponent(body.user_id),{method:'PATCH',headers:{Prefer:'return=representation'},body:JSON.stringify({active:body.active})});
   if(!body.active)await auth('/auth/v1/admin/users/'+body.user_id,{method:'PUT',body:JSON.stringify({ban_duration:'876000h'})});
   else await auth('/auth/v1/admin/users/'+body.user_id,{method:'PUT',body:JSON.stringify({ban_duration:'none'})});
   return res.status(200).json({ok:true,member:rows?.[0]||null});
  }
  if(body.action==='projects-list'){
   const rows=await auth('/rest/v1/projects?select=*&order=created_at.desc');
   return res.status(200).json({projects:rows||[]});
  }
  if(body.action==='project-create'){
   if(typeof body.name!=='string'||body.name.trim().length<2)return res.status(400).json({error:'Enter a project name.'});
   const rows=await auth('/rest/v1/projects',{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify({name:body.name.trim(),client_name:String(body.client_name||'').slice(0,160),description:String(body.description||'').slice(0,3000),due_date:body.due_date||null})});
   return res.status(201).json({project:rows?.[0]||null});
  }
  if(body.action==='task-create'){
   if(!ownerSession(req))return res.status(401).json({error:'Owner access required.'});
   if(typeof body.title!=='string'||body.title.trim().length<2||typeof body.assigned_to!=='string'||!['todo','in_progress','blocked','done'].includes(body.status||'todo')||!['low','normal','high','urgent'].includes(body.priority||'normal'))return res.status(400).json({error:'Check task title, assignee, status and priority.'});
   const assignee=await member(body.assigned_to);if(!assignee?.active)return res.status(400).json({error:'Choose an active employee.'});
   const rows=await auth('/rest/v1/tasks',{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify({project_id:body.project_id||null,title:body.title.trim(),description:String(body.description||'').slice(0,3000),assigned_to:body.assigned_to,status:body.status||'todo',priority:body.priority||'normal',due_date:body.due_date||null})});
   return res.status(201).json({task:rows?.[0]||null});
  }
  return res.status(400).json({error:'Unknown action.'});
 }catch(e){return res.status(503).json({error:e.message||'Team service unavailable.'});}
}
