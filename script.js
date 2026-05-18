// API Configuration - Demo Mode by Default for Easy Use
const CONFIG = {
  orApiKey: '', // Empty = no auth header = demo mode (browse freely!)
  overpassApiUrl: 'https://overpass-api.de/api/interpreter'
};

const OPENROUTESERVICE_URL = "https://api.openrouteservice.org/v2/directions/foot-hiking/geojson";
const OVERPASS_URL = "https://overpass-api.de/api/interpreter";

const typeConfig = {
  viewpoint:  { label: "Viewpoints",  color: "#22C55E" },
  attraction: { label: "Attractions", color: "#EC4899" },
  firepit:    { label: "Firepits",    color: "#F97316" },
  picnic:     { label: "Picnic",      color: "#F59E0B" },
  camping:    { label: "Camping",     color: "#2E8B57" },
  shelter:    { label: "Shelter",     color: "#A3A3A3" },
  water:      { label: "Water",       color: "#06B6D4" },
  cave:       { label: "Caves",       color: "#7C3AED" },
  hut:        { label: "Huts",        color: "#16A34A" },
  parking:    { label: "Parking",     color: "#2563EB" },
  wc:         { label: "WC",          color: "#0EA5E9" },
  historic:   { label: "Historic",    color: "#B45309" },
  other:      { label: "Other",       color: "#64748B" }
};

const state = {
  all: [],
  filtered: [],
  activeTypes: new Set(Object.keys(typeConfig)),
  selectedId: null,
  markers: new Map(),
  routeLine: null,
  routeStops: [],
  routeSummary: null,
  routeSelectionMode: false,
  routeBuilt: false
};

const SEARCH_ZOOM = 13;
let userLocationMarker = null;
let userAccuracyCircle = null;

const list = document.querySelector("#list");
const stats = document.querySelector("#stats");
const summary = document.querySelector("#summary");
const emptyState = document.querySelector("#emptyState");
const searchInput = document.querySelector("#searchInput");
const searchButton = document.querySelector("#searchButton");
const routeButton = document.querySelector("#routeButton");

const leafletMap = L.map("map", {
  zoomControl: true,
  scrollWheelZoom: true,
  doubleClickZoom: true
}).setView([60.1699, 24.9384], SEARCH_ZOOM);

const markerLayer = L.layerGroup().addTo(leafletMap);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(leafletMap);

routeButton.addEventListener("click", buildFootLoop);
searchButton.addEventListener("click", async () => {
  const zoom = leafletMap.getZoom();
  if (zoom < SEARCH_ZOOM) {
    searchButton.classList.add("loading");
    leafletMap.flyTo(leafletMap.getCenter(), SEARCH_ZOOM);
    leafletMap.once("moveend", async () => {
      await searchOverpass();
    });
    return;
  }
  searchButton.classList.add("loading");
  await searchOverpass();
});

searchInput.addEventListener("input", () => {
  applyFilters();
});
window.addEventListener("resize", () => {
  leafletMap.invalidateSize();
  fitMapToFiltered();
});

document.querySelector("#locateButton")
  .addEventListener("click", locateUser);

document.querySelector("#gpxButton").addEventListener("click", () => {
  if (!state.routeLine) {
    alert("No route to export yet");
    return;
  }
  const gpx = generateGPX(state.routeLine);
  downloadGPX(gpx);
});
document.querySelector("#gpxInput").addEventListener("change", async (event) => {
  const file = event.target.files[0];
  if (!file) return;
  const text = await file.text();
  const coords = parseGPX(text);
  loadGPXRoute(coords);
});

function distanceMeters(a, b) {
  const R = 6371000;
  const dLat = (b.lat - a.lat) * Math.PI / 180;
  const dLon = (b.lon - a.lon) * Math.PI / 180;
  const lat1 = a.lat * Math.PI / 180;
  const lat2 = b.lat * Math.PI / 180;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.sqrt(x));
}

