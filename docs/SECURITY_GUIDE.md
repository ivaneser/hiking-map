# 🔐 Security Guide - API Key Management for Hiking Map

## 🎯 Overview

Hiking Map uses a **simple, user-friendly security model**:

1. **Default Behavior:** Browse freely without any setup
2. **On-Demand Setup:** Prompted only when trying to build routes
3. **Encrypted Storage:** AES-GCM encryption with optional password protection
4. **Never Hardcoded:** API keys never in source code or commits

---

## 🔑 Architecture

### Client-Side Encrypted Storage

```
┌─────────────────────────────────────────────────────┐
│           Browser localStorage                        │
├─────────────────────────────────────────────────────┤
│                                                      │
│  ┌─────────────────────────────────────────────┐    │
│  │  AES-GCM Encrypted API Keys Storage          │    │
│  │                                             │    │
│  │  Format: {                                   │    │
│  │    "demomode": "false",                     │    │
│  │    "keys": {                                │    │
│  │      "openrouteservice": "encrypted..."     │    │
│  │    }                                        │    │
│  │  }                                          │    │
│  └─────────────────────────────────────────────┘    │
│                                                      │
│  Encryption:                                         │
│  • AES-256-GCM encryption                            │
│  • Salt per storage key (32 bytes)                  │
│  • Random IV (12 bytes) for each operation          │
│  • PBKDF2 for password-based encryption             │
└─────────────────────────────────────────────────────┘
```

### Build-Time Token Hashing (GitHub Actions)

For production deployments with GitHub Pages:

```yaml
# .github/workflows/build-and-deploy.yml
jobs:
  setup-env:
    steps:
      - Generate encrypted token hash via PBKDF2
        • Input: OR_API_KEY secret + random salt
        • Output: Base64(token_hash + salt)
      - Embed hash in build config
      - Deploy to GitHub Pages
      
# Client decrypts with user password or demo mode
```

---

## 🛡️ Security Layers

### Layer 1: Development Mode (Default)
- **No API key required** for browsing/searching
- **Demo mode** uses empty auth header on OpenRouteService
- Perfect for casual users, testing, and personal use
- Free tier allows ~10K routes/month

### Layer 2: On-Demand Setup
- Popup appears only when first building a route
- User chooses: Demo Mode / Add Key / Sign Up Now
- No intrusive floating button or setup page
- Non-intrusive UX design

### Layer 3: Encrypted Storage (Optional)
- AES-GCM encryption for stored keys
- Salt + IV combination prevents replay attacks
- PBKDF2 password hashing (optional, default: no password)
- Keys only in user's browser, never transmitted

### Layer 4: GitHub Secrets (Production)
- Raw API key stored as GitHub secret
- Workflow generates encrypted hash client-side
- Frontend never sees raw API key
- Secure CI/CD pipeline

---

## 📋 Encryption Details

### Algorithm: AES-GCM with PBKDF2

```javascript
// Encryption Flow
input: apiKeyString

1. Generate Random Salt (32 bytes)
   ↓
2. Derive Key using PBKDF2:
   • Password (or 'demo-no-password')
   • Salt (from step 1)
   • 100,000 iterations
   • SHA-256 hash function
   ↓
3. Encrypt with AES-GCM:
   • Key from step 2
   • Random IV (12 bytes)
   ↓
4. Store in localStorage:
   {
     demomode: 'false',
     keys: {
       openrouteservice: base64(encrypted_data_with_iv)
     }
   }

// Decryption mirrors this flow with same password/salt
```

### Storage Format

```javascript
{
  "demomode": "false",           // true = no encryption, false = encrypted
  "keys": {                      // Contains only encrypted ciphertexts
    "openrouteservice": "base64(encrypted)"
  },
  "timestamp": 1715980000000     // Optional: for key rotation detection
}
```

---

## 💻 Production Deployment Options

### Option A: GitHub Pages with Secrets ✅ Recommended

```bash
# Repository Settings → Secrets and variables → Actions
Add secret: OR_API_KEY = your_api_key_here

# Push to main/test branch
# Workflow handles encryption and deployment automatically
```

