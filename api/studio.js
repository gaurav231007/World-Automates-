import crypto from 'node:crypto';
const safeEqual=(a,b)=>{const x=Buffer.from(String(a)),y=Buffer.from(String(b));return x.length===y.length&&crypto.timingSafeEqual(x,y);};
function ownerSession(req){
 const cookies=(req.headers.cookie||'').split(';').map(v=>v.trim()).filter(v=>v.startsWith('wa_admin='));
 if(!process.env.ADMIN_SESSION_SECRET)return false;
 for(const c of cookies){const raw=c.slice(9),dot=raw.lastIndexOf('.');if(dot<1)continue;const p=raw.slice(0,dot),s=raw.slice(dot+1);const expected=crypto.createHmac('sha256',process.env.ADMIN_SESSION_SECRET).update(p).digest('base64url');if(!safeEqual(s,expected))continue;try{if(JSON.parse(Buffer.from(p,'base64url').toString()).exp>Date.now())return true;}catch{}}
 return false;
}
async function db(path,options={}){const url=process.env.SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;if(!url||!key)throw new Error('Supabase is not configured.');const r=await fetch(url.replace(/\/$/,'')+path,{...options,headers:{apikey:key,Authorization:'Bearer '+key,'Content-Type':'application/json',...(options.headers||{})}});const raw=await r.text();let data=null;try{data=raw?JSON.parse(raw):null}catch{}if(!r.ok)throw new Error(data?.message||data?.error||'Studio request failed ('+r.status+').');return data;}
const idOk=v=>/^\d+$/.test(String(v||''));
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 if(req.method!=='POST')return res.status(405).json({error:'Method not allowed'});
 if(!ownerSession(req))return res.status(401).json({error:'Owner access required. Sign in again.'});
 try{
  const b=req.body||{},action=b.action;
  if(action==='videos-list'){const rows=await db('/rest/v1/video_assets?select=*&order=created_at.desc');return res.status(200).json({videos:rows||[]});}
  if(action==='video-upload-url'){
   const name=String(b.filename||'').trim().replace(/[^a-zA-Z0-9._-]/g,'_').slice(-100),type=String(b.content_type||'');
   if(!name||!/^video\/(mp4|webm|quicktime)$/.test(type))return res.status(400).json({error:'Upload MP4, WebM or MOV video only.'});
   if(Number(b.size)>150*1024*1024)return res.status(413).json({error:'Video must be 150 MB or smaller.'});
   const path=Date.now()+'-'+crypto.randomBytes(5).toString('hex')+'-'+name;
   const result=await db('/storage/v1/object/upload/sign/wa-videos/'+encodeURIComponent(path),{method:'POST',body:JSON.stringify({})});
   const signed=result?.url||result?.signedURL;
   if(!signed)throw new Error('Could not create upload link. Check the wa-videos storage bucket.');
   return res.status(200).json({path,signed_url:signed,token:result.token||null,public_url:process.env.SUPABASE_URL.replace(/\/$/,'')+'/storage/v1/object/public/wa-videos/'+path});
  }
  if(action==='video-create'){
   if(typeof b.title!=='string'||b.title.trim().length<2||typeof b.path!=='string'||!b.path.startsWith(String(Date.now()).slice(0,6))){} 
   const path=String(b.path||'');if(!path||path.includes('..')||path.includes('/'))return res.status(400).json({error:'Invalid uploaded video path.'});
   const rows=await db('/rest/v1/video_assets',{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify({title:String(b.title||'').trim().slice(0,120),description:String(b.description||'').slice(0,1000),storage_path:path,public_url:process.env.SUPABASE_URL.replace(/\/$/,'')+'/storage/v1/object/public/wa-videos/'+path})});
   return res.status(201).json({video:rows?.[0]||null});
  }
  if(action==='video-delete'){
   if(!idOk(b.id))return res.status(400).json({error:'Invalid video.'});
   const rows=await db('/rest/v1/video_assets?select=id,storage_path&id=eq.'+b.id);if(!rows?.length)return res.status(404).json({error:'Video not found.'});
   const base=process.env.SUPABASE_URL.replace(/\/$/,'');
   await fetch(base+'/storage/v1/object/wa-videos/'+rows[0].storage_path,{method:'DELETE',headers:{apikey:process.env.SUPABASE_SERVICE_ROLE_KEY,Authorization:'Bearer '+process.env.SUPABASE_SERVICE_ROLE_KEY}});
   await db('/rest/v1/video_assets?id=eq.'+b.id,{method:'DELETE'});return res.status(200).json({ok:true});
  }
  if(action==='campaigns-list'){const rows=await db('/rest/v1/marketing_campaigns?select=*&order=created_at.desc');return res.status(200).json({campaigns:rows||[]});}
  if(action==='campaign-create'||action==='campaign-update'){
   if(typeof b.name!=='string'||b.name.trim().length<2)return res.status(400).json({error:'Campaign name is required.'});
   const status=['draft','scheduled','active','completed','paused'].includes(b.status)?b.status:'draft';
   const payload={name:b.name.trim().slice(0,120),channel:String(b.channel||'Other').slice(0,50),objective:String(b.objective||'').slice(0,500),budget:Number.isFinite(Number(b.budget))?Math.max(0,Number(b.budget)):0,status,start_date:b.start_date||null,end_date:b.end_date||null,notes:String(b.notes||'').slice(0,2000)};
   let rows;if(action==='campaign-create')rows=await db('/rest/v1/marketing_campaigns',{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify(payload)});
   else{if(!idOk(b.id))return res.status(400).json({error:'Invalid campaign.'});rows=await db('/rest/v1/marketing_campaigns?id=eq.'+b.id,{method:'PATCH',headers:{Prefer:'return=representation'},body:JSON.stringify(payload)});}
   return res.status(200).json({campaign:rows?.[0]||null});
  }
  if(action==='campaign-delete'){if(!idOk(b.id))return res.status(400).json({error:'Invalid campaign.'});await db('/rest/v1/marketing_campaigns?id=eq.'+b.id,{method:'DELETE'});return res.status(200).json({ok:true});}
  if(action==='delete-review'||action==='delete-lead'||action==='delete-task'||action==='delete-project'){
   if(!idOk(b.id))return res.status(400).json({error:'Invalid record.'});
   const table={'delete-review':'reviews','delete-lead':'leads','delete-task':'tasks','delete-project':'projects'}[action];
   if(action==='delete-project'){const tasks=await db('/rest/v1/tasks?select=id&project_id=eq.'+b.id);if(tasks?.length)return res.status(409).json({error:'This project still has tasks. Delete or reassign its tasks first.'});}
   await db('/rest/v1/'+table+'?id=eq.'+b.id,{method:'DELETE'});return res.status(200).json({ok:true});
  }
  return res.status(400).json({error:'Unknown studio action.'});
 }catch(e){return res.status(503).json({error:e.message||'Studio service unavailable.'});}
}