leafletMap.on("click", (e) => {
  if (!state.routeSelectionMode) return;
  const lat = e.latlng.lat;
  const lon = e.latlng.lng;
  const latDelta = 100 / 111320;
  const lonDelta = 100 / (111320 * Math.cos(lat * Math.PI / 180));
  const candidates = state.all.filter(s =>
    Math.abs(s.lat - lat) < latDelta &&
    Math.abs(s.lon - lon) < lonDelta
  );
  const existing = candidates.find(s =>
    distanceMeters({ lat, lon }, s) < 100
  );
  if (existing) {
    toggleRouteStop(existing.id);
    return;
  }
  const synthetic = {
    id: `custom-${Date.now()}`,
    name: "My point",
    osmType: "custom",
    type: "other",
    lat,
    lon,
    tags: {}
  };
  state.all.push(synthetic);
  state.filtered.push(synthetic);
  state.routeStops.push(synthetic.id);
  state.selectedId = synthetic.id;
  render();
  summary.textContent =
    `${state.routeStops.length} route stop(s) selected (including custom points).`;
});

function getCoordinates(item) {
  if (typeof item.lat === "number" && typeof item.lon === "number") {
    return { lat: item.lat, lon: item.lon };
  }
  if (item.center && typeof item.center.lat === "number" && typeof item.center.lon === "number") {
    return { lat: item.center.lat, lon: item.center.lon };
  }
  return null;
}

function parseGPX(text) {
  const parser = new DOMParser();
  const xml = parser.parseFromString(text, "application/xml");
  const trkpts = xml.querySelectorAll("trkpt");
  const coords = [];
  trkpts.forEach(pt => {
    const lat = parseFloat(pt.getAttribute("lat"));
    const lon = parseFloat(pt.getAttribute("lon"));
    if (!isNaN(lat) && !isNaN(lon)) {
      coords.push([lat, lon]);
    }
  });
  return coords;
}

function locateUser() {
  if (!navigator.geolocation) {
    alert("Geolocation is not supported");
    return;
  }
  navigator.geolocation.getCurrentPosition(
    (position) => {
      const lat = position.coords.latitude;
      const lon = position.coords.longitude;
      const accuracy = position.coords.accuracy;
      if (userLocationMarker) {
        leafletMap.removeLayer(userLocationMarker);
      }
      if (userAccuracyCircle) {
        leafletMap.removeLayer(userAccuracyCircle);
      }
      userLocationMarker = L.circleMarker([lat, lon], {
        radius: 8,
        fillColor: "#2563eb",
        color: "#fff",
        weight: 3,
        opacity: 1,
        fillOpacity: 1
      }).addTo(leafletMap);
      userAccuracyCircle = L.circle([lat, lon], {
        radius: accuracy,
        color: "#2563eb",
        weight: 1,
        fillColor: "#2563eb",
        fillOpacity: 0.15
      }).addTo(leafletMap);
      userLocationMarker.bindTooltip("Your location", {
        direction: "top",
        offset: [0, -10]
      });
      leafletMap.flyTo([lat, lon], 14);
    },
    (error) => {
      alert(error.message || "Could not get location");
    },
    {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 30000
    }
  );
}

function loadGPXRoute(coords) {
  if (!coords.length) return;
  clearRoute();
  state.routeStops = [];
  const first = coords[0];
  const last = coords[coords.length - 1];
  function findSpot(lat, lon) {
    return state.all.find(s =>
      Math.abs(s.lat - lat) < 0.0005 &&
      Math.abs(s.lon - lon) < 0.0005
    );
  }
  const startSpot = findSpot(first[0], first[1]);
  const endSpot = findSpot(last[0], last[1]);
  if (startSpot) state.routeStops.push(startSpot.id);
  if (endSpot && endSpot.id !== startSpot?.id) {
    state.routeStops.push(endSpot.id);
  }
  state.routeLine = L.polyline(coords, {
    className: "route-line",
    color: "#111827",
    weight: 5,
    opacity: 0.85
  }).addTo(leafletMap);
  state.routeSummary = null;
  fitMapToFiltered();
  updateGoogleMapsButtonVisibility?.();
  summary.textContent = "Route loaded successfully";
  render();
}

