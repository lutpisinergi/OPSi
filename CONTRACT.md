# OPSi — Kontrak Antar-Modul (ACUAN TUNGGAL SEMUA AGEN)

Project root: `/home/user/.dola/agent_mode/workspace/OPSi`
Bahasa UI: Indonesia. Brand: teal `#0D9488` (primary), `#14B8A6` (accent), navy `#0F172A` / `#1E293B`, putih, abu-abu lembut. Font Inter. Ikon: `lucide-react`. JANGAN pakai emoji sebagai ikon.

## 1. Stack & Dependency Frontend
- React 18 + TypeScript + Vite 5 + Tailwind CSS 3 + react-router-dom 6 + lucide-react + recharts + xlsx (SheetJS) + date-fns + zod + sonner (toast).
- Komponen UI ditulis manual gaya shadcn di `src/components/ui/` (button, input, textarea, card, badge, dialog, select, table, toast/sonner wrapper, skeleton, pagination, avatar, dropdown-menu, label, progress). TIDAK perlu Radix; gunakan elemen native + Tailwind agar build offline-stable.
- `index.css`: @tailwind base/components/utilities + CSS variables warna + font Inter dari Google Fonts di index.html + class utility (.card, .input dll opsional).

## 2. Struktur Folder Frontend (WAJIB)
```
OPSi/
  package.json, vite.config.ts, tsconfig.json, tsconfig.node.json,
  tailwind.config.js, postcss.config.js, index.html, .gitignore, .env.example,
  README.md, DEPLOYMENT.md
  src/
    main.tsx, App.tsx, index.css, vite-env.d.ts
    types/index.ts
    utils/ (formatTanggal.ts, validators.ts, constants.ts -> ROLES, PERIODE_OPTIONS, API_ACTIONS)
    services/ (api.ts, auth.ts, laporan.ts, master.ts, export.ts)
    context/AuthContext.tsx
    hooks/ (useAuth.ts, usePolling.ts, useToast.ts -> re-export sonner)
    components/ui/ (semua komponen dasar)
    components/layout/ (Sidebar.tsx, Header.tsx, AppLayout.tsx, ProtectedRoute.tsx)
    pages/ (Login.tsx, Dashboard.tsx, InputLaporan.tsx, RiwayatLaporan.tsx,
            DetailLaporan.tsx, EksporLaporan.tsx, MasterArea.tsx,
            ManajemenPengguna.tsx, Pengaturan.tsx, NotFound.tsx)
  backend/ (Code.gs, Auth.gs, Sheets.gs, Laporan.gs, Users.gs, Master.gs,
            Settings.gs, Utils.gs, Drive.gs, Audit.gs, appsscript.json)
  scripts/ (setup.md, dummy-data.md)
  tests/ (manual-checklist.md, boleh ada utils.test.ts dengan vitest)
```

## 3. Kontrak API (Backend Google Apps Script Web App)
Endpoint tunggal: `POST {VITE_API_URL}` dengan `Content-Type: text/plain` (hindari preflight CORS) body JSON:
```json
{ "action": "<nama_action>", "token": "<jwt/uuid atau null>", "payload": { ... } }
```
Response selalu JSON: `{ "success": true, "data": ... }` atau `{ "success": false, "error": "PESAN_AMAN", "code": "AUTH_FAILED|FORBIDDEN|VALIDATION_ERROR|NOT_FOUND|RATE_LIMITED|SERVER_ERROR" }`.
JANGAN pernah return stack trace. `doGet` boleh return halaman info sederhana.

Daftar action (payload -> data):
- `login` {username, password} -> { token, user: {user_id, username, nama_lengkap, role}, expires_at }
- `logout` {} -> {ok:true}
- `validateSession` {} -> { user, expires_at }
- `getProfile` {} -> { user }
- `getDashboard` { periode: "1w"|"3w"|"1m"|"3m", startDate?, endDate? } -> {
    kpi: { total_area, area_dikunjungi_unik, area_belum_dikunjungi, persentase, target_direncanakan, target_terealisasi },
    per_area: [ {area_id, nama_area, target, realisasi, persentase} ],
    per_koordinator: [ {user_id, nama, target, realisasi, persentase} ] (hanya role manajemen; untuk koordinator array 1 elemen dirinya),
    trend: [ { label, tanggal_iso, jumlah } ],
    recent10: [ {laporan_id, tanggal_kunjungan, nama_area_koordinator, nama_area, client_pic, notice, foto_url, note, created_at} ]
  }
