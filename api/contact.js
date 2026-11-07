export default async function handler(req, res) {
 if(req.method!=='POST')return res.status(405).json({error:'Method not allowed'});
 const {name,email,service,details=''}=req.body||{};
 if(typeof name!=='string'||name.trim().length<2||name.length>120)return res.status(400).json({error:'Please enter a valid name.'});
 if(typeof email!=='string'||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>200)return res.status(400).json({error:'Please enter a valid email address.'});
 if(typeof service!=='string'||service.length>120||typeof details!=='string'||details.length>4000)return res.status(400).json({error:'Please check the project details and try again.'});
 const dbUrl=process.env.SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!dbUrl||!key)return res.status(503).json({error:'Enquiry inbox is not configured yet. Please try again later.'});
 const safe=s=>s.replace(/[<>]/g,'');
 try{
  const saved=await fetch(dbUrl.replace(/\/$/,'')+'/rest/v1/leads',{
   method:'POST',headers:{apikey:key,Authorization:'Bearer '+key,'Content-Type':'application/json',Prefer:'return=representation'},
   body:JSON.stringify({name:name.trim(),email:email.trim(),service,details:details.trim(),status:'new'})
  });
  if(!saved.ok)return res.status(502).json({error:'We could not save your enquiry. Please try again.'});
  let autoReply='queued';
  const apiKey=process.env.RESEND_API_KEY,sender=process.env.RESEND_FROM;
  if(apiKey&&sender){
   const mail=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+apiKey,'Content-Type':'application/json'},body:JSON.stringify({
    from:sender,to:[email.trim()],subject:'We received your enquiry — World Automates',
    text:'Hi '+safe(name.trim())+',\n\nThanks for reaching out to World Automates. We have received your enquiry about '+safe(service)+'. Our team will review the details and get back to you as soon as possible.\n\nYour message:\n'+safe(details.trim())+'\n\n— World Automates'
   })});
   autoReply=mail.ok?'sent':'saved';
  }
  if(apiKey&&sender&&process.env.CONTACT_EMAIL){
   await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+apiKey,'Content-Type':'application/json'},body:JSON.stringify({from:sender,to:[process.env.CONTACT_EMAIL],reply_to:email.trim(),subject:'New website enquiry — '+safe(name.trim()),text:'Name: '+safe(name.trim())+'\nEmail: '+safe(email.trim())+'\nService: '+safe(service)+'\n\n'+safe(details.trim())})}).catch(()=>{});
  }
  return res.status(200).json({ok:true,message:autoReply==='sent'?'Enquiry received. A confirmation email is on its way.':'Enquiry received. We have saved your request and will follow up shortly.'});
 }catch{return res.status(500).json({error:'Could not process your enquiry. Please try again.'});}
}
