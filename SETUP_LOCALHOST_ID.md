# Setup Localhost - Vapestore POS

Panduan lengkap untuk menjalankan Vapestore POS di localhost Anda.

## Prerequisites

Pastikan sudah install:
- **Node.js** v18+ (cek: `node --version`)
- **pnpm** (package manager, cek: `pnpm --version`)
- **PostgreSQL** v14+ (belum install? ikuti langkah di bawah)
- **Git** (sudah ada)

---

## 1. Install PostgreSQL

### Download & Install

1. Download dari: https://www.postgresql.org/download/windows/
2. Pilih versi terbaru (15.x atau 16.x)
3. Jalankan installer dan ikuti langkah:
   - **Data Directory**: Gunakan default atau ubah sesuai preferensi
   - **Password**: **Ingat password untuk user `postgres`** (misal: `postgres`)
   - **Port**: Gunakan default `5432`
   - **Locale**: Default baik-baik saja

4. Setelah selesai, PostgreSQL akan berjalan otomatis sebagai Windows service

### Verifikasi Instalasi

Buka PowerShell dan jalankan:

```powershell
psql --version
```

Jika muncul versi, PostgreSQL sudah terinstall.

---

## 2. Setup Database User & Database

Gunakan pgAdmin 4 (sudah terinstall dengan PostgreSQL) atau PowerShell.

### Opsi A: Pakai PowerShell (Lebih cepat)

```powershell
# Buka psql dengan user postgres
psql -U postgres

# Jika diminta password, gunakan password yang Anda set saat install
```

Setelah masuk ke psql, jalankan command berikut (copy-paste semua):

```sql
-- 1. Buat user baru untuk aplikasi
CREATE ROLE vapestore_dev WITH LOGIN PASSWORD 'password123';

-- 2. Buat database
CREATE DATABASE vapestore_pos OWNER vapestore_dev;

-- 3. Berikan privilege
GRANT ALL PRIVILEGES ON DATABASE vapestore_pos TO vapestore_dev;
ALTER ROLE vapestore_dev CREATEDB;

-- 4. Keluar
\q
```

### Opsi B: Pakai pgAdmin 4 (GUI)

1. Buka **pgAdmin 4** dari Start menu
2. Klik kanan **Servers** → **Create** → **Server**
3. Tab **General**: Nama = `Localhost`
4. Tab **Connection**:
   - Host: `localhost`
   - Port: `5432`
   - Username: `postgres`
   - Password: (password yang Anda set saat install)
5. Save

Setelah terhubung:
1. Expand Servers → Localhost
2. Klik kanan **Databases** → **Create** → **Database**
3. Nama: `vapestore_pos`, Owner: `vapestore_dev`
4. Save

---

## 3. Test Database Connection

Dari PowerShell, test koneksi:

```powershell
# Test dengan user vapestore_dev
psql -h localhost -U vapestore_dev -d vapestore_pos -c "SELECT version();"

# Masukkan password: password123
```

Jika berhasil, akan keluar versi PostgreSQL.

---

## 4. Setup Project

### A. Install Dependencies

```powershell
# Dari folder project root
cd "c:\Users\rahma\Documents\Mvape-Pos-Rev"
pnpm install
```

### B. Setup Environment Files

Environment file sudah ada di:
- `packages/backend/.env`
- `packages/frontend/.env.local`

Cek isi file `.env` backend sudah benar:

```powershell
cat packages/backend/.env
```

Harus berisi:
```
DATABASE_URL=postgresql://vapestore_dev:password123@localhost:5432/vapestore_pos
PORT=3001
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000
...
```

Jika belum, update dengan nilai yang benar.

---

## 5. Jalankan Aplikasi

### Terminal 1: Backend (Port 3001)

```powershell
cd c:\Users\rahma\Documents\Mvape-Pos-Rev\packages\backend
pnpm run dev
```

Tunggu sampai muncul:
```
[INFO] 🚀 Backend API is running on http://localhost:3001
```

**Migrations akan jalan otomatis** saat backend start, membuat semua tabel database.

### Terminal 2: Frontend (Port 3000)

```powershell
cd c:\Users\rahma\Documents\Mvape-Pos-Rev\packages\frontend
pnpm run dev
```

Tunggu sampai muncul:
```
> ready - started server on 0.0.0.0:3000, url: http://localhost:3000
```

### Akses Aplikasi

Buka browser:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001/health

---

## 6. Troubleshooting

### Error: "psql is not recognized"

PostgreSQL belum di-install atau belum di-add ke PATH Windows.
→ Install PostgreSQL atau restart komputer setelah install.

### Error: "password authentication failed"

Password salah atau user tidak ada.
→ Pastikan user `vapestore_dev` sudah dibuat dengan password `password123`.
→ Atau update `DATABASE_URL` di `.env` sesuai kredensial Anda.

### Error: "Cannot connect to database"

PostgreSQL service tidak berjalan.
→ Buka Services (Win + R → services.msc) → cari `postgresql` → start jika stopped.
→ Atau restart komputer.

### Frontend/Backend tidak bisa connect satu sama lain

Cek `CORS_ORIGIN` di `packages/backend/.env`:
```
CORS_ORIGIN=http://localhost:3000
```

Harus betul-betul `http://localhost:3000` (tidak ada trailing slash).

### Port 3000 atau 3001 sudah dipakai aplikasi lain

Ganti port di `.env`:
```
PORT=3001  → PORT=3002
```

Dan update di frontend `.env.local`:
```
NEXT_PUBLIC_API_URL=http://localhost:3002
```

---

## 7. Stop Aplikasi

Tekan `Ctrl + C` di setiap terminal untuk stop backend dan frontend.

---

## 8. Database Commands (Useful)

Masuk ke database:
```powershell
psql -h localhost -U vapestore_dev -d vapestore_pos
```

Useful commands:
```sql
-- Lihat semua table
\dt

-- Lihat isi tabel users
SELECT * FROM users;

-- Exit
\q
```

---

## Next Steps

Setelah berhasil setup:

1. **Login ke aplikasi**
   - Default user: `admin` (dibuat oleh seed script)
   - Password: `password123` (atau sesuai di seed)

2. **Test fitur**
   - Buat toko (Store)
   - Buat produk
   - Buat transaksi

3. **Deploy ke Vercel** (backend di Railway)
   - Ikuti dokumentasi: `DEPLOYMENT_VERCEL.md`

---

## Support

Jika ada error, cek:
1. PostgreSQL running? (Services)
2. User & database sudah dibuat?
3. DATABASE_URL benar di `.env`?
4. Port 3000 & 3001 tersedia?
5. Dependencies sudah di-install? (`pnpm install`)

Tanya ke dokumentasi atau issues di project.
