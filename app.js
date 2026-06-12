const STORE_KEY = 'system_v11_stable_state';
const MODEL_DEFAULT = 'gemini-2.5-flash';
const $ = (q)=>document.querySelector(q);
const view = $('#view');
const modal = $('#modal');
const modalBody = $('#modalBody');
const tabTitles = {status:'STATUS WINDOW',order:'CURRENT ORDER',proof:'PROOF SYSTEM',core:'SYSTEM CORE',report:'ADAPTATION REPORT'};

const todayKey = () => new Date().toISOString().slice(0,10);
const endOfDay = () => { const d=new Date(); d.setHours(23,59,59,999); return d; };
const startOfTomorrow = () => { const d=new Date(); d.setDate(d.getDate()+1); d.setHours(0,0,0,0); return d; };
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const pct=(a,b)=> b? Math.round((a/b)*100) : 0;

const initialState = {
  booted:false,
  tab:'status',
  apiKey:'', model: MODEL_DEFAULT,
  profile:null,
  bodyScan:null,
  goal:null,
  rank:'E', level:1, xp:0, title:'Unawakened Player', className:'NONE',
  stats:{strength:1,endurance:1,core:1,discipline:1,recovery:1},
  route:null,
  quest:null,
  penalty:null,
  proof:{run:null,timer:null,sets:{}},
  fatigue:{sleep:7,energy:5,pain:'none'},
  logs:[], transmissions:[], report:null,
  lastCycleDate:null
};
let state = load();
let runWatchId=null, runTimer=null, timerInterval=null;

function load(){ try{ return {...structuredClone(initialState), ...(JSON.parse(localStorage.getItem(STORE_KEY)||'{}'))}; }catch{return structuredClone(initialState)} }
function save(){ localStorage.setItem(STORE_KEY, JSON.stringify(state)); }
function tx(text){ state.transmissions.unshift({time:new Date().toLocaleString('id-ID'), text}); state.transmissions=state.transmissions.slice(0,25); save(); showModal(text); }
function showModal(text){ modalBody.innerHTML = renderText(text); modal.classList.remove('hidden'); }
function renderText(t=''){ return String(t).replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\*\*(.*?)\*\*/g,'<b>$1</b>').replace(/\[(.*?)\]/g,'<span class="transmission-title">[$1]</span>'); }
function setTab(tab){ state.tab=tab; save(); document.querySelectorAll('.nav-btn').forEach(b=>b.classList.toggle('active',b.dataset.tab===tab)); $('#topTitle').textContent=tabTitles[tab]||'SYSTEM'; render(); }

