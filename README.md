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
