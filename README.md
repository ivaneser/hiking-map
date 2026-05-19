# 🥾 Hiking Loop Planner

A modern web application for discovering hiking trails, finding nature spots, and planning outdoor adventures using OpenStreetMap data.

![Hiking Map](https://img.shields.io/badge/status-beta-success)
![License](https://img.shields.io/badge/license-CC--BY--NC--SA-green)
![Map Provider](https://img.shields.io/badge/Open%20Street%20Map-white)

## 🌟 Features

### Map & Discovery
- 🔍 **Search** - Discover hiking spots within any map area
- 🗺️ **Interactive Map** - Browse OpenStreetMap with custom hiking point markers
- 🏷️ **13 Point Types** - Viewpoints, firepits, water, campsites, caves, and more
- 🔎 **Live Filtering** - Search by name, type, or tags

### Route Planning
- 🥾 **Build Loops** - Create hiking loops through selected points
- 💾 **Export GPX** - Download routes for offline navigation
- 📂 **Import GPX** - Load existing routes from GPX files
- ⭕ **Auto Loop** - Routes automatically close to create circular trails

### Utilities
- 📍 **GPS Location** - Find your current location on the map
- 🔀 **Type Filtering** - Toggle point categories on/off
- 📱 **Responsive Design** - Works on desktop and mobile devices
- 🌙 **Dark Mode** - Automatically adapts to system preferences

## 🎨 Point Types

| Type | Icon | Description |
|------|------|-------------|
| 🏔️ Viewpoint | Blue | Scenic overlooks with views |
| 🎯 Attraction | Pink | Tourist attractions and landmarks |
| 🔥 Firepit | Orange | Designated fire pits |
| 🌲 Camping | Green | Campsite locations |
| 🌊 Water | Cyan | Drinking water sources |
| ⛱️ Picnic | Amber | Picnic sites and shelters |
| 🏠 Hut | Turquoise | Wilderness huts |
| 🅿️ Parking | Blue | Public parking areas |
| ♿ WC | Sky Blue | Restrooms |
| 🕰️ Historic | Bronze | Historical landmarks |
| 🛡️ Shelter | Gray | Emergency shelters |
| 🪨 Cave | Purple | Cave entrances |
| ⭐ Other | Slate | Miscellaneous points |

## 🚀 Quick Start

### Using GitHub Pages (Free Hosting)

1. **Clone the repository:**
   ```bash
   git clone https://github.com/ivaneser/hiking-map.git
   cd hiking-map
   ```

2. **Open index.html in your browser** - No server required!

Or host on GitHub Pages:
- Go to repo Settings → Pages
- Select `test` branch as source
- Your site will be live at: `https://ivaneser.github.io/hiking-map/`

### Using Python HTTP Server (Local Testing)

```bash
# Simple server - works directly from repo folder
cd /path/to/hiking-map
python3 -m http.server 8765 --bind 0.0.0.0
# Visit: http://localhost:8765/index.html
```

### Using Node.js (Development Server)

```bash
npm install
npm start
# Visit: http://localhost:8765
```

## 🛠️ Technical Stack

- **Frontend:** Pure HTML/CSS/JavaScript (no frameworks!)
- **Mapping:** [Leaflet.js](https://leafletjs.com/) v1.9.4
- **Map Tiles:** OpenStreetMap
- **Data API:** Overpass API for spot queries
- **Routing:** OpenRouteService API for hiking routes
- **Styling:** CSS Variables with theme system

## 📡 APIs Used

### Overpass API
```javascript
const OVERPASS_URL = 'https://overpass-api.de/api/interpreter'
// Fetches OSM nodes/ways/relations with specified tags
```

### OpenRouteService
```javascript
const OPENROUTESERVICE_URL = 'https://api.openrouteservice.org/v2/directions/foot-hiking/geojson'
// Calculates walking/hiking routes between points
```

## 🚀 Setup

### 1. **Discover Spots**
   - Open the map and navigate to your area
   - Click 🔍 (Search) to find all nearby hiking points
   - Use filter buttons to show/hide specific point types

### 2. **Build a Route**
   - Enter "route build" mode (🥾 button)
   - Click markers on the map in desired order
   - Click again to confirm and generate the route

### 3. **Export/Import**
   - Click 💾 to download your route as GPX
   - Click 📂 to load a GPX file from disk

### 4. **Find Your Location**
   - Click 📍 to see your GPS position on the map
   - Blue circle shows accuracy radius

## 🌐 Supported Browsers

- Chrome (recommended)
- Firefox
- Safari
- Edge
- Opera

## 🔧 Development

This project is a lightweight static web app with split files.

### File Structure
```
hiking-map/
├── index.html              # Main HTML structure + script loading order
├── style.css               # Styling and responsive layout
├── script.js               # Main application logic
├── api-keys.js             # Encrypted API key storage manager
├── setup-api-keys.js       # API key setup dialog
├── config.js               # Runtime configuration
├── runtime-secrets.js      # Placeholder; generated in CI deploy
├── docs/                   # Project documentation (except this README)
└── README.md               # Main documentation
```

### Making Changes
1. Edit relevant files (`index.html`, `style.css`, `script.js`, API key files)
2. Run tests (`npx playwright test --project=chromium`)
3. Commit and push

## 📱 Mobile Support

- Touch-friendly map controls
- Responsive layout adapts to screen size
- Tap-to-select markers
- Works on all modern mobile browsers

## 🔒 Privacy & Security

### API Key Management 🗝️

The app supports encrypted browser storage for OpenRouteService API keys.

#### How it works
- You can enter your own ORS API key in the in-app dialog.
- The dialog includes a link to generate a key at OpenRouteService.
- You can continue with a demo fallback key (with warning it may stop working).
- If routing fails because of an invalid/expired key, the app prompts for key entry again.

#### Security model
- Keys are encrypted in browser storage.
- Demo fallback key is injected at deploy time via GitHub secrets into `runtime-secrets.js`.
- Repository source does not contain plaintext ORS key.

#### Deployment requirements
Configure these GitHub Actions secrets:
- `OR_API_KEY`
- `DEPLOY_TOKEN`

See:
- [docs/API_KEY_SETUP.md](docs/API_KEY_SETUP.md)
- [docs/SECURITY_GUIDE.md](docs/SECURITY_GUIDE.md)

## 🌍 Data Sources

All geographic data comes from **OpenStreetMap**:
- [OSM Contributors](https://www.openstreetmap.org/copyright)
- [Overpass API Documentation](http://overpass-turbo.eu/)

## 📜 License

This project uses data from OpenStreetMap, licensed under **CC-BY-SA**. The application code is available for educational and personal use.

---

Made with ❤️ by sergeivanenko@gmail.com  
Built on the amazing OpenStreetMap community! 🌍
