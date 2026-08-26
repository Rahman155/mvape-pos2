# ✅ Vercel Deployment Checklist

## Prerequisites
- [ ] GitHub account created
- [ ] Repository pushed to GitHub (master branch)
- [ ] Vercel account created (vercel.com)

---

## Step 1: GitHub Push (MUST DO FIRST)
- [ ] Code committed locally
- [ ] Remote configured: `https://github.com/Rahman155/mvape-pos2.git`
- [ ] Push executed: `git push -u origin master`
- [ ] Verify on GitHub: https://github.com/Rahman155/mvape-pos2

**Status:** ⏳ (Waiting for Git push)

---

## Step 2: Vercel Project Creation
- [ ] Go to https://vercel.com/dashboard
- [ ] Click "Add New" → "Project"
- [ ] Click "Import Git Repository"
- [ ] Select `mvape-pos2` repository
- [ ] Click "Import"

**Expected:** Vercel loads repo and shows import form

---

## Step 3: Configure Root Directory (CRITICAL!)
In Vercel import form:
- [ ] **Framework Preset**: Next.js
- [ ] **Root Directory**: `packages/frontend` ← TYPE THIS EXACTLY
- [ ] **Build Command**: Leave default or `pnpm run build`
- [ ] **Install Command**: Leave default or `pnpm install`

**Screenshot should show:**
```
Root Directory: packages/frontend
```

---

## Step 4: Add Environment Variables
In Vercel import form, click "Environment Variables" and add:

```
NEXT_PUBLIC_API_URL = https://your-backend-url-here.railway.app

NEXT_PUBLIC_APP_NAME = Vapestore POS PWA

NEXT_PUBLIC_ENVIRONMENT = production
```

- [ ] Variable 1: `NEXT_PUBLIC_API_URL` added
- [ ] Variable 2: `NEXT_PUBLIC_APP_NAME` added
- [ ] Variable 3: `NEXT_PUBLIC_ENVIRONMENT` added

---

## Step 5: Deploy
- [ ] Click "Deploy" button
- [ ] Wait for build to complete (5-10 minutes)
- [ ] Verify no errors in logs

---

## Step 6: Verify Deployment Success
- [ ] Deployment shows "Ready"
- [ ] Visit: `https://your-project.vercel.app`
- [ ] Page loads without errors
- [ ] Check browser console (F12) for errors

**Expected URL:** Something like:
```
https://mvape-pos2.vercel.app
```

---

## Step 7: If Build Failed
1. [ ] Click failed deployment
2. [ ] Check "Logs" tab
3. [ ] Look for error message
4. [ ] Compare with `VERCEL_DEPLOYMENT_GUIDE.md`
5. [ ] Fix locally and push to GitHub
6. [ ] Vercel auto-redeploys

---

## Backend Deployment (Next)
After frontend is working:
- [ ] Deploy backend to Railway.app
- [ ] Setup PostgreSQL database
- [ ] Update `NEXT_PUBLIC_API_URL` with backend URL
- [ ] Frontend auto-redeploys with new API URL

---

## Final Verification
- [ ] Frontend: https://your-project.vercel.app ✅
- [ ] Backend: https://your-api.railway.app/health ✅
- [ ] API calls working
- [ ] Database connected
- [ ] All features working

---

## 🎉 DONE!
Application is live and accessible on Vercel!

---

**Need Help?**
1. Read: `VERCEL_DEPLOYMENT_GUIDE.md` (full guide)
2. Check: Vercel logs for error messages
3. Review: Environment variables are correct
4. Verify: GitHub push was successful
