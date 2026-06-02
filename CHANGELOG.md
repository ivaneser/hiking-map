# Changelog

## Unreleased

- Unified status/error messaging in `script.js` via `setSummaryMessage(...)`.
- Added red error styling for summary/status messages in `style.css`.
- Kept list-to-map/mobile behavior smooth: clicking a spot in the list now scrolls back to the map on small screens and focuses the map.
- Prevented list auto-scroll when selecting a marker on the map.
- Removed extra line breaks from the API key setup text in `setup-api-keys.js`.
- Made API key storage persistent in the browser by syncing `localStorage` and `sessionStorage`.
- Cleared stored API keys only on confirmed OpenRouteService auth failures, not on ordinary route errors.
- Disabled Leaflet popup animation for a calmer UI.
- Removed the legacy duplicate `scripts/script.js`; the app now uses the root `script.js` only.

## Verification

- `node --check script.js`
- `node --check setup-api-keys.js`
- Browser check confirmed error-state summary text renders in red.
