# DEPLOYMENT.md — Panduan Deploy OPSi (Langkah demi Langkah untuk Pemula)

Dokumen ini memandu Anda dari nol hingga aplikasi OPSi bisa diakses online. Estimasi waktu: **30–60 menit**.

Yang Anda butuhkan:
- Akun Google (Gmail) — untuk Google Sheets, Drive, dan Apps Script.
- Akun GitHub — untuk menyimpan source code & (opsional) GitHub Pages.
- Komputer dengan Node.js 18+ dan Git terpasang.
- Koneksi internet.

> **Catatan keamanan:** Jangan pernah menulis password, token, atau `SECRET_PEPPER` asli di file yang akan di-push ke GitHub. Semua nilai rahasia disimpan di **Script Properties** (Google) dan file `.env` (lokal, sudah masuk `.gitignore`).

---

## (a) Buat Repo GitHub & Push Source Code

1. Buka <https://github.com/new>, buat repository baru (mis. bernama `opsi`), pilih **Private** atau **Public** (disarankan Private untuk aplikasi internal). **Jangan** centang "Add a README" (karena source sudah ada).
2. Di komputer, masuk ke folder project lalu push:

```bash
cd OPSi
git init
git add .
git commit -m "Initial commit OPSi"
git branch -M main
git remote add origin https://github.com/<USERNAME>/opsi.git
git push -u origin main
```

3. Pastikan file `.env` **tidak** ter-push (sudah ada di `.gitignore`). Yang ter-push hanya `.env.example`.

---

## (b) Install & Jalankan Frontend di Lokal

```bash
cd OPSi
npm install          # wajib, unduh semua dependensi
cp .env.example .env # buat file konfigurasi lokal
# edit .env: isi VITE_API_URL (akan diisi setelah langkah i)
npm run dev          # buka http://localhost:5173
```

> Verifikasi build dilakukan di environment terpisah. Di komputer Anda, `npm install` wajib dijalankan sendiri sebelum `npm run dev` / `npm run build`.

---

## (c) Buat Google Spreadsheet Baru

1. Buka <https://sheets.new> (login dengan akun Google Anda).
2. Beri nama spreadsheet, mis. **"OPSi Database"**.
3. Salin **ID spreadsheet** dari URL browser:
   `https://docs.google.com/spreadsheets/d/`**`INI_ID_NYA`**`/edit`
4. Simpan ID tersebut — akan dipakai di langkah (g) sebagai `SPREADSHEET_ID`.

> Sheet-sheet data (`Users`, `Master_Area`, `Area_Assignment`, `Laporan_Kunjungan`, `Sessions`, `Settings`, `Audit_Log`) **dibuat otomatis** oleh fungsi `setup()` di langkah (h). Anda tidak perlu membuatnya manual.

---

## (d) Buat Folder Google Drive untuk Foto

1. Buka <https://drive.google.com> → **New > Folder**, beri nama mis. **"OPSi Foto Laporan"**.
2. Buka folder tersebut, salin **ID folder** dari URL:
   `https://drive.google.com/drive/folders/`**`INI_ID_FOLDER`**
3. Simpan ID tersebut — akan dipakai di langkah (g) sebagai `DRIVE_FOLDER_ID`.

> Foto laporan yang diunggah user akan masuk ke folder ini. Backend otomatis mengatur sharing file foto menjadi **"anyone with link can view"** agar bisa ditampilkan di frontend.

---

## (e) Buat Apps Script Project

1. Kembali ke Google Spreadsheet yang dibuat di langkah (c).
2. Di menu atas: **Extensions > Apps Script**. Akan terbuka editor Apps Script di tab baru.
3. Beri nama project, mis. **"OPSi Backend"** (klik "Untitled project" di pojok kiri atas).

---

## (f) Copy File Backend (`*.gs`) + `appsscript.json`

