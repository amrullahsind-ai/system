# ARISE SYSTEM v35 Auto Sync

Cara kerja:
1. User isi Player ID sekali.
2. Saat dashboard terbuka, app otomatis load data dari spreadsheet.
3. Kalau data server lebih baru/lebih lengkap, local diganti server.
4. Kalau data local lebih baru, local otomatis dikirim ke server.
5. Setiap perubahan progress memanggil `save()`.
6. `save()` otomatis antre sync ke spreadsheet dengan debounce 1.5 detik.
7. Kalau gagal, retry 15 detik.

Catatan:
- Apps Script Web App URL tetap disimpan di Vercel ENV: SHEETS_WEBAPP_URL.
- Tombol Backup/Restore masih ada untuk darurat.
- Untuk multi-device, wajib pakai Player ID yang sama.
