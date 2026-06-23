# ARISE SYSTEM v33 Apps Script Sync

1. Buat Google Sheet kosong.
2. Copy ID sheet dari URL.
3. Buka Extensions > Apps Script.
4. Paste `Code.gs`.
5. Ganti `SHEET_ID`.
6. Deploy > New deployment > Web app.
7. Execute as: Me.
8. Access: Anyone with the link.
9. Copy Web App URL.
10. Masukkan ke Vercel Project Settings > Environment Variables dengan nama SHEETS_WEBAPP_URL.
11. Redeploy project.
12. Di aplikasi, isi Player ID saja.
