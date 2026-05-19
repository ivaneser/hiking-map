    const OVERPASS_URL = window.CONFIG?.overpassUrl || "https://overpass-api.de/api/interpreter";
    const OPENROUTESERVICE_URL = window.CONFIG?.openRouteServiceUrl || "https://api.openrouteservice.org/v2/directions/foot-hiking/geojson";
    const DEMO_FALLBACK_KEY_ENC = window.RUNTIME_SECRETS?.demoFallbackKeyEnc || "";
    const DEMO_FALLBACK_SECRET = window.RUNTIME_SECRETS?.demoFallbackSecret || "";
    let demoFallbackNoticeShown = false;

    function getDemoFallbackKey() {
      if (!DEMO_FALLBACK_KEY_ENC || !DEMO_FALLBACK_SECRET) return "";
      try {
        const encrypted = atob(DEMO_FALLBACK_KEY_ENC);
        let out = "";
        for (let i = 0; i < encrypted.length; i += 1) {
          out += String.fromCharCode(
            encrypted.charCodeAt(i) ^ DEMO_FALLBACK_SECRET.charCodeAt(i % DEMO_FALLBACK_SECRET.length)
          );
        }
        return out;
      } catch {
        return "";
      }
    }

    async function ensureOrsApiKey() {
      const manager = window.ApiKeyManager ? new window.ApiKeyManager() : null;
      let key = manager ? manager.getApiKey() : "";
      if (key) return key;

      if (typeof window.setupApiKeySetup === "function") {
        key = await window.setupApiKeySetup();
        if (key) return key;
      }

      const demoKey = getDemoFallbackKey();
      if (demoKey) {
        if (!demoFallbackNoticeShown) {
          demoFallbackNoticeShown = true;
          alert("Using built-in demo API key. It may stop working at any time; please add your own key for reliable routing.");
        }
        return demoKey;
      }

      return "";
    }

    /*const typeConfig = {
      viewpoint: { label: "Viewpoints", color: "#475569" },
      attraction: { label: "Attractions", color: "#db2777" },
      firepit: { label: "Firepits", color: "#d97706" },
	  picnic: { label: "Picnic", color: "#d97706" },
	  shelter: { label: "Shelter", color: "#d97706" },
	  water: { label: "Water", color: "#d97706" },
      cave: { label: "Caves", color: "#6d28d9" },
      hut: { label: "Huts", color: "#047857" },
	  parking: { label: "Parking", color: "#2563eb" },
	  wc: { label: "WC", color: "#2563eb" },
	  historic: { label: "Historic", color: "#0000ff" },
      other: { label: "Other", color: "#ffffff" }
    };*/
	const typeConfig = {
	  viewpoint:  { label: "Viewpoints",  color: "#22C55E" }, // vivid green
	  attraction: { label: "Attractions", color: "#EC4899" }, // pink
	  firepit:    { label: "Firepits",    color: "#F97316" }, // orange
	  picnic:     { label: "Picnic",      color: "#F59E0B" }, // amber
	  camping:    { label: "Camping",     color: "#2E8B57" }, // forest green
	  shelter:    { label: "Shelter",     color: "#A3A3A3" }, // gray
	  water:      { label: "Water",       color: "#06B6D4" }, // cyan
	  cave:       { label: "Caves",       color: "#7C3AED" }, // purple
	  hut:        { label: "Huts",        color: "#16A34A" }, // green
	  parking:    { label: "Parking",     color: "#2563EB" }, // strong blue
	  wc:         { label: "WC",          color: "#0EA5E9" }, // light blue
	  historic:   { label: "Historic",    color: "#B45309" }, // brown/bronze
	  other:      { label: "Other",       color: "#64748B" }  // slate
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
	}).setView([60.1699, 24.9384], SEARCH_ZOOM); // Helsinki
    const markerLayer = L.layerGroup().addTo(leafletMap);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(leafletMap);
		
    //document.querySelector("#fitButton").addEventListener("click", fitMapToFiltered);
    routeButton.addEventListener("click", buildFootLoop);
	searchButton.addEventListener("click", async () => {

	  const zoom = leafletMap.getZoom();

	  // zoom in first if too far away
	  if (zoom < SEARCH_ZOOM) {

	    searchButton.classList.add("loading");

	    leafletMap.flyTo(
	      leafletMap.getCenter(),
	      SEARCH_ZOOM
	    );

	    leafletMap.once("moveend", async () => {
	      await searchOverpass();
	    });

	    return;
	  }

	  searchButton.classList.add("loading");

	  await searchOverpass();
	});
	
    /*document.querySelector("#fileInput").addEventListener("change", async (event) => {
      const file = event.target.files[0];
      if (!file) return;
      loadData(JSON.parse(await file.text()), file.name);
    });*/
    
	searchInput.addEventListener("input", () => {
      //clearRouteSelection();
      applyFilters();
    });
    window.addEventListener("resize", () => {
      leafletMap.invalidateSize();
      fitMapToFiltered();
    });
	
  	document
      .querySelector("#locateButton")
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
	  const lon = e.latlng.lng;   // IMPORTANT: Leaflet uses lng, your app uses lon

	  // optional: avoid duplicates near existing spots
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

	  // create synthetic point
	  const synthetic = {
		id: `custom-${Date.now()}`,
		name: "My point",
		osmType: "custom",
		type: "other",
		lat,
		lon,
		tags: {}
	  };

	  // store it globally so it behaves like normal spot
	  state.all.push(synthetic);
	  state.filtered.push(synthetic);
	  
	  // immediately add to route
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

	      // remove old marker
	      if (userLocationMarker) {
	        leafletMap.removeLayer(userLocationMarker);
	      }

	      if (userAccuracyCircle) {
	        leafletMap.removeLayer(userAccuracyCircle);
	      }

	      // blue dot
	      userLocationMarker = L.circleMarker([lat, lon], {
	        radius: 8,
	        fillColor: "#2563eb",
	        color: "#fff",
	        weight: 3,
	        opacity: 1,
	        fillOpacity: 1
	      }).addTo(leafletMap);

	      // accuracy radius
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

	  // clear existing route
	  clearRoute();

	  // set route stops (best effort: just endpoints + simplification)
	  state.routeStops = [];

	  const first = coords[0];
	  const last = coords[coords.length - 1];

	  // find nearest known spots (optional enhancement)
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

	  // draw route
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
	  //clearRouteSelection();
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
	  //const zoom = leafletMap.getZoom();
	  //searchButton.disabled = zoom < SEARCH_ZOOM;
	  //searchButton.textContent =
	    //zoom < SEARCH_ZOOM ? "Zoom in" : "Search here";
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
        summary.textContent = "Search failed, try again."; //error.message ||
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

	  const totalActive =
	    state.activeTypes.size === allTypes.length;

	  const totalDiv = document.createElement("div");

	  totalDiv.className = `stat${totalActive ? " active" : ""}`;
	  
	  /*totalDiv.style.display = "flex";
	  totalDiv.style.alignItems = "center";
	  totalDiv.style.gap = "6px";
	  totalDiv.style.padding = "6px 10px";
	  totalDiv.style.borderRadius = "999px";
	  totalDiv.style.border = "1px solid var(--line)";*/
	  //totalDiv.style.background = active ? `${config.color}22` : "#fbfcfa";
	  //totalDiv.style.cursor = "pointer";

	  totalDiv.innerHTML = `
	    <strong>${state.filtered.length}</strong>
	    <span style="font-size:14px;">Total</span>
	  `;

	  totalDiv.addEventListener("click", () => {

	    //clearRouteSelection();

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

		/*div.style.display = "flex";
		div.style.alignItems = "center";
		div.style.gap = "6px";
		div.style.padding = "6px 10px";
		div.style.borderRadius = "999px";
		div.style.border = "1px solid var(--line)";*/
		div.style.background = active ? `${config.color}22` : "#fbfcfa";
		//div.style.cursor = "pointer";

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

	      //clearRouteSelection();

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

	  emptyState.style.display =
	    state.filtered.length ? "none" : "grid";

	  if (!state.filtered.length) return;

  	  const visibleSpots =
        state.routeBuilt
          ? getRouteStopSpots()
          : state.filtered;

      visibleSpots.forEach((spot) => {
	  //state.filtered.forEach((spot) => {

		const config =
	      typeConfig[spot.type] || typeConfig.other;

	    const routeIndex =
	      state.routeStops.indexOf(spot.id);

	  	const isCustom = spot.osmType === "custom";

	  	const markerClasses = [
	      "spot-marker",
	      isCustom ? "custom-point" : "",
	      spot.id === state.selectedId ? "selected" : "",
	      routeIndex >= 0 ? "route-stop" : ""
	    ]
	    .filter(Boolean)
	    .join(" ");

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
	      iconSize:
	        spot.id === state.selectedId
	          ? [24, 24]
	          : [18, 18],

	      iconAnchor:
	        spot.id === state.selectedId
	          ? [12, 12]
	          : [9, 9],

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


	    const marker = L.marker([spot.lat, spot.lon],{ icon })
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

	        selectSpot(spot.id, {
				scrollList: false	
	        });
	      })
		  .bindTooltip(
		    `<strong>${title}</strong>${subtitle ? `<br>${subtitle}` : ""}`,
		    {
		      direction: "top",
		      offset: [0, -10],
		      sticky: true
		    }
		  )
		  
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
      //document.querySelector(".spot.selected")?.scrollIntoView({ block: "nearest" });
      const count = state.routeStops.length;
      summary.textContent = count
        ? `${count} route stop${count === 1 ? "" : "s"} selected. Click the button again to build the route.`
        : "No route stops selected. Click map markers to add stops.";
    }

    async function fetchHikingRoute(points, allowRetry = true) {
      const apiKey = await ensureOrsApiKey();
      if (!apiKey) {
        throw new Error("Missing OpenRouteService API key. Configure your key to build routes.");
      }

      try {
        const response = await fetch(OPENROUTESERVICE_URL, {
          method: "POST",
          headers: {
            "Accept": "application/json, application/geo+json",
            "Authorization": apiKey,
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
      } catch (error) {
        if (allowRetry && typeof window.setupApiKeySetup === "function") {
          const manager = window.ApiKeyManager ? new window.ApiKeyManager() : null;
          manager?.clearKeys?.();

          alert("Route build failed. Please re-enter your OpenRouteService API key.");
          const newKey = await window.setupApiKeySetup();

          if (newKey) {
            return fetchHikingRoute(points, false);
          }
        }

        throw error;
      }
    }

	async function buildFootLoop() {

	  // ENTER SELECTION MODE

	  if (!state.routeSelectionMode) {
		updateGpxButtonVisibility();

	    clearRoute();

	    state.routeStops = [];
	    state.routeSelectionMode = true;
		state.routeBuilt = false;

	    routeButton.classList.add("active");
	    //routeButton.textContent = "Build Route";

	    summary.textContent =
	      "Route selection mode enabled. Click your stops.";

	    render();

	    return;
	  }

	  // BUILD ROUTE

	  const selectedStops = getRouteStopSpots();

	  if (selectedStops.length < 2) {
		updateGpxButtonVisibility();

	    state.routeSelectionMode = false;

	    routeButton.classList.remove("active");
	    //routeButton.textContent = "Build Hiking Loop";

	    summary.textContent = "Route selection cancelled.";

	    state.routeStops = [];

	    render();

	    return;
	  }

	  routeButton.disabled = true;
	  //routeButton.textContent = "Routing";

	  summary.textContent =
	    `Building hiking loop through ${selectedStops.length} selected stops`;

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
		//fitMapToFiltered();
		
	    routeButton.classList.remove("active");
	    //routeButton.textContent = "Build Hiking Loop";
		updateGpxButtonVisibility();

	    summary.textContent =
	      `Hiking loop built through ${selectedStops.length} selected stops${
	        state.routeSummary
	          ? ` (${formatRouteSummary(state.routeSummary).replace("Route: ", "")})`
	          : ""
	      }`;

	  } catch (error) {

	    summary.textContent =
	      error.message || "Could not build hiking loop";

	  } finally {

	    routeButton.disabled = false;

	    if (!state.routeSelectionMode) {
	      //routeButton.textContent = "Build Hiking Loop";
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

	  // loop
	  const looped = [...points, points[0]];

	  const origin = looped[0];
	  const destination = looped[looped.length - 1];

	  const waypoints = looped.slice(1, -1);

	  let url = `https://maps.apple.com/?saddr=${origin}&daddr=${destination}`;

	  if (waypoints.length) {
	    url += `&dirflg=w`; // walking mode
	  }

	  window.open(url, "_blank");
	}
	
	function openInGoogleMaps(routeStops) {
	  if (routeStops.length < 2) return;

	  const points = routeStops.map(s => `${s.lat},${s.lon}`);

	  // 🔁 close the loop by repeating first point
	  const looped = [...points, points[0]];

	  const origin = looped[0];
	  const destination = looped[looped.length - 1];

	  // middle points become waypoints (excluding first + last)
	  const waypoints = looped.slice(1, -1).join("|");

	  let url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&travelmode=walking`;

	  if (waypoints.length) {
	    url += `&waypoints=${waypoints}`;
	  }

	  window.open(url, "_blank");
	}
	
	function formatTags(tags) {
	  const keys = ["historic", "memorial", "building", "natural", "geological", "description", "note", "parking", "time_interval", "maxstay", "seasonal", "fee", "access", "fireplace", "fuel", "inscription", "website",  "leisure", "nudism", "table", "covered", "wheelchair", "website:map"];
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
	  
	  //const baseSpots =
	  const visibleSpots =
	    state.routeBuilt
	      ? getRouteStopSpots()
	      : state.filtered;

	  /*const visibleSpots = [...baseSpots].sort((a, b) => {

	    if (a.id === state.selectedId) return -1;
	    if (b.id === state.selectedId) return 1;

	    return 0;
	  });*/
  
  	  visibleSpots.forEach((spot) => {
      //state.filtered.forEach((spot) => {
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

		        <!--span style="font-size:11px; color:#64706a;">
		          ${spot.osmType}
		        </span-->
		      </div>

		      <!--div style="font-size:12px; color:#64706a;">
		        📍 ${spot.lat.toFixed(5)}, ${spot.lon.toFixed(5)}
		      </div-->
			  <div style="font-size:11px; color:#64706a; margin-top:6px;">
				<!--${escapeHtml(formatAllTags(spot.tags))}-->
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
        //const targetZoom = Math.max(leafletMap.getZoom(), 15);
        if (shouldOpenPopup) {
          //leafletMap.once("moveend", () => selectedMarker.openPopup());
		  selectedMarker.openPopup();
        }
        //leafletMap.setView([selectedSpot.lat, selectedSpot.lon], targetZoom, { animate: true });
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
  

/* prepush-balance: }} */
/* prepush-balance: )) */
