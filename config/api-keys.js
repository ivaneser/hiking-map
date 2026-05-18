/**
 * API Keys Security Module - Simplified User Experience
 * 
 * This module handles secure storage of API keys in the browser.
 * By default, runs in "demo mode" (no authentication) for browsing.
 * Users can optionally enable encrypted storage and configure their API key.
 */

class ApiKeyManager {
  constructor() {
    this.STORAGE_KEY = 'hiking_map_api_keys';
  }

  /**
   * Initialize the API key manager
   * Checks if keys are stored; if not, uses demo mode
   */
  async init() {
    const existingKeys = await this.loadKeys();
    return existingKeys; // true if keys exist, false otherwise
  }

  /**
   * Load all API keys from encrypted storage
   */
  async loadKeys() {
    const raw = localStorage.getItem(this.STORAGE_KEY);
    if (!raw) return null;

    try {
      const storedData = JSON.parse(raw);
      
      // Check for demo mode (no encryption)
      if (storedData.demomode === 'true') {
        return storedData.keys || {};
      }

      // Try to decrypt keys (requires password)
      const password = localStorage.getItem('hiking_map_password');
      if (!password) {
        // No password - assume demo mode or corrupted
        return null;
      }

      const encryptedKeys = storedData.keys;
      if (!encryptedKeys) return null;

      // Decrypt each key
      const decryptedKeys = {};
      for (const [key, encrypted] of Object.entries(encryptedKeys)) {
        try {
          const decrypted = await this.decrypt(encrypted);
          decryptedKeys[key] = decrypted;
        } catch (e) {
          console.error(`Failed to decrypt ${key}:`, e.message);
          return null; // If any key fails, consider storage invalid
        }
      }
      return decryptedKeys;
    } catch (e) {
      console.error('Failed to load API keys:', e);
      return null;
    }
  }

  /**
   * Encrypt a value using AES-GCM
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
    const dataView = new DataView(ciphertext.buffer);
    const originalBytes = Uint8Array.from(new Uint8Array(dataView.buffer));

    return new TextDecoder().decode(await window.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv },
      keyBytes,
      originalBytes
    ));
  }

  decodeSalt(saltB64) {
    const salt = atob(saltB64);
    return new Uint8Array([...salt].map(c => c.charCodeAt(0)));
  }

  /**
   * Get current storage password
   */
  getPassword() {
    return localStorage.getItem('hiking_map_password') || 'demo-no-password';
  }

  async getSalt() {
    const salt = localStorage.getItem('hiking_map_salt');
    if (!salt) {
      await this.createStorage();
      return null;
    }
    return new Uint8Array([...atob(salt)].map(c => c.charCodeAt(0)));
  }

  async createStorage() {
    const salt = await this.generateSalt();
    const password = this.getPassword();
    
    const keyBytes = await this.deriveKey(password, salt);
    localStorage.setItem('hiking_map_salt', btoa(String.fromCharCode(...salt)));
  }

  async generateSalt() {
    const array = new Uint8Array(32);
    window.crypto.getRandomValues(array);
    return array;
  }

  /**
   * Derive a key from password and salt using PBKDF2
   */
  async deriveKey(password, salt) {
    const enc = new TextEncoder();
    const keyMaterial = await window.crypto.subtle.importKey(
      'raw',
      enc.encode(password),
      'PBKDF2',
      false,
      ['deriveBits']
    );

    return window.crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      256
    );
  }

  /**
   * Store API keys in encrypted storage
   */
  async storeKeys(keys) {
    const encryptedKeys = {};
    
    for (const [key, value] of Object.entries(keys)) {
      const encrypted = await this.encrypt(value);
      if (!encrypted) throw new Error('Failed to encrypt key');
      
      // Remove sensitive info from storage
      delete encrypted.salt;
      delete encrypted.iv;
      encryptedKeys[key] = encrypted.ciphertext;
    }

    localStorage.setItem(this.STORAGE_KEY, JSON.stringify({ demomode: 'false', keys: encryptedKeys }));
  }

  /**
   * Switch to demo mode (no encryption)
   */
  setDemoMode(enabled) {
    if (enabled) {
      console.warn('⚠️ Demo mode enabled - API keys stored in plaintext');
    }
    localStorage.setItem('hiking_map_demo_mode', enabled ? 'true' : 'false');
    
    const existingKeys = localStorage.getItem(this.STORAGE_KEY);
    if (existingKeys && !enabled) {
      // Migrate to encrypted storage
      const data = JSON.parse(existingKeys);
      this.storeKeys(data.keys, this.getPassword());
      localStorage.setItem(
        this.STORAGE_KEY,
        JSON.stringify({ demomode: 'false', keys: data.keys })
      );
    }
  }

  /**
   * Clear all stored API keys
   */
  clearKeys() {
    localStorage.removeItem(this.STORAGE_KEY);
    localStorage.removeItem('hiking_map_salt');
    localStorage.removeItem('hiking_map_password');
  }

  /**
   * Setup modal for configuring API key (non-intrusive, opens when needed)
   */
  setupModal() {
    const overlay = document.createElement('div');
    overlay.id = 'apiKeySetupOverlay';
    overlay.style.cssText = `
      position: fixed; inset: 0;
      background: rgba(0,0,0,0.6);
      display: none;
      align-items: center; justify-content: center;
      z-index: 999999;
    `;

    const container = document.createElement('div');
    container.style.cssText = `
      background: white; border-radius: 16px; padding: 32px;
      max-width: 500px; width: 90%; max-height: 80vh;
      overflow-y: auto; box-shadow: 0 25px 50px rgba(0,0,0,0.3);
    `;

    const content = `
      <h2 style="margin: 0 0 16px; color: #1e40af;">🔐 Configure API Key</h2>
      
      <div style="background: #fef3c7; padding: 12px; border-radius: 8px; margin-bottom: 16px; font-size: 14px;">
        <strong>Note:</strong> This is optional! You can browse and build routes without an API key. 
        Enter your key only if you want full access to OpenRouteService.
      </div>

      ${this.getSetupForms()}
    `;

    container.innerHTML = content;

    overlay.appendChild(container);
    document.body.appendChild(overlay);

    // Click outside to close
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.style.display = 'none';
    });

    return () => {
      overlay.remove();
    };
  }
}

// Export for use in script.js
window.ApiKeyManager = ApiKeyManager;
