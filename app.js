const $=s=>document.querySelector(s);
const year=$('#year');if(year)year.textContent=new Date().getFullYear();
const menu=$('#menu'),nav=$('.desktop-nav');
if(menu&&nav){menu.addEventListener('click',()=>{const open=nav.classList.toggle('open');menu.setAttribute('aria-expanded',String(open));menu.setAttribute('aria-label',open?'Close navigation':'Open navigation')});nav.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>{nav.classList.remove('open');menu.setAttribute('aria-expanded','false')}))}
const form=$('#contact-form');if(form)form.addEventListener('submit',e=>{e.preventDefault();const note=$('#form-note');note.textContent='Thanks — this form is not connected yet, so your enquiry has not been sent. Please use the chat preview or connect an email service before launch.';note.setAttribute('role','status')});
const open=$('#chat-open'),box=$('#chat-box'),close=$('#chat-close'),chatForm=$('#chat-form'),chatInput=$('#chat-input'),chatBody=$('#chat-body');
function toggleChat(show){box.hidden=!show;open.setAttribute('aria-expanded',String(show));if(show)chatInput.focus()}
if(open)open.addEventListener('click',()=>toggleChat(box.hidden));if(close)close.addEventListener('click',()=>toggleChat(false));
function message(text,kind){const p=document.createElement('p');p.className=kind+'-msg';p.textContent=text;chatBody.appendChild(p);chatBody.scrollTop=chatBody.scrollHeight}
function answer(q){const s=q.toLowerCase();if(s.includes('website'))return'We shape websites and digital experiences around your business goals. What should the website help people do?';if(s.includes('brand'))return'We can help define a clear identity across visuals, voice and digital touchpoints. What are you building?';if(s.includes('automation')||s.includes('ai'))return'We design practical workflows that reduce repetitive work while keeping people in control. Which process would you like to improve?';return'Thanks for reaching out. This is a chat preview; a secure AI service can be connected through a backend later.'}
function send(q){q=q.trim();if(!q)return;message(q,'user');const quick=$('.quick');if(quick)quick.remove();message(answer(q),'bot')}
if(chatForm)chatForm.addEventListener('submit',e=>{e.preventDefault();send(chatInput.value);chatInput.value=''});document.querySelectorAll('.quick button').forEach(b=>b.addEventListener('click',()=>send(b.textContent)));
