# 🔐 GitHub Secrets Configuration

## Required Repository Secrets

To enable secure API key management in production, add these secrets to your GitHub repository.

### How to Add Secrets

1. Go to: `https://github.com/YOUR_USERNAME/hiking-map/settings/secrets-and-variables/actions`
2. Click "New repository secret" for each required secret below
3. Copy the values from your API provider into the appropriate fields

---

## Required Secrets

| Name | Description | Get From | Example Value |
|------|-------------|----------|---------------|
| `OR_API_KEY` | OpenRouteService API Key | [OpenRouteService](https://openrouteservice.org/dev/#/signup) | `or_abc123...xyz789` |
| `OVERPASS_URL` | Overpass API URL (optional) | Default | `https://overpass-api.de/api/interpreter` |

---

## Getting Your OpenRouteService API Key

1. Visit: https://openrouteservice.org/dev/#/signup
2. Create a free account
3. Go to dashboard and copy your API key
4. Add it as GitHub secret named `OR_API_KEY`

**Note:** The workflow automatically generates an encrypted hash for client-side use, so you don't expose the raw key in frontend code.

---

## Optional Secrets (Future Use)

| Name | Description | When Needed |
|------|-------------|-------------|
| `OVERPASS_URL` | Custom Overpass API endpoint | Only if using custom instance |

---

## Security Notes

- ⚠️ **NEVER** commit secrets to Git repository
- ⚠️ Secrets are only accessible during Actions runs
- ✅ GitHub automatically rotates secret access tokens
- ✅ Encrypted tokens prevent raw key exposure in builds

---

## Testing Without Real Keys (Development)

For development on `localhost`, the app auto-detects and uses demo mode. No secrets needed!

To verify setup:
```bash
cd /path/to/hiking-map
open index.html  # or use npm run serve
# Look for floating "🔐 Configure API Keys" button
```

---

## Production Deployment Checklist

Before deploying to production:

- [ ] Add `OR_API_KEY` secret in GitHub settings
- [ ] Verify build workflow runs successfully on push
- [ ] Test encrypted token generation (check console output)
- [ ] Confirm API keys load correctly after deploy
- [ ] Clear test/demo mode from production environment

---

## Workflow Automation

The workflow at `.github/workflows/build-and-deploy.yml` will:

1. Read secrets from GitHub Actions context
2. Generate encrypted token via PBKDF2 hashing
3. Embed hashed token in build configuration
4. Deploy to GitHub Pages (or your hosting)
5. Client decrypts with user password or uses demo mode

---

## Troubleshooting Secrets

### Secret Not Found Error

**Symptom:** `error: secret OR_API_KEY not found`

**Solution:**
```bash
# Check secrets in GitHub UI:
https://github.com/YOUR_USERNAME/hiking-map/settings/secrets-and-variables/actions

# Verify name matches exactly (case-sensitive!)
# Click "New repository secret" and add:
Name: OR_API_KEY
Value: your-api-key-here
```

### Invalid Secret Format

**Symptom:** API returns 401 unauthorized after deploy

**Solution:**
1. Check that secret value is correct (no trailing spaces)
2. Verify it starts with `or_` prefix (OpenRouteService format)
3. Re-run workflow to regenerate token hash

---

## Environment Variables (Not in Actions)

The `.env.example` file contains optional development variables:

```bash
DEMO_MODE=true              # For testing without API key
OR_API_KEY_DEV=demo_key     # Development only
OR_API_KEY_PRODUCTION=your_real_key  # Production use
```

**Remember:**
- Never commit `.env` files
- Only create `.env` file locally (not in git)
- Use GitHub Secrets for production

---

## References

- [GitHub Actions Secrets Documentation](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
- [OpenRouteService API Docs](https://openrouteservice.org/documentation/)
- Security Guide: `docs/SECURITY_GUIDE.md`
