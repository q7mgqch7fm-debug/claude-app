(()=>{
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const app=$('#app'),thread=$('#thread'),input=$('#input'),dock=$('#dock');
const KEY='claude-clone-v1';
let S={name:'bạn',apiKey:'',chats:[],cur:null};
try{Object.assign(S,JSON.parse(localStorage.getItem(KEY)||'{}'))}catch(e){}
const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(S))}catch(e){}};
let tab='chat',busy=false,incognito=false;

/* star logo */
const starSVG=()=>{let p='';for(let i=0;i<12;i++){const a=i*Math.PI/6,L=[44,35,41,32,43,36][i%6];
p+=`<line x1="${(50+9*Math.sin(a)).toFixed(1)}" y1="${(50-9*Math.cos(a)).toFixed(1)}" x2="${(50+L*Math.sin(a)).toFixed(1)}" y2="${(50-L*Math.cos(a)).toFixed(1)}"/>`}
return `<svg viewBox="0 0 100 100" stroke="currentColor" stroke-width="6.5" stroke-linecap="round">${p}</svg>`};
const fillStars=()=>$$('[data-star]').forEach(e=>e.innerHTML=starSVG());
fillStars();

/* toast */
let tt;const toast=m=>{const t=$('#toast');t.textContent=m;t.classList.add('show');clearTimeout(tt);tt=setTimeout(()=>t.classList.remove('show'),2000)};
$$('[data-toast]').forEach(b=>b.onclick=()=>toast(b.dataset.toast));
$('#upgradeBtn').onclick=$('#planBtn').onclick=()=>toast('Đây là bản giao diện, không có gói trả phí');
$('#artBtn').onclick=()=>{go('chat');newChat();input.value='Tạo giúp mình một artifact: ';input.focus();onType()};
$('#searchBtn').onclick=()=>toast('Chưa có dự án để tìm');

/* header + tabs */
function updateHead(){
  const c=cur(),convo=tab==='chat'&&c&&c.msgs.length>0;
  app.classList.toggle('convo',convo);
  const top=$('.top');top.className='top t-'+tab+(tab==='chat'?(convo?' convo':' home-on'):'');
  $('#topTitle').textContent=convo?c.title:(tab==='chat'&&incognito?'Chat ẩn danh':'');
  top.classList.toggle('line',convo);
  dock.style.display=tab==='chat'?'':'none';
}
function go(t){
  tab=t;$$('.view').forEach(v=>v.classList.toggle('active',v.id==='v-'+t));
  $$('.tabbar button').forEach(b=>b.classList.toggle('on',b.dataset.tab===t));
  updateHead();if(navigator.vibrate)navigator.vibrate(5);
}
$$('.tabbar button').forEach(b=>b.onclick=()=>go(b.dataset.tab));

/* greeting + recent */
function greet(){
  const h=new Date().getHours(),p=h<11?'sáng':h<14?'trưa':h<18?'chiều':'tối';
  $('#greeting').textContent=`Chào buổi ${p}, ${S.name}`;
  $('#dName').textContent=S.name;$('#avatar').textContent=(S.name||'b')[0];
  const r=S.chats[0],b=$('#recent');
  if(r&&!incognito){b.hidden=false;b.innerHTML=`<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a8 8 0 0 1-11.7 7L4 20l1.2-4.4A8 8 0 1 1 21 12z"/></svg><span></span><small>${fmtDate(r.t)}</small>`;b.querySelector('span').textContent=r.title;b.onclick=()=>openChat(r.id)}
  else b.hidden=true;
}
const fmtDate=t=>{const d=new Date(t);return `${d.getDate()} thg ${d.getMonth()+1}`};

/* chats */
const cur=()=>S.chats.find(c=>c.id===S.cur)||(S.cur&&S.cur.msgs?S.cur:null);
function newChat(){S.cur=null;thread.innerHTML='';updateHead();greet();closeDrawer()}
function openChat(id){
  S.cur=id;const c=cur();if(!c)return;go('chat');closeDrawer();
  thread.innerHTML='';c.msgs.forEach(m=>addMsg(m.r,m.t,false));updateHead();scrollEnd();
}
function renderList(){
  const l=$('#dList');l.innerHTML='';
  if(!S.chats.length){l.innerHTML='<div class="d-none">Chưa có đoạn chat nào</div>';return}
  S.chats.forEach(c=>{const b=document.createElement('button');b.className='d-item'+(c.id===S.cur?' on':'');b.textContent=c.title;b.onclick=()=>openChat(c.id);l.appendChild(b)});
}

