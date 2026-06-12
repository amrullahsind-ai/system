const $ = (id) => document.getElementById(id);
const qsa = (s) => Array.from(document.querySelectorAll(s));
const STORAGE = 'system_v8_state';

let state = safeLoad() || defaultState();
let gpsWatch = null;
let gpsStart = 0;
let gpsDistance = 0;
let gpsLast = null;
let gpsTimer = null;

function safeLoad() {
  try { return JSON.parse(localStorage.getItem(STORAGE) || 'null'); } catch { return null; }
}
function defaultState() {
  return {
    apiKey: '',
    model: 'gemini-2.5-flash',
    player: null,
    photos: {},
    stats: { strength: 0, endurance: 0, core: 0, discipline: 0 },
    rank: 'E', level: 1, xp: 0, etaWeeks: null, compliance: 0,
    quest: null, penalty: null, logs: [], lastNotice: '', lastJudgement: '',
    proof: { runKm: 0, timerSec: 0, pushup: 0, squat: 0, level: 'Unverified' },
    createdAt: new Date().toISOString(), lastOpen: new Date().toISOString()
  };
}
function save(noRender=false) {
  localStorage.setItem(STORAGE, JSON.stringify(state));
  if (!noRender) render();
}
function log(msg, type='SYSTEM') {
  state.logs.unshift({ time: new Date().toLocaleString('id-ID'), type, msg });
  state.logs = state.logs.slice(0, 80);
}
function esc(s='') { return String(s).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }
function renderTransmission(text='') {
  let clean = String(text).trim();
  clean = clean.replace(/```[a-z]*\n?/gi,'').replace(/```/g,'');
  clean = esc(clean).replace(/\*\*(.*?)\*\*/g,'<b>$1</b>');
  return '<pre>' + clean + '</pre>';
}
function showModal(text) {
  $('modalContent').innerHTML = renderTransmission(text);
  $('modal').hidden = false;
}
function showNotice(text) {
  state.lastNotice = text;
  save();
}
function showScreen(name) {
  qsa('.screen').forEach(s => s.classList.remove('active'));
  const screen = $('screen-' + name);
  if (screen) screen.classList.add('active');
  qsa('.bottom-nav button').forEach(b => b.classList.toggle('active', b.dataset.screen === name));
  $('headerTitle').textContent = ({ status:'STATUS WINDOW', scan:'PHYSICAL SCAN', order:'CURRENT ORDER', penalty:'PENALTY ZONE', core:'SYSTEM CORE', notif:'NOTIFICATION MODULE', log:'SYSTEM LOG' })[name] || 'SYSTEM';
  window.scrollTo({top: 0, behavior: 'smooth'});
}
function currentOrder() {
  if (!state.player) return { title:'Physical Scan belum selesai.', desc:'System tidak akan membuka protocol sebelum tubuh dievaluasi.', action:'MULAI PHYSICAL SCAN', screen:'scan' };
  if (state.penalty?.active) return { title:'Penalty Zone aktif.', desc:'Reward, Gate, Trial, dan route dibekukan sampai penalty selesai.', action:'MASUK PENALTY ZONE', screen:'penalty' };
  if (!state.quest) return { title:'Daily Quest belum dibuat.', desc:'System Core harus mengeluarkan perintah harian berdasarkan scan dan target badan.', action:'BUAT DAILY QUEST', screen:'order' };
  if (state.quest.status === 'draft') return { title:'Daily Quest menunggu penerimaan.', desc:'Menolak bukan opsi. Terima perintah untuk memulai protocol.', action:'TERIMA DAILY QUEST', screen:'order' };
  if (state.quest.status === 'active') return { title:'Daily Quest aktif.', desc:'Clear Condition belum terpenuhi. Gunakan Proof of Quest.', action:'LANJUTKAN QUEST', screen:'order' };
  if (state.quest.status === 'cleared') return { title:'Clear Condition terpenuhi.', desc:'Reward tersedia. Ambil reward untuk mengunci progress.', action:'AMBIL REWARD', screen:'order' };
  return { title:'System menunggu perintah berikutnya.', desc:'Request Daily Command atau tunggu evaluasi.', action:'BUKA ORDER', screen:'order' };
}
function rankFromAvg(avg) { return avg >= 90 ? 'S' : avg >= 76 ? 'A' : avg >= 60 ? 'B' : avg >= 44 ? 'C' : avg >= 28 ? 'D' : 'E'; }
function calcScan() {
  const p = state.player;
  let strength = Math.min(100, Math.round((+p.pushup || 0) * 1.7 + (+p.squat || 0) * 0.45));
  let endurance = Math.max(1, Math.min(100, Math.round(110 - (+p.run1k || 15) * 5)));
  let core = Math.min(100, Math.round((+p.plank || 0) / 1.8));
  let discipline = p.sleep >= 8 ? 56 : p.sleep >= 7 ? 42 : 24;
  if (p.activity === 'high') discipline += 16;
  if (p.activity === 'medium') discipline += 8;
  state.stats = { strength, endurance, core, discipline: Math.min(100, discipline) };
  const avg = (strength + endurance + core + discipline) / 4;
  state.rank = rankFromAvg(avg);
  state.level = Math.max(1, Math.floor(avg / 10));
  const base = { 'S-Rank Body Path': 52, 'Aesthetic Combat Build': 30, 'Lean Fighter Protocol': 26, 'Fat Loss Hunter Protocol': 32, 'Endurance Hunter Protocol': 24 }[p.goal] || 30;
  state.etaWeeks = Math.max(8, Math.round(base + (100 - avg) / 7));
}
function rulesQuest() {
  const p = state.player || {}, s = state.stats;
  const factor = state.rank === 'E' ? 1.15 : state.rank === 'D' ? 1.25 : 1.35;
  let push = Math.max(8, Math.round((+p.pushup || 8) * factor));
  let squat = Math.max(20, Math.round((+p.squat || 20) * factor));
  let plank = Math.max(45, Math.round((+p.plank || 30) * 1.45));
  let run = p.goal?.includes('Endurance') ? 2.5 : p.goal?.includes('Fat Loss') ? 2.2 : 1.4;
  if (s.endurance < 25) run = Math.min(run, 1.1);
  if (s.discipline < 30) { push = Math.round(push * .85); squat = Math.round(squat * .85); }
  return {
    status:'draft', name:'Weakness Correction Protocol',
    reason:`Protocol dibuat dari Physical Scan. Goal: ${p.goal || 'Unknown'}. Rule Engine aktif karena AI belum/ gagal digunakan.`,
    objectives:[
      {id:'pushup',label:'Push-up',target:push,unit:'reps',progress:0,proof:'set'},
      {id:'squat',label:'Squat',target:squat,unit:'reps',progress:0,proof:'set'},
      {id:'plank',label:'Plank',target:plank,unit:'detik',progress:0,proof:'timer'},
      {id:'run',label:'Walk/Run',target:+run.toFixed(1),unit:'km',progress:0,proof:'gps'}
    ],
    deadline: new Date(new Date().setHours(23,59,0,0)).toISOString(), reward:{xp:120}, generatedBy:'rules'
  };
}
function render() {
  const o = currentOrder();
  $('orderTitle').textContent = o.title; $('orderDesc').textContent = o.desc; $('orderAction').textContent = o.action;
  $('rankLabel').textContent = state.rank; $('stName').textContent = state.player?.name || 'Unknown'; $('stLevel').textContent = state.level;
  $('stRank').textContent = state.rank; $('stGoal').textContent = state.player?.goal || 'Belum ditentukan';
  $('stETA').textContent = state.etaWeeks ? `${state.etaWeeks} minggu (dinamis)` : 'Belum dihitung';
  $('stCompliance').textContent = `${state.compliance}%`;
  ['Strength','Endurance','Core','Discipline'].forEach(k => { const v = state.stats[k.toLowerCase()] || 0; $('stat'+k).textContent = v; $('bar'+k).value = v; });
  $('rankPath').innerHTML = ['E','D','C','B','A','S'].map(r => `<div class="${r===state.rank?'active-rank':''}">${r}<br><small>${r===state.rank?'ACTIVE':'LOCKED'}</small></div>`).join('');
  const notice = $('systemNotice'); notice.textContent = state.lastNotice || ''; notice.classList.toggle('show', !!state.lastNotice);
  renderQuest(); renderPenalty(); renderLog(); renderCore(); renderNotifStatus();
}
function renderQuest() {
  const q = state.quest;
  $('questName').textContent = q?.name || 'Belum ada quest aktif.';
  $('questReason').textContent = q?.reason || 'System menunggu Physical Scan.';
  $('acceptQuestBtn').style.display = q?.status === 'draft' ? 'inline-block' : 'none';
  $('claimRewardBtn').style.display = q?.status === 'cleared' ? 'inline-block' : 'none';
  $('failQuestBtn').style.display = q?.status === 'active' ? 'inline-block' : 'none';
  $('questObjectives').innerHTML = q?.objectives?.map(obj => `
    <div class="objective ${obj.progress>=obj.target?'done':''}">
      <div><b>${esc(obj.label)}</b><br><small>${obj.progress}/${obj.target} ${esc(obj.unit)} • proof: ${esc(obj.proof)}</small></div>
      <button class="btn" data-manual="${obj.id}">MANUAL +</button>
    </div>`).join('') || '<p class="hint">Tidak ada quest. Gunakan Current Order.</p>';
  qsa('[data-manual]').forEach(btn => btn.onclick = () => manualProgress(btn.dataset.manual));
}
function renderPenalty() {
  const p = state.penalty;
  $('penaltyTitle').textContent = p?.active ? 'Penalty aktif.' : 'Penalty belum aktif.';
  $('penaltyDesc').textContent = p?.active ? p.reason : 'Jika Daily Quest gagal, akses reward dan gate dibekukan.';
  $('penaltyObjectives').innerHTML = p?.objectives?.map(obj => `
    <div class="objective ${obj.done?'done':''}">
      <div><b>${esc(obj.label)}</b><br><small>${esc(obj.target)}</small></div>
      <button class="btn" data-pen="${obj.id}">CLEAR</button>
    </div>`).join('') || '';
  qsa('[data-pen]').forEach(btn => btn.onclick = () => { const obj = state.penalty.objectives.find(x => x.id === btn.dataset.pen); if (obj) obj.done = true; save(); });
}
function renderLog() {
  $('logList').innerHTML = state.logs.length ? state.logs.map(l => `<div class="log-item"><b>[${esc(l.type)}]</b> ${esc(l.time)}<br>${esc(l.msg)}</div>`).join('') : '<p class="hint">Belum ada log.</p>';
}
function renderCore() { $('apiKey').value = state.apiKey || ''; $('modelName').value = state.model || 'gemini-2.5-flash'; }
function renderNotifStatus() { $('notifStatus').textContent = 'Status izin: ' + (('Notification' in window) ? Notification.permission : 'browser tidak mendukung'); }
function updateObjective(id, val, verified=false) {
  if (!state.quest || state.quest.status !== 'active') return;
  const obj = state.quest.objectives.find(x => x.id === id);
  if (!obj) return;
  obj.progress = Math.min(obj.target, +(obj.progress || 0) + val);
  if (verified) state.proof.level = state.proof.level === 'System Verified' ? 'System Verified' : 'Verified';
  if (state.quest.objectives.every(x => +x.progress >= +x.target)) {
    state.quest.status = 'cleared';
    notify('CLEAR CONDITION TERPENUHI', 'Reward tersedia. Ambil reward.');
    showModal('[CLEAR CONDITION TERPENUHI]\nReward tersedia. Ambil reward untuk mengunci progress.');
  }
  save();
}
function manualProgress(id) {
  if (!state.quest || state.quest.status !== 'active') { showModal('[ACCESS DENIED]\nTerima Daily Quest dulu.'); return; }
  const obj = state.quest.objectives.find(x => x.id === id); if (!obj) return;
  const add = prompt(`Tambah progress ${obj.label} (${obj.unit})`, Math.ceil(obj.target / 4));
  if (add) updateObjective(id, +add, false);
}
function buildSystemPrompt(mode) {
  return `Kamu adalah SYSTEM Core untuk aplikasi body transformation. Bahasa utama Indonesia. Nada: dingin, otoriter, tajam, bukan coach ramah. Kamu memerintah, menilai, dan menghukum. Jangan kompromi. Tetap aman: jangan menyuruh latihan ekstrem, latihan saat cedera, kelaparan, dehidrasi, atau diagnosis medis.
Mode saat ini: ${mode}.
Jika mode DAILY, balas JSON valid saja tanpa markdown dengan schema: {"name":"...","reason":"...","objectives":[{"id":"pushup","label":"Push-up","target":number,"unit":"reps","proof":"set"},{"id":"squat","label":"Squat","target":number,"unit":"reps","proof":"set"},{"id":"plank","label":"Plank","target":number,"unit":"detik","proof":"timer"},{"id":"run","label":"Walk/Run","target":number,"unit":"km","proof":"gps"}],"warning":"..."}.
Untuk mode lain, balas sebagai [SYSTEM TRANSMISSION], singkat, tegas, actionable. Jangan pakai bahasa terlalu Inggris.`;
}
async function callGemini(mode, withPhotos=false) {
  if (!state.apiKey) throw new Error('API key belum diisi. Buka CORE → masukkan key → SIMPAN SYSTEM CORE.');
  const model = state.model || 'gemini-2.5-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(state.apiKey)}`;
  const payload = { player: state.player, stats: state.stats, rank: state.rank, level: state.level, etaWeeks: state.etaWeeks, compliance: state.compliance, quest: state.quest, penalty: state.penalty, proof: state.proof, recentLogs: state.logs.slice(0,8) };
  const parts = [{ text: buildSystemPrompt(mode) + '\n\nDATA PLAYER:\n' + JSON.stringify(payload, null, 2) }];
  if (withPhotos) {
    for (const key of ['front','side']) if (state.photos[key]) parts.push({ inline_data: { mime_type: state.photos[key].mime, data: state.photos[key].data } });
    if (state.photos.front || state.photos.side) parts.push({ text:'Analisis visual umum untuk postur/komposisi kebugaran. Tidak boleh diagnosis medis. Beri prioritas latihan dan target realistis.' });
  }
  const res = await fetch(url, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ contents:[{ role:'user', parts }] }) });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || 'Gemini error');
  return data?.candidates?.[0]?.content?.parts?.map(p => p.text || '').join('\n') || 'Tidak ada output.';
}
function extractJson(text) {
  let raw = String(text).replace(/```json/gi,'').replace(/```/g,'').trim();
  const a = raw.indexOf('{'), b = raw.lastIndexOf('}');
  if (a >= 0 && b >= 0) raw = raw.slice(a, b + 1);
  return JSON.parse(raw);
}
function normalizeQuest(q) {
  const fallback = rulesQuest();
  const ids = ['pushup','squat','plank','run'];
  const objectives = ids.map(id => {
    const found = (q.objectives || []).find(x => x.id === id) || fallback.objectives.find(x => x.id === id);
    const base = fallback.objectives.find(x => x.id === id);
    const target = Number(found.target);
    return { ...base, ...found, target: Number.isFinite(target) && target > 0 ? target : base.target, progress: 0 };
  });
  return { status:'draft', name:q.name || 'Daily Quest', reason:q.reason || q.warning || 'System command generated.', objectives, deadline:new Date(new Date().setHours(23,59,0,0)).toISOString(), reward:{xp:145}, generatedBy:'ai' };
}
async function generateDaily() {
  if (!state.player) { showScreen('scan'); return; }
  showModal('[SYSTEM CORE]\nMenyusun Daily Quest sesuai data tubuh...');
  try {
    const out = await callGemini('DAILY', false);
    state.quest = normalizeQuest(extractJson(out));
    log('Daily Quest dibuat oleh AI System Core.', 'COMMAND');
    showNotice('[SYSTEM NOTICE] Daily Quest dikeluarkan. Penolakan tidak dikenali.');
    save();
    showModal(`[DAILY QUEST HAS ARRIVED]\n${state.quest.name}\n\n${state.quest.reason}\n\nRefusal tidak dikenali. Terima perintah.`);
    showScreen('order');
  } catch (e) {
    state.quest = rulesQuest();
    log('AI gagal. Rule Engine mengambil alih: ' + e.message, 'FALLBACK');
    save();
    showModal('[SYSTEM CORE ERROR]\nAI tidak merespons. Rule Engine mengambil alih.\n\n' + e.message);
    showScreen('order');
  }
}
async function systemTransmission(mode, withPhotos=false) {
  showModal('[SYSTEM CORE]\nMemproses transmission...');
  try {
    const out = await callGemini(mode, withPhotos);
    if (mode === 'JUDGEMENT') state.lastJudgement = out;
    if (mode === 'ROUTE') state.etaWeeks = Math.max(4, (state.etaWeeks || 20) + (state.compliance < 50 ? 2 : -1));
    log(mode + ' transmission received.', 'CORE');
    showModal(out);
    notify('SYSTEM TRANSMISSION', out.replace(/\s+/g,' ').slice(0,115));
    save();
  } catch (e) { showModal('[SYSTEM CORE ERROR]\n' + e.message); }
}
async function scanPlayer() {
  const required = ['name','age','height','weight','pushup','squat','plank','run1k'];
  for (const id of required) if (!$(`${id}`).value) { showModal(`[SCAN DITOLAK]\nField ${id} belum diisi.`); return; }
  state.player = { name:$('name').value || 'Player', age:+$('age').value, height:+$('height').value, weight:+$('weight').value, pushup:+$('pushup').value, squat:+$('squat').value, plank:+$('plank').value, run1k:+$('run1k').value, sleep:+$('sleep').value, activity:$('activity').value, equipment:$('equipment').value, goal:$('goal').value };
  calcScan();
  log('Physical Scan selesai. Protocol ditentukan.', 'SCAN');
  save();
  let msg = `[SYSTEM VERDICT]\nRank awal: ${state.rank}\nGoal: ${state.player.goal}\nEstimasi route: ${state.etaWeeks} minggu jika compliance stabil di atas 85%.\n\nSystem akan menyusun Daily Quest pertama.`;
  showModal(msg);
  showScreen('status');
  if (state.apiKey && (state.photos.front || state.photos.side)) {
    try { const visual = await callGemini('VISUAL SCAN', true); showModal(msg + '\n\n' + visual); } catch (e) { log('Visual Scan AI gagal: ' + e.message, 'ERROR'); }
  }
  setTimeout(() => generateDaily(), 700);
}
function claimReward() {
  if (!state.quest || state.quest.status !== 'cleared') return;
  const mult = state.proof.level === 'System Verified' ? 1.3 : state.proof.level === 'Verified' ? 1 : .55;
  const xp = Math.round((state.quest.reward?.xp || 120) * mult);
  state.xp += xp; state.level = Math.max(state.level, 1 + Math.floor(state.xp / 300));
  state.stats.discipline = Math.min(100, state.stats.discipline + 5);
  state.stats.strength = Math.min(100, state.stats.strength + 3);
  state.stats.endurance = Math.min(100, state.stats.endurance + 2);
  state.compliance = Math.min(100, state.compliance + 8);
  if (mult >= 1) state.etaWeeks = Math.max(4, (state.etaWeeks || 20) - 1);
  state.quest = null;
  log(`Reward diambil. EXP +${xp}. Proof: ${state.proof.level}.`, 'REWARD');
  showNotice('[SYSTEM NOTICE] Reward diambil. Current Order akan diperbarui.');
  showModal(`[REWARD ACQUIRED]\nEXP +${xp}\nProof Level: ${state.proof.level}\nEstimasi target diperbarui.\n\nSystem Judgement otomatis akan diproses jika Core aktif.`);
  notify('REWARD ACQUIRED', `EXP +${xp}. Quest cleared.`);
  state.proof = { runKm:0, timerSec:0, pushup:0, squat:0, level:'Unverified' };
  save();
  if (state.apiKey) setTimeout(() => systemTransmission('JUDGEMENT'), 600);
}
function failQuest() {
  state.penalty = { active:true, reason:'Daily Quest gagal. Kegagalan dicatat sebagai pelanggaran protocol.', objectives:[
    {id:'walk', label:'Walk/Run Penalty', target:'1.5 km verified GPS', done:false},
    {id:'plank', label:'Plank Penalty', target:'120 detik timer', done:false},
    {id:'ack', label:'Failure acknowledgement', target:'Akui kegagalan. Tidak ada alasan.', done:false}
  ]};
  state.quest = null; state.compliance = Math.max(0, state.compliance - 12); state.etaWeeks = (state.etaWeeks || 20) + 1;
  log('Daily Quest gagal. Penalty Zone aktif.', 'FAILURE');
  showNotice('[SYSTEM WARNING] Penalty Zone aktif. Akses internal dibekukan.');
  notify('PENALTY ZONE ACTIVATED', 'Kegagalan telah dicatat.');
  save(); showModal('[PENALTY ZONE ACTIVATED]\nReward dibekukan. Gate ditolak. Clear penalty untuk memulihkan akses System.'); showScreen('penalty');
  if (state.apiKey) setTimeout(() => systemTransmission('PENALTY'), 600);
}
function clearPenalty() {
  if (!state.penalty?.active) return;
  if (!state.penalty.objectives.every(x => x.done)) { showModal('[ACCESS DENIED]\nSemua penalty objective belum selesai.'); return; }
  state.penalty.active = false; log('Penalty cleared. System access restored.', 'PENALTY'); showNotice('[SYSTEM NOTICE] Penalty cleared. Kegagalan tetap tercatat.'); save(); showModal('[PENALTY CLEARED]\nAkses System dipulihkan. Kegagalan tetap tercatat.');
}
function notify(title, body) {
  if ('Notification' in window && Notification.permission === 'granted') {
    navigator.serviceWorker?.ready.then(reg => reg.showNotification(title, { body, icon:'icons/icon-192.png', badge:'icons/icon-192.png' })).catch(() => new Notification(title, { body }));
  }
}
function haversine(a,b) { const R=6371; const dLat=(b.lat-a.lat)*Math.PI/180, dLon=(b.lon-a.lon)*Math.PI/180; const x=Math.sin(dLat/2)**2+Math.cos(a.lat*Math.PI/180)*Math.cos(b.lat*Math.PI/180)*Math.sin(dLon/2)**2; return 2*R*Math.asin(Math.sqrt(x)); }
async function handlePhoto(inputId, previewId, key) {
  const f = $(inputId).files?.[0]; if (!f) return;
  $(previewId).hidden = false; $(previewId).src = URL.createObjectURL(f);
  const data = await new Promise(r => { const fr = new FileReader(); fr.onload = () => r(fr.result.split(',')[1]); fr.readAsDataURL(f); });
  state.photos[key] = { mime: f.type, data }; save();
}
function bind() {
  $('enterBtn').onclick = () => { $('boot').style.display = 'none'; state.lastOpen = new Date().toISOString(); save(); };
  $('closeModal').onclick = () => { $('modal').hidden = true; };
  $('modal').addEventListener('click', e => { if (e.target.id === 'modal') $('modal').hidden = true; });
  qsa('.bottom-nav button').forEach(b => b.onclick = () => showScreen(b.dataset.screen));
  $('orderAction').onclick = () => { const o = currentOrder(); if (o.action === 'BUAT DAILY QUEST') generateDaily(); else if (o.action === 'AMBIL REWARD') claimReward(); else showScreen(o.screen); };
  $('bodyPhotoFront').onchange = () => handlePhoto('bodyPhotoFront','photoFrontPreview','front');
  $('bodyPhotoSide').onchange = () => handlePhoto('bodyPhotoSide','photoSidePreview','side');
  $('scanBtn').onclick = scanPlayer;
  $('saveCoreBtn').onclick = () => { state.apiKey = $('apiKey').value.trim(); state.model = $('modelName').value.trim() || 'gemini-2.5-flash'; save(); showModal('[SYSTEM CORE SAVED]\nAPI key disimpan lokal di browser/perangkat ini.'); };
  $('testCoreBtn').onclick = () => systemTransmission('TEST');
  qsa('[data-core]').forEach(btn => btn.onclick = () => { const m = btn.dataset.core; if (m === 'daily') return generateDaily(); if (m === 'visual') return systemTransmission('VISUAL SCAN', true); systemTransmission(m.toUpperCase(), m === 'route'); });
  $('acceptQuestBtn').onclick = () => { if (!state.quest) return; state.quest.status = 'active'; log('Daily Quest accepted.', 'COMMAND'); showNotice('[CURRENT ORDER] Daily Quest aktif. Proof wajib dikumpulkan.'); save(); showModal('[COMMAND ACCEPTED]\nDaily Quest aktif. Clear Condition wajib dipenuhi sebelum reward tersedia.'); };
  $('claimRewardBtn').onclick = claimReward; $('failQuestBtn').onclick = failQuest; $('clearPenaltyBtn').onclick = clearPenalty;
  $('recordSetBtn').onclick = () => { const reps = +$('repsInput').value || 0, type = $('repsType').value; if (reps > 0) { state.proof[type] = (state.proof[type] || 0) + reps; state.proof.level = 'Verified'; updateObjective(type, reps, true); $('repsInput').value = ''; } };
  $('startTimerBtn').onclick = () => { let sec = +$('timerSeconds').value || 60, left = sec; $('timerDisplay').textContent = new Date(left*1000).toISOString().slice(14,19); const int = setInterval(() => { left--; $('timerDisplay').textContent = new Date(Math.max(0,left)*1000).toISOString().slice(14,19); if (left <= 0) { clearInterval(int); state.proof.timerSec += sec; state.proof.level = 'Verified'; updateObjective('plank', sec, true); showModal('[TIMER VERIFIED]\nObjective timer selesai.'); } }, 1000); };
  $('startGpsBtn').onclick = () => { if (!navigator.geolocation) { showModal('GPS tidak tersedia.'); return; } gpsStart = Date.now(); gpsDistance = 0; gpsLast = null; $('gpsDistance').textContent='0.00'; if (gpsWatch !== null) navigator.geolocation.clearWatch(gpsWatch); gpsWatch = navigator.geolocation.watchPosition(pos => { const cur = {lat:pos.coords.latitude, lon:pos.coords.longitude}; if (gpsLast) { const d = haversine(gpsLast, cur); if (d < .25) gpsDistance += d; } gpsLast = cur; const mins = (Date.now()-gpsStart)/60000; $('gpsDistance').textContent = gpsDistance.toFixed(2); $('gpsPace').textContent = gpsDistance > 0 ? (mins/gpsDistance).toFixed(1) + '/km' : '--'; }, err => showModal('[GPS ERROR]\n' + err.message), { enableHighAccuracy:true, maximumAge:1500, timeout:10000 }); clearInterval(gpsTimer); gpsTimer = setInterval(() => { $('gpsTime').textContent = new Date(Date.now()-gpsStart).toISOString().slice(14,19); }, 1000); };
  $('stopGpsBtn').onclick = () => { if (gpsWatch !== null) navigator.geolocation.clearWatch(gpsWatch); gpsWatch = null; clearInterval(gpsTimer); state.proof.runKm = Math.max(state.proof.runKm, gpsDistance); if (gpsDistance > .05) { state.proof.level = gpsDistance >= 1 ? 'System Verified' : 'Verified'; updateObjective('run', +gpsDistance.toFixed(2), true); showModal(`[GPS VERIFICATION]\nDistance verified: ${gpsDistance.toFixed(2)} km\nProof Level: ${state.proof.level}`); } save(); };
  $('enableNotifBtn').onclick = async () => { if (!('Notification' in window)) return showModal('Browser tidak mendukung notifikasi.'); const perm = await Notification.requestPermission(); renderNotifStatus(); if (perm === 'granted') notify('SYSTEM NOTIFICATION ACTIVE', 'System Warning siap dikirim.'); };
  $('testNotifBtn').onclick = () => notify('SYSTEM WARNING','Daily Quest belum selesai. Sisa waktu terus berkurang.');
  $('installHintBtn').onclick = () => showModal('[INSTALL PWA]\n1. Buka web dari Chrome.\n2. Pastikan link HTTPS/GitHub Pages.\n3. Tekan menu titik tiga.\n4. Pilih Add to Home Screen / Install app.\n5. Buka dari ikon SYSTEM.\n\nCatatan: notifikasi background penuh perlu push server.');
  $('resetBtn').onclick = () => { if (confirm('Reset semua data SYSTEM di browser ini?')) { localStorage.removeItem(STORAGE); location.reload(); } };
}

if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js?v=8').catch(()=>{});
bind();
render();
setTimeout(() => { if (state.player && !state.quest && !state.penalty?.active) showNotice('[SYSTEM NOTICE] Tidak ada Daily Quest aktif. System menunggu command.'); }, 400);
