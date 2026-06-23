# ARISE SYSTEM — Vercel Ready

PWA fitness gamification bergaya SYSTEM: onboarding player, body assessment, ability test, daily quest, proof module, AI transmission, rank dashboard, dan logo kepala macan.

## File penting

- `index.html` — UI utama.
- `api/gemini.js` — Vercel Serverless Function untuk Gemini.
- `manifest.webmanifest` — PWA install.
- `sw.js` — service worker.
- `icon.svg` — logo kepala macan.
- `db/schema.sql` — optional Supabase schema.

## Deploy ke GitHub + Vercel

1. Buat repo GitHub baru, misalnya `arise-system`.
2. Upload seluruh isi folder ini.
3. Masuk Vercel → Add New Project → Import repo.
4. Settings → Environment Variables:
   - `GEMINI_API_KEY` = API key Gemini kamu
5. Deploy.
6. Buka URL Vercel di Chrome Android.
7. Pilih menu browser → Add to Home Screen / Install App.

## Database

Untuk versi pribadi: tidak perlu database. Data tersimpan di browser (`localStorage`).

Kalau ingin dijual/multi-user:
- Pakai Supabase.
- Jalankan `db/schema.sql`.
- Tambahkan Supabase Auth.
- Simpan profile, quest_logs, streak, subscription, dan proof data.

## Kenapa key Gemini di Vercel?

Agar API key tidak muncul di source code browser. Frontend hanya memanggil `/api/gemini`; Vercel yang menyimpan `GEMINI_API_KEY`.


## v15 SYSTEM Notification Upgrade

Versi ini menambahkan:
- Hologram SYSTEM overlay di dalam aplikasi.
- Text typing animation, tidak langsung muncul.
- Auto transmission setelah onboarding dan saat player kembali membuka dashboard.
- AI transmission otomatis via `/api/gemini` bila `GEMINI_API_KEY` sudah aktif di Vercel.
- Fallback rule-engine transmission kalau AI gagal/offline.
- Perbaikan input nama agar tidak mudah freeze ketika mengetik.

Catatan: notifikasi hologram ini muncul di dalam aplikasi. Notifikasi sistem Android saat aplikasi benar-benar tertutup butuh push server/FCM untuk versi lanjutan.


## v16 Firebase Cloud Messaging + AI Profile

Tambahan v16:
- Firebase Cloud Messaging Web Push.
- `/api/firebase-config` untuk membaca config Firebase dari Vercel env.
- `/firebase-messaging-sw.js` digenerate dari Vercel serverless function.
- `/api/register-token` untuk menyimpan token; Supabase opsional.
- `/api/send-system-push` untuk test push memakai Firebase Admin.
- Upload foto wajah/profil di onboarding.
- Dashboard avatar memakai foto player, bukan logo default.
- Layout kartu player diperbaiki agar nama panjang tidak keluar.
- AI auto-transmission tetap aktif sejak onboarding selesai.

### Environment Variables wajib untuk AI
- `GEMINI_API_KEY`

### Environment Variables untuk Firebase Push
Public Firebase web config tetap aman untuk frontend, tapi disimpan di Vercel env agar rapi:
- `FIREBASE_API_KEY`
- `FIREBASE_AUTH_DOMAIN`
- `FIREBASE_PROJECT_ID`
- `FIREBASE_STORAGE_BUCKET`
- `FIREBASE_MESSAGING_SENDER_ID`
- `FIREBASE_APP_ID`
- `FIREBASE_VAPID_KEY`

### Untuk mengirim push dari server
Tambahkan:
- `FIREBASE_SERVICE_ACCOUNT_JSON`

Ambil dari Firebase Console → Project Settings → Service Accounts → Generate new private key. Isi env ini dengan JSON satu baris penuh.

### Supabase opsional
Untuk menyimpan token semua user:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Kalau Supabase tidak dipasang, app tetap bisa minta token dan test push ke token lokal, tapi token tidak tersimpan sebagai database list.

