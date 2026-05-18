/**
 * Setup Script for Hiking Map API Keys
 * 
 * Run this script in browser console to configure your API keys securely.
 */

(function() {
  'use strict';

  // Wait for the app to be ready
  window.addEventListener('load', async () => {
    const setupButton = document.createElement('button');
    setupButton.textContent = '🔐 Configure API Keys';
    setupButton.style.cssText = `
      position: fixed;
      top: 20px; right: 20px;
      padding: 16px 24px;
      font-size: 16px;
      font-weight: bold;
      background: #3b82f6;
      color: white;
      border: none;
      border-radius: 12px;
      cursor: pointer;
      box-shadow: 0 4px 6px rgba(0,0,0,0.3);
      z-index: 10000;
    `;

    setupButton.addEventListener('click', async () => {
      try {
        // Initialize API key manager
        const apiManager = new ApiKeyManager();
        
        // Check current state
        const existingKeys = await apiManager.loadKeys();
        const demoMode = window.CONFIG?.demoMode;
        const hasApiKey = !!(window.CONFIG?.orApiKey);

        if (existingKeys || demoMode || hasApiKey) {
          // Keys already configured
          setupButton.textContent = '✅ API Keys Configured';
          alert('API keys are already configured!\n\nCurrent status:\n• Demo mode: ' + (demoMode ? 'Yes' : 'No') + '\n• Has API key: ' + (hasApiKey ? 'Yes' : 'No'));
        } else {
          // Need to configure - open setup page
          apiManager.setupApiKeySetup();
        }

      } catch (error) {
        console.error('Setup error:', error);
        alert('Error configuring API keys:\n' + error.message);
      }
    });

    document.body.appendChild(setupButton);

    // Auto-show setup if no keys exist (only in development)
    const checkAndAutoSetup = async () => {
      if (window.location.hostname === 'localhost') {
        const manager = new ApiKeyManager();
        const existingKeys = await manager.loadKeys();
        
        if (!existingKeys && window.CONFIG?.orApiKey) {
          // Has API key but no stored keys - should be fine
        } else if (!existingKeys && !window.CONFIG?.orApiKey) {
          // No keys at all in dev - maybe suggest setup
          const alreadyPrompted = localStorage.getItem('hiking_map_setup_prompted');
          if (!alreadyPrompted) {
            console.log(
              '%c🔐 Hiking Map API Key Reminder', 
              'color: #3b82f6; font-size: 14px;'
            );
            console.log(
              'No API keys stored. Click the "Configure API Keys" button\n' +
              'or run: window.setupApiKeySetup()'
            );
            localStorage.setItem('hiking_map_setup_prompted', 'true');
          }
        }
      }
    };

    checkAndAutoSetup();

  }, false);

})();
