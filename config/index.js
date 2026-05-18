/**
 * Hiking Map Configuration Module - Demo Mode by Default
 * 
 * Automatically loads API keys if stored, otherwise uses demo mode.
 * No intrusive setup required - just browse and build routes!
 */

if (typeof window !== 'undefined') {
  // Initialize with demo mode by default
  const CONFIG = {
    orApiKey: '', // Empty means no auth header (demo mode)
    overpassApiUrl: 'https://overpass-api.de/api/interpreter',
    demoMode: true, // Default to demo mode - browse freely!
    showApiKeySetup: () => {
      if (!window.ApiKeyManager) return;
      
      const manager = new window.ApiKeyManager();
      const storedKeys = async () => await manager.init();
      
      // Only show setup if user has an API key to store
      if (window.location.hostname !== 'localhost') {
        // Non-localhost sites should check if keys exist
        manager.init().then((keys) => {
          if (!keys && !CONFIG.orApiKey) {
            CONFIG.showApiKeySetup = () => manager.setupModal();
            window.openAboutToSetup();
          }
        });
      }
    },
    openAboutToSetup: async () => {
      const storedKeys = await new window.ApiKeyManager().init();
      
      if (storedKeys) {
        // Keys exist - show setup anyway to allow update
        CONFIG.showApiKeySetup = () => new window.ApiKeyManager().setupModal();
        CONFIG.openAboutToSetup = async () => {
          const manager = new window.ApiKeyManager();
          const overlay = document.createElement('div');
          overlay.id = 'apiKeyAboutSetup';
          overlay.style.cssText = `
            position: fixed; inset: 0; background: rgba(0,0,0,0.6);
            display: flex; align-items: center; justify-content: center; z-index: 999998;
          `;
          
          const container = document.createElement('div');
          container.style.cssText = `
            background: #1e3a5f; padding: 32px; border-radius: 16px; text-align: center;
            box-shadow: 0 25px 50px rgba(0,0,0,0.4);
          `;
          
          container.innerHTML = `
            <h2 style="color: white; margin: 0 0 16px;">🔐 You Have Stored API Keys</h2>
            <p style="color: #d1d5db; line-height: 1.6;">
              Your OpenRouteService API key is stored securely in your browser.<br><br>
              Would you like to configure your key now? This is optional - you can 
              continue building routes without entering a new password.
            </p>
            <button id="setupButton" style="
              margin-top: 20px; padding: 12px 24px; font-size: 16px;
              background: #3b82f6; color: white; border: none; border-radius: 8px;
              cursor: pointer;
            " onclick="CONFIG.showApiKeySetup()">Configure Now</button>
            <br><br>
            <button style="background: transparent; color: #9ca3af; border: none; 
              background: transparent; padding: 4px 8px; font-size: 12px; cursor: pointer;"
              onclick="document.getElementById('apiKeyAboutSetup').remove()">Not Now</button>
          `;
          
          overlay.appendChild(container);
          document.body.appendChild(overlay);
        };
        
        return true;
      } else {
        // No keys stored - use demo mode
        return false;
      }
    }
  };
}

// Export for use in script.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = window.CONFIG || {};
}