1. Di editor Apps Script, hapus file default `Code.gs` yang kosong (atau timpa isinya).
2. Buat file-file berikut (klik **+ > Script**) dan salin isi dari folder `backend/` di project Anda:
   - `Code.gs` — entry point `doPost` / `doGet`, routing action.
   - `Auth.gs` — login, logout, validasi sesi, password hashing.
   - `Sheets.gs` — helper akses Google Sheets.
   - `Laporan.gs` — CRUD laporan kunjungan, dashboard, ekspor.
   - `Users.gs` — manajemen pengguna.
   - `Master.gs` — master area & penugasan.
   - `Settings.gs` — baca/tulis pengaturan.
   - `Utils.gs` — utilitas umum (UUID, format tanggal, rate limit).
   - `Drive.gs` — upload foto ke Drive.
   - `Audit.gs` — pencatatan audit log.
3. Klik ikon **gear (Project Settings)** di sidebar kiri → centang **"Show 'appsscript.json' manifest file in editor"**.
4. Kembali ke editor, buka file `appsscript.json`, timpa dengan isi `backend/appsscript.json` dari project (pastikan `timeZone: "Asia/Jakarta"`, `webapp.executeAs: "USER_DEPLOYING"`, `webapp.access: "ANYONE_ANONYMOUS"`, dan `oauthScopes` lengkap).
5. **Save** (ikon disket atau Ctrl+S).

---

## (g) Set Script Properties

1. Di editor Apps Script, klik **gear (Project Settings)** di sidebar kiri.
2. Scroll ke bagian **Script Properties** → klik **Add script property**, isi satu per satu:

| Property | Nilai Contoh | Keterangan |
| --- | --- | --- |
| `SPREADSHEET_ID` | `1AbCd...` (ID dari langkah c) | ID spreadsheet database. |
| `DRIVE_FOLDER_ID` | `1XyZ...` (ID dari langkah d) | ID folder Drive untuk foto. |
| `SECRET_PEPPER` | string acak panjang, mis. `xK9$mP2...` (min. 32 karakter) | Rahasia pengacak hash password. **Buat sendiri, simpan rapat.** |
| `SESSION_DURATION_HOURS` | `8` | Durasi login (jam). Boleh diubah. |

3. Klik **Save script properties**.

> `SECRET_PEPPER` tidak boleh dibagikan ke siapa pun dan tidak boleh di-commit ke Git. Jika hilang, semua password user harus di-reset.

---

## (h) Jalankan Fungsi `setup()` Sekali Kali

1. Di editor Apps Script, pilih fungsi **`setup`** di dropdown toolbar (sebelah tombol Run).
2. Klik **Run** (▶). Pertama kali akan muncul dialog **Authorization required** → klik **Review permissions** → pilih akun Google Anda → jika muncul "Google hasn't verified this app", klik **Advanced > Go to OPSi Backend (unsafe)** → **Allow**. (Ini normal karena aplikasi Anda belum diverifikasi Google; hanya Anda sendiri yang menjalankannya.)
3. Fungsi `setup()` akan:
   - Membuat 7 sheet + header kolom (`Users`, `Master_Area`, `Area_Assignment`, `Laporan_Kunjungan`, `Sessions`, `Settings`, `Audit_Log`).
   - Mengisi default settings (target bulanan = 2, polling = 20 detik).
   - Membuat akun **`admin`** dengan password acak 12 karakter.
4. **PENTING — password admin hanya tampil SEKALI:**
   - Buka menu **View > Logs** (atau **Executions** di sidebar, klik eksekusi terbaru).
   - Cari baris `Logger.log` yang berisi: `Password admin: xxxxxxxxxxxx`.
   - **Salin password itu segera dan simpan di tempat aman.** Setelah log digulir/hapus, password tidak bisa dilihat lagi. Jika lupa, jalankan ulang `setup()` (akan membuat admin baru) atau reset password via Script editor.
5. Detail lebih lanjut: lihat `scripts/setup.md`.

---

## (i) Deploy Web App & Salin URL

1. Di editor Apps Script, klik **Deploy > New deployment** (tombol Deploy biru di kanan atas).
2. Klik ikon **gear (pilih type)** → pilih **Web app**.
3. Isi:
   - **Description:** mis. `OPSi v1.0`
   - **Execute as:** **Me** (akun Anda)
   - **Who has access:** **Anyone** (siapa pun dengan URL bisa memanggil API; autentikasi ditangani oleh login OPSi sendiri)
