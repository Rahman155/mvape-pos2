# 🔑 Manual Git Push Guide

PowerShell di Kiro memiliki masalah output. Silakan jalankan commands ini di **VS Code Terminal** atau **Command Prompt** untuk push ke GitHub.

## Option 1: Menggunakan Personal Access Token (RECOMMENDED)

### Step 1: Buat Personal Access Token di GitHub
1. Buka https://github.com/settings/tokens
2. Klik "Generate new token" → "Generate new token (classic)"
3. Masukkan nama: "Mvape POS Deployment"
4. Checklist permissions:
   - ✅ `repo` (full control)
   - ✅ `workflow` (actions)
5. Klik "Generate token"
6. **COPY token** (hanya muncul 1 kali!)

### Step 2: Push dengan Token
Buka VS Code Terminal atau Command Prompt dan jalankan:

```bash
cd C:\Users\rahma\Documents\Mvape-Pos-Rev

# Configure git
git config --global user.name "Rahman"
git config --global user.email "your-email@example.com"

# Set remote dengan token
git remote set-url origin https://Rahman155:YOUR_TOKEN_HERE@github.com/Rahman155/mvape-pos2.git

# Push ke GitHub
git push -u origin master

# Verify
git log --oneline -5
```

**Replace `YOUR_TOKEN_HERE` dengan token yang Anda generate tadi!**

---

## Option 2: Menggunakan Git Credential Manager

Jika Anda sudah install Git Credential Manager:

```bash
cd C:\Users\rahma\Documents\Mvape-Pos-Rev

# Configure git
git config --global user.name "Rahman"
git config --global user.email "your-email@example.com"

# Change remote ke HTTPS
git remote set-url origin https://github.com/Rahman155/mvape-pos2.git

# Push (akan prompt untuk password/token)
git push -u origin master
```

Ketika diminta password, **gunakan Personal Access Token** (bukan password GitHub).

---

## Option 3: Menggunakan SSH (Advanced)

Jika Anda familiar dengan SSH:

```bash
# Generate SSH key
ssh-keygen -t ed25519 -C "your-email@example.com"

# Add to SSH agent
eval $(ssh-agent -s)
ssh-add ~/.ssh/id_ed25519

# Add SSH key to GitHub
# 1. Copy public key: Get-Content ~/.ssh/id_ed25519.pub
# 2. Buka https://github.com/settings/keys
# 3. New SSH key, paste
# 4. Save

# Change remote ke SSH
git remote set-url origin git@github.com:Rahman155/mvape-pos2.git

# Push
git push -u origin master
```

---

## ✅ Verify Push Success

Setelah push berhasil, check di GitHub:

```
https://github.com/Rahman155/mvape-pos2
```

Anda harus melihat:
- ✅ Branch `master` dengan semua files
- ✅ Commits dengan deployment docs
- ✅ package.json, tsconfig.json, dll

---

## 🚨 Troubleshooting

### Error: "fatal: could not read Username"
**Solution**: Gunakan Personal Access Token, bukan password

### Error: "fatal: could not read Password for 'https://github.com'"
**Solution**: 
1. Setup Git Credential Manager
2. Atau gunakan Personal Access Token di URL

### Error: "Remote branch master not found"
**Solution**: Pastikan push ke `master` (bukan `main`):
```bash
git push -u origin master
```

### Error: "Permission denied (publickey)"
**Solution**: Setup SSH key dengan benar (Option 3)

---

## Next After Push Success

Setelah `git push` berhasil:

1. Verifikasi di GitHub
2. Buka https://vercel.com
3. Import repository
4. Set root directory ke `packages/frontend`
5. Deploy!

---

**Questions?** Check GitHub's official guide:
https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens
