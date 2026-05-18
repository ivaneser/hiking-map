/**
 * Hiking Map Configuration Module - Zero Setup Required
 * 
 * Default behavior:
 * • No prompts at all while browsing
 * • Routes build in demo mode automatically  
 * • Setup modal ONLY appears when API key would be needed
 */

if (typeof window !== 'undefined') {
  // Always use demo mode by default - never prompt!
  const CONFIG = {
    orApiKey: '',              // Empty = demo mode (no auth)
    overpassApiUrl: 'https://overpass-api.de/api/interpreter',
    demoMode: true,            // Always enabled in production
    
    // Demo mode API key string for fallback
    demoApiKey: '',
  };

  /**
   * Try to load stored API key silently (no user prompt)
   */
  CONFIG.tryLoadStoredKey = async function() {
    const manager = new window.ApiKeyManager();
    
    try {
      // Check if encrypted storage exists and is valid
      const keys = await manager.init();
      
      if (keys && keys.openrouteservice) {
        CONFIG.orApiKey = keys.openrouteservice;
        console.log('✅ Loaded stored API key');
        return true;
      }
    } catch {
      console.warn('Stored keys not available, using demo mode');
    }
    
    // Fall back to demo mode (no prompts!)
    CONFIG.demoMode = true;
    return false;
  };

  /**
   * Get current auth header for API requests
   */
  CONFIG.getAuthHeader = async function() {
    const manager = new window.ApiKeyManager();
    
    try {
      const keys = await manager.init();
      
      // Demo mode or no stored key = empty auth header
      if (!keys || !keys.openrouteservice) {
        console.log('Using demo mode (no authentication)');
        return '';
      }
      
      return 'Bearer ' + keys.openrouteservice;
    } catch {
      console.warn('Failed to load stored key, using demo mode');
      return '';
    }
  };

  /**
   * Check if running in demo mode
   */
  CONFIG.isDemoMode = async function() {
    const manager = new window.ApiKeyManager();
    const keys = await manager.init();
    
    // Demo mode = no valid API key in storage
    return !keys || !keys.openrouteservice;
  };

  /**
   * Silent initialization - check for stored keys, use demo if none found
   */
  CONFIG.initSilently = async function() {
    console.log('🚀 Initializing Hiking Map...');
    
    // Try to load stored key (fails silently)
    await CONFIG.tryLoadStoredKey();
    
    // Check current status
    const isDemo = await CONFIG.isDemoMode();
    
    if (isDemo) {
      console.log('✅ Demo mode: Browse and explore freely!');
      console.log('   Build routes in demo mode (no API key needed)');
    } else {
      console.log('✅ Full mode: Using stored API key');
    }
  };

  /**
   * Show setup modal when user tries to build route without valid key
   */
  CONFIG.showSetupModalIfNeeded = async function() {
    // Check if we need to show the modal (no API key stored)
    const manager = new window.ApiKeyManager();
    const keys = await manager.init();
    
    // Only show modal if:
    // 1. No API key in storage AND
    // 2. Not already using demo mode explicitly
    if (!keys || !keys.openrouteservice) {
      // Show the modal with all options
      const setupModal = new window.ApiKeyManager().setupModal;
      await setupModal?.();
      
      return true;
    }
    
    return false;
  };

  // Run silent initialization when loaded
  CONFIG.initSilently().catch(console.error);
}

// Export for Node.js environments
if (typeof module !== 'undefined' && module.exports) {
  try {
    window.initConfig?.();
    module.exports = {};
  } catch(e) { console.warn('Config init error:', e.message); }
}
