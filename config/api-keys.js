/**
 * API Keys Security Module - Always Prompt for Setup
 * 
 * This module handles secure storage of OpenRouteService API keys.
 * Default behavior: Demomode works, shows setup modal when needed.
 */

class ApiKeyManager {
  constructor() {
    this.STORAGE_KEY = 'hiking_map_api_keys';
  }

  /**
   * Initialize and check for stored keys
   */
  async init() {
    const raw = localStorage.getItem(this.STORAGE_KEY);
    if (!raw) return false;
    
    try {
      const data = JSON.parse(raw);
      
      // Demo mode or no password = demo mode
      if (data.demomode === 'true') return true;
      
      // Has encrypted storage but no password
      const password = localStorage.getItem('hiking_map_password');
      if (!password) return true; // Return true - keys exist with password
      
      // Try to decrypt and verify keys work
      const decrypted = await this.tryDecrypt(data.keys);
      if (!decrypted || !decrypted.openrouteservice) return false;
      
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Load API keys for authentication
   */
  async getAuthHeader() {
    const stored = await this.init();
    
    // Demo mode - no auth needed
    if (typeof CONFIG !== 'undefined' && CONFIG.demoMode === true) {
      console.log('Using demo mode (no auth)');
      return '';
    }
    
    // Try to load from storage
    const raw = localStorage.getItem(this.STORAGE_KEY);
    if (!raw) return '';
    
    try {
      const data = JSON.parse(raw);
      
      // Demo mode flag
      if (data.demomode === 'true') return '';
      
      const password = localStorage.getItem('hiking_map_password');
      if (!password) return '';
      
      // Try decrypting and get the key
      try {
        const decrypted = await this.tryDecrypt(data.keys);
        return decrypted?.openrouteservice || '';
      } catch {
        console.warn('Failed to decrypt stored keys, using demo mode');
        return '';
      }
    } catch {
      return '';
    }
  }

  /**
   * Try to decrypt stored keys (for verification)
   */
  async tryDecrypt(keys) {
    const password = localStorage.getItem('hiking_map_password');
    if (!password || !keys) return null;
    
    const decryptedKeys = {};
    for (const [keyName, encrypted] of Object.entries(keys)) {
      try {
        const decrypted = await this.decrypt(encrypted);
        if (decrypted && decrypted.key !== undefined) {
          decryptedKeys[keyName] = decrypted.key;
        }
      } catch {
        throw new Error('Key decryption failed');
      }
    }
    
    return decryptedKeys;
  }

  /**
   * Encrypt a value using AES-GCM with PBKDF2 password derivation
   */
  async encrypt(value) {
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const salt = await this.getSalt();

    const keyBytes = await this.deriveKey(this.getPassword(), salt);
    const encodedValue = new TextEncoder().encode(value);
    const ciphertext = await window.crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: iv },
      keyBytes,
      encodedValue
    );

    return {
      salt: btoa(String.fromCharCode(...salt)),
      iv: btoa(String.fromCharCode(...iv)),
      ciphertext: btoa(String.fromCharCode(...new Uint8Array(ciphertext.buffer)))
    };
  }

