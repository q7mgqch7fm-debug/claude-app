(()=>{
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const app=$('#app'),thread=$('#thread'),input=$('#input'),dock=$('#dock');
// Chỉ lưu cài đặt; tuyệt đối không lưu nội dung hội thoại.
const SETTINGS_KEY='claude-ui-settings-v2';
try{localStorage.removeItem('claude-clone-v1')}catch(e){}
let saved={};try{saved=JSON.parse(localStorage.getItem(SETTINGS_KEY)||'{}')||{}}catch(e){}
let S={name:typeof saved.name==='string'?saved.name:'bạn',apiKey:typeof saved.apiKey==='string'?saved.apiKey:'',chats:[],cur:null,model:['fable','opus','sonnet','haiku'].includes(saved.model)?saved.model:'sonnet',think:Number.isInteger(saved.think)?Math.max(0,Math.min(3,saved.think)):1};
const save=()=>{try{localStorage.setItem(SETTINGS_KEY,JSON.stringify({name:S.name,apiKey:S.apiKey,model:S.model,think:S.think}))}catch(e){}};
let tab='chat',busy=false,incognito=false;

/* star logo */
const RAYS=[[0,46],[29,31],[62,42],[88,36],[119,47],[152,33],[178,40],[212,29],[243,44],[268,35],[299,41],[330,30]];
const starSVG=(th=0)=>{const r0=th?3:8,w0=th?3.2:1.7,w1=th?4.2:3.4;let p='';RAYS.forEach(([d,L])=>{const a=d*Math.PI/180,s=Math.sin(a),c=Math.cos(a);
const f=n=>n.toFixed(1),X=(r,w)=>[50+r*s+w*c,50-r*c+w*s],Y=(r,w)=>[50+r*s-w*c,50-r*c-w*s];
const q=[X(r0,w0),X(L,w1),Y(L,w1),Y(r0,w0)].map(v=>f(v[0])+','+f(v[1])).join(' ');
p+=`<polygon points="${q}"/><circle cx="${f(50+L*s)}" cy="${f(50-L*c)}" r="${w1}"/>`});
return `<svg viewBox="0 0 100 100" fill="currentColor">${p}</svg>`};
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
  const b=$('#recent');b.hidden=true;b.onclick=null;
}
const fmtDate=t=>{const d=new Date(t);return `${d.getDate()} thg ${d.getMonth()+1}`};

/* chats */
const cur=()=>S.cur;
function newChat(){S.cur=null;thread.innerHTML='';updateHead();greet();closeDrawer()}
function openChat(){newChat()}
function renderList(){const l=$('#dList');l.innerHTML='<div class="d-none">Lịch sử chat đã tắt — cuộc trò chuyện chỉ tồn tại trong phiên hiện tại</div>'}

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
  if(/model|phiên bản|bạn là ai|ban la ai/i.test(t))return `Bạn đang chọn chế độ hiển thị **${M().n}** với mức nỗ lực **${TH[S.think].n}**. Để minh bạch: model AI thực tế đang xử lý là Claude Haiku 5.5; tên trong bộ chọn là nhãn chế độ giao diện, không thay model nền.`;
  if(/^(hi|hello|chào|xin chào|alo)/i.test(t.trim()))return `Chào bạn! Mình là Claude, một trợ lý AI. Mình có thể giúp bạn khá nhiều việc, ví dụ:\n- **Trả lời câu hỏi và giải thích:** kiến thức, khái niệm, học tập\n- **Viết và chỉnh sửa:** email, bài luận, CV, dịch thuật\n- **Lập trình:** viết code, sửa lỗi, giải thích thuật toán\n- **Phân tích:** số liệu, tài liệu, file bạn tải lên\n- **Lên kế hoạch và brainstorm ý tưởng**\n\nBạn đang cần giúp việc gì không?`;
  return `Mình chưa được kết nối API nên chưa thể tạo câu trả lời AI thực. Hãy mở **Cài đặt** và thêm Anthropic API key để bật trả lời trực tiếp. Chế độ đang chọn: **${M().n} · ${TH[S.think].n}**.`;
};
async function reply(){
  const c=cur();
  if(!S.apiKey)return demo(c.msgs[c.msgs.length-1].t);
  const lbl=M().n;
  const sys=`Bạn là trợ lý AI Claude. Chế độ giao diện người dùng đã chọn: ${lbl}. Model AI thực tế luôn cố định là Claude Haiku 5.5; lựa chọn Fable/Opus/Sonnet/Haiku chỉ là nhãn chế độ giao diện, KHÔNG thay đổi model API. Nếu được hỏi đang chọn chế độ nào, nêu ${lbl}. Nếu hỏi model AI thực tế, trả lời trung thực là Claude Haiku 5.5. Không được tuyên bố đang chạy Opus/Sonnet/Fable thật. Mức nỗ lực được chọn: ${TH[S.think].n}; áp dụng độ sâu tương ứng. Trả lời bằng ngôn ngữ người dùng đang dùng, rõ ràng.`;
  const msgs=c.msgs.map(m=>({role:m.r==='u'?'user':'assistant',content:m.t}));
  const call=async ()=>{
    const body={model:REAL_MODEL,max_tokens:32000,system:sys,messages:msgs,thinking:{type:'adaptive'},output_config:{effort:['low','medium','high','max'][S.think]}};
    const r=await fetch('https://api.anthropic.com/v1/messages',{method:'POST',headers:{'content-type':'application/json','x-api-key':S.apiKey,'anthropic-version':'2023-06-01','anthropic-dangerous-direct-browser-access':'true'},body:JSON.stringify(body)});
    const j=await r.json();
    if(!r.ok)throw new Error(j.error&&j.error.message||'Lỗi '+r.status);
    return j.content.filter(x=>x.type==='text').map(x=>x.text).join('');
  };
  return await call();
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
  let c=cur();if(!c){c={id:'session-'+Date.now(),title:text.slice(0,40),t:Date.now(),msgs:[]};S.cur=c}
  c.msgs.push({r:'u',t:text});updateHead();addMsg('u',text);scrollEnd();
  const th=document.createElement('div');th.className='thinkrow'+(S.think>=2?' hue':'');th.innerHTML='<span class="star tk">'+starSVG()+'</span>'+(S.think>0?'<span class="rbtext">Đang suy nghĩ</span>':'');thread.appendChild(th);scrollEnd();
  let ans;try{await new Promise(r=>setTimeout(r,S.apiKey?0:250));ans=await reply()}catch(e){ans='Không gọi được Claude: '+e.message}
  th.remove();const el=addMsg('a','');el.innerHTML='';await stream(el,ans);c.msgs.push({r:'a',t:ans});
  // Tin nhắn chỉ nằm trong bộ nhớ phiên hiện tại, không ghi vào localStorage.
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
$('#clearAll').onclick=()=>{S.chats=[];S.cur=null;try{localStorage.removeItem('claude-clone-v1')}catch(e){}newChat();app.classList.remove('sheet-open');toast('Đã xóa cuộc trò chuyện trong phiên này')};

/* model + thinking */
const REAL_MODEL='claude-haiku-5-5'; // Model nền cố định, tiết kiệm; lựa chọn bên dưới chỉ đổi nhãn chế độ.
const MODELS=[{id:'fable',n:'Fable 5.2',d:'Chế độ giao diện cho tác vụ khó (model nền không đổi)'},{id:'opus',n:'Opus 5.5',d:'Chế độ giao diện ưu tiên suy luận sâu'},{id:'sonnet',n:'Sonnet 5.5',d:'Chế độ giao diện cân bằng'},{id:'haiku',n:'Haiku 5.5',d:'Chế độ giao diện ưu tiên tốc độ'}];
const TH=[{n:'Thấp'},{n:'Vừa'},{n:'Cao'},{n:'Tối đa'}];
const M=()=>MODELS.find(m=>m.id===S.model)||MODELS[2];
const composer=$('.composer');let flashT;
function updatePill(){
  $('#mpName').textContent=M().n;const t=$('#mpThink');t.textContent=TH[S.think].n;
  $('#modelPill').classList.toggle('max',S.think===3);
  composer.classList.toggle('rb',S.think===3);
}
function flash(){composer.classList.add('rb','burst');clearTimeout(flashT);flashT=setTimeout(()=>{composer.classList.remove('burst');composer.classList.toggle('rb',S.think===3)},1500)}
function renderModelSheet(){
  $('#mlist').innerHTML=MODELS.map(m=>`<button class="mrow${m.id===S.model?' on':''}" data-m="${m.id}"><span><b>${m.n}</b><small>${m.d}</small></span><i class="chk"></i></button>`).join('');
  $('#seg').innerHTML=TH.map((t,i)=>`<button class="${i===S.think?'on':''}${i===3?' mx':''}" data-t="${i}">${t.n}</button>`).join('');
}
$('#modelPill').onclick=()=>{renderModelSheet();app.classList.add('msheet-open')};
$('#msheet-wrap').onclick=e=>{
  if(e.target.id==='msheet-wrap')return app.classList.remove('msheet-open');
  const m=e.target.closest('[data-m]'),t=e.target.closest('[data-t]');
  if(m){S.model=m.dataset.m;save();updatePill();renderModelSheet();flash();if(navigator.vibrate)navigator.vibrate(8);setTimeout(()=>app.classList.remove('msheet-open'),550)}
  if(t){S.think=+t.dataset.t;save();updatePill();renderModelSheet();flash()}
};
$('#settingsBtn').addEventListener('click',()=>{$('#realModel').textContent='Model nền cố định: Claude Haiku 5.5 ('+REAL_MODEL+'). Bộ chọn Fable / Opus / Sonnet / Haiku chỉ đổi nhãn chế độ và mức nỗ lực, không đổi model API.'});

/* boot */
S.chats=[];S.cur=null;greet();updateHead();updatePill();
setTimeout(()=>$('#splash').classList.add('out'),1500);
if('serviceWorker'in navigator&&location.protocol.startsWith('http'))navigator.serviceWorker.register('sw.js').catch(()=>{});
})();