## v19 Full Bugfix
- ZIP lengkap: semua file deploy Vercel ikut masuk.
- validateStep dibersihkan; avatar optional dan tidak merusak flow.
- input nama stabil di Chrome Android.
- tombol Lanjutkan avatar normal.
- proses upload avatar dan analisis punya progress overlay.


## v20 FULL COMPLETE STABLE

Ini versi lengkap, bukan patch sebagian. Isi folder sudah termasuk:
- `api/` lengkap untuk Gemini, Firebase config, register token, send push.
- `db/schema.sql`
- `index.html`
- `firebase-messaging-sw.js` statis root.
- `manifest.webmanifest`, `sw.js`, `icon.svg`, `vercel.json`, `package.json`.

Perbaikan v20:
- Input nama diganti ke textarea aman agar keyboard Android tidak langsung hilang.
- Ditambah tombol `Mode input aman` memakai prompt native kalau keyboard tetap bermasalah.
- AI Transmission dipaksa pendek dan dibersihkan dari markdown.
- Hologram punya scroll internal.
- Firebase push SW generic tanpa import Firebase CDN, supaya tidak error script evaluation failed.
- Service worker lama akan dicoba unregister sebelum register v20.

Setelah upload:
1. Redeploy Vercel.
2. Clear Site Data domain Vercel di Chrome.
3. Buka ulang app.
4. Cek `/firebase-messaging-sw.js` harus menampilkan kode JavaScript v20.


## v21 Push Admin Fix

Perbaikan:
- Error `Cannot read properties of undefined (reading 'length')` diperbaiki.
- Penyebabnya import `firebase-admin` di Vercel ESM bisa masuk sebagai `default`, sehingga `admin.apps` undefined.
- `FIREBASE_SERVICE_ACCOUNT_JSON` sekarang lebih tahan error:
  - Bisa JSON biasa.
  - Bisa base64 JSON.
  - Private key `\n` otomatis dinormalisasi.


## v22 AI Message Complete Fix

Perbaikan:
- AI tidak boleh lagi berhenti hanya di `PLAYER:`.
- Frontend mendeteksi jawaban AI yang terlalu pendek/kosong lalu memakai fallback SYSTEM rule-engine.
- Prompt AI dibuat lebih ketat: setiap label wajib ada isinya.
- API Gemini juga punya fallback server kalau output model tidak lengkap.


## v23 AI Full Message No Cutoff

Perbaikan:
- Batas 5-7 baris dihapus.
- AI boleh menjawab lebih lengkap, ideal 80-160 kata.
- Hologram body dibuat scroll lebih besar.
- Token Gemini dinaikkan lagi agar jawaban tidak kepotong.
- Fallback hanya aktif kalau AI benar-benar kosong atau cuma label seperti `PLAYER:`.


## v24 Hologram Progress Input

Perbaikan:
- Quest tidak lagi langsung selesai sekali klik.
- Setiap quest punya progress parsial: contoh 10/30 push-up.
- Tombol quest menjadi `INPUT PROGRESS`.
- Input progress muncul di hologram SYSTEM.
- Ada mode `Tambah` dan `Set Total`.
- Quest baru clear kalau progress mencapai target.

## v25 Rebuilt UI Progress Fixed
- ORDER benar-benar diganti: tombol `Input Progress`, bukan `Mark Clear`.
- Progress parsial tampil langsung di card.
- Input progress lewat hologram SYSTEM.
- UI order card lebih rapi di mobile.
- Loading awal dibuat lebih elegan dan tidak fokus ke siluet orang.
- AI auto-call diberi cooldown 3 menit agar tidak terlalu sering kena 429.

## v27 AI + Penalty + Proof + Profile Fix

Perbaikan:
- AI hologram tidak lagi dipotong pendek. Limit tampilan dinaikkan dan area pesan bisa scroll panjang.
- API Gemini dinaikkan ke maxOutputTokens 1800.
- Proof diubah menjadi Proof Vault: catatan bukti, save proof, status proof logged, dan progress bar.
- Penalty Zone ditambahkan.
- Penalty aktif otomatis jika completion harian di bawah 60%.
- Profile UI/UX dirapikan agar tidak keluar dari card pada layar kecil.
- Bottom navigation disesuaikan untuk menu Penalty.
- Notifikasi Web Push tetap didukung melalui service worker. Di Android Chrome bisa masuk saat app/web ditutup setelah izin notifikasi aktif.

