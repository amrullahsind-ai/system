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