function getTimestamp() {
  const d = new Date();
  return d.toISOString()
    .replace(/T/, "_")
    .replace(/:/g, "-")
    .split(".")[0];
}

function getSpotType(tags) {
  if (tags.tourism === "viewpoint") return "viewpoint";
  if (tags.tourism === "attraction") return "attraction";
  if (tags.tourism === "picnic_site") return "picnic";
  if (tags.tourism === "camp_site") return "camping";
  if (tags.leisure === "firepit") return "firepit";
  if (tags.natural === "cave_entrance") return "cave";
  if (tags.tourism === "wilderness_hut") return "hut";
  if (tags.amenity === "parking") return "parking";
  if (tags.amenity === "shelter") return "shelter";
  if (tags.amenity === "drinking_water") return "water";
  if (tags.amenity === "toilets") return "wc";
  if (tags.historic) return "historic";
  return "other";
}

function normalize(data) {
  return (data.elements || [])
    .map((item, index) => {
      const coordinates = getCoordinates(item);
      if (!coordinates) return null;
      const tags = item.tags || {};
      const type = getSpotType(tags);
      return {
        id: `${item.type}-${item.id || index}`,
        osmType: item.type || "item",
        name: tags.name || "No name",
        tags,
        type,
        lat: coordinates.lat,
        lon: coordinates.lon
      };
    })
    .filter(Boolean);
}

function loadData(data, sourceName, fitMap = true) {
  state.all = normalize(data);
  updateRouteButtonVisibility();
  state.selectedId = state.all[0]?.id || null;
  summary.textContent =
    `${state.all.length} plotted objects from ${sourceName}`;
  applyFilters({ fitMap });
}

function getViewportBbox() {
  const bounds = leafletMap.getBounds();
  return [
    bounds.getSouth(),
    bounds.getWest(),
    bounds.getNorth(),
    bounds.getEast()
  ];
}

function buildOverpassQuery(bboxValues) {
  const bbox = bboxValues.join(",");
  return `
    [out:json][timeout:40];
    (
      nwr["tourism"="viewpoint"](${bbox});
      nwr["tourism"="attraction"](${bbox});
      nwr["tourism"="picnic_site"](${bbox});
      nwr["leisure"="firepit"](${bbox});
      nwr["natural"="cave_entrance"](${bbox});
      nwr["tourism"="wilderness_hut"](${bbox});
      nwr["tourism"="camp_site"](${bbox});
      nwr["amenity"="shelter"](${bbox});
      nwr["amenity"="toilets"](${bbox});
      nwr["amenity"="drinking_water"](${bbox});
      nwr["historic"](${bbox});
      nwr["amenity"="parking"]["access"!="private"]["access"!="no"]["charging"!="yes"]["fee"!="yes"]["parking:condition"!="ticket"](${bbox});
    );
    out center tags;
  `;
}

function updateRouteButtonVisibility() {
  routeButton.style.display =
    state.all.length ? "inline-block" : "none";
}

function updateGpxButtonVisibility() {
  const btn = document.querySelector("#gpxButton");
  const routeVisible = !!state.routeLine && state.routeStops.length >= 2;
  btn.style.display = routeVisible ? "inline-block" : "none";
}

function updateSearchButtonState() {
}

leafletMap.on("zoomend moveend", updateSearchButtonState);
updateSearchButtonState();

async function searchOverpass() {
  const bbox = getViewportBbox();
  summary.textContent = "Searching current map viewport";
  searchButton.disabled = true;
  try {
    const body = new URLSearchParams({ data: buildOverpassQuery(bbox) });
    const response = await fetch(OVERPASS_URL, {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8"
      },
      body
    });
    const responseText = await response.text();
    if (!response.ok) {
      throw new Error(`Overpass returned ${response.status}: ${responseText.slice(0, 180)}`);
    }
    const data = JSON.parse(responseText);
    if (data.remark) {
      throw new Error(data.remark);
    }
    loadData(data, "current map viewport", false);
  } catch (error) {
    state.all = [];
    updateRouteButtonVisibility();
    applyFilters({ fitMap: false });
    summary.textContent = "Search failed, try again.";
  } finally {
    searchButton.disabled = false;
    searchButton.classList.remove("loading");
  }
}

