const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const STORAGE = 'SYSTEM_LIVING_BODY_V5';
const now = () => new Date();
const todayKey = () => new Date().toISOString().slice(0,10);
const fmt = n => Number(n||0).toFixed(2);
const clamp = (n,a,b)=>Math.max(a,Math.min(b,n));
const uid = ()=>Math.random().toString(36).slice(2,9);

let deferredPrompt = null;
let tab = 'status';
let watchId = null;
let runState = {active:false, start:0, last:null, distance:0, points:[], paused:false};
let timerId = null;
let timerState = {active:false, type:'plank', remaining:0, total:0, objectiveId:null};

const defaultState = {
  setup:false,
  player:{name:'Player',age:'',height:'',weight:'',activity:'rendah',sleep:6,equipment:'tanpa alat'},
  goal:'Aesthetic Combat Build',
  scan:{pushup:0,squat:0,plank:0,runKmTime:0,visualNotes:''},
  rank:'E', level:1, xp:0, title:'Weak Hunter', className:'NONE',
  stats:{strength:3,endurance:3,agility:2,core:2,recovery:4,discipline:1,fatigue:18},
  protocol:{phase:'E-Rank Awakening', estimateWeeks:16, complianceReq:85, route:[]},
  currentOrder:null,
  dailyQuest:null,
  penalty:null,
  logs:[], failures:[], history:[],
  ai:{key:'',model:'gemini-2.0-flash'},
  settings:{monarch:false,notif:false},
  proof:{runs:[],sets:[],timers:[],photos:[]},
  rankProgress:0, streak:0, lastActive:null
};
let state = load();

function load(){ try{return {...structuredClone(defaultState), ...(JSON.parse(localStorage.getItem(STORAGE)||'{}'))}}catch{return structuredClone(defaultState)} }
function save(){ localStorage.setItem(STORAGE, JSON.stringify(state)); }
function log(type, text){ state.logs.unshift({id:uid(),time:new Date().toLocaleString('id-ID'),type,text}); state.logs=state.logs.slice(0,80); save(); }
function transmission(title, body){ $('#modalTitle').textContent = title || '[SYSTEM TRANSMISSION]'; $('#modalBody').textContent = body; $('#modal').classList.remove('hidden'); }
function notify(title, body){ if(Notification?.permission==='granted'){ new Notification(title,{body,icon:'icons/icon-192.png'}); } }
function setTab(t){ tab=t; $$('.nav button').forEach(b=>b.classList.toggle('active', b.dataset.tab===t)); render(); }

$('#enterBtn').onclick=()=>{ $('#boot').classList.add('hidden'); $('#app').classList.remove('hidden'); firstNotice(); render(); };
$('#modalClose').onclick=()=>$('#modal').classList.add('hidden');
$$('.nav button').forEach(b=>b.onclick=()=>setTab(b.dataset.tab));
window.addEventListener('beforeinstallprompt', e=>{ e.preventDefault(); deferredPrompt=e; $('#installBtn').classList.remove('hidden'); });
$('#installBtn').onclick=async()=>{ if(deferredPrompt){deferredPrompt.prompt(); deferredPrompt=null; $('#installBtn').classList.add('hidden');} };
if('serviceWorker' in navigator){ navigator.serviceWorker.register('./sw.js').catch(()=>{}); }

function firstNotice(){
  const last=state.lastActive; state.lastActive=Date.now(); save();
  if(!state.setup){ transmission('[PHYSICAL SCAN REQUIRED]','Target badan belum ditentukan. System tidak dapat membuat protocol tanpa membaca kondisi awal tubuh.\n\nPerintah: mulai Physical Scan.'); return; }
  if(state.penalty?.active){ transmission('[PENALTY ZONE ACTIVE]','Kegagalan belum dibayar. Reward, Gate, dan Trial tetap dibatasi sampai Penalty Clear Condition terpenuhi.'); return; }
  if(state.dailyQuest?.status==='active') transmission('[SYSTEM NOTICE]',`Player kembali. Daily Quest masih aktif.\nSisa objective: ${remainingObjectives().length}.\nSelesaikan Current Order.`);
  else if(last && Date.now()-last>1000*60*60*18) transmission('[SYSTEM OBSERVATION]','Inaktivitas panjang terdeteksi. Jika pola ini berulang, estimasi target akan diperpanjang.');
}

function view(){ return $('#view'); }
function card(title, body='', cls=''){ return `<section class="card ${cls}"><h2 class="title">${title}</h2>${body}</section>`; }
function stat(k,v){ return `<div class="stat"><span class="muted">${k}</span><b>${v}</b></div>`; }
function progressBar(v){ return `<div class="bar"><span style="width:${clamp(v,0,100)}%"></span></div>`; }
function accessLocked(){ return !!state.penalty?.active; }