### Option B: Encrypted Browser Storage (No Backend)

Users configure via setup popup when building routes.
- No server-side configuration needed
- Secure because keys never leave user's browser
- Perfect for personal projects, portfolio sites

### Option C: Backend Proxy Server

```javascript
// Your backend receives route requests
app.post('/api/route', (req, res) => {
  // Forward to OpenRouteService with your secret key
  const response = await fetch(
    'https://api.openrouteservice.org/...',
    { headers: { Authorization: `Bearer ${OR_SECRET_KEY}` } }
  );
  return response.json();
});

// Frontend sends requests to your proxy only
```

---

## 🔒 Security Best Practices

### ✅ DO
- Use GitHub Secrets for production deployments
- Set strong passwords for local encrypted storage (recommended)
- Rotate API keys periodically
- Use HTTPS in production environments
- Clear stored keys before sharing your browser

### ❌ DON'T
- Commit `.env` files to Git repository
- Store plaintext API keys anywhere
- Share keys via chat/email/Slack/GitHub issues
- Use demo/production keys interchangeably
- Assume demo mode is permanent (has request limits)

---

## 🔍 Auditing & Monitoring

### Check Encryption Status
```javascript
// In browser console:
console.log('Demo Mode:', window.CONFIG.demoMode);           // true = no key needed
console.log('Has API Key:', !!window.CONFIG.orApiKey);        // false = demo mode
console.log('API Keys Stored:', localStorage.getItem('hiking_map_api_keys'));

// Verify encryption salt exists
console.log('Salt Exists:', !!localStorage.getItem('hiking_map_salt'));
```

### Rotate Stored Keys (Optional)
```javascript
await window.ApiKeyManager.clearKeys();
window.setupApiKeySetup(); // Re-configure with same key or new one
```

---

## 🆘 Troubleshooting Common Issues

### "No API Key Configured" Error

**Cause:** No keys stored and demo mode not detected

**Solution:**
```javascript
// Check config status
console.log(window.CONFIG);

// If empty, configure via popup:
window.CONFIG.showApiKeySetup();

// Or enable demo mode (if available):
window.ApiKeyManager.setDemoMode(true);
```

### "Failed to Decrypt" Error

**Cause:** Password changed or corrupted storage

**Solution:**
```javascript
await window.ApiKeyManager.clearKeys();
location.reload();
// Re-run setup if needed
window.CONFIG.showApiKeySetup();
```

### CORS Errors from OpenRouteService

**Cause:** Invalid API key or wrong endpoint format

**Solutions:**
1. Verify demo mode is active: `window.CONFIG.demoMode`
2. Check for stored keys in localStorage
3. Get new API key if using full auth mode
4. Ensure URL uses `?key=demo` suffix when no key present

### Setup Button Not Appearing

**Check:**
1. Console for errors (F12)
2. Script loaded: `typeof window.ApiKeyManager !== 'undefined'`
3. Try manual config call:
   ```javascript
   window.open('/config/api-keys.js?setup=true', '_blank');
   ```

---

## 📜 Privacy Policy Considerations

When deploying publicly, inform users about:

- **API Key Storage:** "We store optional API keys in your browser's localStorage using AES-GCM encryption"
- **Data Never Shared:** "Your API keys are never sent to any third party except the routing service itself"
- **Browser-Specific:** "Keys are only stored in YOUR browser, not our servers"

---

## 🆘 Support & Resources

### Official Documentation
- OpenRouteService Docs: https://openrouteservice.org/documentation/
- Web Crypto API: https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API
- GitHub Secrets: https://docs.github.com/en/actions/reference/encrypted-secrets

### Project Resources
- Main README: `README.md`
- Security Guide: This file (`SECURITY_GUIDE.md`)
- Setup Guide: `docs/API_KEY_SETUP.md`
- Workflow Config: `.github/workflows/build-and-deploy.yml`

---

**Remember:** If your application processes sensitive user data, always use a backend proxy instead of client-side storage. For public-facing apps with limited functionality (like route building), encrypted browser storage is acceptable and recommended for privacy.
