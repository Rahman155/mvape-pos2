# 🚀 Quick Start: Deploy to Vercel dalam 5 Menit

## Opsi Tercepat: Frontend ke Vercel

### Step 1: Push ke GitHub
```bash
cd C:\Users\rahma\Documents\Mvape-Pos-Rev
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/mvape-pos
git push -u origin main
```

### Step 2: Connect Vercel to GitHub
1. Buka https://vercel.com
2. Klik "New Project"
3. Import repository GitHub Anda
4. Pilih `packages/frontend` sebagai root directory
5. Klik "Deploy"

**Frontend siap in 2 menit!** ✅

---

## Backend: Deploy ke Railway (5 menit)

### Step 1: Buat Railway Account
- Buka https://railway.app
- Sign up dengan GitHub

### Step 2: Deploy Backend
1. Klik "New Project"
2. Select "Deploy from GitHub repo"
3. Pilih repo Anda
4. Konfigurasi:
   - **Root Directory**: `packages/backend`
   - **Start Command**: `node dist/index.js`
   - **Build Command**: `pnpm install && pnpm run build`

### Step 3: Add Database
1. Dalam Railway dashboard: "Add Service" → "PostgreSQL"
2. Copy `DATABASE_URL` dari tab Variables
3. Paste ke backend environment variables

### Step 4: Deploy
Klik "Deploy" dan tunggu...

**Backend siap in 5 menit!** ✅

---

## Update Frontend API URL

1. Di Vercel dashboard:
   - Settings → Environment Variables
   - Add: `NEXT_PUBLIC_API_URL = https://your-railway-api-url`

2. Redeploy:
   - Klik Deployments → Redeploy

---

## Verify Deployment

### Frontend:
```
https://your-app.vercel.app
```

### Backend API:
```
curl https://your-api.railway.app/health
```

Should return: `{ "status": "ok" }`

---

## 🎉 Selesai!

Aplikasi Anda sekarang live!

**Problematic?** Check:
1. Vercel Logs: Dashboard → Deployments → Logs
2. Railway Logs: Dashboard → Deployments → Logs
3. Environment variables sudah benar

---

## Next Steps

- [ ] Setup custom domain di Vercel
- [ ] Setup SSL/HTTPS (automatic)
- [ ] Configure CI/CD dengan GitHub Actions
- [ ] Setup monitoring dan alerts
- [ ] Daily backup database