function render(){
  if(tab==='status') renderStatus();
  if(tab==='order') renderOrder();
  if(tab==='proof') renderProof();
  if(tab==='gate') renderGate();
  if(tab==='core') renderCore();
}

function renderStatus(){
  const p=state.player, s=state.stats;
  const route = state.protocol.route?.length ? state.protocol.route.map(r=>`<div class="objective"><div><b>${r.name}</b><div class="muted">${r.days} hari • ${r.status}</div></div><span class="badge ${r.status==='ACTIVE'?'gold':''}">${r.rank}</span></div>`).join('') : '<p class="muted">Route belum dibuat. Physical Scan wajib dilakukan.</p>';
  const locked = state.setup?'':'lock';
  view().innerHTML = `
  ${!state.setup ? renderScanForm() : ''}
  <section class="card ${locked}">
    <h2 class="title">[STATUS WINDOW]</h2>
    <div class="grid">
      ${stat('NAME', p.name || 'Player')}${stat('LEVEL', state.level)}${stat('RANK', state.rank)}${stat('CLASS', state.className)}${stat('TITLE', state.title)}${stat('XP', state.xp)}
    </div>
    <p class="muted">Rank Progress</p>${progressBar(state.rankProgress)}<p class="muted">${fmt(state.rankProgress)}% menuju Promotion Trial berikutnya.</p>
  </section>
  <section class="card">
    <h2 class="title">[PHYSICAL STATS]</h2>
    <div class="grid">${stat('Strength',s.strength)}${stat('Endurance',s.endurance)}${stat('Agility',s.agility)}${stat('Core',s.core)}${stat('Recovery',s.recovery)}${stat('Discipline',s.discipline)}${stat('Fatigue',s.fatigue+'%')}${stat('Streak',state.streak+' hari')}</div>
  </section>
  <section class="card">
    <h2 class="title">[BODY PROTOCOL]</h2>
    <p><b>Target:</b> ${state.goal}</p>
    <p><b>Phase:</b> ${state.protocol.phase}</p>
    <p><b>Estimasi menuju target:</b> ${state.protocol.estimateWeeks} minggu jika kepatuhan ≥ ${state.protocol.complianceReq}%.</p>
    <p class="muted">Estimasi dapat maju jika quest verified dan konsisten. Estimasi akan mundur jika failure berulang.</p>
    ${progressBar(Math.max(3, 100 - (state.protocol.estimateWeeks/52*100)))}
  </section>
  <section class="card"><h2 class="title">[RANK PATH]</h2>${route}<div class="objective"><div><b>S-RANK</b><div class="dangerText">ACCESS DENIED. Tubuh belum memenuhi minimum survival standard.</div></div><span class="badge red">LOCKED</span></div></section>
  <section class="card"><h2 class="title">[SYSTEM LOG]</h2><div class="log">${state.logs.length?state.logs.map(l=>`<div class="logitem"><b>${l.type}</b><div class="muted">${l.time}</div><div>${l.text}</div></div>`).join(''):'<p class="muted">Belum ada log.</p>'}</div></section>
  `;
  bindScan();
}

function renderScanForm(){
 return `<section class="card danger"><h2 class="title">[PHYSICAL SCAN REQUIRED]</h2><p class="muted">System belum memiliki data tubuh. Akses protocol dibatasi sampai scan selesai.</p>
 <div class="grid">
 <div><label>Nama Player</label><input id="name" placeholder="Contoh: Sevila"></div>
 <div><label>Umur</label><input id="age" type="number" placeholder="19"></div>
 <div><label>Tinggi badan (cm)</label><input id="height" type="number" placeholder="170"></div>
 <div><label>Berat badan (kg)</label><input id="weight" type="number" placeholder="55"></div>
 <div><label>Push-up maksimal</label><input id="pushup" type="number" placeholder="8"></div>
 <div><label>Squat maksimal</label><input id="squat" type="number" placeholder="35"></div>
 <div><label>Plank maksimal (detik)</label><input id="plank" type="number" placeholder="45"></div>
 <div><label>Waktu 1 km jalan/lari (menit)</label><input id="run" type="number" placeholder="10"></div>
 <div><label>Target Body Protocol</label><select id="goal"><option>Aesthetic Combat Build</option><option>Lean Fighter Protocol</option><option>Fat Loss Hunter Protocol</option><option>Endurance Hunter Protocol</option><option>S-Rank Body Path</option></select></div>
 <div><label>Alat latihan</label><select id="equipment"><option>tanpa alat</option><option>dumbbell</option><option>gym</option></select></div>
 </div>
 <label>Visual Body Scan Notes opsional</label><textarea id="visualNotes" placeholder="Contoh: badan kurus, perut agak maju, bahu sempit, dll."></textarea>
 <div class="actions"><button class="primary" id="completeScan">MULAI PHYSICAL SCAN</button></div></section>`;
}
function bindScan(){ const b=$('#completeScan'); if(!b)return; b.onclick=()=>{
  state.player={name:$('#name').value||'Player',age:$('#age').value,height:$('#height').value,weight:$('#weight').value,equipment:$('#equipment').value,activity:'rendah',sleep:6};
  state.scan={pushup:+$('#pushup').value||0,squat:+$('#squat').value||0,plank:+$('#plank').value||0,runKmTime:+$('#run').value||0,visualNotes:$('#visualNotes').value||''};
  state.goal=$('#goal').value; calculateVerdict(); state.setup=true; state.currentOrder={type:'daily',status:'required'}; log('SCAN','Physical Scan selesai. Protocol dan estimasi route dibuat.'); save();
  transmission('[SYSTEM VERDICT]',`Current Rank: ${state.rank}\nBody Protocol: ${state.goal}\nPrimary Weakness: ${weakness()}\nEstimasi target: ${state.protocol.estimateWeeks} minggu dengan kepatuhan minimal ${state.protocol.complianceReq}%.\n\nPerintah berikutnya: terima Daily Quest.`); render(); } }