/* markdown-lite */
const esc=s=>s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
function md(src){
  let t=esc(src),blocks=[];
  t=t.replace(/```(\w*)\n?([\s\S]*?)(```|$)/g,(_,l,c)=>{blocks.push(`<pre><code>${c.replace(/\n$/,'')}</code></pre>`);return `\u0000${blocks.length-1}\u0000`});
  const inl=s=>s.replace(/`([^`]+)`/g,'<code>$1</code>').replace(/\*\*([^*]+)\*\*/g,'<b>$1</b>').replace(/(^|\s)\*([^*\s][^*]*)\*/g,'$1<i>$2</i>');
  const out=[];let list=null;
  const flush=()=>{if(list){out.push(`<${list.t}>${list.i.join('')}</${list.t}>`);list=null}};
  t.split('\n').forEach(line=>{
    let m;
    if(m=line.match(/^\s*[-*•]\s+(.*)/)){if(!list||list.t!=='ul'){flush();list={t:'ul',i:[]}}list.i.push(`<li>${inl(m[1])}</li>`)}
    else if(m=line.match(/^\s*\d+[.)]\s+(.*)/)){if(!list||list.t!=='ol'){flush();list={t:'ol',i:[]}}list.i.push(`<li>${inl(m[1])}</li>`)}
    else{flush();if(m=line.match(/^\u0000(\d+)\u0000$/))out.push(blocks[m[1]]);else if(line.trim())out.push(`<p>${inl(line.replace(/^#+\s*/,'**')+(/^#+\s/.test(line)?'**':''))}</p>`)}
  });flush();
  return out.join('').replace(/\u0000(\d+)\u0000/g,(_,i)=>blocks[i]);
}

function addMsg(role,text,anim=true){
  const d=document.createElement('div');
  if(role==='u'){d.className='msg-u';d.textContent=text}
  else{d.className='msg-a';d.innerHTML=md(text)+footer()}
  if(!anim)d.style.animation='none';
  thread.appendChild(d);return d;
}
const footer=()=>`<div class="foot"><button data-act="copy" aria-label="Sao chép"><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="11" height="11" rx="2.5"/><path d="M5 15V6a2 2 0 0 1 2-2h9"/></svg></button><button data-act="up" aria-label="Thích"><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M7 11v9H4v-9zM7 11l4-7c1.7 0 2.5 1.2 2 3l-.6 3H19a2 2 0 0 1 2 2.4l-1.3 6a2 2 0 0 1-2 1.6H7"/></svg></button></div>`;
thread.addEventListener('click',e=>{const b=e.target.closest('[data-act]');if(!b)return;
  if(b.dataset.act==='copy'){const t=b.closest('.msg-a').innerText;navigator.clipboard&&navigator.clipboard.writeText(t).then(()=>toast('Đã sao chép'))}
  else{b.style.color='var(--accent)';toast('Cảm ơn phản hồi của bạn')}});
const scrollEnd=()=>thread.scrollTo({top:thread.scrollHeight,behavior:'smooth'});

/* replies */
const demo=t=>{
  if(/^(hi|hello|chào|xin chào|alo)/i.test(t.trim()))return `Chào bạn! Mình là Claude, một trợ lý AI. Mình có thể giúp bạn khá nhiều việc, ví dụ:\n- **Trả lời câu hỏi và giải thích:** kiến thức, khái niệm, học tập\n- **Viết và chỉnh sửa:** email, bài luận, CV, dịch thuật\n- **Lập trình:** viết code, sửa lỗi, giải thích thuật toán\n- **Phân tích:** số liệu, tài liệu, file bạn tải lên\n- **Lên kế hoạch và brainstorm ý tưởng**\n\nBạn đang cần giúp việc gì không?`;
  return `Đây là bản giao diện nên mình chưa kết nối với Claude thật. Vào **Cài đặt** (bấm tên của bạn ở menu bên trái) và nhập Anthropic API key để mình trả lời thật nhé.`;
};
async function reply(){
  const c=cur();
  if(!S.apiKey)return demo(c.msgs[c.msgs.length-1].t);
  const r=await fetch('https://api.anthropic.com/v1/messages',{method:'POST',headers:{'content-type':'application/json','x-api-key':S.apiKey,'anthropic-version':'2023-06-01','anthropic-dangerous-direct-browser-access':'true'},
    body:JSON.stringify({model:'claude-sonnet-4-6',max_tokens:2000,system:'Trả lời bằng ngôn ngữ người dùng đang dùng, ngắn gọn và rõ ràng.',messages:c.msgs.map(m=>({role:m.r==='u'?'user':'assistant',content:m.t}))})});
  const j=await r.json();
  if(!r.ok)throw new Error(j.error&&j.error.message||'Lỗi '+r.status);
  return j.content.map(x=>x.text||'').join('');
}
async function stream(el,text){
  let i=0;const step=Math.max(2,Math.ceil(text.length/260));
  el.classList.add('cursor');
  while(i<text.length){i=Math.min(text.length,i+step);el.innerHTML=md(text.slice(0,i));el.classList.add('cursor');
    if(thread.scrollHeight-thread.scrollTop-thread.clientHeight<140)thread.scrollTop=thread.scrollHeight;
    await new Promise(r=>setTimeout(r,18))}
  el.classList.remove('cursor');el.innerHTML=md(text)+footer();
}