## v30 Emergency Stable Analysis Fix
- runAnalysis dibuat ulang lebih sederhana dan aman.
- Ditambahkan tombol Force Continue di layar analysis.
- Ditambahkan runtime error overlay agar app tidak blank/error diam.
- Daily reset tidak jalan sebelum onboardingComplete.

## v31 Persistence + AI Tone + Sync Ready
- Progress/quest hari yang sama tidak dihapus saat recalculation.
- Local backup ditambah di localStorage.
- Jika quest kosong, app mencoba restore backup.
- AI dibuat pendek, dingin, otoriter, tidak yapping.
- Gemini maxOutputTokens 900 agar selesai tapi tidak kepanjangan.
- Ditambah db/supabase_sync_schema.sql untuk database sync.

## v32 Countdown + Chronicle + Real Penalty + Database Plan

Changes:
- Removed Proof menu from navigation.
- Added Chronicle menu: daily countdown, streak, day records, clear/failed history.
- Countdown remaining to 00.00 is visible.
- Penalty Zone only activates after deadline passes and at least one quest failed.
- Penalty tasks are generated from failed quests and are heavier than the missed targets.
- AI is not truncated by frontend/API. UI scrolls long output.
- AI instruction: short, cold, authoritarian, no yapping, but complete all sentences.
- Database plan added to Core.
- Supabase schema updated with history and penalty fields.

## v33 Sheets Sync + Hard Persistence + Force System
- Hard backup: BACKUP, HARD_BACKUP, LAST_GOOD.
- If progress suddenly becomes 0 but backup has progress, app restores automatically.
- Spreadsheet Server Sync added in Core.
- apps_script/Code.gs included for Google Sheets backend.
- Push notification explanation added: Firebase needs server/trigger when phone is closed.
- AI tone made shorter, colder, more commanding.

## v34 ENV Sheets Sync

Changes:
- Removed Apps Script URL input from app UI.
- Added `api/sheets-sync.js` as Vercel serverless proxy.
- Spreadsheet URL is now stored in Vercel ENV: `SHEETS_WEBAPP_URL`.
- App only asks for Player ID.
- Added `VERCEL_ENV_SETUP.md`.

## v35 Auto Sheets Sync

Changes:
- App auto-loads spreadsheet data when dashboard starts and Player ID exists.
- Every `save()` now queues auto-sync unless called with `{noSync:true}`.
- Auto sync is debounced 1.5 seconds to avoid spam.
- Failed sync retries after 15 seconds.
- Manual Backup/Restore buttons remain as emergency fallback.
- Sync status pill added in Core.
- `/api/sheets-sync` now sends Cache-Control: no-store.

## v36 Stable Onboarding + Auto Sync Guard

Fix:
- Auto-sync is fully disabled during onboarding and analysis.
- Typing player name no longer triggers sync or dashboard rerender.
- `save()` only queues sync when onboardingComplete + analysisDone + Player ID exists.
- `hardRestoreIfProgressWipedV33()` no longer runs while onboarding.
- Auto-load from spreadsheet only runs after dashboard and Player ID are ready.
- Analysis final save uses `{noSync:true}` to prevent crash.

## v37 Hard Restore Reference Fix
- Fixed runtime error: `hardRestoreIfProgressWipedV33 is not defined`.
- Added safe fallback wrappers for hard restore and hard backup.
- Exposes `state` to window for emergency restore helpers.
- Onboarding should no longer crash at SYSTEM ANALYSIS.

## v38 Compatibility Stability Patch
- Fixed runtime error: `timeToMidnight is not defined`.
- Added compatibility fallback layer for countdown/history/penalty/sync helpers.
- Added Chronicle fallback if the menu exists but renderer is missing.
- Added fallback CSS for countdown/chronicle UI.