function weakness(){ const a=[]; if(state.scan.pushup<12)a.push('upper body strength'); if(state.scan.plank<60)a.push('core stability'); if(state.scan.runKmTime>10||!state.scan.runKmTime)a.push('endurance'); return a.join(', ')||'discipline consistency'; }
function calculateVerdict(){
  const pu=state.scan.pushup, sq=state.scan.squat, pl=state.scan.plank, run=state.scan.runKmTime||12;
  const score = pu*1.4 + sq*.5 + pl*.18 + Math.max(0, 16-run)*2;
  state.rank = score>160?'C':score>105?'D':'E';
  state.stats.strength=clamp(Math.round(pu/3)+3,1,30); state.stats.endurance=clamp(Math.round((16-run)*1.2)+3,1,30); state.stats.core=clamp(Math.round(pl/15)+2,1,30); state.stats.discipline=2;
  let base = state.goal==='Fat Loss Hunter Protocol'?28: state.goal==='S-Rank Body Path'?52: state.goal==='Endurance Hunter Protocol'?24:20;
  if(score<70) base += 12; if(score>120) base-=6; state.protocol.estimateWeeks=clamp(base,8,72);
  state.protocol.phase='E-Rank Awakening'; state.protocol.route=[
    {rank:'E',name:'E-Rank Awakening',days:14,status:'ACTIVE'},
    {rank:'D',name:'D-Rank Foundation',days:30,status:'LOCKED'},
    {rank:'C',name:'C-Rank Body Formation',days:45,status:'LOCKED'},
    {rank:'B',name:'B-Rank Combat Conditioning',days:60,status:'LOCKED'},
    {rank:'A',name:'A-Rank Refinement',days:90,status:'LOCKED'}
  ];
}

