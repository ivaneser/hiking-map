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
# With npm dependencies installed
npm install && npm run serve
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

This is a single-file application! All functionality lives in `index.html`.

### File Structure
```
hiking-map/
├── index.html              # Main HTML structure (loads Leaflet library)
├── style.css               # All CSS styling and responsive design
├── script.js               # Application logic and routing
└── README.md               # Documentation
```

### Making Changes
This is a simple single-file application with separated CSS and JS files.
1. You can edit **any** of the three files (`index.html`, `style.css`, or `script.js`)
2. Test in your browser
3. Commit and push to GitHub

## 📱 Mobile Support

- Touch-friendly map controls
- Responsive layout adapts to screen size
- Tap-to-select markers
- Works on all modern mobile browsers

## 🔒 Privacy & Security

### API Key Management 🗝️

The application now supports **encrypted browser storage** for API keys.

#### Quick Setup (First Time)

1. Open the app in your browser
2. A floating button "🔐 Configure API Keys" will appear
3. Click it to open the secure setup page
4. Follow the prompts to enter your API key and (optionally) set a password

**Your API keys are encrypted and stored securely in browser storage.**

#### Development Mode

For development, the app auto-detects demo mode when:
- Running on `localhost`
- No API keys stored

To manually configure during dev:
```javascript
window.setupApiKeySetup()
// Follow the setup prompts
```

#### Security Features
- **Encrypted Storage:** Your API keys are AES-GCM encrypted in your browser
- **Optional Password Protection:** Set a password for extra security
- **Never Hardcoded:** Keys are never committed to source code or shared
- **Private by Design:** Keys only stored in YOUR browser, never sent anywhere

#### For Developers & Production Deployments

See [API Key Setup Guide](docs/API_KEY_SETUP.md) for:
- GitHub Actions workflow for CI/CD
- GitHub Secrets configuration  
- Backend proxy patterns
- Advanced security options

## 🌍 Data Sources

All geographic data comes from **OpenStreetMap**:
- [OSM Contributors](https://www.openstreetmap.org/copyright)
- [Overpass API Documentation](http://overpass-turbo.eu/)

## 📜 License

This project uses data from OpenStreetMap, licensed under **CC-BY-SA**. The application code is available for educational and personal use.

---

Made with ❤️ by sergeivanenko@gmail.com  
Built on the amazing OpenStreetMap community! 🌍
