/**
 * Hiking Map Configuration Module - Demo Mode by Default
 * 
 * Automatically loads API keys if stored, otherwise uses demo mode.
 * No intrusive setup required - just browse and build routes!
 */

if (typeof window !== 'undefined') {
  // Initialize with demo mode by default for immediate use
  const CONFIG = {
    orApiKey: '', // Empty means no auth header (demo mode)
    overpassApiUrl: 'https://overpass-api.de/api/interpreter',
    demoMode: true, // Default to demo mode - browse freely!
    
    // Functions used by script.js for prompting setup
    showApiKeySetup: function() {
      console.log('Opening API key setup...');
      if (!window.ApiKeyManager) {
        console.error('ApiKeyManager not loaded. Check config/api-keys.js');
        return;
      }
      
      const manager = new window.ApiKeyManager();
      const initKeys = async () => await manager.init();
      
      // Show setup modal if no keys exist and not in demo mode
      if (!CONFIG.demoMode) {
        initKeys().then((keys) => {
          if (!keys && !CONFIG.orApiKey) {
            CONFIG.showApiKeySetup = () => manager.setupModal?.() || {};
            window.openAboutToSetup?.();
          }
        });
      }
    },
    
    openAboutToSetup: async function() {
      const storedKeys = await new window.ApiKeyManager().init?.();
      
      if (storedKeys) {
        // Keys exist - show setup modal to allow update
        CONFIG.showApiKeySetup = () => new window.ApiKeyManager()?.setupModal?.() || {};
        
        window.open('about:blank', 'setupPrompt');
        
        const containerHtml = `
          <div style="
            position: fixed; inset: 0; background: rgba(0,0,0,0.85);
            display: flex; align-items: center; justify-content: center; z-index: 999998;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          ">
            <div style="
              background: #1e3a5f; padding: 40px; border-radius: 16px; text-align: center;
              box-shadow: 0 25px 50px rgba(0,0,0,0.4); color: white; min-width: 350px;
            ">
              <h2 style="color: white; margin: 0 0 16px;">🔐 API Key Detected</h2>
              <p style="color: #d1d5db; line-height: 1.6;">
                You have stored OpenRouteService API keys securely in your browser.<br><br>
                Would you like to configure them now? This is optional.
              </p>
              <button 
                id="setupButton" 
                style="margin-top: 20px; padding: 12px 24px; font-size: 16px; border-radius: 8px; cursor: pointer;"
                onclick="CONFIG.showApiKeySetup?.() || window.location.reload()"
              >Configure Now</button>
              <br><br>
              <button 
                style="background: transparent; color: #9ca3af; border: none; background: transparent; padding: 8px 16px; font-size: 14px; cursor: pointer;"
                onclick="window.close();"
              >Not Now</button>
            </div>
          </div>
        `;
        
        const promptWin = window.open('about:blank', '_blank');
        if (promptWin) {
          promptWin.document.write(containerHtml);
          promptWin.document.close();
        } else {
          console.warn('Popup blocked by browser, reload page to continue');
        }
      } else {
        // No keys stored - use demo mode
        return false;
      }
    }
  };
}

// Export for Node.js environment
if (typeof module !== 'undefined' && module.exports) {
  try {
    window.initConfig();
    module.exports = {};
  } catch(e) {}
}