function init(){
  $('#bootBtn').onclick=()=>{ state.booted=true; save(); $('#boot').classList.add('hidden'); render(); };
  $('#modalClose').onclick=()=>modal.classList.add('hidden');
  $('#resetBtn').onclick=()=>{ if(confirm('Reset semua data SYSTEM?')){ localStorage.removeItem(STORE_KEY); location.reload(); }};
  document.querySelectorAll('.nav-btn').forEach(b=>b.onclick=()=>setTab(b.dataset.tab));
  if(state.booted) $('#boot').classList.add('hidden');
  cycleCheck(); render(); setInterval(()=>{ cycleCheck(); updateCountdowns(); },1000);
  if('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(()=>{});
}

function cycleCheck(){
  const tk=todayKey();
  if(state.profile && state.bodyScan && state.goal){
    if(state.lastCycleDate!==tk){
      if(state.quest && state.quest.status==='active') failQuest('Siklus harian berakhir sebelum clear condition terpenuhi.');
      state.lastCycleDate=tk;
      state.quest = makeQuest();
      state.penalty = null;
      state.proof={run:null,timer:null,sets:{}};
      save();
      if(state.booted) state.transmissions.unshift({time:new Date().toLocaleString('id-ID'), text:'[DAILY QUEST HAS ARRIVED]\nQuest harian baru dibuat otomatis untuk siklus 00:00–23:59.'});
    }
    if(state.quest?.status==='active' && new Date()>endOfDay()) failQuest('Batas waktu 23:59 terlewati.');
  }
}

function makeQuest(){
  const goal=state.goal?.id||'aesthetic';
  const scan=state.bodyScan||{};
  const pushBase = clamp(Math.round((Number(scan.pushup)||8)*0.7), 8, 80);
  const squatBase = clamp(Math.round((Number(scan.squat)||20)*0.9), 15, 120);
  const sitBase = clamp(Math.round((Number(scan.situp)||15)*0.8), 12, 100);
  const plankBase = clamp(Math.round((Number(scan.plank)||45)*0.85), 30, 360);
  const runBase = goal==='fatloss'?2.5:goal==='endurance'?3.0:1.5;
  const obj = [
    {id:'pushup',name:'Push-up',type:'sets',unit:'reps',target:pushBase,done:0,required:true},
    {id:'squat',name:'Squat',type:'sets',unit:'reps',target:squatBase,done:0,required:true},
    {id:'situp',name:'Sit-up / Crunch',type:'sets',unit:'reps',target:sitBase,done:0,required:true},
    {id:'plank',name:'Plank',type:'timer',unit:'detik',target:plankBase,done:0,required:true},
    {id:'run',name:'Walk/Run',type:'gps',unit:'km',target:runBase,done:0,required:true},
    {id:'stretch',name:'Stretching / Mobility',type:'timer',unit:'menit',target:8,done:0,required:true},
    {id:'protein',name:'Protein Quest',type:'manual',unit:'porsi',target:2,done:0,required:true},
    {id:'water',name:'Water Quest',type:'manual',unit:'liter',target:2,done:0,required:true},
    {id:'sleep',name:'Sleep Target',type:'manual',unit:'jam',target:7,done:0,required:false}
  ];
  return {date:todayKey(), status:'active', accepted:false, source:'rule+ai-guard', objectives:obj, createdAt:Date.now(), deadline:endOfDay().toISOString(), rewardClaimed:false};
}

function completion(){ if(!state.quest) return 0; return Math.round(state.quest.objectives.reduce((s,o)=>s+clamp(o.done/o.target,0,1),0)/state.quest.objectives.length*100); }
function allClear(){ return state.quest && state.quest.objectives.filter(o=>o.required).every(o=>o.done>=o.target); }
function updateObj(id,val,add=false){ const o=state.quest?.objectives.find(x=>x.id===id); if(!o) return; o.done=clamp(add?o.done+Number(val):Number(val),0,o.target); if(allClear()) state.quest.status='cleared'; save(); render(); }
function claimReward(){ if(!state.quest||state.quest.status!=='cleared') return; const verified = proofLevel(); const mult = verified==='SYSTEM VERIFIED'?1.35:verified==='VERIFIED'?1:0.55; const gain=Math.round(120*mult); state.xp+=gain; while(state.xp>=300){ state.xp-=300; state.level++; } state.stats.strength+=1; state.stats.core+=1; state.stats.discipline+= verified==='UNVERIFIED'?0:1; state.quest.status='completed'; state.quest.rewardClaimed=true; state.logs.unshift({date:new Date().toLocaleString('id-ID'),type:'REWARD',msg:`Daily Quest selesai. Reward ${gain} EXP. Proof: ${verified}`}); updateRoute(-1); save(); tx(`[REWARD ACQUIRED]\nDaily Quest selesai.\nEXP +${gain}\nProof Level: ${verified}\nEstimasi target diperbarui.\n\n[SYSTEM STANDBY]\nQuest utama hari ini selesai. Next Daily Quest akan muncul otomatis pada 00:00.`); render(); }
function failQuest(reason){ if(!state.quest) return; state.quest.status='failed'; state.penalty={active:true, reason, objectives:[{id:'p_run',name:'Penalty Walk/Run',type:'gps',unit:'km',target:1.2,done:0},{id:'p_squat',name:'Penalty Squat',type:'sets',unit:'reps',target:40,done:0},{id:'p_plank',name:'Penalty Plank',type:'timer',unit:'detik',target:90,done:0}]}; state.logs.unshift({date:new Date().toLocaleString('id-ID'),type:'FAILURE',msg:reason}); updateRoute(3); save(); tx(`[PENALTY ZONE ACTIVATED]\n${reason}\nReward dikunci. Rank progress dibekukan sampai penalty clear.`); render(); }
function clearPenalty(){ if(!state.penalty) return; const ok=state.penalty.objectives.every(o=>o.done>=o.target); if(!ok) return tx('[ACCESS DENIED]\nPenalty objective belum selesai.'); state.penalty.active=false; state.logs.unshift({date:new Date().toLocaleString('id-ID'),type:'PENALTY CLEAR',msg:'Penalty Zone diselesaikan.'}); save(); tx('[PENALTY CLEARED]\nAkses System dipulihkan. Siklus berikutnya tetap berjalan otomatis.'); render(); }
function proofLevel(){ if(!state.quest) return 'UNVERIFIED'; const run=state.quest.objectives.find(o=>o.id==='run')?.done||0; const runTarget=state.quest.objectives.find(o=>o.id==='run')?.target||1; const hasRun=run>=runTarget && state.proof.run?.points?.length>=2; const hasTimer=(state.quest.objectives.find(o=>o.id==='plank')?.done||0)>0; const sets=Object.values(state.proof.sets||{}).flat().length>=3; if(hasRun&&hasTimer&&sets) return 'SYSTEM VERIFIED'; if(hasRun||hasTimer||sets) return 'VERIFIED'; return 'UNVERIFIED'; }
function updateRoute(deltaDays){ if(!state.route) return; state.route.etaDays=clamp((state.route.etaDays||84)+deltaDays,14,720); }

function render(){
  $('.nav-btn.active')?.classList.remove('active'); document.querySelector(`[data-tab="${state.tab}"]`)?.classList.add('active'); $('#topTitle').textContent=tabTitles[state.tab]||'SYSTEM';
  if(!state.profile || !state.bodyScan || !state.goal){ renderOnboarding(); return; }
  if(state.tab==='status') return renderStatus();
  if(state.tab==='order') return renderOrder();
  if(state.tab==='proof') return renderProof();
  if(state.tab==='core') return renderCore();
  if(state.tab==='report') return renderReport();
}

function renderOnboarding(){
  view.innerHTML=`<div class="card gold"><p class="eyebrow">PHYSICAL SCAN REQUIRED</p><h3>System belum bisa memberi perintah.</h3><p class="muted">Masukkan nama, kondisi tubuh, kemampuan awal, dan target badan. Setelah itu Daily Quest akan dibuat otomatis setiap hari.</p></div>
  <form id="scanForm" class="card stack">
    <h3>Awakening Scan</h3>
    <div class="form-grid">
      <div><label>Nama Player</label><input name="name" value="${state.profile?.name||''}" placeholder="Nama kamu" required></div>
      <div><label>Usia</label><input name="age" type="number" value="${state.bodyScan?.age||''}" required></div>
      <div><label>Tinggi (cm)</label><input name="height" type="number" value="${state.bodyScan?.height||''}" required></div>
      <div><label>Berat (kg)</label><input name="weight" type="number" value="${state.bodyScan?.weight||''}" required></div>
      <div><label>Push-up max</label><input name="pushup" type="number" value="${state.bodyScan?.pushup||''}" required></div>
      <div><label>Squat max</label><input name="squat" type="number" value="${state.bodyScan?.squat||''}" required></div>
      <div><label>Sit-up/Crunch max</label><input name="situp" type="number" value="${state.bodyScan?.situp||''}" required></div>
      <div><label>Plank max (detik)</label><input name="plank" type="number" value="${state.bodyScan?.plank||''}" required></div>
      <div class="full"><label>Target Body Protocol</label><select name="goal"><option value="aesthetic">Aesthetic Combat Build</option><option value="lean">Lean Fighter Protocol</option><option value="fatloss">Fat Loss Hunter Protocol</option><option value="endurance">Endurance Hunter Protocol</option><option value="srank">S-Rank Body Path</option></select></div>
    </div>
    <button class="primary">AKTIFKAN SYSTEM</button>
  </form>`;
  $('#scanForm').onsubmit=(e)=>{e.preventDefault(); const fd=new FormData(e.currentTarget); state.profile={name:fd.get('name')}; state.bodyScan=Object.fromEntries(fd.entries()); state.goal=goalData(fd.get('goal')); state.route=makeRoute(fd.get('goal')); state.rank='E'; state.title='Weak Hunter'; state.lastCycleDate=null; save(); cycleCheck(); tx(`[SYSTEM VERDICT]\nPlayer: ${state.profile.name}\nRank awal: E\nTarget: ${state.goal.name}\nEstimasi menuju bentuk target awal: ${state.route.etaDays} hari jika kepatuhan di atas 85%.\n\nDaily Quest akan dibuat otomatis.`); setTab('order'); };
}
function goalData(id){ const map={aesthetic:'Aesthetic Combat Build',lean:'Lean Fighter Protocol',fatloss:'Fat Loss Hunter Protocol',endurance:'Endurance Hunter Protocol',srank:'S-Rank Body Path'}; return {id,name:map[id]||map.aesthetic}; }
function makeRoute(id){ const days={aesthetic:84,lean:90,fatloss:120,endurance:75,srank:240}[id]||84; return {etaDays:days, phases:['E-Rank Awakening','D-Rank Foundation','C-Rank Formation','B-Rank Conditioning','A-Rank Refinement','S-Rank Trial Locked']}; }

function renderStatus(){
  view.innerHTML=`<div class="card"><p class="eyebrow">STATUS WINDOW</p><h3>${state.profile.name}</h3><div class="grid">
  <div class="stat"><span>Rank</span><b>${state.rank}</b></div><div class="stat"><span>Level</span><b>${state.level}</b></div><div class="stat"><span>Title</span><b>${state.title}</b></div><div class="stat"><span>Class</span><b>${state.className}</b></div></div></div>
  <div class="card"><h3>Physical Stats</h3><div class="grid">${Object.entries(state.stats).map(([k,v])=>`<div class="stat"><span>${k.toUpperCase()}</span><b>${v}</b></div>`).join('')}</div></div>
  <div class="card"><h3>Target Body</h3><p><b>${state.goal.name}</b></p><p class="muted">Estimasi tersisa: <b>${state.route.etaDays} hari</b>. Estimasi maju kalau quest verified dan mundur kalau gagal.</p><div class="stack">${state.route.phases.map((p,i)=>`<span class="pill">${i===0?'ACTIVE':'LOCKED'} — ${p}</span>`).join('')}</div></div>`;
}
function renderOrder(){
  const q=state.quest;
  if(state.penalty?.active) return renderPenalty();
  if(!q) return view.innerHTML=`<div class="card"><h3>Menunggu siklus harian</h3><p class="muted">Daily Quest akan muncul otomatis saat System membaca siklus baru.</p></div>`;
  if(q.status==='completed') return view.innerHTML=`<div class="card gold"><p class="eyebrow">SYSTEM STANDBY</p><h3>Daily Quest hari ini selesai.</h3><p>Next Daily Quest otomatis saat siklus 00:00 berikutnya.</p><p class="countdown" data-countdown="tomorrow"></p><button class="secondary" id="optionalGate">REQUEST OPTIONAL GATE</button></div>${objectiveList(q,false)}`;
  view.innerHTML=`<div class="card ${q.status==='failed'?'danger':''}"><p class="eyebrow">CURRENT ORDER</p><h3>${q.status==='cleared'?'Clear condition terpenuhi':'Daily Quest Aktif'}</h3><p class="countdown" data-countdown="deadline"></p><div class="bar"><div class="fill" style="width:${completion()}%"></div></div><p class="muted">Progress: ${completion()}% · Proof: ${proofLevel()}</p><div class="row"><button id="acceptQuest" class="primary">${q.accepted?'QUEST DITERIMA':'TERIMA DAILY QUEST'}</button><button id="failBtn" class="danger-btn">GAGALKAN / MASUK PENALTY</button></div>${q.status==='cleared'?'<button id="claimBtn" class="primary">AMBIL REWARD</button>':''}</div>${objectiveList(q,true)}`;
  $('#acceptQuest').onclick=()=>{state.quest.accepted=true;save();tx('[COMMAND ACCEPTED]\nDaily Quest telah diterima. Selesaikan sebelum 23:59.');render();};
  $('#failBtn').onclick=()=>failQuest('Player memilih mengakhiri quest sebelum clear condition.');
  $('#claimBtn') && ($('#claimBtn').onclick=claimReward);
}
function objectiveList(q,editable){ return `<div class="card"><h3>Objectives</h3><div class="stack">${q.objectives.map(o=>`<div class="objective"><div><b>${o.name}</b><p class="muted">${o.done} / ${o.target} ${o.unit} · ${o.type.toUpperCase()}</p><div class="bar"><div class="fill" style="width:${pct(o.done,o.target)}%"></div></div></div>${editable?quickAction(o):'<span class="pill">RECORDED</span>'}</div>`).join('')}</div></div>`; }
function quickAction(o){ if(o.type==='sets') return `<button class="secondary small" onclick="quickSet('${o.id}')">+ SET</button>`; if(o.type==='timer') return `<button class="secondary small" onclick="quickTimer('${o.id}')">TIMER</button>`; if(o.type==='gps') return `<button class="secondary small" onclick="setTab('proof')">GPS</button>`; return `<button class="secondary small" onclick="manualAdd('${o.id}')">CATAT</button>`; }
window.quickSet=(id)=>{ const val=Number(prompt('Jumlah reps set ini?', '10')||0); if(val>0){ state.proof.sets[id]=state.proof.sets[id]||[]; state.proof.sets[id].push(val); updateObj(id,val,true); }};
window.quickTimer=(id)=>{ const o=state.quest.objectives.find(x=>x.id===id); if(!o)return; let sec=(o.unit==='menit'?o.target*60:o.target)-o.done; sec=clamp(sec,10,3600); startTimer(sec,()=>updateObj(id,o.target,false)); setTab('proof'); };
window.manualAdd=(id)=>{ const o=state.quest.objectives.find(x=>x.id===id); const val=Number(prompt(`Masukkan ${o.name} (${o.unit})`, String(o.target))||0); if(val>0) updateObj(id,val,false); };

function renderPenalty(){ const p=state.penalty; view.innerHTML=`<div class="card danger"><p class="eyebrow">PENALTY ZONE</p><h3>Escape tidak diakui.</h3><p class="muted">${p.reason}</p><button id="clearPenalty" class="primary">CLEAR PENALTY</button></div><div class="card"><h3>Penalty Objectives</h3><div class="stack">${p.objectives.map((o,i)=>`<div class="objective"><div><b>${o.name}</b><p class="muted">${o.done} / ${o.target} ${o.unit}</p><div class="bar"><div class="fill" style="width:${pct(o.done,o.target)}%"></div></div></div><button class="secondary small" onclick="penaltyAdd(${i})">CATAT</button></div>`).join('')}</div></div>`; $('#clearPenalty').onclick=clearPenalty; }
window.penaltyAdd=(i)=>{ const o=state.penalty.objectives[i]; const val=Number(prompt(`Catat ${o.name}`,String(o.target))||0); o.done=clamp(val,0,o.target); save(); render(); };

function renderProof(){
  view.innerHTML=`<div class="card"><p class="eyebrow">RUN TRACKER</p><h3>GPS Quest Verification</h3><p class="muted">Untuk objective Walk/Run. Reward penuh hanya jika clear condition terverifikasi.</p><div class="grid"><div class="stat"><span>Distance</span><b id="gpsDist">${state.quest?.objectives.find(o=>o.id==='run')?.done||0} km</b></div><div class="stat"><span>Time</span><b id="gpsTime">00:00</b></div></div><div class="row"><button id="startRun" class="primary">START GPS</button><button id="stopRun" class="secondary">STOP</button></div></div>
  <div class="card"><p class="eyebrow">WORKOUT TIMER</p><h3 id="timerText">Timer standby</h3><div class="countdown" id="timerCountdown">00:00</div></div>
  <div class="card"><h3>Proof Level</h3><p><b>${proofLevel()}</b></p><p class="muted">System Verified membutuhkan GPS + timer + set recorder.</p></div>`;
  $('#startRun').onclick=startRun; $('#stopRun').onclick=stopRun;
}
function startRun(){ if(!navigator.geolocation) return tx('[ACCESS DENIED]\nGPS tidak didukung browser ini.'); const runObj=state.quest?.objectives.find(o=>o.id==='run'); if(!runObj) return tx('[SYSTEM NOTICE]\nTidak ada objective lari hari ini.'); const run={start:Date.now(),points:[],distance:0}; state.proof.run=run; save(); let last=null; runWatchId=navigator.geolocation.watchPosition(pos=>{ const p={lat:pos.coords.latitude,lng:pos.coords.longitude,t:Date.now()}; if(last){ run.distance += hav(last,p); } last=p; run.points.push(p); state.proof.run=run; runObj.done=Number(run.distance.toFixed(2)); if(runObj.done>=runObj.target) runObj.done=runObj.target; save(); $('#gpsDist') && ($('#gpsDist').textContent=`${runObj.done} km`); renderIfClear(); }, err=>tx('[GPS ERROR]\n'+err.message), {enableHighAccuracy:true,maximumAge:1000,timeout:10000}); runTimer=setInterval(()=>{ if(!state.proof.run)return; const s=Math.floor((Date.now()-state.proof.run.start)/1000); $('#gpsTime') && ($('#gpsTime').textContent=formatTime(s)); },1000); }
function stopRun(){ if(runWatchId) navigator.geolocation.clearWatch(runWatchId); clearInterval(runTimer); runWatchId=null; runTimer=null; save(); render(); }
function hav(a,b){ const R=6371; const dLat=(b.lat-a.lat)*Math.PI/180; const dLon=(b.lng-a.lng)*Math.PI/180; const la1=a.lat*Math.PI/180, la2=b.lat*Math.PI/180; const x=Math.sin(dLat/2)**2+Math.cos(la1)*Math.cos(la2)*Math.sin(dLon/2)**2; return 2*R*Math.asin(Math.sqrt(x)); }
function startTimer(sec,done){ clearInterval(timerInterval); const end=Date.now()+sec*1000; timerInterval=setInterval(()=>{ const left=Math.max(0,Math.ceil((end-Date.now())/1000)); $('#timerCountdown') && ($('#timerCountdown').textContent=formatTime(left)); $('#timerText') && ($('#timerText').textContent='Timer berjalan. Jangan skip.'); if(left<=0){ clearInterval(timerInterval); state.proof.timer={done:true,at:Date.now()}; save(); done&&done(); tx('[TIMER VERIFIED]\nObjective timer selesai.'); } },500); }
function renderIfClear(){ if(allClear()){state.quest.status='cleared'; save();} }
function formatTime(s){ const m=Math.floor(s/60), r=s%60; return `${String(m).padStart(2,'0')}:${String(r).padStart(2,'0')}`; }

function renderCore(){
  view.innerHTML=`<div class="card"><p class="eyebrow">SYSTEM CORE</p><h3>AI Core</h3><p class="muted">AI dipakai sebagai kesadaran System: command, judgement, hidden quest, dan route recalculation. Rule Engine tetap menjaga hukum utama.</p><label>Gemini API Key</label><input id="apiKey" value="${state.apiKey||''}" placeholder="Masukkan API key"><label>Model</label><input id="model" value="${state.model||MODEL_DEFAULT}"><div class="row"><button id="saveCore" class="primary">SIMPAN CORE</button><button id="testCore" class="secondary">TEST SYSTEM CORE</button></div></div>
  <div class="card"><h3>Transmissions</h3><div class="stack">${state.transmissions.slice(0,8).map(t=>`<div class="stat"><small class="muted">${t.time}</small><div>${renderText(t.text)}</div></div>`).join('')||'<p class="muted">Belum ada transmission.</p>'}</div></div>`;
  $('#saveCore').onclick=()=>{state.apiKey=$('#apiKey').value.trim(); state.model=$('#model').value.trim()||MODEL_DEFAULT; save(); tx('[SYSTEM CORE SAVED]\nCore aktif jika API key valid.');};
  $('#testCore').onclick=aiTest;
}
async function aiTest(){ const prompt=`Kamu adalah SYSTEM Body Protocol. Jawab bahasa Indonesia tegas, dingin, tidak ramah berlebihan. Data player: ${JSON.stringify({profile:state.profile,goal:state.goal,rank:state.rank,quest:state.quest,stats:state.stats,route:state.route})}. Beri SYSTEM TRANSMISSION singkat berisi judgement dan perintah.`; const out=await callGemini(prompt); tx(out||'[SYSTEM CORE ERROR]\nAI tidak merespons. Periksa API key/model.'); }
async function callGemini(prompt){ if(!state.apiKey) return ''; try{ const url=`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(state.model||MODEL_DEFAULT)}:generateContent?key=${encodeURIComponent(state.apiKey)}`; const r=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({contents:[{parts:[{text:prompt}]}],generationConfig:{temperature:.65,maxOutputTokens:700}})}); const j=await r.json(); if(!r.ok) return `[SYSTEM CORE ERROR]\n${j.error?.message||r.statusText}`; return j.candidates?.[0]?.content?.parts?.map(p=>p.text).join('\n')||''; }catch(e){ return `[SYSTEM CORE ERROR]\n${e.message}`; } }