- `getAreasForUser` {} -> [ {area_id, nama_area, nama_client} ] (hanya area ditugaskan ke user login; untuk manajemen return semua area aktif)
- `createLaporan` { tanggal_kunjungan (YYYY-MM-DD), area_id, client_pic, notice, note, foto_base64? (data:image/...;base64,...), foto_nama? } -> { laporan_id, foto_file_id, foto_url }
- `updateLaporan` { laporan_id, tanggal_kunjungan?, area_id?, client_pic?, notice?, note?, foto_base64?, foto_nama? } -> { laporan_id }
- `getLaporanList` { page (1-based), pageSize, search?, startDate?, endDate?, koordinator_user_id?, area_id?, sort? ("tanggal_desc" default) } -> { rows: [...Laporan], total, page, pageSize }
- `getLaporanDetail` { laporan_id } -> Laporan lengkap
- `getUsers` {} (admin) -> [User tanpa password_hash]
- `createUser` { username, password, nama_lengkap, role } (admin) -> {user_id}
- `updateUser` { user_id, nama_lengkap?, role?, status?, username? } (admin) -> {ok}
- `resetPassword` { user_id, new_password } (admin) -> {ok}
- `getMasterArea` {} -> [Area]
- `createArea` { nama_area, nama_client, target_kunjungan_bulanan? } (admin/manager) -> {area_id}
- `updateArea` { area_id, nama_area?, nama_client?, status?, target_kunjungan_bulanan? } -> {ok}
- `getAssignments` {} -> [ {assignment_id, area_id, user_id_koordinator, nama_area_koordinator, status} ]
- `setAssignments` { area_id, user_ids: [] } (admin) -> {ok}
- `getSettings` {} -> { default_target_bulanan, polling_interval_detik, ... }
- `updateSettings` { key, value } (admin) -> {ok}
- `exportData` { startDate, endDate, koordinator_user_id?, area_id? } -> [ {no, tanggal_kunjungan, nama_area_koordinator, nama_area, client_pic, notice, foto_url, note, created_at} ]

Aturan otorisasi backend (WAJIB di setiap action):
- Semua action kecuali `login` wajib validasi token (ada di sheet Sessions, belum expired).
- `area_koordinator`: getLaporanList/getLaporanDetail/getDashboard/createLaporan/updateLaporan/exportData HANYA untuk data miliknya (user_id cocok). Jika minta laporan orang lain -> FORBIDDEN. Tidak bisa akses getUsers/createUser/updateUser/resetPassword/createArea/updateArea/setAssignments/updateSettings.
- `operasional_manager`: read semua laporan + dashboard + export + getMasterArea + getAssignments; TIDAK bisa createUser/updateUser/resetPassword/setAssignments/updateSettings.
- `direktur`: read semua + export; TIDAK bisa manajemen user/area/settings.
- `admin_operasional`: full access.
- Akun status != "aktif" -> login ditolak.

## 4. Tipe Data TypeScript (src/types/index.ts)
```ts
export type Role = 'direktur' | 'operasional_manager' | 'admin_operasional' | 'area_koordinator';
export interface User { user_id: string; username: string; nama_lengkap: string; role: Role; status: 'aktif'|'nonaktif'; created_at?: string; last_login?: string; }
export interface Area { area_id: string; nama_area: string; nama_client: string; status: 'aktif'|'nonaktif'; target_kunjungan_bulanan: number; }
export interface Assignment { assignment_id: string; area_id: string; user_id_koordinator: string; nama_area_koordinator: string; status: string; }
export interface Laporan { laporan_id: string; user_id: string; nama_area_koordinator: string; tanggal_kunjungan: string; area_id: string; nama_area: string; client_pic: string; notice: string; foto_file_id?: string; foto_url?: string; note: string; created_at: string; updated_at?: string; }
export interface Settings { default_target_bulanan: number; polling_interval_detik: number; }
export interface DashboardStats { kpi: {...}; per_area: {...}[]; per_koordinator: {...}[]; trend: {...}[]; recent10: Laporan[]; }
export type Periode = '1w'|'3w'|'1m'|'3m';
```

