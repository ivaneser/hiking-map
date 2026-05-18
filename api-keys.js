/**
 * API Keys Security Module - Silent Demo Mode by Default
 * 
 * Design Philosophy:
 * 1. User can browse/search freely without any prompts ✓
 * 2. Setup modal ONLY when user tries to build route AND has no key stored
 * 3. Never show "about to setup" screen during normal browsing ✓
 */

class ApiKeyManager {
  constructor() {
    this.STORAGE_KEY = 'hiking_map_api_keys';
  }

  /**
   * Initialize and silently check for stored keys
   */
  async init() {
    const raw = localStorage.getItem(this.STORAGE_KEY);
    
    if (!raw) return false; // No storage yet
    
    try {
      const data = JSON.parse(raw);
      
      // Demo mode (explicitly set or corrupted)
      if (data.demomode === 'true') return true;
      
      // Has encrypted storage with password - check if valid
      const password = localStorage.getItem('hiking_map_password');
      if (!password) {
        // No password but has storage = corrupted, use demo mode
        return false;
      }
      
      // Valid encrypted storage - try to decrypt and get key
      try {
        const decrypted = await this.tryDecrypt(data.keys);
        return !!decrypted?.openrouteservice; // true if key exists
      } catch {
        // Decryption failed, consider it invalid
        return false;
      }
    } catch {
      return false;
    }
  }

  /**
   * Try to decrypt stored keys (for init() verification)
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
        } else {
          throw new Error('Missing key property');
        }
      } catch {
        throw new Error(`Failed to decrypt ${keyName}`);
      }
    }
    
    return decryptedKeys;
  }

  /**
   * Load API key for current request (demo mode = empty string)
   */
  async getApiKey() {
    // Check if demo mode is active
    if (CONFIG && CONFIG.demoMode === true) {
      console.log('Using demo mode');
      return '';
    }
    
    const stored = await this.init();
    if (!stored) return ''; // Demo mode
    
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      const data = JSON.parse(raw);
      
      // Get password for decryption
      const password = localStorage.getItem('hiking_map_password');
      if (!password) return '';
      
      // Try decrypting and getting the key
      const decrypted = await this.tryDecrypt(data.keys);
      return decrypted?.openrouteservice || '';
    } catch {
      console.warn('Failed to load stored API key');
      return ''; // Use demo mode
    }
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
   * Decrypt a value using AES-GCM
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
   * Derive encryption key from password using PBKDF2 (100k iterations)
   */
  async deriveKey(password, salt) {
    const encodedPassword = new TextEncoder().encode(password);
    return window.crypto.subtle.deriveKey(
      { name: 'PBKDF2', hash: 'SHA-256', salt: salt, iterations: 100000 },
      encodedPassword,
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    );
  }

  /**
   * Get stored salt or generate new one (with fallback to localStorage)
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
   * Decode salt from base64 string to buffer-like object
   */
  decodeSalt(salt) {
    const bytes = Uint8Array.from(atob(salt), c => c.charCodeAt(0));
    return { 
      toString: () => Buffer ? Buffer.from(bytes).toString('base64') : 'base64',
      slice: (start, end) => this.decodeSalt(btoa(String.fromCharCode(...bytes.slice(start, end))))
    };
  }

  /**
   * Get stored password for decryption
   */
  getPassword() {
    return localStorage.getItem('hiking_map_password') || '';
  }

