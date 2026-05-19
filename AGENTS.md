# 🤖 AGENT INSTRUCTIONS — Hiking Map Project (Stable)

## Current Project Status

The project is in a **stable, working state**.

- UI and behavior are based on the original live app (`ivaneser.github.io/hiking-map`)
- App is split into separate files:
  - `index.html`
  - `style.css`
  - `script.js`
- API key handling is integrated and working with:
  - `api-keys.js`
  - `config.js`
  - `setup-api-keys.js`
  - `runtime-secrets.js` (generated in deploy workflow)
- GitHub Pages deployment is active via `.github/workflows/build-and-deploy.yml`

---

## Required Script Order (Do Not Change)

In `index.html`, scripts must stay in this sequence:

1. Leaflet JS
2. `api-keys.js`
3. `config.js`
4. `setup-api-keys.js`
5. `runtime-secrets.js`
6. `script.js`

---

## API Key Flow (Stable Behavior)

- User can enter their own OpenRouteService API key in modal
- Modal includes link to OpenRouteService signup
- User can choose to continue with demo fallback key
- If routing fails due to API key issues, app reprompts for API key
- Demo fallback key is provided via `window.RUNTIME_SECRETS`
- Runtime secrets are injected at deploy time from GitHub secrets

---

## Local Run

```bash
npm install
npm start
```

Server binds:

- `0.0.0.0:8765`

Open in browser:

- `http://localhost:8765`

---

## Test Workflow (Always Run Before/After Changes)

```bash
npm install
npx playwright install
npx playwright test --project=chromium
```

If environment cannot install browsers, still run available Playwright tests and report constraints.

Minimum validation:

```bash
npx playwright test test-errors.spec.js --project=chromium
npx playwright test test-loading-order.spec.js --project=chromium
```

---

## Deployment Workflow

File: `.github/workflows/build-and-deploy.yml`

- Deploys on push to `main` and `test`
- Publishes `dist` to `gh-pages`
- Requires secrets:
  - `OR_API_KEY`
  - `DEPLOY_TOKEN`
- Fails fast if required secrets are missing
- Generates `dist/runtime-secrets.js` from `OR_API_KEY`

---

## Editing Rules for Future Agents

- Preserve current UI/UX and original logic behavior
- Avoid introducing module/global mixing regressions
- Keep file structure split (no monolithic merge back)
- Keep runtime secret injection pattern for API fallback
- Run tests and pre-push validation before committing

---

## Stable File Map

- `index.html` — markup + script includes
- `style.css` — all styles
- `script.js` — main app logic
- `api-keys.js` — encrypted key storage/session handling
- `setup-api-keys.js` — key setup modal
- `config.js` — global config values
- `runtime-secrets.js` — placeholder in repo; generated in deploy

---

## Git Push

Push target branch currently in use:

- `origin/test`

Use standard project pre-push checks (hook script) before pushing.