function renderOrder(){
  if(!state.setup){ view().innerHTML=card('[ACCESS DENIED]','<p>Physical Scan belum selesai. Kembali ke STATUS dan lakukan scan.</p>','danger'); return; }
  if(state.penalty?.active){ renderPenalty(); return; }
  if(!state.dailyQuest || state.dailyQuest.date!==todayKey()) generateQuest(false);
  const q=state.dailyQuest;
  const objectives=q.objectives.map(o=>objectiveHtml(o)).join('');
  const clear = q.objectives.every(o=>o.progress>=o.target);
  view().innerHTML=`
  <section class="card"><h2 class="title">[CURRENT ORDER]</h2><p><b>Status:</b> ${q.status==='active'?'Daily Quest aktif': q.status==='cleared'?'Clear Condition terpenuhi':'Daily Quest tersedia'}</p><p class="muted">Deadline: 23:59. Failure akan memicu Penalty Zone.</p><div class="actions">${q.status==='new'?'<button id="acceptQuest" class="primary">TERIMA DAILY QUEST</button>':''}${q.status==='active'?'<button id="failQuest" class="dangerbtn">CATAT GAGAL / DEADLINE TERLEWAT</button>':''}${clear&&q.status!=='claimed'?'<button id="claimReward" class="primary">AMBIL REWARD</button>':''}</div></section>
  <section class="card"><h2 class="title">[DAILY QUEST HAS ARRIVED]</h2><p><b>Quest:</b> ${q.name}</p><p><b>Protocol:</b> ${state.goal}</p><p><b>Reward:</b> ${q.reward}</p><p><b>Failure:</b> Penalty Zone</p>${objectives}</section>
  <section class="card"><h2 class="title">[PROOF LEVEL]</h2><p>Manual claim memberi reward terbatas. Verified proof memberi reward penuh. System Verified memberi bonus.</p><div>${proofBadge(q.proofLevel)}</div></section>`;
  bindOrder();
}
function objectiveHtml(o){ const pct = o.target?clamp(o.progress/o.target*100,0,100):0; return `<div class="objective ${pct>=100?'done':''}"><div><b>${o.label}</b><div class="muted">${o.progress} / ${o.target} ${o.unit} • ${o.verify}</div>${progressBar(pct)}</div><div><button class="secondary small" data-inc="${o.id}">+ RECORD</button></div></div>`; }
function proofBadge(level){ return `<span class="badge ${level==='System Verified'?'gold':''}">${level||'Unverified'}</span>`; }
function bindOrder(){
  $('#acceptQuest')?.addEventListener('click',()=>{state.dailyQuest.status='active'; state.currentOrder={type:'daily',status:'active'}; log('ORDER','Daily Quest diterima. Current Order aktif.'); save(); transmission('[COMMAND ACCEPTED]','Daily Quest aktif. Selesaikan objective sebelum 23:59. Refusal tidak dikenali.'); render();});
  $('#claimReward')?.addEventListener('click',()=>claimReward());
  $('#failQuest')?.addEventListener('click',()=>activatePenalty('Daily Quest tidak diselesaikan.'));
  $$('[data-inc]').forEach(btn=>btn.onclick=()=>recordObjective(btn.dataset.inc));
}
function generateQuest(silent=true){
  const pu=Math.max(8, Math.round((state.scan.pushup||8)*0.65)); const sq=Math.max(20, Math.round((state.scan.squat||30)*0.75)); const plank=Math.max(45, Math.round((state.scan.plank||45)*1.2));
  let run= state.goal==='Fat Loss Hunter Protocol'||state.goal==='Endurance Hunter Protocol'?2.5:1.5;
  if(state.goal==='Lean Fighter Protocol') run=1.2; if(state.settings.monarch){ run+=0.5; }
  state.dailyQuest={id:uid(),date:todayKey(),status:'new',name:questName(),reward:'Hidden until Clear Condition',proofLevel:'Unverified',objectives:[
    {id:'pushup',label:'Push-up',target:pu,progress:0,unit:'reps',verify:'Set Recorder'},
    {id:'squat',label:'Squat',target:sq,progress:0,unit:'reps',verify:'Set Recorder'},
    {id:'plank',label:'Plank',target:plank,progress:0,unit:'detik',verify:'Timer'},
    {id:'run',label:'Walk/Run',target:run,progress:0,unit:'km',verify:'GPS Tracker'},
    {id:'stretch',label:'Stretching',target:8,progress:0,unit:'menit',verify:'Timer'}
  ]}; save(); if(!silent) transmission('[DAILY QUEST HAS ARRIVED]',`Quest Name: ${state.dailyQuest.name}\nProtocol: ${state.goal}\nClear Condition: selesaikan seluruh objective.\nFailure: Penalty Zone.`);
}
function questName(){ const opts=['Weakness Correction','Training to Become Stronger','Physical Adaptation','E-Rank Body Protocol','Survival Conditioning']; return opts[Math.floor(Math.random()*opts.length)]; }
function recordObjective(id){ const o=state.dailyQuest.objectives.find(x=>x.id===id); if(!o)return; let add=0; if(id==='pushup'||id==='squat'){ add=+(prompt(`Masukkan jumlah ${o.label} yang selesai:`, id==='pushup'?10:20)||0); state.proof.sets.unshift({time:new Date().toLocaleString('id-ID'),type:id,reps:add}); }
  else if(id==='plank'||id==='stretch'){ setTab('proof'); setTimeout(()=>startTimerFor(id),100); return; }
  else if(id==='run'){ setTab('proof'); setTimeout(()=>transmission('[RUN TRACKER REQUIRED]','Gunakan GPS Tracker di tab PROOF untuk memverifikasi objective Walk/Run.'),50); return; }
  o.progress=clamp(o.progress+add,0,o.target); updateProofLevel(); save(); render(); }
function updateProofLevel(){ const q=state.dailyQuest; if(!q)return; const runOk=q.objectives.find(o=>o.id==='run')?.progress>=q.objectives.find(o=>o.id==='run')?.target; const timerOk=q.objectives.find(o=>o.id==='plank')?.progress>=q.objectives.find(o=>o.id==='plank')?.target; const setOk=q.objectives.find(o=>o.id==='pushup')?.progress>0 && q.objectives.find(o=>o.id==='squat')?.progress>0; q.proofLevel = runOk&&timerOk&&setOk?'System Verified':(timerOk||runOk||setOk?'Verified':'Unverified'); }
function claimReward(){ const q=state.dailyQuest; const multiplier=q.proofLevel==='System Verified'?1.25:q.proofLevel==='Verified'?1:.55; const xp=Math.round(120*multiplier); state.xp+=xp; while(state.xp>=250){state.xp-=250;state.level++;}
  state.rankProgress=clamp(state.rankProgress+(q.proofLevel==='System Verified'?4:2.2),0,100); state.streak++; state.stats.discipline=clamp(state.stats.discipline+1,1,99); state.stats.strength=clamp(state.stats.strength+1,1,99); if(q.objectives.find(o=>o.id==='run')?.progress>0) state.stats.endurance=clamp(state.stats.endurance+1,1,99);
  if(q.proofLevel==='System Verified') state.protocol.estimateWeeks=clamp(state.protocol.estimateWeeks-1,4,80);
  q.status='claimed'; state.history.unshift({date:todayKey(),proof:q.proofLevel,xp}); state.currentOrder={type:'none',status:'complete'}; log('REWARD',`Daily Quest clear. ${q.proofLevel}. EXP +${xp}.`); save(); transmission('[REWARD ACQUIRED]',`EXP +${xp}\nProof Level: ${q.proofLevel}\nStrength Adaptation increased.\nRank Progress updated.\nEstimasi target ${q.proofLevel==='System Verified'?'berkurang 1 minggu.':'tetap dipantau.'}`); render(); }
