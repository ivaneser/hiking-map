# 🔐 API Key Setup Guide - Simple Version

## 🎯 The Easy Way (Default Behavior)

**No setup required!** Just enjoy the app:

1. **Open the hiking map** - Start exploring right away
2. **Browse hiking spots** - Search, view markers, plan trips
3. **Try building a route** - Click the "Build Route" button (🥾)
4. **Get prompted** - A friendly popup appears when you first try to build a route

The popup gives you three options:
- ✅ **Continue with Demo Mode** - Works perfectly for personal use!
- ➕ **Add Your API Key** - Sign up (takes 10s), then add key to browser
- 🔗 **Sign Up Now** - Go directly to OpenRouteService signup

That's it! Your keys are securely stored in your browser.

---

## 🚀 Optional: Get Your Free OpenRouteService API Key

While demo mode works for personal use, a paid account gives you additional features and higher rate limits.

### Step 1: Sign Up (Free!)
Visit: https://openrouteservice.org/dev/#/signup

Fill out the simple form - it takes about 10 seconds!

### Step 2: Copy Your API Key
After signing up, you'll see your API key. Copy it and keep it handy.

**Your key will look like:** `or_abc123...xyz789`

---

## 🔒 How Your Keys Are Stored Securely

When you add an API key:

```
Browser Storage (localStorage)
     ↓
Encrypted with AES-GCM
     ↓
(Optional password protection via PBKDF2)
     ↓
Safe! Never shares your keys anywhere.
```

### Security Layers:

1. **AES-GCM Encryption** - Military-grade encryption standard
2. **Salt & IV** - Each storage unique, prevents rainbow table attacks
3. **Optional Password** - PBKDF2 key derivation (100k iterations)
4. **Browser Sandboxing** - Keys only in YOUR browser

### Privacy Guarantee:

- ⚠️ Keys are **NEVER** sent to any server except OpenRouteService API
- ✅ Your keys are **ONLY** in your browser's localStorage
- ✅ No analytics, no tracking, no data collection
- ✅ You control everything

---

## 🎮 Demo Mode vs. Full Access

### Demo Mode (Free - Personal Use)
- Fully functional for personal hiking routes
- Limited by OpenRouteService free tier (10K requests/month)
- Great for testing and casual use
- **No signup required!**

### Full Account (Optional)
- Higher rate limits
- Commercial usage allowed
- Access to premium features
- Free tier: 10,000 monthly requests
- Paid tiers available

**Recommendation:** Start with demo mode, upgrade when needed!

---

## 💾 Managing Your Stored Keys

### Check if You Have a Key Stored
```javascript
console.log(window.CONFIG.orApiKey); // Shows key or empty string
```

### Clear All Stored Keys
```javascript
window.ApiKeyManager.clearKeys();
location.reload();
```

### Switch to Demo Mode Only
```javascript
window.ApiKeyManager.setDemoMode(true);
location.reload();
```

---

## 📱 Mobile Users

On mobile devices, the setup popup:
- Works with all modern browsers (Chrome, Safari, Firefox)
- Uses same encryption as desktop
- May use slightly smaller storage due to browser limits

**Tip:** Use HTTPS connection when storing sensitive data on mobile.

---

## 🔐 For Developers & Security-Conscious Users

### Advanced Setup Options

See [Security Guide](SECURITY_GUIDE.md) for:
- GitHub Actions integration
- Backend proxy patterns  
- Custom encryption preferences
- Production deployment configs

### Setting Password Protection

```javascript
// Open browser console (F12) and run:
window.ApiKeyManager.setDemoMode(false);
await window.ApiKeyManager.clearKeys();
window.setupApiKeySetup(); // Will open setup page
```

---

## ❓ Frequently Asked Questions

### Q: Do I NEED an API key to use this app?
**A:** No! Demo mode works perfectly for building routes and exporting GPX files.

### Q: What happens when demo mode expires?
**A:** OpenRouteService has a 10K request/month free tier, so it should last most casual users indefinitely.

### Q: Can I use this on multiple devices?
**A:** Yes! Your stored keys sync with your browser profile. Switch devices by signing into the same browser account.

### Q: Is my data being tracked?
**A:** Absolutely not. No analytics, no tracking, no data collection. Keys never leave your browser.

### Q: What if I lose my browser?
**A:** That's okay! Demo mode requires no setup and works on any device. Your keys are just stored locally for convenience.

---

## 🔗 Quick Links

- [Security Guide](SECURITY_GUIDE.md) - Advanced security patterns
- [GitHub Actions Workflow](../.github/workflows/build-and-deploy.yml) - CI/CD setup
- OpenRouteService: https://openrouteservice.org/dev/#/signup

---

**Need help?** Check the browser console (F12) for detailed error messages, or check the main README file.
