# OPSi — Aplikasi Laporan Kunjungan Operasional

**OPSi** adalah aplikasi web untuk mencatat, memantau, dan melaporkan kunjungan lapangan tim operasional ke area klien. Aplikasi ini dirancang untuk perusahaan dengan tim koordinator lapangan yang perlu melaporkan hasil kunjungan (foto, PIC klien, catatan) secara terstruktur, serta manajemen yang perlu memantau realisasi target kunjungan per area dan per koordinator.

Bahasa antarmuka: **Bahasa Indonesia**.

---

## 1. Tujuan Aplikasi

- Mencatat laporan kunjungan lapangan (tanggal, area, PIC klien, foto, catatan) secara digital.
- Memantau realisasi target kunjungan bulanan per area dan per koordinator.
- Menyediakan dashboard ringkasan dengan periode fleksibel (1 minggu / 3 minggu / 1 bulan / 3 bulan).
- Mengekspor data laporan ke format **XLSX**, **CSV**, dan **PDF/Print**.
- Mengelola master area, penugasan koordinator, dan pengguna dengan kontrol hak akses berbasis peran (role-based access).

---

## 2. Fitur Utama Berdasarkan Peran (Role)

| Role | Hak Akses Ringkas |
| --- | --- |
| **`admin_operasional`** | Akses penuh: semua laporan, dashboard, master area, manajemen pengguna, penugasan area, pengaturan, ekspor. |
| **`operasional_manager`** | Membaca semua laporan + dashboard + ekspor + master area + daftar penugasan. **Tidak bisa** manajemen user, set penugasan, ubah pengaturan. |
| **`direktur`** | Membaca semua laporan + dashboard + ekspor. **Tidak bisa** manajemen user/area/pengaturan. |
| **`area_koordinator`** | Hanya melihat & menginput laporan **miliknya sendiri**; melihat area yang ditugaskan kepadanya; dashboard hanya menampilkan data dirinya. **Tidak bisa** akses manajemen. Jika mencoba mengakses data orang lain → ditolak (`FORBIDDEN`). |

> Akun dengan status `nonaktif` tidak bisa login.

### Fitur umum (semua role kecuali dibatasi):

- Login / logout dengan sesi berbasis token (durasi dapat dikonfigurasi, default 8 jam).
- Dashboard dengan KPI (total area, area dikunjungi, persentase capaian), grafik tren, rincian per area & per koordinator, 10 laporan terbaru.
- Input laporan kunjungan dengan upload foto (JPG/PNG, maksimal 5 MB).
- Riwayat laporan dengan pencarian, filter tanggal/koordinator/area, paginasi.
- Detail laporan (termasuk pratinjau foto).
- Ekspor data ke XLSX / CSV / Print-PDF dengan nama file otomatis:
  `OPSi_Laporan_Kunjungan_<tanggal_awal>_sampai_<tanggal_akhir>.xlsx`
- Pengaturan: target kunjungan bulanan default (default **2 kunjungan/area/bulan**), interval polling (default **20 detik**).

---

## 3. Tech Stack

### Frontend
- **React 18** + **TypeScript** + **Vite 5**
- **Tailwind CSS 3** (desain token: primary teal `#0D9488`, aksen `#14B8A6`, navy `#0F172A`/`#1E293B`, font Inter)
- **react-router-dom 6** (routing)
- **lucide-react** (ikon — tanpa emoji)
- **recharts** (grafik dashboard)
- **xlsx / SheetJS** (ekspor XLSX & CSV)
- **date-fns** (manipulasi tanggal, zona Asia/Jakarta)
- **zod** (validasi)
- **sonner** (notifikasi toast)

### Backend
- **Google Apps Script** (V8 runtime) sebagai Web App API tunggal.
- **Google Sheets** sebagai penyimpanan data (7 sheet, dibuat otomatis oleh `setup()`).
- **Google Drive** untuk menyimpan file foto laporan.

> Verifikasi build (`npm install` + `npm run build`) dilakukan di environment terpisah. Saat Anda menjalankan di komputer sendiri, **wajib menjalankan `npm install` terlebih dahulu** sebelum `npm run dev` atau `npm run build`.

---