function remainingObjectives(){ return state.dailyQuest?.objectives?.filter(o=>o.progress<o.target)||[]; }
function activatePenalty(reason){ state.penalty={active:true,reason,objectives:[{id:'prun',label:'Walk/Run Penalty',target:1.5,progress:0,unit:'km',verify:'GPS Tracker'},{id:'psquat',label:'Squat Penalty',target:50,progress:0,unit:'reps',verify:'Set Recorder'},{id:'pstretch',label:'Recovery Stretching',target:8,progress:0,unit:'menit',verify:'Timer'}]}; state.failures.unshift({date:todayKey(),reason}); state.streak=0; state.rankProgress=clamp(state.rankProgress-5,0,100); state.protocol.estimateWeeks=clamp(state.protocol.estimateWeeks+2,4,90); log('FAILURE',reason); save(); transmission('[PENALTY ZONE ACTIVATED]',`Reason: ${reason}\nReward locked. Gate access denied. Trial unavailable.\nEstimasi target diperpanjang 2 minggu.`); render(); }

function renderPenalty(){ const p=state.penalty; const objectives=p.objectives.map(o=>`<div class="objective ${o.progress>=o.target?'done':''}"><div><b>${o.label}</b><div class="muted">${o.progress} / ${o.target} ${o.unit} • ${o.verify}</div>${progressBar(o.progress/o.target*100)}</div><button class="secondary small" data-pinc="${o.id}">+ RECORD</button></div>`).join(''); const clear=p.objectives.every(o=>o.progress>=o.target);
 view().innerHTML=`<section class="card danger"><h2 class="title">[PENALTY ZONE]</h2><p>Escape tidak tersedia di dalam System.</p><p><b>Cause:</b> ${p.reason}</p><p class="dangerText">Reward, Gate, Trial, dan Rank Promotion dibekukan sampai penalty selesai.</p>${objectives}<div class="actions">${clear?'<button id="clearPenalty" class="primary">CLEAR PENALTY</button>':''}</div></section>`;
 $$('[data-pinc]').forEach(btn=>btn.onclick=()=>recordPenalty(btn.dataset.pinc)); $('#clearPenalty')?.addEventListener('click',()=>{state.penalty.active=false; log('PENALTY','Penalty Zone clear. System access restored.'); save(); transmission('[PENALTY CLEARED]','System access restored. Kegagalan tetap tercatat.'); render();}); }
function recordPenalty(id){ const o=state.penalty.objectives.find(x=>x.id===id); if(!o)return; if(id==='prun'){ setTab('proof'); transmission('[PENALTY TRACKING REQUIRED]','Gunakan GPS Tracker untuk menyelesaikan Walk/Run Penalty. Setelah jarak tercapai, progress penalty akan tercatat.'); return; } let add=+(prompt(`Masukkan progress ${o.label}:`, id==='psquat'?20:5)||0); o.progress=clamp(o.progress+add,0,o.target); save(); render(); }

