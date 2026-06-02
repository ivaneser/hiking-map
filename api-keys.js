(function () {
  const STORAGE_KEY = "hiking_map_api_key_encrypted";
  const SESSION_KEY = "hiking_map_api_key_session";
  const PERSISTENT_KEY = "hiking_map_api_key_persistent";

  function toBase64(bytes) {
    const binary = String.fromCharCode(...bytes);
    return btoa(binary);
  }

  function fromBase64(base64) {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    return bytes;
  }

  async function deriveAesKey(password, salt) {
    const enc = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      "raw",
      enc.encode(password),
      "PBKDF2",
      false,
      ["deriveKey"]
    );
    return crypto.subtle.deriveKey(
      { name: "PBKDF2", salt, iterations: 120000, hash: "SHA-256" },
      keyMaterial,
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt", "decrypt"]
    );
  }

  class ApiKeyManager {
    constructor() {
      this.lastError = "";
    }

    getApiKey() {
      return sessionStorage.getItem(SESSION_KEY) || localStorage.getItem(PERSISTENT_KEY) || "";
    }

    setSessionKey(apiKey, persist = true) {
      if (!apiKey) {
        sessionStorage.removeItem(SESSION_KEY);
        localStorage.removeItem(PERSISTENT_KEY);
        return;
      }
      sessionStorage.setItem(SESSION_KEY, apiKey);
      if (persist) {
        localStorage.setItem(PERSISTENT_KEY, apiKey);
      } else {
        localStorage.removeItem(PERSISTENT_KEY);
      }
    }

    hasStoredKey() {
      return !!localStorage.getItem(STORAGE_KEY) || !!localStorage.getItem(PERSISTENT_KEY);
    }

    async storeKeys(apiKey, password, persist = true) {
      this.lastError = "";
      if (!apiKey || !password) {
        this.lastError = "Missing API key or password";
        return false;
      }

      const canEncrypt = !!(window.isSecureContext && window.crypto && window.crypto.subtle);

      if (!canEncrypt) {
        // Fallback for non-secure local/dev contexts.
        sessionStorage.setItem(SESSION_KEY, apiKey);
        if (persist) {
          localStorage.setItem(PERSISTENT_KEY, apiKey);
        } else {
          localStorage.removeItem(PERSISTENT_KEY);
        }
        return true;
      }

      try {
        const salt = crypto.getRandomValues(new Uint8Array(16));
        const iv = crypto.getRandomValues(new Uint8Array(12));
        const key = await deriveAesKey(password, salt);
        const encoded = new TextEncoder().encode(apiKey);
        const cipher = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoded);

        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({
            version: 1,
            salt: toBase64(salt),
            iv: toBase64(iv),
            cipher: toBase64(new Uint8Array(cipher))
          })
        );

        this.setSessionKey(apiKey, persist);
        return true;
      } catch (err) {
        this.lastError = err?.message || "Encryption/storage failed";
        console.error("Failed to store API key", err);
        return false;
      }
    }

    async unlock(password) {
      const payloadRaw = localStorage.getItem(STORAGE_KEY);
      if (!payloadRaw || !password) return "";
      try {
        const payload = JSON.parse(payloadRaw);
        const salt = fromBase64(payload.salt);
        const iv = fromBase64(payload.iv);
        const cipher = fromBase64(payload.cipher);

        const key = await deriveAesKey(password, salt);
        const plainBuffer = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, cipher);
        const apiKey = new TextDecoder().decode(plainBuffer);
        this.setSessionKey(apiKey);
        return apiKey;
      } catch (err) {
        return "";
      }
    }

    loadKeys() {
      return {
        hasStoredEncryptedKey: !!localStorage.getItem(STORAGE_KEY),
        hasStoredPersistentKey: !!localStorage.getItem(PERSISTENT_KEY),
        hasSessionKey: !!sessionStorage.getItem(SESSION_KEY)
      };
    }

    clearKeys() {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(PERSISTENT_KEY);
      sessionStorage.removeItem(SESSION_KEY);
    }

    enableDemoMode() {
      sessionStorage.removeItem(SESSION_KEY);
    }

    static setupModal(options) {
      if (typeof window.setupApiKeySetup === "function") {
        return window.setupApiKeySetup(options);
      }
      return Promise.resolve("");
    }
  }

  window.ApiKeyManager = ApiKeyManager;
})();
