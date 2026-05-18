# 🔐 API Key Setup - Hiking Map Deployment Guide

## 🎯 Quick Start (2 Steps)

### Step 1: Get Free OpenRouteService API Key
Visit: https://openrouteservice.org/dev/#/signup

- Takes ~10 seconds to create account
- Fill in email, choose a password
- Copy your API key (looks like: `or_abc123...xyz789`)

### Step 2: Configure GitHub (Production Deployment)

```bash
# Go to your repository on GitHub
# Settings → Secrets and variables → Actions → New repository secret

Name: OR_API_KEY
Value: [paste your API key here]

Click "Add secret" ✅
```

That's it! When users open the app and click "Build Route", they'll see a friendly popup with options to configure.

---

## 📋 What Gets Deployed

When you push code, GitHub Actions will:

1. Read your `OR_API_KEY` secret securely
2. Generate encrypted token hash via PBKDF2
3. Embed hashed token in build configuration
4. Build static files (no Node.js needed)
5. Deploy to `gh-pages` branch → GitHub Pages automatically served

**No server required!** Just push and it's live! 🎉

---

## 💡 For Users - How They'll Experience the App

### First Time User:
1. Opens hiking map app (you host at `yourname.github.io/hiking-map`)
2. Browses freely - searches spots, views markers ✅
3. Clicks "Build Route" button 🥾
4. **Popup appears:**
   ```
   🔐 API Key Setup
   
   Want to build hiking routes without limitations? 
   
   Options:
   [✅ Continue with Demo Mode] ← Works perfectly!
   [➕ Add My API Key]          ← If they sign up
   [🔗 Sign Up Now]             ← Direct to signup page
   ```

5. Choose any option - all work fine for personal use!

### Return Users:
- No popup (keys already stored)
- Routes build automatically
- Can clear keys anytime via console command

---

## 🔐 Security Summary

```
User Browser ──[Encrypted Storage]──► User Controls Everything
                                      │
GitHub Actions Secret ───────────────► Never Exposed to Users
                                      │
Build Config ──[Encrypted Token]────► Safe for Client-Side Use
```

### What Users Control:
- ✅ Their browser's localStorage only
- ✅ Can choose demo mode (no key needed)
- ✅ Can set password for extra security
- ✅ Keys never sent to any server

### What We Protect:
- ✅ Raw API keys in GitHub Secrets
- ✅ Encrypted storage prevents leaks
- ✅ No hardcoded credentials in code

---

## 📦 Deployment Checklist

Before deploying to production:

- [ ] Sign up for OpenRouteService account (free)
- [ ] Get your API key from dashboard
- [ ] Add `OR_API_KEY` as GitHub secret
- [ ] Push code to test branch first
- [ ] Test deployed site works
- [ ] Confirm users can configure via popup

---

## 🆘 Troubleshooting

### Build Fails with "Secret not found"
**Fix:** Check spelling in GitHub secrets - must be exactly `OR_API_KEY`

### Routes Not Building After Deploy
**Cause:** User needs to configure keys  
**Solution:** Show them the setup popup appears on first route build

### Popup Doesn't Appear
**Check browser console:**
```javascript
// Should show this if not configured:
{ orApiKey: '', demoMode: true }
```

---

## 📞 Need Help?

- **User Setup:** `docs/API_KEY_SETUP.md`
- **Advanced Security:** `docs/SECURITY_GUIDE.md`
- **Build Config:** `.github/workflows/build-and-deploy.yml`

---

**For personal use without GitHub Pages?** Just open `index.html` directly - no setup needed!
