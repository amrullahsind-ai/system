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

## 3. Redeploy
Environment variable baru tidak otomatis masuk ke deployment lama. Redeploy project.

## 4. Cek endpoint
Buka app, lalu gunakan Core > Spreadsheet Server Sync.
Aplikasi akan memanggil:

/api/sheets-sync

Endpoint itu yang meneruskan request ke Apps Script.
