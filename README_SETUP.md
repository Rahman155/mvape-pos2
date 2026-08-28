# Vapestore POS - Setup Panduan Cepat

Panduan setup cepat untuk menjalankan aplikasi di localhost.

## 🚀 Quick Start (5 menit)

### 1. Prerequisites

Pastikan sudah install:
```powershell
# Check Node.js
node --version    # Harus v18+

# Check pnpm
pnpm --version    # Harus ada

# Check PostgreSQL
psql --version    # Jika belum, install dari https://www.postgresql.org/download/windows/
```

### 2. Setup Database (Hanya kali pertama)

Jalankan script setup:

```powershell
powershell -ExecutionPolicy Bypass -File SETUP_DATABASE.ps1
```

Script ini akan:
- ✅ Check PostgreSQL installation
- ✅ Create user `vapestore_dev`
- ✅ Create database `vapestore_pos`
- ✅ Grant permissions

**Input yang dibutuhkan:** Password user `postgres` (yang Anda set saat install PostgreSQL)

### 3. Install Dependencies

```powershell
pnpm install
```

### 4. Start Development Servers

**Opsi A: Menggunakan Script (Recommended)**

```powershell
powershell -ExecutionPolicy Bypass -File START_DEV.ps1
```

Pilih menu, misal:
- `1` untuk Backend only
- `2` untuk Frontend only
- `3` untuk Backend + Frontend

**Opsi B: Manual (2 Terminal)**

Terminal 1 - Backend:
```powershell
cd packages\backend
pnpm run dev
```

Terminal 2 - Frontend:
```powershell
cd packages\frontend
pnpm run dev
```

### 5. Akses Aplikasi

Buka browser:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001/api/v1
- **Health Check**: http://localhost:3001/health

---

## 📚 Dokumentasi Lengkap

- **Setup Detail**: `SETUP_LOCALHOST_ID.md`
- **Deploy ke Vercel**: `DEPLOYMENT_VERCEL.md`
- **Deploy ke Railway**: `QUICK_START_DEPLOY.md`

---

## 🐛 Troubleshooting

### PostgreSQL Error

**Error:** `password authentication failed`
```
→ Pastikan user vapestore_dev sudah dibuat
→ Jalankan: powershell -ExecutionPolicy Bypass -File SETUP_DATABASE.ps1
```

**Error:** `Connection refused`
```
→ PostgreSQL service tidak running
→ Buka Services.msc → Cari postgresql → Click Start
→ Atau: net start postgresql-x64-15
```

### Port Error

**Error:** `Port 3000 already in use`
```
→ Update PORT di packages/backend/.env
→ Update NEXT_PUBLIC_API_URL di packages/frontend/.env.local
```

### Dependencies Error

**Error:** `Cannot find module`
```
→ Jalankan: pnpm install
→ Atau: pnpm install --force
```

---

## 📝 Default Credentials

Setelah database setup, Anda bisa login dengan:

**Database:**
- User: `vapestore_dev`
- Password: `password123`
- Host: `localhost`
- Port: `5432`
- Database: `vapestore_pos`

**Aplikasi:** (Setelah seed data)
- Email: `admin@vapestore.com`
- Password: `password123`

---

## ✅ Verification Checklist

Sebelum development:

- [ ] PostgreSQL installed dan running
- [ ] Database `vapestore_pos` created
- [ ] User `vapestore_dev` created
- [ ] `pnpm install` completed
- [ ] `.env` files exist di backend dan frontend
- [ ] Port 3000 dan 3001 available
- [ ] Backend start without error
- [ ] Frontend start without error

---

## 🎯 Architecture

```
Vapestore POS
├── Frontend (Next.js)
│   ├── Port: 3000
│   ├── Tech: React, TypeScript, Tailwind CSS
│   └── .env.local: API URL config
│
├── Backend (Express.js)
│   ├── Port: 3001
│   ├── Tech: Node.js, TypeScript, PostgreSQL
│   ├── API: http://localhost:3001/api/v1
│   └── .env: Database config
│
└── Database (PostgreSQL)
    ├── Host: localhost
    ├── Port: 5432
    ├── Database: vapestore_pos
    └── User: vapestore_dev
```

---

## 📖 Project Structure

```
Mvape-Pos-Rev/
├── packages/
│   ├── backend/          # Express API
│   │   ├── src/
│   │   ├── package.json
│   │   └── .env
│   │
│   ├── frontend/         # Next.js App
│   │   ├── src/
│   │   ├── package.json
│   │   └── .env.local
│   │
│   └── shared/           # Shared types
│
├── SETUP_DATABASE.ps1    # Database setup script
├── START_DEV.ps1         # Development start script
├── SETUP_LOCALHOST_ID.md # Detailed guide (Indonesian)
└── README.md             # Main readme
```

---

## 🚀 Next Steps

1. **Development**
   - Modify code in `packages/frontend` or `packages/backend`
   - Changes auto-reload (dev mode)

2. **Testing**
   - Backend: `pnpm run test` in `packages/backend`
   - Frontend: `pnpm run test` in `packages/frontend`

3. **Build for Production**
   ```powershell
   pnpm run build
   ```

4. **Deploy**
   - Follow: `DEPLOYMENT_VERCEL.md`

---

## 📞 Support

Jika ada error:
1. Baca dokumentasi lengkap: `SETUP_LOCALHOST_ID.md`
2. Check logs di console (backend/frontend)
3. Verify database connection
4. Check environment variables

---

**Happy coding! 🎉**