4. Klik **Deploy**. Jika diminta authorization lagi, izinkan.
5. Setelah berhasil, akan muncul **Web app URL**, formatnya:
   `https://script.google.com/macros/s/`**`DEPLOYMENT_ID`**`/exec`
6. **Salin URL tersebut** — akan dipakai di langkah (j).

> Catatan: URL berakhiran `/exec` adalah URL produksi. Ada juga URL `/dev` (untuk testing di editor) — keduanya berbeda. Pastikan frontend memakai URL `/exec`.

---

## (j) Set `VITE_API_URL` di `.env`

1. Di folder project, buka file `.env` (hasil copy dari `.env.example` di langkah b).
2. Isi:
   ```
   VITE_API_URL=https://script.google.com/macros/s/DEPLOYMENT_ID_ANDA/exec
   ```
3. Simpan. Restart `npm run dev` jika sedang berjalan (Vite membaca `.env` saat start).

---

## (k) Deploy Frontend

Pilih **satu** dari dua opsi berikut.

### Opsi 1: GitHub Pages (gratis, dari repo yang sudah dibuat)

`vite.config.ts` sudah diset `base: './'` sehingga kompatibel dengan subpath GitHub Pages.

```bash
npm run build          # output di folder dist/
```

1. Push folder `dist/` ke branch `gh-pages` (mis. dengan `gh-pages` package):
   ```bash
   npm install -D gh-pages
   npx gh-pages -d dist
   ```
2. Di GitHub: repo **Settings > Pages** → **Source: Deploy from a branch** → pilih branch `gh-pages`, folder `/ (root)` → **Save**.
3. Tunggu 1–2 menit, situs bisa diakses di `https://<USERNAME>.github.io/opsi/`.

### Opsi 2: Vercel atau Netlify (alternatif, lebih mudah untuk preview)

- **Vercel:** <https://vercel.com> → **Add New > Project** → import repo GitHub → Framework preset: **Vite** → Build command `npm run build` → Output directory `dist` → **Deploy**. Tambahkan **Environment Variable** `VITE_API_URL` di settings Vercel.
- **Netlify:** <https://netlify.com> → **Add new site > Import an existing project** → pilih repo → Build command `npm run build` → Publish directory `dist` → **Deploy site**. Tambahkan environment variable `VITE_API_URL` di **Site settings > Environment variables**.

Kelebihan Vercel/Netlify: auto-deploy tiap push ke `main`, HTTPS otomatis, dan tidak perlu urus branch `gh-pages`.

---

## (l) CORS — Yang Perlu Diketahui

Google Apps Script **Web App tidak mendukung custom header penuh** untuk CORS. Karena itu:

- Frontend selalu mengirim request dengan **`Content-Type: text/plain`** (bukan `application/json`), sehingga browser **tidak mengirim preflight OPTIONS** (simple request). Body tetap berupa JSON.
- Jika Anda melihat error **CORS** di console browser:
  1. Pastikan `VITE_API_URL` berakhiran **`/exec`** (bukan `/dev`, bukan diakhiri slash `/`).
  2. Pastikan deployment Web App sudah di-**Deploy** (bukan hanya disimpan di editor).
  3. Setelah mengubah kode `.gs`, **wajib re-deploy** (Deploy > Manage deployments > edit > New version) agar URL `/exec` memakai kode terbaru. Jika lupa, perubahan tidak akan muncul.
  4. Pastikan **Who has access = Anyone** (bukan "Only myself").

---

## (m) Login dengan Admin & Buat User Lain

1. Buka URL frontend (lokal `http://localhost:5173` atau hasil deploy).
2. Login dengan:
   - Username: `admin`
   - Password: password acak 12 karakter yang Anda salin di langkah (h).
3. Setelah login, masuk ke menu **Pengguna** → **Tambah Pengguna** untuk membuat akun koordinator, manajer, dan direktur sesuai kebutuhan.
4. (Disarankan) Segera ganti password admin via menu Pengguna → Reset Password, agar tidak bergantung pada password one-time.

---

## (n) Testing Checklist (Wajib Dijalankan Sebelum Dipakai Tim)

