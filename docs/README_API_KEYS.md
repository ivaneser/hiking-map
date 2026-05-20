# 🔐 API Key Management Solution - Complete Guide

This document explains the complete solution for securely managing API keys in Hiking Map.

---

## 📦 What Was Added

### Core Files Created

| File | Purpose |
|------|---------|
| `api-keys.js` | Secure encrypted API key storage using Web Crypto API (AES-GCM) |
| `config.js` | Configuration loader for browser and runtime settings |
| `setup-api-keys.js` | API key setup modal/loader |
| `.github/workflows/build-and-deploy.yml` | CI/CD workflow with GitHub Actions secrets |
| `.env.example` | Environment variable template for local development |
| `docs/API_KEY_SETUP.md` | User-facing setup guide |
| `docs/SECURITY_GUIDE.md` | Detailed security documentation |
| `.github/secrets-template.md` | Documentation for GitHub secrets |

### Files Modified

| File | Changes |
|------|---------|
| `script.js` | Replaced hardcoded API key with configuration lookup |
| `index.html` | Added config scripts and setup auto-loader |
| `README.md` | Updated security section with API key info |
| `.gitignore` | Added `.env` to prevent committing sensitive files |

---

## 🎯 How It Works

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Hiking Map Application                     │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────────┐      ┌──────────────────────────────┐ │
│  │   Browser Storage │      │     Build-Time Injection     │ │
│  │  (localStorage)   │ ◄──► │      (GitHub Actions)        │ │
│  └────────┬─────────┘      └──────────────────────────────┘ │
│           │                                                  │
│         Encrypt/Decrypt                                     │
│           │                                                  │
│    ┌──────▼──────┐                                           │
│    │   API Key   │ ◄──► User Password (optional)            │
│    │   Storage   │                                           │
│    └─────────────┘                                           │
│                                                               │
│  API Keys → AES-GCM Encrypted in localStorage                │
│                  OR                                          │
│                  Build-time encrypted token hash              │
└─────────────────────────────────────────────────────────────┘
```

### Security Layers

1. **Development Mode**: Auto-detects, uses demo keys (no auth)
2. **Build Time**: GitHub Actions generates encrypted token hash
3. **Storage**: AES-GCM encryption with salt and IV
4. **Optional Password**: PBKDF2 key derivation for extra security

---

## 🚀 Quick Setup Steps

### For End Users (First-time Configuration)

1. **Open the Hiking Map app** in your browser
2. **Look for the floating button**: "🔐 Configure API Keys"
3. **Click it** - setup page opens in new tab
4. **Enter your OpenRouteService API key**
5. **Optional:** Set a password to encrypt storage
6. **Done!** Your keys are now securely stored

### For Developers (Local Testing)

```bash
# 1. Clone the repository
git clone https://github.com/ivaneser/hiking-map.git

# 2. Open in browser
open index.html  # macOS
# or double-click index.html

# 3. Setup page should auto-open, or run:
window.setupApiKeySetup()
```

### For Production Deployment (GitHub Pages)

1. **Get API key**: https://openrouteservice.org/dev/#/signup
2. **Set GitHub Secret**: `OR_API_KEY` (Settings → Secrets)
3. **Push code** - workflow automatically:
   - Reads secret securely
   - Generates encrypted token
   - Builds and deploys

---

## 🔑 API Key Providers

### OpenRouteService (Required for Routing)

- **Free Tier**: Available at https://openrouteservice.org/dev/#/signup
- **Production**: Requires commercial account
- **Demo Mode**: Uses empty keys (for development only)

### Overpass API (Optional, Public)

- No authentication required
- Used for fetching OSM hiking data
- URL: `https://overpass-api.de/api/interpreter`

---

## 🔐 Encryption Details

### Algorithm: AES-GCM with PBKDF2

```javascript
// Key Derivation
PBKDF2 → SHA-256 (100,000 iterations)

// Storage Format
{
  "salt": "base64-encoded-salt",
  "iv": "base64-encoded-initialization-vector", 
  "ciphertext": "base64-encoded-encrypted-key"
}
```

### Demo Mode (Development Only)

When demo mode is enabled:
- Keys stored in plaintext (no encryption)
- Uses empty string or demo key values
- Suitable for local development and testing only

---

## 📋 Common Commands

### Clear All Stored Keys
```javascript
await window.ApiKeyManager.clearKeys();
location.reload();
```

### Switch to Demo Mode
```javascript
await window.ApiKeyManager.setDemoMode(true);
```

### Switch to Encrypted Storage
```javascript
await window.ApiKeyManager.setDemoMode(false);
window.setupApiKeySetup(); // Re-configure with password
```

### Check Current Configuration
```javascript
console.log(window.CONFIG);
// { orApiKey: "abc123", demoMode: false }
```

---

## 🛡️ Security Best Practices

### ✅ DO
- Use GitHub Secrets for production deployments
- Set strong passwords for local encrypted storage
- Clear keys when sharing your browser
- Rotate API keys periodically
- Use HTTPS in production (required for some APIs)

### ❌ DON'T
- Commit `.env` files to Git
- Share plaintext API keys publicly
- Use demo keys in production environments
- Store keys without encryption in shared browsers

---

## 📁 Project Structure

```
hiking-map/
├── api-keys.js              # Encrypted storage module
├── config.js                # Configuration loader
├── setup-api-keys.js        # API key setup modal/loader
├── docs/
│   ├── API_KEY_SETUP.md     # User setup guide
│   └── SECURITY_GUIDE.md    # Security documentation
├── .github/
│   ├── secrets-template.md  # Secrets documentation
│   └── workflows/
│       └── build-and-deploy.yml
├── .env.example             # Environment template
└── README_API_KEYS.md       # This file
```

---

## 🔄 Migration from Old Code

### If You Had Hardcoded Keys in script.js

**Old code (INSECURE):**
```javascript
const OPENROUTESERVICE_API_KEY = "your_hardcoded_key";
```

**New code (SECURE):**
- Reads from `window.CONFIG` automatically
- Falls back to demo mode if no key found
- Uses encrypted storage when available

No code changes needed - the system is backward compatible!

---

## 🆘 Support & Resources

### Documentation Files
- `README_API_KEYS.md` - This file (overview)
- `docs/API_KEY_SETUP.md` - Step-by-step user guide  
- `docs/SECURITY_GUIDE.md` - Security patterns and architecture
- `.github/secrets-template.md` - GitHub Actions secrets info

### API Providers
- OpenRouteService: https://openrouteservice.org/dev/#/signup
- Overpass API: http://overpass-turbo.eu/

### Troubleshooting
See `docs/SECURITY_GUIDE.md` for common issues and solutions.

---

## 📜 License & Credits

This solution implements encrypted storage using the Web Crypto API, providing secure handling of sensitive data in browsers.

**For more information:** Check out [docs/SECURITY_GUIDE.md](docs/SECURITY_GUIDE.md)