function applyFilters(options = {}) {
  const shouldFitMap = options.fitMap ?? false;
  const query = searchInput.value.trim().toLowerCase();
  state.filtered = state.all.filter((spot) => {
    const text = `${spot.name} ${spot.type} ${JSON.stringify(spot.tags)}`.toLowerCase();
    return state.activeTypes.has(spot.type) && (!query || text.includes(query));
  });
  if (!state.filtered.some((spot) => spot.id === state.selectedId)) {
    state.selectedId = state.filtered[0]?.id || null;
  }
  render();
  leafletMap.invalidateSize();
  if (shouldFitMap) {
    requestAnimationFrame(fitMapToFiltered);
  }
}

function renderStats() {
  const counts = state.all.reduce((acc, spot) => {
    acc[spot.type] = (acc[spot.type] || 0) + 1;
    return acc;
  }, {});
  const allTypes = Object.keys(typeConfig);
  stats.innerHTML = "";
  const totalActive = state.activeTypes.size === allTypes.length;
  const totalDiv = document.createElement("div");
  totalDiv.className = `stat${totalActive ? " active" : ""}`;
  totalDiv.innerHTML = `
    <strong>${state.filtered.length}</strong>
    <span style="font-size:14px;">Total</span>
  `;
  totalDiv.addEventListener("click", () => {
    if (totalActive) {
      state.activeTypes.clear();
    } else {
      state.activeTypes = new Set(allTypes);
    }
    applyFilters({ fitMap: true });
  });
  stats.append(totalDiv);
  Object.entries(typeConfig).forEach(([type, config]) => {
    const count = counts[type] || 0;
    if (!count) return;
    const active = state.activeTypes.has(type);
    const div = document.createElement("div");
    div.className = `stat${active ? " active" : ""}`;
    div.style.background = active ? `${config.color}22` : "#fbfcfa";
    div.innerHTML = `
      <div style="
        width:18px;
        height:18px;
        border-radius:50%;
        background:${config.color};
        color:#fff;
        display:flex;
        align-items:center;
        justify-content:center;
        font-size:10px;
        font-weight:700;
      ">
        ${count}
      </div>
      <span style="font-size:12px; color:#64706a;">
        ${config.label}
      </span>
    `;
    div.addEventListener("click", () => {
      if (active) {
        state.activeTypes.delete(type);
      } else {
        state.activeTypes.add(type);
      }
      applyFilters({ fitMap: false });
    });
    stats.append(div);
  });
}

function drawRouteFromCoords(latlngs, summary = null) {
  clearRoute();
  state.routeLine = L.polyline(latlngs, {
    className: "route-line",
    color: "#111827",
    weight: 5,
    opacity: 0.82
  }).addTo(leafletMap);
  state.routeSummary = summary || null;
  fitMapToFiltered();
}