Jalankan skenario berikut (versi lengkap & tabel ada di `tests/manual-checklist.md`):

1. **Login valid** — username & password benar → masuk dashboard.
2. **Password salah** — muncul pesan error, tidak masuk.
3. **Akun nonaktif** — login ditolak dengan pesan jelas.
4. **Hak akses tiap role** — koordinator tidak bisa membuka menu Pengguna/Pengaturan; manajer tidak bisa tambah user.
5. **Koordinator tidak bisa lihat data orang lain** — paksa akses detail laporan user lain via URL → ditolak `FORBIDDEN`.
6. **Upload foto** — JPG/PNG ≤5MB berhasil; file >5MB ditolak.
7. **Dashboard periode** — ganti periode 1w / 3w / 1m / 3m → angka berubah sesuai rentang tanggal nyata (Asia/Jakarta).
8. **Ekspor** — unduh XLSX, CSV, dan Print/PDF → data sesuai filter.
9. **Multiuser** — dua user login bersamaan dari browser berbeda → masing-masing hanya melihat data sesuai role.

---

## (o) Update Aplikasi (Setelah Ada Perubahan Kode)

1. **Backend (Apps Script):** edit file `.gs` di editor → **Save** → **Deploy > Manage deployments** → klik ikon pensil (edit) → **Version: New version** → isi deskripsi → **Deploy**. URL `/exec` tetap sama, tapi kode sudah terbaru.
2. **Frontend:** edit source → `npm run build` → push ke GitHub → (GitHub Pages) `npx gh-pages -d dist`, atau (Vercel/Netlify) auto-deploy.
3. Jika mengubah Script Properties, tidak perlu re-deploy (langsung berlaku).

---

## (p) Troubleshooting Umum

| Gejala | Kemungkinan Penyebab | Solusi |
| --- | --- | --- |
| **Error 401 / AUTH_FAILED** | Token sesi habis atau tidak terkirim. | Logout lalu login ulang. Cek `SESSION_DURATION_HOURS`. Pastikan frontend kirim header/body `token`. |
| **Error 403 / FORBIDDEN** | Role tidak punya hak, atau koordinator akses data orang lain. | Periksa role user & status penugasan. Ini perilaku yang benar — bukan bug. |
| **CORS error di console** | URL salah (`/dev` vs `/exec`), atau belum re-deploy. | Lihat bagian (l). Pastikan URL berakhiran `/exec` dan deployment versi terbaru. |
| **Foto tidak muncul (broken image)** | Sharing Drive belum "anyone with link", atau `DRIVE_FOLDER_ID` salah. | Cek `DRIVE_FOLDER_ID` di Script Properties. Pastikan backend memanggil `setSharing(ANYONE_WITH_LINK, VIEW)`. Coba buka URL foto langsung di tab baru. |
| **Kuota Apps Script habis** | Terlalu banyak panggilan (batas ~20rb/hari konsumen) atau eksekusi >6 menit. | Naikkan interval polling, kurangi user bersamaan, atau migrasi ke Firestore/Postgres. Lihat batasan di README. |
| **"Sheet tidak ditemukan" / error sheet** | `setup()` belum dijalankan atau `SPREADSHEET_ID` salah. | Jalankan ulang `setup()` (langkah h). Periksa ID spreadsheet. |
| **Laporan tidak tersimpan saat upload foto** | Ukuran foto >5MB, atau format bukan JPG/PNG. | Kompres foto (maks. 5MB), pastikan format JPG/PNG. Pesan error akan muncul di toast. |
| **Perubahan kode backend tidak berefek** | Lupa re-deploy ke versi baru. | Lihat bagian (o): Deploy > Manage deployments > New version. |
| **Lupa password admin** | Password one-time hanya tampil sekali di Logger. | Jalankan ulang `setup()` (akan buat admin baru) atau reset password via editor Apps Script dengan memanggil fungsi reset secara manual. |

---

## Selesai

Jika semua langkah berhasil, aplikasi OPSi sudah bisa dipakai tim. Dokumentasikan URL frontend, URL Web App (internal), dan daftar akun yang dibuat di tempat yang aman (bukan di repo).
