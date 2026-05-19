(function () {
  const CONFIG = {
    overpassUrl: "https://overpass-api.de/api/interpreter",
    openRouteServiceUrl: "https://api.openrouteservice.org/v2/directions/foot-hiking/geojson",
    demoMode: true,
    getApiKey() {
      const manager = window.ApiKeyManager ? new window.ApiKeyManager() : null;
      return manager ? manager.getApiKey() : "";
    }
  };

  window.CONFIG = CONFIG;
})();