function renderMap() {
  markerLayer.clearLayers();
  state.markers.clear();
  emptyState.style.display = state.filtered.length ? "none" : "grid";
  if (!state.filtered.length) return;
  const visibleSpots = state.routeBuilt ? getRouteStopSpots() : state.filtered;
  visibleSpots.forEach((spot) => {
    const config = typeConfig[spot.type] || typeConfig.other;
    const routeIndex = state.routeStops.indexOf(spot.id);
    const isCustom = spot.osmType === "custom";
    const markerClasses = [
      "spot-marker",
      isCustom ? "custom-point" : "",
      spot.id === state.selectedId ? "selected" : "",
      routeIndex >= 0 ? "route-stop" : ""
    ].filter(Boolean).join(" ");
    const icon = L.divIcon({
      className: "",
      html: `
        <div
          class="${markerClasses}"
          style="background:${config.color}"
        >
          ${
            routeIndex >= 0
              ? `<span class="route-stop-badge">
                   ${routeIndex + 1}
                 </span>`
              : ""
          }
        </div>
      `,
      iconSize: spot.id === state.selectedId ? [24, 24] : [18, 18],
      iconAnchor: spot.id === state.selectedId ? [12, 12] : [9, 9],
      popupAnchor: [0, -10]
    });
    const title =
      spot.name === "No name"
        ? escapeHtml(spot.type)
        : escapeHtml(spot.name);
    const subtitle =
      spot.name === "No name"
        ? ""
        : config.label.replace(/s$/, "");
    const marker = L.marker([spot.lat, spot.lon], { icon })
      .bindPopup(
        `<strong>${title}</strong>${subtitle ? `<br>${subtitle}` : ""}<br>${spot.lat.toFixed(6)}, ${spot.lon.toFixed(6)}`,
        {
          closeButton: false
        }
      )
      .on("click", () => {
        if (state.routeSelectionMode) {
          toggleRouteStop(spot.id);
          return;
        }
        selectSpot(spot.id, { scrollList: false });
      })
      .bindTooltip(
        `<strong>${title}</strong>${subtitle ? `<br>${subtitle}` : ""}`,
        {
          direction: "top",
          offset: [0, -10],
          sticky: true
        }
      );
    marker.addTo(markerLayer);
    state.markers.set(spot.id, marker);
  });
}

function fitMapToFiltered() {
  const boundsItems = state.routeLine
    ? state.routeLine.getLatLngs()
    : state.filtered.map((spot) => [spot.lat, spot.lon]);
  if (!boundsItems.length) return;
  leafletMap.fitBounds(L.latLngBounds(boundsItems), {
    padding: [34, 34],
    maxZoom: SEARCH_ZOOM
  });
}

function clearRoute() {
  if (!state.routeLine) return;
  state.routeLine.remove();
  state.routeLine = null;
  state.routeSummary = null;
  state.routeBuilt = false;
  updateGpxButtonVisibility();
}

function clearRouteSelection() {
  clearRoute();
  state.routeStops = [];
}

function formatRouteSummary(summaryData) {
  if (!summaryData) return "";
  const distanceKm = summaryData.distance / 1000;
  const durationMinutes = Math.round(summaryData.duration / 60);
  return `Route: ${distanceKm.toFixed(1)} km · ${durationMinutes} min`;
}

function getRouteStopSpots() {
  return state.routeStops
    .map((id) => state.all.find((spot) => spot.id === id))
    .filter(Boolean);
}

function toggleRouteStop(id) {
  clearRoute();
  const existingIndex = state.routeStops.indexOf(id);
  if (existingIndex >= 0) {
    state.routeStops.splice(existingIndex, 1);
  } else {
    state.routeStops.push(id);
  }
  state.selectedId = id;
  render();
  const count = state.routeStops.length;
  summary.textContent = count
    ? `${count} route stop${count === 1 ? "" : "s"} selected. Click the button again to build the route.`
    : "No route stops selected. Click map markers to add stops.";
}

