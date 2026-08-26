# Vercel Deployment Guide - Monorepo (pnpm)

## 🚨 Error: "No Next.js version detected"

This error occurs when:
1. **Root Directory is incorrect** in Vercel
2. **Build settings are wrong** for monorepo
3. **pnpm is not installed** in Vercel environment

---

## ✅ Solution: Correct Vercel Configuration

### Step 1: Ensure GitHub Push Successful
```bash
# Verify master branch on GitHub
# https://github.com/Rahman155/mvape-pos2
```

### Step 2: In Vercel Dashboard - Import Project

1. Buka https://vercel.com/dashboard
2. Klik "Add New" → "Project"
3. Select "Import Git Repository"
4. Paste: `https://github.com/Rahman155/mvape-pos2`
5. Click "Import"

### Step 3: Configure Project Settings

**Important: Set these EXACTLY as shown!**

| Setting | Value |
|---------|-------|
| **Framework Preset** | Next.js |
| **Root Directory** | `packages/frontend` ✅ |
| **Build Command** | (Leave default or use) `pnpm run build` |
| **Install Command** | (Leave default or use) `pnpm install` |
| **Output Directory** | (Leave default) `.next` |

**Screenshot reference:**
```
Project Name: mvape-pos
Framework Preset: Next.js
Root Directory: packages/frontend  ← CRITICAL!
Build Command: pnpm run build
Install Command: pnpm install
```

### Step 4: Environment Variables

Add these in Vercel Dashboard:
- **Settings** → **Environment Variables**

```
NEXT_PUBLIC_API_URL = https://your-backend-api.railway.app
NEXT_PUBLIC_APP_NAME = Vapestore POS PWA
NEXT_PUBLIC_ENVIRONMENT = production
```

### Step 5: Deploy

Click "Deploy" and wait for build to complete.

---

## 🔧 If Still Failing: Advanced Configuration

Create/Update `vercel.json` at **root level** (`c:\Users\rahma\Documents\Mvape-Pos-Rev\vercel.json`):

```json
{
  "version": 2,
  "buildCommand": "cd packages/frontend && pnpm run build",
  "installCommand": "pnpm install --recursive",
  "env": {
    "HUSKY": "0"
  },
  "framework": "nextjs",
  "outputDirectory": ".next",
  "monorepo": true,
  "public": false,
  "cleanUrls": true
}
```

**Then commit and push to GitHub:**
```bash
git add vercel.json
git commit -m "Fix Vercel monorepo configuration"
git push origin master
```

Vercel akan automatically redeploy dengan config baru.

---

## 📋 Checklist for Vercel Deployment

- [ ] Repository pushed to GitHub (`master` branch)
- [ ] `packages/frontend/package.json` has `"next"` in dependencies
- [ ] `packages/frontend/next.config.mjs` exists
- [ ] Root Directory set to `packages/frontend` in Vercel
- [ ] Build Command: `pnpm run build`
- [ ] Install Command: `pnpm install`
- [ ] Environment variables added: `NEXT_PUBLIC_API_URL`, etc
- [ ] `vercel.json` at root with correct monorepo config
- [ ] Commit `vercel.json` to GitHub

---

## 🎯 Deployment Steps (In Order)

### 1. Verify Local Build Works
```bash
cd c:\Users\rahma\Documents\Mvape-Pos-Rev\packages\frontend
pnpm install
pnpm run build
```
Should create `.next` folder without errors.

### 2. Push to GitHub
```bash
cd c:\Users\rahma\Documents\Mvape-Pos-Rev
git add .
git commit -m "Ready for Vercel deployment"
git push origin master
```

### 3. Vercel Configuration
- Go to https://vercel.com/dashboard
- New Project → Import `mvape-pos2` repo
- **Set Root Directory: `packages/frontend`** ← MOST IMPORTANT
- Add env vars
- Deploy

### 4. Verify Deployment
- Frontend: `https://your-project.vercel.app`
- Should show Vapestore POS PWA

---

## 🆘 Troubleshooting

### Error: "No Next.js version detected"
**Fix:**
1. Check Root Directory is `packages/frontend` ✓
2. Check `packages/frontend/package.json` has `next` ✓
3. Rebuild in Vercel: Deployments → Trigger Deploy → Redeploy

### Error: "Cannot find module '@vapestore-pos/shared'"
**Fix:**
```bash
# Ensure shared package is built
cd packages/shared
pnpm run build
git add -A
git commit -m "Build shared package"
git push origin master
```

### Build fails with "pnpm: not found"
**Fix:**
- Update `vercel.json`:
```json
{
  "installCommand": "npm install -g pnpm && pnpm install --recursive"
}
```

### Build success but app shows blank page
**Check:**
1. Browser console for errors
2. `NEXT_PUBLIC_API_URL` is set correctly
3. Backend API is running and accessible

---

## 📚 Useful Links

- **Vercel Docs**: https://vercel.com/docs
- **Next.js Deployment**: https://nextjs.org/docs/deployment/vercel
- **Monorepo with pnpm**: https://vercel.com/docs/concepts/monorepos/monorepos
- **Environment Variables**: https://vercel.com/docs/concepts/projects/environment-variables

---

## ✨ After Successful Deployment

1. **Setup custom domain:**
   - Vercel Dashboard → Settings → Domains
   - Add your custom domain

2. **Enable Analytics:**
   - Vercel Dashboard → Analytics
   - Track user behavior, performance

3. **Setup Git push to auto-deploy:**
   - Already enabled! Every push to `master` auto-deploys

4. **Protect production branch:**
   - GitHub → Settings → Branch protection rules
   - Require PR reviews before merge

---

**Need help?** Check Vercel logs:
- Vercel Dashboard → Deployments → Click failed deployment → Logs
- Look for specific error messages

Good luck! 🚀