async function send(){
  const text=input.value.trim();if(!text||busy)return;
  busy=true;input.value='';resize();onType();
  let c=cur();
  if(!c){c={id:'c'+Date.now(),title:text.slice(0,40),t:Date.now(),msgs:[]};S.chats.unshift(c);S.cur=c.id}
  c.msgs.push({r:'u',t:text});c.t=Date.now();
  updateHead();addMsg('u',text);scrollEnd();
  const th=document.createElement('span');th.className='star think';th.innerHTML=starSVG();thread.appendChild(th);scrollEnd();
  let ans;
  try{await new Promise(r=>setTimeout(r,S.apiKey?0:700));ans=await reply()}catch(e){ans='Không gọi được Claude: '+e.message}
  th.remove();
  const el=addMsg('a','');el.innerHTML='';
  await stream(el,ans);
  c.msgs.push({r:'a',t:ans});
  if(!incognito)save();else{S.chats=S.chats.filter(x=>x!==c);S.cur=c}
  renderList();busy=false;
}

/* input */
function resize(){input.style.height='auto';input.style.height=Math.min(input.scrollHeight,140)+'px'}
function onType(){dock.classList.toggle('typing',input.value.trim().length>0)}
input.addEventListener('input',()=>{resize();onType()});
input.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send()}});
$('#sendBtn').onclick=()=>input.value.trim()?send():toast('Chế độ giọng nói chưa có trong bản này');
$('#micBtn').onclick=()=>{
  const R=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(!R)return toast('Dùng micro trên bàn phím iPhone để nói');
  const r=new R();r.lang='vi-VN';r.onresult=e=>{input.value=e.results[0][0].transcript;resize();onType()};r.onerror=()=>toast('Không dùng được micro');r.start();toast('Đang nghe...');
};
$('#plusBtn').onclick=()=>toast('Tải tệp chưa có trong bản này');
$('#ghostBtn').onclick=()=>{incognito=!incognito;toast(incognito?'Chat ẩn danh: không lưu lịch sử':'Đã tắt chat ẩn danh');updateHead();greet()};
$('#newBtn').onclick=newChat;

/* keyboard (iOS) */
input.addEventListener('focus',()=>app.classList.add('kb'));
input.addEventListener('blur',()=>app.classList.remove('kb'));
if(window.visualViewport){const f=()=>{app.style.height=visualViewport.height+'px';window.scrollTo(0,0);if(app.classList.contains('kb'))thread.scrollTop=thread.scrollHeight};
  visualViewport.addEventListener('resize',f);visualViewport.addEventListener('scroll',f)}

/* drawer + settings */
const closeDrawer=()=>app.classList.remove('open');
$('#menuBtn').onclick=()=>{renderList();app.classList.add('open')};
$('#scrim').onclick=closeDrawer;
$('#dNew').onclick=()=>{go('chat');newChat()};
let sx=null;document.addEventListener('touchstart',e=>{sx=e.touches[0].clientX},{passive:true});
document.addEventListener('touchend',e=>{if(sx===null)return;const dx=e.changedTouches[0].clientX-sx;
  if(dx<-60&&app.classList.contains('open'))closeDrawer();
  if(dx>70&&sx<24&&!app.classList.contains('open')){renderList();app.classList.add('open')}sx=null},{passive:true});
$('#settingsBtn').onclick=()=>{$('#setName').value=S.name;$('#setKey').value=S.apiKey;closeDrawer();app.classList.add('sheet-open')};
$('#sheet-wrap').onclick=e=>{if(e.target.id==='sheet-wrap')app.classList.remove('sheet-open')};
$('#saveSet').onclick=()=>{S.name=$('#setName').value.trim()||'bạn';S.apiKey=$('#setKey').value.trim();save();greet();app.classList.remove('sheet-open');toast('Đã lưu')};
$('#clearAll').onclick=()=>{if(confirm('Xóa toàn bộ đoạn chat?')){S.chats=[];S.cur=null;save();newChat();app.classList.remove('sheet-open')}};

/* boot */
greet();updateHead();
setTimeout(()=>$('#splash').classList.add('out'),1500);
if('serviceWorker'in navigator&&location.protocol.startsWith('http'))navigator.serviceWorker.register('sw.js').catch(()=>{});
})();