async function fetchHikingRoute(points) {
  // Check if we need to prompt for API key setup
  const config = await CONFIG.openAboutToSetup();
  
  if (!config.orApiKey && !window.CONFIG?.orApiKey) {
    // No API key configured - ask user for demo mode or full access
    return new Promise((resolve, reject) => {
      let showedModal = false;
      const showPrompt = () => {
        if (showedModal) { resolve(null); return; }
        showedModal = true;
        
        const getButtonHtml = (text, action, isPrimary = false) => `
          <button style="
            width: 100%; padding: 14px; margin: 8px 0;
            font-size: 15px; border: none; border-radius: 8px;
            cursor: pointer; font-weight: 500;
          " ${isPrimary ? 'background: #2563eb; color: white;' : 'background: #f3f4f6; color: #374151;'}>
            ${text}
          </button>
        `;
        
        const promptHtml = `
          <div style="
            position: fixed; inset: 0; background: rgba(0,0,0,0.85);
            display: flex; align-items: center; justify-content: center;
            z-index: 100000;
          ">
            <div style="
              background: #ffffff; border-radius: 16px; padding: 32px;
              max-width: 450px; width: 90%; box-shadow: 0 25px 80px rgba(0,0,0,0.5);
            ">
              <h2 style="margin: 0 0 16px; color: #1e40af;">🔐 API Key Setup</h2>
              
              <div style="
                background: #dbeafe; padding: 12px; border-radius: 8px;
                font-size: 13px; line-height: 1.6; margin-bottom: 16px;
              ">
                Want to build hiking routes without limitations? Add your OpenRouteService API key!
                <br><br>
                <strong>Free & Easy:</strong> <a href="https://openrouteservice.org/dev/#/signup" target="_blank" style="color: #2563eb; text-decoration: underline;">Sign up here (10s)</a>
              </div>
              
              ${getButtonHtml('Continue with Demo Mode', () => { resolve(null); }, true)}
              ${getButtonHtml('Add My API Key', () => window.open('/config/api-keys.js?setup=true', '_blank'))}
              ${getButtonHtml('Sign Up for API Key', () => window.open('https://openrouteservice.org/dev/#/signup', '_blank'), true)}
            </div>
          </div>
        `;
        document.body.insertAdjacentHTML('beforeend', promptHtml);
      };
      
      // Setup storage first if not done
      window.ApiKeyManager = window.ApiKeyManager || class {
        async loadKeys() { return localStorage.getItem('hiking_map_api_keys'); }
        async storeKeys(keys) {
          const iv = window.crypto.getRandomValues(new Uint8Array(12));
          const keyBytes = await this.deriveKey(this.getPassword(), this.getSalt());
          for (const [key, value] of Object.entries(keys)) {
            const encodedValue = new TextEncoder().encode(value);
            const ciphertext = await window.crypto.subtle.encrypt(
              { name: 'AES-GCM', iv: iv },
              keyBytes,
              encodedValue
            );
            const saltB64 = btoa(String.fromCharCode(...this.getSalt()));
            const dataView = new DataView(ciphertext.buffer);
            localStorage.setItem('hiking_map_api_keys', JSON.stringify({
              demomode: 'false',
              keys: {
                openrouteservice: btoa(String.fromCharCode(...new Uint8Array(dataView.buffer)))
              }
            }));
          }
        }
        getPassword() { return localStorage.getItem('hiking_map_password') || 'demo-password'; }
        async getSalt() {
          const salt = localStorage.getItem('hiking_map_salt');
          if (!salt) {
            await this.createStorage();
          }
          const raw = atob(localStorage.getItem('hiking_map_salt') || atob(btoa('default-salt')));
          return new Uint8Array([...raw].map(c => c.charCodeAt(0)));
        }
        async createStorage() {
          const salt = await this.generateSalt();
          localStorage.setItem('hiking_map_salt', btoa(String.fromCharCode(...salt)));
        }
        async generateSalt() {
          const array = new Uint8Array(32); window.crypto.getRandomValues(array);
          return array;
        }
        async deriveKey(password, salt) {
          const enc = new TextEncoder();
          const keyMaterial = await window.crypto.subtle.importKey(
            'raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']
          );
          return window.crypto.subtle.deriveBits(
            { name: 'PBKDF2', salt: salt, iterations: 100000, hash: 'SHA-256' },
            keyMaterial, 256
          );
        }
        async encrypt(value) {
          const iv = window.crypto.getRandomValues(new Uint8Array(12));
          const keyBytes = await this.deriveKey(this.getPassword(), this.getSalt());
          const encodedValue = new TextEncoder().encode(value);
          const ciphertext = await window.crypto.subtle.encrypt(
            { name: 'AES-GCM', iv: iv }, keyBytes, encodedValue
          );
          return {
            salt: btoa(String.fromCharCode(...this.getSalt())),
            iv: btoa(String.fromCharCode(...iv)),
            ciphertext: btoa(String.fromCharCode(...new Uint8Array(ciphertext.buffer)))
          };
        }
        async decrypt(encryptedData) {
          const salt = atob(encryptedData.salt);
          const iv = atob(encryptedData.iv);
          const ciphertextBytes = Uint8Array.from(atob(encryptedData.ciphertext), c => c.charCodeAt(0));
          const keyBytes = await this.deriveKey(this.getPassword(), this.decodeSalt(salt));
          const dataView = new DataView(ciphertext.buffer);
          const originalBytes = Uint8Array.from(new Uint8Array(dataView.buffer));
          return new TextDecoder().decode(await window.crypto.subtle.decrypt(
            { name: 'AES-GCM', iv: iv }, keyBytes, originalBytes
          ));
        }
        decodeSalt(saltB64) {
          const salt = atob(saltB64);
          return new Uint8Array([...salt].map(c => c.charCodeAt(0)));
        }
      };
      
      showPrompt();
    });
  }
  
  // Has API key - proceed with fetch
  const response = await fetch(OPENROUTESERVICE_URL, {
    method: "POST",
    headers: {
      "Accept": "application/json, application/geo+json",
      "Authorization": window.CONFIG?.orApiKey || 'demo',
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      coordinates: points.map((spot) => [spot.lon, spot.lat])
    })
  });
  const data = await response.json();
  if (!response.ok || !data.features?.[0]?.geometry?.coordinates) {
    throw new Error(data.error?.message || data.message || `OpenRouteService returned ${response.status}`);
  }
  const feature = data.features[0];
  return {
    coordinates: feature.geometry.coordinates.map(([lon, lat]) => [lat, lon]),
    summary: feature.properties?.summary || null
  };
}