  /**
   * Decrypt a value
   */
  async decrypt(encryptedData) {
    const salt = atob(encryptedData.salt);
    const iv = atob(encryptedData.iv);
    const ciphertextBytes = Uint8Array.from(atob(encryptedData.ciphertext), c => c.charCodeAt(0));

    const keyBytes = await this.deriveKey(this.getPassword(), this.decodeSalt(salt));
    
    return new TextDecoder().decode(await window.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv },
      keyBytes,
      ciphertextBytes
    ));
  }

  /**
   * Derive encryption key from password using PBKDF2
   */
  async deriveKey(password, salt) {
    const encodedPassword = new TextEncoder().encode(password);
    return window.crypto.subtle.deriveKey(
      { name: 'PBKDF2', hash: 'SHA-256', salt: this.decodeSalt(salt), iterations: 100000 },
      encodedPassword,
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    );
  }

  /**
   * Get stored salt or generate new one
   */
  async getSalt() {
    let existingSalt = localStorage.getItem('hiking_map_salt');
    
    if (!existingSalt) {
      const newSalt = crypto.getRandomValues(new Uint8Array(16));
      existingSalt = btoa(String.fromCharCode(...newSalt));
      localStorage.setItem('hiking_map_salt', existingSalt);
    }
    
    return this.decodeSalt(existingSalt);
  }

  /**
   * Decode salt from base64 to buffer-like object
   */
  decodeSalt(salt) {
    const bytes = Uint8Array.from(atob(salt), c => c.charCodeAt(0));
    return { 
      toString: () => Buffer.from(bytes).toString('base64'),
      slice: (start, end) => this.decodeSalt(btoa(String.fromCharCode(...bytes.slice(start, end))))
    };
  }

  /**
   * Get stored password or prompt for it (should only be called in setup)
   */
  getPassword() {
    return localStorage.getItem('hiking_map_password') || '';
  }

  /**
   * Set password (called from setup modal)
   */
  setPassword(password) {
    if (!password || typeof password !== 'string') {
      console.error('Password must be a non-empty string');
      return false;
    }
    
    localStorage.setItem('hiking_map_password', password);
    console.log('✓ Password set for encrypted storage');
    return true;
  }

  /**
   * Store API keys in encrypted storage
   */
  async storeKeys(keys) {
    const encryptedKeys = {};
    
    for (const [key, value] of Object.entries(keys)) {
      const encrypted = await this.encrypt(value);
      if (!encrypted) throw new Error('Failed to encrypt key');
      
      encryptedKeys[key] = { salt: encrypted.salt, iv: encrypted.iv, ciphertext: encrypted.ciphertext };
    }

    localStorage.setItem(this.STORAGE_KEY, JSON.stringify({ demomode: 'false', keys: encryptedKeys }));
  }

  /**
   * Clear all stored API keys and passwords
   */
  clearKeys() {
    localStorage.removeItem(this.STORAGE_KEY);
    localStorage.removeItem('hiking_map_salt');
    localStorage.removeItem('hiking_map_password');
  }

  /**
   * Setup modal - shows when API key storage is needed
   * Returns cleanup function to remove the modal
   */
  async setupModal() {
    const overlay = document.createElement('div');
    overlay.id = 'apiKeySetupOverlay';
    overlay.style.cssText = `
      position: fixed; inset: 0; background: rgba(0,0,0,0.65);
      display: flex; align-items: center; justify-content: center; z-index: 999999;
    `;

    const container = document.createElement('div');
    container.style.cssText = `
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 36px 48px; border-radius: 24px; text-align: center; color: white;
      box-shadow: 0 25px 50px rgba(0,0,0,0.3); max-width: 520px;
    `;

    const html = `
      <div style="position: relative;">
        <h2 style="margin: 0 0 8px;">🔐 API Key Setup</h2>
        <p style="color: rgba(255,255,255,0.9); margin-bottom: 24px; line-height: 1.6;">
          Store your OpenRouteService API key securely in the browser.<br>
          Your keys are encrypted and never sent to any server!
        </p>

        <div style="background: rgba(255,255,255,0.1); padding: 24px; border-radius: 16px; margin-bottom: 24px; text-align: left;">
          <h3 style="margin: 0 0 12px; color: #fff;">Option 1: Continue with Demo Mode</h3>
          <p style="color: rgba(255,255,255,0.8); margin-bottom: 8px;">Browse freely, search spots, view maps</p>
          <button 
            onclick="window.ApiKeyManager.clearKeys(); location.reload();"
            style="background: #4ade80; color: #065f46; border: none; padding: 12px 24px; border-radius: 12px; cursor: pointer; font-weight: 600;"
          >Use Demo Mode</button>
        </div>

        <div style="background: rgba(255,255,255,0.1); padding: 24px; border-radius: 16px; margin-bottom: 24px; text-align: left;">
          <h3 style="margin: 0 0 12px; color: #fff;">Option 2: Enter API Key</h3>
          <p style="color: rgba(255,255,255,0.8); margin-bottom: 8px;">Full access to build unlimited routes</p>
          
          <div style="background: white; padding: 16px; border-radius: 12px; margin-bottom: 12px;">
            <input 
              id="apiInput" type="text" placeholder="Enter your OpenRouteService API key"
              style="width: 100%; border: none; outline: none; font-size: 14px;"
            />
          </div>
          
          <button 
            onclick="document.getElementById('setupOverlay').remove(); ApiKeyManager.setupWithPassword()"
            style="background: #60a5fa; color: white; border: none; padding: 12px 24px; border-radius: 12px; cursor: pointer; font-weight: 600;"
          >Set Password & Store Key</button>
          <p style="font-size: 12px; margin-top: 8px; color: rgba(255,255,255,0.7);">
            Choose a password to encrypt your keys! 
          </p>
        </div>

        <button onclick="document.getElementById('setupOverlay').remove();" style="background: transparent; border: none; color: rgba(255,255,255,0.7); cursor: pointer;">
          ✕ Close without storing
        </button>
      </div>
    `;

    container.innerHTML = html;
    overlay.appendChild(container);
    document.body.appendChild(overlay);

    // Add password input for encryption
    const passwordContainer = document.createElement('div');
    passwordContainer.style.cssText = `background: rgba(255,255,255,0.1); padding: 16px; border-radius: 12px; margin-bottom: 12px;`;
    passwordContainer.innerHTML = `
      <p style="color: rgba(255,255,255,0.8); font-size: 13px; margin-bottom: 8px;">⚙️ Choose a password to encrypt your keys</p>
      <input 
        id="passwordInput" type="password" placeholder="Set encryption password (don't forget!)"
        style="width: 100%; padding: 12px; border-radius: 8px; border: none; font-size: 14px;"
      />
    `;
    
    // Hide password section initially, show it after first option click
    setTimeout(() => {
      if (document.getElementById('passwordInput')) {
        document.getElementById('apiSetupContainer').querySelectorAll('.api-option')[0].style.display = 'none';
      }
    }, 100);

    const overlayId = document.querySelector('#apiKeySetupOverlay')?.id;
    
    // Close when clicking outside or on close button
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.remove();
    });

    // Add password change listener
    document.getElementById('passwordInput')?.addEventListener('input', () => {
      localStorage.setItem('hiking_map_password', document.getElementById('passwordInput').value);
    });

    const cleanup = () => overlay.remove();
    
    return cleanup;
  }

  /**
   * Setup with password and store keys
   */
  setupWithPassword() {
    const apiKey = document.getElementById('apiInput')?.value || '';
    const password = document.getElementById('passwordInput')?.value || 'demo-password';
    
    // Store password in localStorage for decryption
    if (password.trim()) {
      this.setPassword(password);
    }

    // If key is provided, store it
    if (apiKey.trim()) {
      // Try to store encrypted or use demo mode flag
      try {
        const stored = localStorage.getItem(this.STORAGE_KEY);
        if (!stored || JSON.parse(stored).demomode === 'true') {
          // Clear and re-store with new key
          this.storeKeys({ openrouteservice: apiKey });
          console.log('✓ API key stored and encrypted');
          document.getElementById('setupOverlay')?.remove();
        }
      } catch {
        // Use demo mode if storage fails
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify({ demomode: 'true' }));
      }
    } else {
      // No API key - switch to demo mode
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify({ demomode: 'true', keys: {} }));
    }

    document.getElementById('setupOverlay')?.remove();
  }
}

// Export for use in script.js and config/index.js
window.ApiKeyManager = ApiKeyManager;