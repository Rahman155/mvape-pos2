# Deploy ke Vercel - Panduan Lengkap

## 📋 Prasyarat

Sebelum memulai, pastikan Anda memiliki:
1. **GitHub Account** (required untuk deploy via Vercel)
2. **Vercel Account** (gratis di https://vercel.com)
3. **Node.js v20+** (sudah terinstall)
4. **Git** (sudah terinstall)

---

## 🚀 Langkah-Langkah Deployment

### STEP 1: Persiapkan Repository Git

```bash
# 1. Inisialisasi git (jika belum ada)
cd C:\Users\rahma\Documents\Mvape-Pos-Rev
git init

# 2. Add remote repository GitHub
git remote add origin https://github.com/YOUR_USERNAME/mvape-pos.git

# 3. Buat .gitignore (jika belum ada)
# File: .gitignore sudah ada, tapi pastikan include:
# node_modules/
# dist/
# .next/
# .env.local
# .env.*.local

# 4. Stage dan commit semua files
git add .
git commit -m "Initial commit: Vapestore POS PWA"

# 5. Push ke GitHub
git branch -M main
git push -u origin main
```

---

### STEP 2: Buat Vercel Configuration

**File: `vercel.json` (di root project)**

```json
{
  "version": 2,
  "buildCommand": "pnpm run build",
  "installCommand": "pnpm install",
  "env": {
    "HUSKY": "0"
  },
  "functions": {
    "packages/backend/dist/**/*.js": {
      "runtime": "nodejs18.x"
    }
  },
  "rewrites": [
    {
      "source": "/api/(.*)",
      "destination": "packages/backend/dist/$1"
    }
  ]
}
```

---

### STEP 3: Setup Environment Variables

**File: `.env.production` (di root)**

```
# Backend
NODE_ENV=production
DATABASE_URL=your_postgres_url
REDIS_URL=your_redis_url
JWT_SECRET=your_jwt_secret_key
CORS_ORIGIN=https://your-domain.vercel.app

# Frontend
NEXT_PUBLIC_API_URL=https://your-api.vercel.app
NEXT_PUBLIC_APP_NAME=Vapestore POS PWA
```

---

### STEP 4: Deploy Frontend (Next.js) ke Vercel

**Opsi A: Via Vercel Dashboard (Recommended)**

1. Buka https://vercel.com/dashboard
2. Click "Add New..." → "Project"
3. Select "Import Git Repository"
4. Pilih repository Anda (`mvape-pos`)
5. Configure:
   - **Framework Preset**: Next.js
   - **Root Directory**: `packages/frontend`
   - **Build Command**: `pnpm run build`
   - **Environment Variables**: Add variables dari `.env.production`
6. Click "Deploy"

**Opsi B: Via Vercel CLI**

```bash
# 1. Install Vercel CLI
npm i -g vercel

# 2. Deploy frontend
cd packages/frontend
vercel --prod
# Follow prompts dan set environment variables
```

---

### STEP 5: Deploy Backend (Node.js Express) ke Vercel

Vercel tidak ideal untuk long-running services. Alternatif lebih baik:

#### **Pilihan A: Deploy ke Railway.app** (Recommended)

1. Buka https://railway.app
2. Click "New Project"
3. Select "Deploy from GitHub"
4. Pilih repository Anda
5. Configure:
   - **Start Command**: `node packages/backend/dist/index.js`
   - **Environment Variables**: Add dari `.env.production`
   - **Port**: Ensure your app listens on $PORT
6. Deploy

**Modifikasi `packages/backend/src/index.ts`:**

```typescript
const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});
```

#### **Pilihan B: Deploy ke Render.com**

1. Buka https://render.com
2. New → "Web Service"
3. Connect GitHub repo
4. Configure:
   - **Build Command**: `cd packages/backend && pnpm install && pnpm run build`
   - **Start Command**: `node dist/index.js`
   - **Environment**: Node
5. Add Environment Variables
6. Deploy

#### **Pilihan C: Deploy ke Fly.io**

```bash
# 1. Install Fly CLI
curl https://fly.io/install.sh | sh

# 2. Login
flyctl auth login

# 3. Create app
flyctl launch --no-deploy

# 4. Set environment variables
flyctl secrets set DATABASE_URL=... REDIS_URL=... JWT_SECRET=...

# 5. Deploy
flyctl deploy
```

---

### STEP 6: Database Setup

#### **PostgreSQL** (Recommended: Supabase atau Railway)

```bash
# Supabase (Easy Setup)
# 1. Buka https://supabase.com
# 2. Create Project
# 3. Get CONNECTION_STRING dari Settings → Database
# 4. Set DATABASE_URL=your_connection_string
```

#### **Redis** (Untuk Cache)

```bash
# Redis Cloud (Free tier tersedia)
# 1. Buka https://redis.com/cloud/
# 2. Create Database (Free)
# 3. Get CONNECTION_URL
# 4. Set REDIS_URL=your_redis_url
```

---

### STEP 7: Frontend Environment Variables (Vercel)

Di **Vercel Dashboard** → Project Settings → Environment Variables:

```
NEXT_PUBLIC_API_URL=https://your-backend-api.railway.app
NEXT_PUBLIC_APP_NAME=Vapestore POS PWA
NEXT_PUBLIC_ENVIRONMENT=production
```

---

### STEP 8: Backend Environment Variables

Di **Railway/Render/Fly Dashboard**:

```
NODE_ENV=production
DATABASE_URL=postgresql://user:pass@host:5432/dbname
REDIS_URL=redis://default:password@host:port
JWT_SECRET=your-super-secret-key-min-32-chars
CORS_ORIGIN=https://your-app.vercel.app
PORT=3001
```

---

### STEP 9: Update Frontend API URL

**File: `packages/frontend/src/lib/api.ts` (or similar)**

```typescript
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 10000,
});
```

---

### STEP 10: Deploy & Test

1. **Push latest changes ke GitHub:**
   ```bash
   git add .
   git commit -m "Setup production deployment"
   git push origin main
   ```

2. **Vercel otomatis redeploy** ketika ada push ke `main` branch

3. **Test aplikasi:**
   - Frontend: `https://your-app.vercel.app`
   - API: `https://your-api.railway.app/health`

4. **Monitor logs:**
   - Vercel: Dashboard → Deployments → Logs
   - Railway/Render: Dashboard → Logs

---

## 🔗 Recommended Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Your Domain                           │
│         (https://vapestore-pos.example.com)              │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  ┌──────────────────┐          ┌──────────────────┐     │
│  │  Vercel (CDN)    │          │  Railway/Render  │     │
│  │  ├─ Frontend     │────API───│  ├─ Backend API  │     │
│  │  │ (Next.js)     │          │  └─ Node.js      │     │
│  │  └─ Static Site  │          └──────────────────┘     │
│  └──────────────────┘          ┌──────────────────┐     │
│                                │  Supabase/AWS    │     │
│  GitHub Repo                   │  ├─ PostgreSQL   │     │
│  (Source Control)              │  └─ Database     │     │
│                                └──────────────────┘     │
│                                ┌──────────────────┐     │
│                                │  Redis Cloud     │     │
│                                │  ├─ Cache        │     │
│                                │  └─ Session      │     │
│                                └──────────────────┘     │
└─────────────────────────────────────────────────────────┘
```

---

## 📊 Comparison: Where to Deploy Backend

| Platform | Pros | Cons | Cost |
|----------|------|------|------|
| **Railway** | Easy setup, good UI, fast | Limited free tier | $5-20/mo |
| **Render** | Free tier available, auto-deploy | Sometimes slow | Free-$20/mo |
| **Fly.io** | Global deployment, fast | Steeper learning curve | $5-20/mo |
| **Heroku** | Simple | ❌ Removed free tier | $50+/mo |
| **AWS Elastic Beanstalk** | Scalable | Complex setup | $10-100+/mo |

**Recommended:** Railway.app (best balance of ease & performance)

---

## ✅ Checklist Sebelum Deploy

- [ ] GitHub repository dibuat dan terhubung
- [ ] `.gitignore` sudah benar (exclude `.env.local`)
- [ ] Vercel account dibuat
- [ ] Railway/Render account dibuat
- [ ] Database (PostgreSQL) dibuat dan URL didapat
- [ ] Redis/Cache setup selesai
- [ ] Environment variables sudah disiapkan
- [ ] `PORT` environment variable ditambahkan di backend
- [ ] CORS_ORIGIN diset ke Vercel URL
- [ ] Frontend API URL diupdate
- [ ] Build lokal berhasil (`pnpm run build`)
- [ ] Tests passed
- [ ] Git push dilakukan

---

## 🆘 Troubleshooting

### Frontend tidak bisa connect ke Backend API
```
Solusi:
1. Cek NEXT_PUBLIC_API_URL di Vercel env vars
2. Cek CORS_ORIGIN di backend matches frontend URL
3. Pastikan backend running dan accessible
```

### Database connection error
```
Solusi:
1. Verify DATABASE_URL format
2. Check database credentials
3. Allow Vercel IPs di database firewall
```

### Build failure di Vercel
```
Solusi:
1. Check build logs di Vercel dashboard
2. Ensure pnpm installed (add engine requirements)
3. Run `pnpm run build` locally untuk test
```

---

## 🎉 Setelah Deploy

1. Setup Custom Domain:
   - Vercel → Project Settings → Domains
   - Add your domain dan follow DNS setup

2. Setup SSL Certificate:
   - Automatic untuk Vercel
   - Manual untuk Railway (use Let's Encrypt)

3. Monitor Performance:
   - Vercel Analytics
   - Railway Metrics
   - Database Query Performance

4. Setup CI/CD:
   - GitHub Actions untuk automated testing
   - Automatic deploy on `main` branch push

---

## 📚 Resources

- **Vercel Docs**: https://vercel.com/docs
- **Next.js Deployment**: https://nextjs.org/docs/deployment
- **Railway Docs**: https://docs.railway.app
- **Express on Railway**: https://docs.railway.app/guides/nodejs

---

**Questions?** Check logs di masing-masing platform dashboard.
Good luck! 🚀