async function buildFootLoop() {
  if (!state.routeSelectionMode) {
    updateGpxButtonVisibility();
    clearRoute();
    state.routeStops = [];
    state.routeSelectionMode = true;
    state.routeBuilt = false;
    routeButton.classList.add("active");
    summary.textContent = "Route selection mode enabled. Click your stops.";
    render();
    return;
  }
  const selectedStops = getRouteStopSpots();
  if (selectedStops.length < 2) {
    updateGpxButtonVisibility();
    state.routeSelectionMode = false;
    routeButton.classList.remove("active");
    summary.textContent = "Route selection cancelled.";
    state.routeStops = [];
    render();
    return;
  }
  routeButton.disabled = true;
  summary.textContent = `Building hiking loop through ${selectedStops.length} selected stops`;
  try {
    clearRoute();
    const ordered = [...selectedStops, selectedStops[0]];
    const route = await fetchHikingRoute(ordered);
    state.routeSummary = route.summary;
    state.routeLine = L.polyline(route.coordinates, {
      className: "route-line",
      color: "#111827",
      weight: 5,
      opacity: 0.82
    }).addTo(leafletMap);
    state.routeSelectionMode = false;
    state.routeBuilt = true;
    render();
    routeButton.classList.remove("active");
    updateGpxButtonVisibility();
    summary.textContent = `Hiking loop built through ${selectedStops.length} selected stops${
      state.routeSummary
        ? ` (${formatRouteSummary(state.routeSummary).replace("Route: ", "")})`
        : ""
    }`;
  } catch (error) {
    summary.textContent = error.message || "Could not build hiking loop";
  } finally {
    routeButton.disabled = false;
    if (!state.routeSelectionMode) {
      updateGpxButtonVisibility();
    }
  }
}