function renderProof(){ const q=state.dailyQuest; const runObj=q?.objectives?.find(o=>o.id==='run'); const penaltyRun=state.penalty?.objectives?.find(o=>o.id==='prun');
 view().innerHTML=`
 <section class="card"><h2 class="title">[VERIFICATION SYSTEM]</h2><p>System tidak menerima klaim kosong. Proof menentukan reward.</p><div>${proofBadge(q?.proofLevel||'Unverified')} <span class="badge">GPS</span> <span class="badge">TIMER</span> <span class="badge">SET RECORDER</span></div></section>
 <section class="card"><h2 class="title">[RUN TRACKER — GPS]</h2><div class="tracker grid"><div class="stat"><span>Distance</span><b id="dist">${fmt(runState.distance)} km</b></div><div class="stat"><span>Time</span><b id="rtime">00:00</b></div><div class="stat"><span>Pace</span><b id="pace">--</b></div><div class="stat"><span>Target</span><b>${runObj?runObj.target:'-'} km</b></div></div><div class="mapbox" id="mapbox">GPS route akan direkam. PWA dapat kurang stabil jika layar mati terlalu lama.</div><div class="actions"><button id="startRun" class="primary">START GPS TRACKING</button><button id="stopRun" class="secondary">STOP & VERIFY</button></div></section>
 <section class="card"><h2 class="title">[WORKOUT TIMER]</h2><div class="big-number" id="timerDisplay">${formatSec(timerState.remaining)}</div><p class="muted">Untuk plank, stretching, recovery, dan penalty timer.</p><div class="actions"><button id="plankTimer" class="primary">START PLANK TIMER</button><button id="stretchTimer" class="secondary">START STRETCHING TIMER</button><button id="stopTimer" class="ghost">STOP TIMER</button></div></section>
 <section class="card"><h2 class="title">[SET RECORDER]</h2><p class="muted">Catat set push-up/squat. Untuk versi PWA, ini masih manual. Versi native nanti bisa naik ke camera pose detection.</p><div class="actions"><button id="recPush" class="secondary">RECORD PUSH-UP SET</button><button id="recSquat" class="secondary">RECORD SQUAT SET</button></div></section>
 <section class="card"><h2 class="title">[PROOF HISTORY]</h2><div class="log">${state.proof.runs.slice(0,8).map(r=>`<div class="logitem"><b>RUN VERIFIED</b><div class="muted">${r.time}</div><div>${r.distance} km • ${r.duration}</div></div>`).join('') || '<p class="muted">Belum ada proof.</p>'}</div></section>`;
 bindProof(); }
function bindProof(){ $('#startRun').onclick=startRun; $('#stopRun').onclick=stopRun; $('#plankTimer').onclick=()=>startTimerFor('plank'); $('#stretchTimer').onclick=()=>startTimerFor('stretch'); $('#stopTimer').onclick=stopTimer; $('#recPush').onclick=()=>recordObjective('pushup'); $('#recSquat').onclick=()=>recordObjective('squat'); }
function startRun(){ if(!navigator.geolocation){transmission('[GPS UNAVAILABLE]','Perangkat/browser tidak mendukung geolocation.');return;} runState={active:true,start:Date.now(),last:null,distance:0,points:[]}; updateRunUI(); watchId=navigator.geolocation.watchPosition(pos=>{ const {latitude,longitude,accuracy}=pos.coords; if(accuracy>80){ $('#mapbox').textContent='GPS accuracy lemah. Pindah ke area terbuka.'; }
  const p={lat:latitude,lon:longitude,t:Date.now(),acc:accuracy}; if(runState.last){ const d=haversine(runState.last,p); if(d<0.35) runState.distance+=d; }
  runState.last=p; runState.points.push(p); updateRunUI(); }, err=>transmission('[GPS ERROR]',err.message), {enableHighAccuracy:true,maximumAge:1000,timeout:10000}); transmission('[RUNNING QUEST STARTED]','GPS Tracking aktif. Jangan matikan layar terlalu lama. Clear Condition akan diverifikasi dari jarak real-time.'); }
function stopRun(){ if(watchId!==null) navigator.geolocation.clearWatch(watchId); watchId=null; if(!runState.active){return} const durationSec=Math.round((Date.now()-runState.start)/1000); const dist=+fmt(runState.distance); runState.active=false; const rec={time:new Date().toLocaleString('id-ID'),distance:dist,duration:formatSec(durationSec),points:runState.points.length}; state.proof.runs.unshift(rec);
  // apply to daily or penalty
  const qRun=state.dailyQuest?.objectives?.find(o=>o.id==='run'); if(qRun) qRun.progress=clamp(qRun.progress+dist,0,qRun.target);
  const pRun=state.penalty?.objectives?.find(o=>o.id==='prun'); if(state.penalty?.active && pRun) pRun.progress=clamp(pRun.progress+dist,0,pRun.target);
  updateProofLevel(); log('PROOF',`Run verified: ${dist} km.`); save(); transmission('[SYSTEM VERIFICATION COMPLETE]',`Distance verified: ${dist} km\nDuration: ${formatSec(durationSec)}\nMovement pattern accepted.\nProof recorded.`); render(); }