## 5. Struktur Google Sheets (backend buat otomatis via setup())
Sheet: `Users`(user_id,username,password_hash,salt,nama_lengkap,role,status,created_at,updated_at,last_login), `Master_Area`(area_id,nama_area,nama_client,status,target_kunjungan_bulanan,created_at,updated_at), `Area_Assignment`(assignment_id,area_id,user_id_koordinator,nama_area_koordinator,status,created_at), `Laporan_Kunjungan`(laporan_id,user_id,nama_area_koordinator,tanggal_kunjungan,area_id,nama_area,client_pic,notice,foto_file_id,foto_url,note,created_at,updated_at), `Sessions`(token,user_id,expires_at,created_at), `Settings`(setting_key,setting_value,updated_at), `Audit_Log`(log_id,user_id,action,detail,created_at).
Password: `password_hash = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, password + salt + pepper)` hex; salt per-user random; pepper dari Script Properties `SECRET_PEPPER`. Session token = UUID, durasi dari Script Properties `SESSION_DURATION_HOURS` (default 8).
Script Properties wajib: `SPREADSHEET_ID`, `DRIVE_FOLDER_ID`, `SECRET_PEPPER`, `SESSION_DURATION_HOURS`. JANGAN hardcode.
Foto: terima base64 dataURL -> Utilities.newBlob -> DriveApp.getFolderById(DRIVE_FOLDER_ID).createFile(blob) -> setSharing(ANYONE_WITH_LINK, VIEW) opsional -> simpan file.getId() & foto_url=`https://drive.google.com/uc?id=FILE_ID`. Validasi MIME JPG/PNG & ukuran <=5MB di backend.
LockService.getScriptLock() saat write. Batch getRange/setValues. Rate limit sederhana via CacheService per username.

## 6. Auth Frontend
- `AuthContext`: state {user, token, loading}. Login -> simpan token & user di memory + `sessionStorage` (BUKAN localStorage). App start: cek sessionStorage -> validateSession ke backend. Logout -> panggil action logout + hapus sessionStorage + redirect /login.
- `ProtectedRoute`: cek user ada; cek role untuk route admin. Redirect /login jika tidak auth.
- api.ts: wrapper fetch POST dengan Content-Type text/plain, inject token, handle 401 -> logout otomatis, retry sekali untuk network error.

## 7. Routing (App.tsx — dibuat oleh Frontend-Core, import SEMUA page)
`/login` (Login), `/` (AppLayout) -> index Dashboard, `/input-laporan`, `/riwayat`, `/riwayat/:laporanId` (DetailLaporan), `/ekspor`, `/master-area` (admin+manager), `/pengguna` (admin only), `/pengaturan` (admin), `*` NotFound. Semua route dalam AppLayout kecuali /login.

## 8. Periode Dashboard (rentang NYATA, Asia/Jakarta)
- 1w = 7 hari terakhir inklusif hari ini; 3w = 21 hari; 1m = 30 hari; 3m = 90 hari. Backend hitung dari tanggal server (WIB). Filter periode BENAR-BENAR membatasi data yang dihitung.
- Persentase = target_terealisasi / target_direncanakan × 100. Target per area per bulan = target_kunjungan_bulanan (default dari Settings.default_target_bulanan = 2). target_direncanakan = Σ area × target bulanan (disesuaikan proporsi hari jika periode <1 bulan — sederhanakan: untuk periode berjalan, target_direncanakan = Σ(area × target_bulanan × (hari_dalam_periode / hari_dalam_bulan_30))). target_terealisasi = min(jumlah kunjungan area di periode, target area di periode). Jelaskan rumus di kode dengan komentar.
- area_dikunjungi_unik = COUNT(DISTINCT area_id yang punya laporan di periode). area_belum = total_area_aktif - area_dikunjungi_unik.

## 9. Design Token Tailwind
extend colors: primary: {50..900} berbasis teal (#0D9488 sebagai 600), navy: {700:#1E293B,900:#0F172A}. borderRadius: komponen default 12px (rounded-xl/2xl). shadow lembut shadow-sm/md. Font sans: Inter.

## 10. Naming File Export
`OPSi_Laporan_Kunjungan_<start>_sampai_<end>.xlsx` (tanggal format YYYY-MM-DD). CSV sama. Print via window.print dengan @media print stylesheet.

## 11. Setup Admin Pertama
Fungsi `setup()` di backend (dijalankan manual via Apps Script editor): buat semua sheet + header + default settings + buat akun `admin` dengan password acak 12 karakter, return password di Logger.log & sebagai return value (tampil sekali). TIDAK ada default password permanen. Dokumentasikan di DEPLOYMENT.md.

Semua agen WAJIB membaca file ini sebelum menulis kode dan menyesuaikan output dengan path absolut di atas.