function generateGPX(routeLine) {
  if (!routeLine) return null;
  const coords = routeLine.getLatLngs();
  const points = coords.map(p => `
    <trkpt lat="${p.lat}" lon="${p.lng}">
      <ele>0</ele>
    </trkpt>
  `).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Nature Spots Viewer" xmlns="http://www.topografix.com/GPX/1/1">
  <trk>
    <name>Hiking Route</name>
    <trkseg>
      ${points}
    </trkseg>
  </trk>
</gpx>`;
}

function downloadGPX(content) {
  const filename = `hiking-route_${getTimestamp()}.gpx`;
  const blob = new Blob([content], { type: "application/gpx+xml" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function openInAppleMaps(routeStops) {
  if (routeStops.length < 2) return;
  const points = routeStops.map(s => `${s.lat},${s.lon}`);
  const looped = [...points, points[0]];
  const origin = looped[0];
  const destination = looped[looped.length - 1];
  const waypoints = looped.slice(1, -1);
  let url = `https://maps.apple.com/?saddr=${origin}&daddr=${destination}`;
  if (waypoints.length) {
    url += `&dirflg=w`;
  }
  window.open(url, "_blank");
}

function openInGoogleMaps(routeStops) {
  if (routeStops.length < 2) return;
  const points = routeStops.map(s => `${s.lat},${s.lon}`);
  const looped = [...points, points[0]];
  const origin = looped[0];
  const destination = looped[looped.length - 1];
  const waypoints = looped.slice(1, -1).join("|");
  let url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&travelmode=walking`;
  if (waypoints.length) {
    url += `&waypoints=${waypoints}`;
  }
  window.open(url, "_blank");
}

function formatTags(tags) {
  const keys = ["historic", "memorial", "building", "natural", "geological", "description", "note", "parking", "time_interval", "maxstay", "seasonal", "fee", "access", "fireplace", "fuel", "inscription", "website", "leisure", "nudism", "table", "covered", "wheelchair", "website:map"];
  return keys
    .filter(k => tags[k])
    .map(k => `${k}: ${tags[k]}`)
    .join(" | ");
}

function formatAllTags(tags) {
  return Object.entries(tags || {})
    .map(([k, v]) => `${k}: ${v}`)
    .join("\n");
}

function renderList() {
  list.innerHTML = "";
  const visibleSpots = state.routeBuilt ? getRouteStopSpots() : state.filtered;
  visibleSpots.forEach((spot) => {
    const config = typeConfig[spot.type] || typeConfig.other;
    const button = document.createElement("button");
    const tagLine = formatTags(spot.tags);
    button.type = "button";
    button.className = `spot${spot.id === state.selectedId ? " selected" : ""}`;
    button.addEventListener("click", () => selectSpot(spot.id, { scrollList: false }));
    button.innerHTML = `
      <div style="display:flex; justify-content:space-between; gap:10px; align-items:start;">
        <div style="flex:1;">
          <h2 style="margin:0 0 6px 0; font-size:15px;">
            ${escapeHtml(spot.name)}
          </h2>
          <div style="display:flex; flex-wrap:wrap; gap:6px; margin-bottom:6px;">
            <span style="
              font-size:11px;
              padding:2px 6px;
              border-radius:999px;
              background:${config.color}22;
              color:${config.color};
            ">
              ${config.label}
            </span>
          </div>
          <div style="font-size:11px; color:#64706a; margin-top:6px;">
            ${tagLine ? `
              <div style="font-size:11px; color:#64706a; margin-top:6px;">
                ${escapeHtml(tagLine)}
              </div>
            ` : ""}
          </div>
        </div>
      </div>
    `;
    list.append(button);
  });
}

function selectSpot(id, options = {}) {
  const shouldScrollList = options.scrollList ?? true;
  const shouldOpenPopup = options.openPopup ?? true;
  state.selectedId = id;
  render();
  const selectedSpot = state.filtered.find((spot) => spot.id === id);
  const selectedMarker = state.markers.get(id);
  if (selectedSpot && selectedMarker) {
    selectedMarker.openPopup();
  }
  if (shouldScrollList) {
    document.querySelector(".spot.selected")?.scrollIntoView({ block: "nearest" });
  }
}

function render() {
  renderStats();
  renderMap();
  renderList();
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[char]);
}

applyFilters({ fitMap: false });