function updateRunUI(){ const d=$('#dist'), t=$('#rtime'), p=$('#pace'), m=$('#mapbox'); if(!d)return; d.textContent=fmt(runState.distance)+' km'; const sec=runState.start?Math.round((Date.now()-runState.start)/1000):0; t.textContent=formatSec(sec); const paceVal=runState.distance>0.03?sec/60/runState.distance:0; p.textContent=paceVal?paceVal.toFixed(1)+'/km':'--'; m.textContent=runState.points.length?`GPS points recorded: ${runState.points.length}`:'Menunggu sinyal GPS...'; if(runState.active) requestAnimationFrame(updateRunUI); }
function haversine(a,b){ const R=6371; const dLat=(b.lat-a.lat)*Math.PI/180, dLon=(b.lon-a.lon)*Math.PI/180; const la1=a.lat*Math.PI/180, la2=b.lat*Math.PI/180; const h=Math.sin(dLat/2)**2+Math.cos(la1)*Math.cos(la2)*Math.sin(dLon/2)**2; return 2*R*Math.asin(Math.sqrt(h)); }
function formatSec(sec){ sec=Math.max(0,Math.round(sec||0)); const m=Math.floor(sec/60), s=sec%60; return String(m).padStart(2,'0')+':'+String(s).padStart(2,'0'); }
function startTimerFor(type){ const q=state.dailyQuest; const obj=q?.objectives?.find(o=>o.id===type); const pObj=state.penalty?.objectives?.find(o=> type==='stretch' && o.id==='pstretch'); let target= type==='plank'?(obj?.target||60):(obj?.target||pObj?.target||8)*60; if(type==='stretch' && obj) target=Math.max(60,(obj.target-obj.progress)*60); if(type==='plank' && obj) target=Math.max(20,obj.target-obj.progress); timerState={active:true,type,remaining:target,total:target,objectiveId:type}; clearInterval(timerId); timerId=setInterval(()=>{ timerState.remaining--; const el=$('#timerDisplay'); if(el)el.textContent=formatSec(timerState.remaining); if(timerState.remaining<=0) completeTimer(); },1000); transmission('[TIMER STARTED]',`${type.toUpperCase()} Timer aktif. Jangan keluar sebelum clear condition selesai.`); renderProof(); }
function completeTimer(){ clearInterval(timerId); timerId=null; const done=timerState.total; const type=timerState.type; timerState.active=false; const qObj=state.dailyQuest?.objectives?.find(o=>o.id===type); if(qObj){ qObj.progress=clamp(qObj.progress+done,0,qObj.target); }
  const pObj=state.penalty?.objectives?.find(o=> type==='stretch' && o.id==='pstretch'); if(pObj){ pObj.progress=clamp(pObj.progress+Math.round(done/60),0,pObj.target); }
  state.proof.timers.unshift({time:new Date().toLocaleString('id-ID'),type,duration:formatSec(done)}); updateProofLevel(); save(); transmission('[TIMER VERIFIED]',`${type.toUpperCase()} clear condition terpenuhi. Proof recorded.`); render(); }
function stopTimer(){ clearInterval(timerId); timerId=null; timerState.active=false; transmission('[TIMER STOPPED]','Timer dihentikan sebelum clear condition. Reward tidak diberikan untuk objective ini.'); renderProof(); }

function renderGate(){ const locked=accessLocked(); view().innerHTML=`<section class="card ${locked?'danger':''}"><h2 class="title">[GATE ACCESS]</h2>${locked?'<p class="dangerText">ACCESS DENIED. Penalty Zone masih aktif.</p>':'<p>Gate terbuka jika Current Order stabil. Gate memberi EXP tambahan dan peluang Hidden Quest.</p>'}<div class="grid"><div class="stat"><span>Strength Gate</span><b>${locked?'LOCKED':'E'}</b></div><div class="stat"><span>Core Gate</span><b>${locked?'LOCKED':'E'}</b></div><div class="stat"><span>Endurance Gate</span><b>${locked?'LOCKED':'E'}</b></div><div class="stat"><span>Promotion Trial</span><b>${state.rankProgress>=100?'AVAILABLE':'LOCKED'}</b></div></div><div class="actions"><button id="openGate" class="primary">ENTER GATE</button><button id="classQuest" class="secondary">CLASS CHANGE SCAN</button><button id="monarch" class="dangerbtn">${state.settings.monarch?'NONAKTIFKAN':'AKTIFKAN'} MONARCH MODE</button></div></section>`;
 $('#openGate').onclick=()=> locked?transmission('[ACCESS DENIED]','Penalty belum selesai. Gate tidak dapat dibuka.'):transmission('[GATE HAS OPENED]','Type: Strength Gate\nDifficulty: E-Rank\nClear Condition: selesaikan protocol tambahan di Daily Quest.\nReward: Hidden.');
 $('#classQuest').onclick=()=>transmission('[CLASS CHANGE QUEST]', state.level<7?'Minimum level belum terpenuhi. Continue current protocol.':'Class scan tersedia. System akan menentukan class berdasarkan pola latihan, bukan pilihan bebas.');
 $('#monarch').onclick=()=>{state.settings.monarch=!state.settings.monarch; save(); transmission('[MONARCH MODE]', state.settings.monarch?'Monarch Mode aktif. Failure limit menurun. Reward meningkat. Escape tidak diakui.':'Monarch Mode dinonaktifkan.'); render();}; }

