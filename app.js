const $=s=>document.querySelector(s),esc=s=>String(s??'').replace(/[&<>"']/g,c=>'&#'+c.charCodeAt(0)+';');
const fmt=s=>isFinite(s)?Math.floor(s/60)+':'+String(Math.floor(s%60)).padStart(2,'0'):'0:00';
/* ---- audio graph: source -> 8 EQ filters -> analyser -> out ---- */
const A=new Audio();A.crossOrigin='anonymous';A.volume=.8;
const ctx=new AudioContext(),src=ctx.createMediaElementSource(A);
const F=[60,170,400,1000,2400,6000,12000,16000];
const PRE={Flat:[0,0,0,0,0,0,0,0],Bass:[7,5,2,0,0,0,0,0],Vocal:[-2,-1,2,4,4,2,0,-1],Bright:[0,0,0,0,1,3,5,6]};
const filt=F.map((f,i)=>{const b=ctx.createBiquadFilter();b.type=i==0?'lowshelf':i==7?'highshelf':'peaking';b.frequency.value=f;b.Q.value=1.1;return b});
const an=ctx.createAnalyser();an.fftSize=2048;
[src,...filt,an,ctx.destination].reduce((a,b)=>(a.connect(b),b));
const gains=JSON.parse(localStorage.eq||'[0,0,0,0,0,0,0,0]');
const setG=(i,v)=>{gains[i]=v;filt[i].gain.value=v;localStorage.eq=JSON.stringify(gains)};
F.forEach((f,i)=>{const l=document.createElement('label');
  l.innerHTML=`<input type=range min=-12 max=12 step=.5 value=${gains[i]} title="Double-click to reset"><small>${f>=1000?f/1000+'k':f}</small>`;
  const r=l.firstChild;r.oninput=()=>setG(i,+r.value);r.ondblclick=()=>{r.value=0;setG(i,0)};filt[i].gain.value=gains[i];$('#bands').append(l)});
$('#pre').innerHTML=Object.keys(PRE).map(n=>`<button>${n}</button>`).join('');
$('#pre').onclick=e=>{const g=PRE[e.target.textContent];if(g)document.querySelectorAll('#bands input').forEach((r,i)=>{r.value=g[i];setG(i,g[i])})};
/* ---- queue + playback ---- */
let Q=[],cur=-1,shuf=false,rep=0,R=[];
function draw(){$('#list').innerHTML=Q.map((t,i)=>`<li class="${i==cur?'on':''}" data-i="${i}"><img src="${esc(t.art)}"><div><b>${esc(t.title)}</b><small>${esc(t.artist)}</small></div><button data-x="${i}">✕</button></li>`).join('')}
async function play(i){
  if(i<0||i>=Q.length)return;cur=i;const t=Q[i];draw();
  $('#title').textContent=t.title;$('#artist').textContent=t.artist;$('#art').src=t.art;document.title=t.title+' – Vibrato';
  api.np(`${t.artist} - ${t.title}`);
  try{await ctx.resume();A.src=await api.resolve(t.id);await A.play()}
  catch(e){$('#artist').textContent='Could not load this track, skipping';if(cur<Q.length-1)setTimeout(()=>play(i+1),1200)}
}
function go(d,auto){
  if(auto&&rep==2)return play(cur);
  let n=shuf&&Q.length>1?(()=>{let r;do r=Math.random()*Q.length|0;while(r==cur);return r})():cur+d;
  if(n>=Q.length){if(!rep&&auto)return;n=0}if(n<0)n=Q.length-1;play(n)}
const add=t=>{Q.push(t);draw();if(cur<0&&A.paused)play(Q.length-1)};
A.onended=()=>go(1,true);
A.onplay=A.onpause=()=>$('#play').textContent=A.paused?'▶':'⏸';
A.ontimeupdate=()=>{$('#cur').textContent=fmt(A.currentTime);$('#dur').textContent=fmt(A.duration);if(A.duration)$('#seek').value=A.currentTime/A.duration*1000};
$('#seek').oninput=e=>A.currentTime=e.target.value/1000*A.duration;
$('#vol').oninput=e=>A.volume=e.target.value;
$('#play').onclick=()=>A.src?(A.paused?A.play():A.pause()):0;
$('#next').onclick=()=>go(1);$('#prev').onclick=()=>A.currentTime>3?A.currentTime=0:go(-1);
$('#shuf').onclick=e=>e.target.classList.toggle('on',shuf=!shuf);
$('#rep').onclick=e=>{rep=(rep+1)%3;e.target.textContent=rep==2?'↻1':'↻';e.target.classList.toggle('on',rep>0)};
$('#list').onclick=e=>{const x=e.target.dataset.x,li=e.target.closest('li');
  if(x!=null){Q.splice(+x,1);if(+x<cur)cur--;else if(+x==cur)cur=-1;draw()}else if(li)play(+li.dataset.i)};
onkeydown=e=>{if(e.code=='Space'&&e.target.tagName!='INPUT'){e.preventDefault();$('#play').click()}};
document.querySelectorAll('[data-w]').forEach(b=>b.onclick=()=>api.win(b.dataset.w));
/* ---- search ---- */
$('#q').onkeydown=async e=>{const v=e.target.value.trim();if(e.key!='Enter'||!v)return;
  const r=$('#res');r.hidden=false;r.innerHTML='<p>Searching…</p>';
  try{R=await api.search(v);r.innerHTML='<button id="all">+ Add all</button>'+R.map((t,i)=>`<div data-r="${i}"><img src="${esc(t.art)}"><div><b>${esc(t.title)}</b><small>${esc(t.artist)} · ${fmt(t.dur)}</small></div></div>`).join('')}
  catch(err){r.innerHTML='<p>Search failed. Check that yt-dlp is in the bin folder or on your PATH.</p>'}};
$('#res').onclick=e=>{if(e.target.id=='all')R.forEach(add);const d=e.target.closest('[data-r]');if(d)add(R[+d.dataset.r])};
document.addEventListener('click',e=>{if(!e.target.closest('#res,#q'))$('#res').hidden=true});
/* ---- visualiser (click to switch wave / bars) ---- */
const cv=$('#cv'),c=cv.getContext('2d'),buf=new Uint8Array(an.fftSize),fq=new Uint8Array(an.frequencyBinCount);let mode=0;
cv.onclick=()=>mode^=1;
(function loop(){requestAnimationFrame(loop);
  const w=cv.width=cv.clientWidth,h=cv.height=cv.clientHeight,g=c.createLinearGradient(0,0,w,0);
  g.addColorStop(0,T.accent);g.addColorStop(1,T.accent2);c.strokeStyle=c.fillStyle=g;c.lineWidth=2.5;c.lineJoin='round';
  if(!mode){an.getByteTimeDomainData(buf);c.beginPath();buf.forEach((v,i)=>{const x=i/buf.length*w,y=v/255*h;i?c.lineTo(x,y):c.moveTo(x,y)});c.stroke()}
  else{an.getByteFrequencyData(fq);const n=64,bw=w/n;for(let i=0;i<n;i++){const v=fq[i*2]/255*h;c.fillRect(i*bw+1,h-v,bw-2,v)}}
})();
/* ---- customisable colours ---- */
const TH={Ink:{bg:'#14161c',panel:'#1c2029',accent:'#ff5d8f',accent2:'#6c8cff',text:'#e9eaf0'},
  Pencil:{bg:'#d9dadd',panel:'#eceef0',accent:'#2b2f3a',accent2:'#7b8090',text:'#20232b'},
  Sunset:{bg:'#1b1020',panel:'#2a1830',accent:'#ffb347',accent2:'#ff5d8f',text:'#f6e9f2'},
  Mint:{bg:'#0f1c1a',panel:'#162926',accent:'#3ef0b4',accent2:'#7aa2ff',text:'#e6f7f3'}};
let T=JSON.parse(localStorage.theme||'null')||{...TH.Ink,r:18};
function apply(){for(const k in T)document.documentElement.style.setProperty('--'+k,k=='r'?T[k]+'px':T[k]);localStorage.theme=JSON.stringify(T)}
function sync(){document.querySelectorAll('#theme [data-k]').forEach(i=>i.value=T[i.dataset.k]);apply()}
$('#theme').innerHTML=Object.keys(TH.Ink).map(k=>`<label>${k}<input type=color data-k="${k}"></label>`).join('')
  +'<label>Corners<input type=range data-k=r min=0 max=32></label><div>'+Object.keys(TH).map(n=>`<button data-t="${n}">${n}</button>`).join('')+'</div>';
$('#theme').oninput=e=>{const k=e.target.dataset.k;if(k){T[k]=k=='r'?+e.target.value:e.target.value;apply()}};
$('#theme').onclick=e=>{const n=e.target.dataset.t;if(n){T={...TH[n],r:T.r};sync()}};
$('#cfg').onclick=()=>$('#theme').hidden=!$('#theme').hidden;sync();