  /**
   * Set password for encrypted storage
   */
  setPassword(password) {
    if (!password || typeof password !== 'string') {
      console.error('Password must be a non-empty string');
      return false;
    }
    
    localStorage.setItem('hiking_map_password', password);
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

    // Store with demomode=false for encrypted storage
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify({ demomode: 'false', keys: encryptedKeys }));
  }

  /**
   * Switch to demo mode (clear encrypted storage)
   */
  enableDemoMode() {
    // Clear encrypted storage and switch to demo
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify({ demomode: 'true', keys: {} }));
    console.log('✅ Demo mode enabled');
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
   * Setup modal for configuring API key storage
   * Shows when user wants to store their first API key
   */
  setupModal() {
    const overlay = document.createElement('div');
    overlay.id = 'apiKeySetupOverlay';
    
    // Centered modal styling
    overlay.style.cssText = `
      position: fixed; inset: 0; background: rgba(0,0,0,0.7);
      display: flex; align-items: center; justify-content: center; z-index: 999999;
    `;

    const container = document.createElement('div');
    container.style.cssText = `
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 40px; border-radius: 24px; text-align: center; color: white;
      box-shadow: 0 25px 50px rgba(0,0,0,0.3); max-width: 500px; width: 90%;
    `;

    const html = `
      <div style="position: relative;">
        <h2 style="margin: 0 0 8px; font-size: 24px;">🔐 API Key Setup</h2>
        
        <p style="color: rgba(255,255,255,0.9); margin-bottom: 32px; line-height: 1.6; font-size: 15px;">
          Store your OpenRouteService API key securely in the browser.<br>
          Your keys are encrypted and never sent to any server!
        </p>

        <div style="background: rgba(255,255,255,0.1); padding: 24px; border-radius: 16px; margin-bottom: 24px; text-align: left;">
          <h3 style="margin: 0 0 12px; color: #fff; font-size: 18px;">🌟 Demo Mode (Recommended)</h3>
          <p style="color: rgba(255,255,255,0.8); margin-bottom: 8px;">Browse freely, search spots, view maps</p>
          <button 
            onclick="window.ApiKeyManager.clearKeys(); location.reload();"
            style="background: #4ade80; color: #065f46; border: none; padding: 12px 24px; border-radius: 12px; cursor: pointer; font-weight: 600;"
          >Use Demo Mode</button>
        </div>

        <div style="background: rgba(255,255,255,0.1); padding: 24px; border-radius: 16px; margin-bottom: 24px; text-align: left;">
          <h3 style="margin: 0 0 12px; color: #fff; font-size: 18px;">⚙️ Store API Key</h3>
          <p style="color: rgba(255,255,255,0.8); margin-bottom: 8px;">For full features and unlimited routes</p>
          
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

    // Show password field
    setTimeout(() => {
      const passContainer = document.createElement('div');
      passContainer.style.cssText = `background: rgba(255,255,255,0.15); padding: 16px; border-radius: 12px; margin-bottom: 12px;`;
      passContainer.innerHTML = `
        <p style="color: rgba(255,255,255,0.8); font-size: 13px; margin-bottom: 8px;">⚙️ Choose a password to encrypt your keys</p>
        <input 
          id="passwordInput" type="password" placeholder="Set encryption password (don't forget!)"
          style="width: 100%; padding: 12px; border-radius: 8px; border: none; font-size: 14px;"
        />
      `;
      
      // Hide API key field initially if demo mode preferred
      const apiInput = document.getElementById('apiInput');
      const setupBtn = overlay.querySelector('button[onclick*="setupWithPassword"]');
      const setPassBtn = overlay.querySelector('[style*="background: #60a5fa"]');
      
      setTimeout(() => {
        passContainer.querySelector('input').focus();
        apiInput.disabled = true;
        setPassBtn.style.opacity = '0.3';
      }, 200);
      
      document.getElementById('setupOverlay').appendChild(passContainer);
    }, 100);

    // Close when clicking outside overlay or close button
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.remove();
    });

    const overlayId = 'setupOverlay';
    
    // Setup handler for password change
    document.getElementById('passwordInput')?.addEventListener('input', (e) => {
      localStorage.setItem('hiking_map_password', e.target.value);
    });

    return () => overlay.remove();
  }

  /**
   * Setup with password and store API key if provided
   */
  setupWithPassword() {
    const apiKey = document.getElementById('apiInput')?.value.trim();
    const password = document.getElementById('passwordInput')?.value || 'demo-no-password';
    
    // Store password in localStorage for decryption
    this.setPassword(password);

    let storedKeys = {};
    
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      if (raw) {
        storedKeys = JSON.parse(raw).keys || {};
      }
    } catch {}

    // If no key provided, switch to demo mode
    if (!apiKey || apiKey === '') {
      this.enableDemoMode();
      document.getElementById('setupOverlay')?.remove();
      return;
    }
    
    // Store encrypted API key
    try {
      this.storeKeys({ openrouteservice: apiKey });
      console.log('✅ API key stored and encrypted');
    } catch (e) {
      console.error('Failed to store API key:', e.message);
    }

    document.getElementById('setupOverlay')?.remove();
  }
}

// Export for use in script.js and config/index.js
window.ApiKeyManager = ApiKeyManager;