function renderCore(){ view().innerHTML=`<section class="card"><h2 class="title">[SYSTEM CORE]</h2><p class="muted">AI bukan coach. AI adalah kesadaran System. Rule Engine tetap menjadi hukum.</p><label>Gemini API Key</label><input id="apiKey" value="${state.ai.key||''}" placeholder="AIza..."><label>Model</label><input id="model" value="${state.ai.model||'gemini-2.0-flash'}"><div class="actions"><button id="saveAI" class="secondary">SIMPAN CORE KEY</button><button id="dailyAI" class="primary">RECEIVE COMMAND</button><button id="judgeAI" class="secondary">REQUEST JUDGEMENT</button><button id="hiddenAI" class="secondary">HIDDEN QUEST SCAN</button><button id="routeAI" class="secondary">ROUTE RECALCULATION</button><button id="notif" class="ghost">AKTIFKAN NOTIFIKASI</button></div></section><section class="card"><h2 class="title">[FAILURE LOG]</h2><div class="log">${state.failures.length?state.failures.map(f=>`<div class="logitem"><b>FAILURE RECORDED</b><div class="muted">${f.date}</div><div>${f.reason}</div></div>`).join(''):'<p class="muted">Belum ada failure.</p>'}</div></section>`;
 bindCore(); }
function bindCore(){ $('#saveAI').onclick=()=>{state.ai.key=$('#apiKey').value.trim(); state.ai.model=$('#model').value.trim()||'gemini-2.0-flash'; save(); transmission('[CORE KEY STORED]','Gemini key tersimpan lokal di perangkat/browser ini. Jangan membagikan key kepada orang lain.');};
 $('#dailyAI').onclick=()=>callAI('daily'); $('#judgeAI').onclick=()=>callAI('judgement'); $('#hiddenAI').onclick=()=>callAI('hidden'); $('#routeAI').onclick=()=>callAI('route'); $('#notif').onclick=requestNotif; }
async function callAI(mode){ if(!state.ai.key){transmission('[CORE OFFLINE]','Gemini API key belum dimasukkan.');return;} const data={player:state.player,goal:state.goal,rank:state.rank,level:state.level,stats:state.stats,scan:state.scan,protocol:state.protocol,dailyQuest:state.dailyQuest,penalty:state.penalty,proofLevel:state.dailyQuest?.proofLevel,history:state.history.slice(0,7),failures:state.failures.slice(0,5),mode};
 const systemPrompt=`Kamu adalah SYSTEM CORE untuk aplikasi body protocol yang terinspirasi rasa otoriter game leveling. Jangan menjadi coach ramah. Gunakan bahasa Indonesia tegas, dingin, singkat, dengan label seperti [SYSTEM COMMAND], [JUDGEMENT], [HIDDEN QUEST]. Jangan menyuruh hal berbahaya: tidak boleh latihan saat cedera/sakit, tidak boleh ekstrem melebihi kapasitas, tidak boleh menghina user. Tetap otoriter: perintah, clear condition, reward, penalty, verdict. Mode: ${mode}. Data player: ${JSON.stringify(data)}. Berikan output yang terasa seperti System hidup, bukan tips biasa.`;
 try{ transmission('[SYSTEM CORE]','Menghubungi System Core...'); const res=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(state.ai.model)}:generateContent?key=${encodeURIComponent(state.ai.key)}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({contents:[{parts:[{text:systemPrompt}]}],generationConfig:{temperature:.75,maxOutputTokens:650}})}); const j=await res.json(); if(!res.ok) throw new Error(j.error?.message||'AI error'); const text=j.candidates?.[0]?.content?.parts?.map(p=>p.text).join('\n')||'Tidak ada output.'; log('CORE',`AI ${mode} transmission received.`); transmission('[SYSTEM TRANSMISSION]',text); }
 catch(e){ transmission('[CORE ERROR]',e.message); } }
async function requestNotif(){ if(!('Notification' in window)){transmission('[NOTIFICATION UNAVAILABLE]','Browser tidak mendukung notifikasi.');return;} const perm=await Notification.requestPermission(); state.settings.notif=perm==='granted'; save(); if(perm==='granted'){ notify('[SYSTEM ONLINE]','Notification module aktif. Daily Quest akan mengirim warning.'); transmission('[NOTIFICATION MODULE ACTIVE]','Izin notifikasi diberikan. Untuk pengalaman terbaik, install PWA ke layar utama.'); } else transmission('[NOTIFICATION DENIED]','Izin notifikasi ditolak. System tidak dapat mengirim warning luar aplikasi.'); }

// deadline watcher
setInterval(()=>{ if(state.dailyQuest?.status==='active'){ const h=new Date().getHours(); if(h>=21 && !state._warnedToday){ state._warnedToday=todayKey(); save(); notify('[SYSTEM WARNING]','Daily Quest belum selesai. Failure akan memicu Penalty Zone.'); } if(h===23 && now().getMinutes()>=59){ activatePenalty('Deadline 23:59 terlewat.'); } } },60000);

render();