## 4. Struktur Folder

```
OPSi/
├── package.json, vite.config.ts, tsconfig.json, tsconfig.node.json
├── tailwind.config.js, postcss.config.js, index.html
├── .gitignore, .env.example
├── README.md, DEPLOYMENT.md, CONTRACT.md
├── src/
│   ├── main.tsx, App.tsx, index.css, vite-env.d.ts
│   ├── types/index.ts
│   ├── utils/            # formatTanggal, validators, constants (ROLES, PERIODE_OPTIONS, API_ACTIONS)
│   ├── services/         # api.ts, auth.ts, laporan.ts, master.ts, export.ts
│   ├── context/AuthContext.tsx
│   ├── hooks/            # useAuth, usePolling, useToast
│   ├── components/ui/    # button, input, card, dialog, table, dll (gaya shadcn, native + Tailwind)
│   ├── components/layout/# Sidebar, Header, AppLayout, ProtectedRoute
│   └── pages/            # Login, Dashboard, InputLaporan, RiwayatLaporan, DetailLaporan,
│                         # EksporLaporan, MasterArea, ManajemenPengguna, Pengaturan, NotFound
├── backend/              # Code.gs, Auth.gs, Sheets.gs, Laporan.gs, Users.gs, Master.gs,
│                         # Settings.gs, Utils.gs, Drive.gs, Audit.gs, appsscript.json
├── scripts/              # setup.md, dummy-data.md
└── tests/                # manual-checklist.md
```

---

## 5. Konfigurasi Wajib

### 5.1 Frontend (file `.env`)

| Variabel | Wajib | Keterangan |
| --- | --- | --- |
| `VITE_API_URL` | Ya | URL Web App Google Apps Script (berakhiran `/exec`). Contoh: `https://script.google.com/macros/s/DEPLOYMENT_ID/exec` |

Salin `.env.example` menjadi `.env` lalu isi URL Anda. Lihat `.env.example`.

### 5.2 Backend (Script Properties di Apps Script)

Buka **File > Project Settings > Script Properties** dan set:

| Property | Wajib | Keterangan |
| --- | --- | --- |
| `SPREADSHEET_ID` | Ya | ID Google Spreadsheet tempat data disimpan. |
| `DRIVE_FOLDER_ID` | Ya | ID folder Google Drive tempat foto laporan diunggah. |
| `SECRET_PEPPER` | Ya | String rahasia acak (mis. 32+ karakter) yang digabung ke hash password. **JANGAN dibagikan.** |
| `SESSION_DURATION_HOURS` | Ya | Durasi sesi login dalam jam (default `8`). |

> **Jangan pernah menulis nilai rahasia (password, token, pepper) di dalam kode atau dokumentasi.** Semua nilai di atas diambil dari Script Properties saat runtime.

---

## 6. Cara Menjalankan di Lokal (Frontend)

Pastikan Node.js versi 18+ sudah terpasang.

```bash
# 1. Masuk ke folder project
cd OPSi

# 2. Salin konfigurasi environment
cp .env.example .env
#    lalu edit .env, isi VITE_API_URL dengan URL Web App GAS Anda

# 3. Install dependensi (wajib, sekali saja atau saat package.json berubah)
npm install

# 4. Jalankan development server
npm run dev
#    buka URL yang muncul (biasanya http://localhost:5173)

# 5. Build untuk produksi (output di folder dist/)
npm run build

# 6. Pratinjau hasil build
npm run preview
```

Backend (Apps Script) tidak bisa dijalankan di lokal — harus di-deploy ke Google (lihat `DEPLOYMENT.md`).

---

## 7. Catatan Batasan (Penting — Dibaca Sebelum Produksi)

OPSi dibangun di atas **Google Sheets + Apps Script** dengan tujuan **cepat diterapkan dan tanpa biaya server**. Ada batasan yang harus Anda pahami secara jujur:

1. **Polling, bukan real-time push.** Dashboard & riwayat diperbarui dengan mekanisme polling (default setiap 20 detik, dapat diubah di Pengaturan). Tidak ada WebSocket / push notification. Perubahan data oleh user lain akan terlihat setelah interval polling berikutnya.

