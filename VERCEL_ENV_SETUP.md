# Vercel ENV Setup untuk Spreadsheet Sync

Tujuan: link Apps Script tidak dimasukkan di aplikasi, tapi disimpan di Vercel.

## 1. Ambil Web App URL dari Apps Script
Contoh:
https://script.google.com/macros/s/AKfycbxxxxxxx/exec

## 2. Masuk Vercel
Project SYSTEM > Settings > Environment Variables.

Tambah variable:

SHEETS_WEBAPP_URL=https://script.google.com/macros/s/AKfycbxxxxxxx/exec

Pilih Production/Preview/Development jika tersedia.

## Optional: Private API Lock
Jika project dipakai pribadi dan tidak ingin endpoint AI/Sheets/Push dipanggil orang lain, tambahkan:

SYSTEM_API_TOKEN=isi-token-panjang-random

Setelah deploy, buka app > Core > Private API Lock, lalu isi token yang sama di field System API Token. Jika env ini dikosongkan, app berjalan seperti mode public/personal biasa.

## Optional: Supabase fallback sync
Jika tidak mau memakai Google Sheets, atau ingin fallback database permanen, tambahkan:

SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=service-role-key

Lalu jalankan `db/supabase_sync_schema.sql` di Supabase SQL Editor. Endpoint `/api/profile` akan dipakai otomatis sebagai fallback ketika `/api/sheets-sync` gagal atau belum dikonfigurasi.

## 3. Redeploy
Environment variable baru tidak otomatis masuk ke deployment lama. Redeploy project.

## 4. Cek endpoint
Buka app, lalu gunakan Core > Spreadsheet Server Sync.
Aplikasi akan memanggil:

/api/sheets-sync

Endpoint itu yang meneruskan request ke Apps Script.


## Error: Illegal spreadsheet id or key
Artinya yang salah ada di Apps Script `SPREADSHEET_ID_OR_URL`, bukan di Vercel ENV. Isi dengan URL Google Sheet, contoh `https://docs.google.com/spreadsheets/d/xxxxx/edit`, lalu Deploy ulang Apps Script Web App.