function renderReport(){
  const comp=completion(); const verdict= state.penalty?.active?'Penalty aktif. Progress dibekukan.': state.quest?.status==='completed'?'Daily Quest selesai. System standby.':'Quest masih aktif.';
  view.innerHTML=`<div class="card"><p class="eyebrow">ADAPTATION REPORT</p><h3>Verdict</h3><p>${verdict}</p><div class="grid"><div class="stat"><span>Completion</span><b>${comp}%</b></div><div class="stat"><span>ETA Target</span><b>${state.route?.etaDays||'-'} hari</b></div><div class="stat"><span>Proof</span><b>${proofLevel()}</b></div><div class="stat"><span>Failures</span><b>${state.logs.filter(l=>l.type==='FAILURE').length}</b></div></div></div>
  <div class="card"><h3>Failure / Reward Log</h3><div class="stack">${state.logs.slice(0,12).map(l=>`<div class="stat"><small class="muted">${l.date} · ${l.type}</small><div>${l.msg}</div></div>`).join('')||'<p class="muted">Belum ada log.</p>'}</div></div>`;
}
function updateCountdowns(){ document.querySelectorAll('[data-countdown]').forEach(el=>{ const type=el.dataset.countdown; const target= type==='tomorrow'?startOfTomorrow():endOfDay(); const diff=Math.max(0,Math.floor((target-new Date())/1000)); const h=Math.floor(diff/3600), m=Math.floor((diff%3600)/60), s=diff%60; el.textContent=`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`; }); }
init();