2. **Google Sheets bukan database produksi skala besar.** Performa Sheets menurun signifikan di atas ~100.000 sel (sekitar 10.000+ baris data laporan). Kuota Apps Script konsumen: eksekusi maksimal **6 menit per panggilan** dan **~20.000 panggilan/hari**. Jika volume laporan Anda melebihi **~10.000 baris** atau user aktif >50 orang secara bersamaan, **sangat disarankan memigrasikan backend ke Firestore atau PostgreSQL** (API contract-nya sama, hanya lapisan penyimpanan yang diganti).

3. **URL endpoint GAS bukan pengganti autentikasi.** Meskipun URL Web App sulit ditebak, keamanan tetap bergantung pada **login + token sesi + validasi role di backend**. Jangan mengandalkan kerahasiaan URL sebagai satu-satunya perlindungan. Semua action (kecuali `login`) wajib memvalidasi token di sheet `Sessions`.

4. **Password hashing: SHA-256 + salt + pepper — ada batasan platform.** Apps Script **tidak menyediakan bcrypt/argon2 secara native**. OPSi menggunakan `Utilities.computeDigest(SHA_256, password + salt + pepper)` dengan:
   - **salt** acak per user (disimpan di sheet `Users`),
   - **pepper** rahasia dari Script Properties `SECRET_PEPPER` (tidak disimpan di sheet).
   
   Ini sudah lebih aman daripada plaintext atau hash tanpa salt, namun **SHA-256 bukanlah password hashing yang dirancang untuk tahan serangan brute-force** (tidak ada work factor seperti bcrypt). Untuk aplikasi dengan user banyak atau data sensitif tinggi, pertimbangkan memindahkan autentikasi ke layanan terpisah (mis. Firebase Auth / Auth0) atau backend dengan bcrypt/argon2 native.

5. **Foto disimpan di Google Drive dengan sharing "anyone with link can view".** URL foto (`https://drive.google.com/uc?id=FILE_ID`) dapat diakses siapa pun yang memiliki link. Ini adalah trade-off agar foto bisa ditampilkan di frontend tanpa login Google. Jangan unggah foto yang sangat rahasia.

6. **Ukuran foto maksimal 5 MB** (divalidasi di backend). File lebih besar akan ditolak dan laporan tidak tersimpan.

---

## 8. Daftar Role & Hak Akses (Ringkas)

| Fitur | admin_operasional | operasional_manager | direktur | area_koordinator |
| --- | :---: | :---: | :---: | :---: |
| Login / logout | ✅ | ✅ | ✅ | ✅ |
| Dashboard (semua data) | ✅ | ✅ | ✅ | ❌ (hanya dirinya) |
| Input & edit laporan | ✅ | ❌ | ❌ | ✅ (miliknya) |
| Lihat riwayat laporan | ✅ (semua) | ✅ (semua) | ✅ (semua) | ✅ (miliknya) |
| Lihat detail laporan | ✅ (semua) | ✅ (semua) | ✅ (semua) | ✅ (miliknya) |
| Ekspor XLSX/CSV/PDF | ✅ | ✅ | ✅ | ✅ (miliknya) |
| Master area (lihat) | ✅ | ✅ | ✅ | ❌ |
| Master area (tambah/ubah) | ✅ | ✅ | ❌ | ❌ |
| Penugasan area ke koordinator | ✅ | ❌ | ❌ | ❌ |
| Manajemen pengguna (CRUD + reset password) | ✅ | ❌ | ❌ | ❌ |
| Ubah pengaturan (target, polling) | ✅ | ❌ | ❌ | ❌ |

---

## 9. Dokumen Terkait

- `DEPLOYMENT.md` — panduan deploy langkah demi langkah untuk pemula.
- `backend/README-backend.md` — daftar file backend, endpoint action, format request/response.
- `scripts/setup.md` — penjelasan fungsi `setup()` dan cara menjalankannya.
- `scripts/dummy-data.md` — contoh data dummy untuk pengujian.
- `tests/manual-checklist.md` — checklist pengujian manual wajib.
- `CONTRACT.md` — kontrak antar-modul (acuan teknis tunggal, untuk pengembang).
"# opsi" 
"# opsi" 
