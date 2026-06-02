(function () {
  function buildModal() {
    const overlay = document.createElement("div");
    overlay.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,.45);display:grid;place-items:center;z-index:9999;padding:16px;";

    const card = document.createElement("div");
    card.style.cssText = "width:min(520px,100%);background:#fff;border-radius:12px;padding:16px;box-shadow:0 10px 35px rgba(0,0,0,.25);font-family:system-ui,sans-serif;";
    card.innerHTML = `
      <h3 style="margin:0 0 10px">Configure OpenRouteService API key</h3>
      <p style="margin:0 0 12px;color:#475569;font-size:14px">
        Needed only for route building. Key is encrypted before storing in your browser. Get a free API key from <a href="https://openrouteservice.org/dev/#/signup" target="_blank" rel="noopener noreferrer">OpenRouteService</a>.
      </p>
      <label style="display:block;font-size:13px;margin-bottom:6px">API key</label>
      <input id="akm-api" type="password" placeholder="Paste API key" style="width:100%;padding:10px;border:1px solid #cbd5e1;border-radius:8px;margin-bottom:10px" />
      <label style="display:block;font-size:13px;margin-bottom:6px">Password (for local encryption)</label>
      <input id="akm-pass" type="password" placeholder="Choose password" style="width:100%;padding:10px;border:1px solid #cbd5e1;border-radius:8px;margin-bottom:8px" />
      <p style="margin:0 0 10px;color:#b45309;font-size:13px">
        You can continue with the built-in demo key, but it may stop working at any time.
      </p>
      <div style="display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap">
        <button id="akm-demo" type="button" style="padding:8px 12px;border:1px solid #f59e0b;background:#fff7ed;color:#9a3412;border-radius:8px">Keep using demo key</button>
        <button id="akm-cancel" type="button" style="padding:8px 12px;border:1px solid #cbd5e1;background:#fff;border-radius:8px">Cancel</button>
        <button id="akm-save" type="button" style="padding:8px 12px;border:0;background:#0f766e;color:#fff;border-radius:8px">Save</button>
      </div>
    `;

    overlay.appendChild(card);
    return { overlay, card };
  }

  window.setupApiKeySetup = function setupApiKeySetup() {
    const manager = new window.ApiKeyManager();
    const current = manager.getApiKey();
    if (current) return Promise.resolve(current);

    return new Promise((resolve) => {
      const { overlay } = buildModal();
      document.body.appendChild(overlay);

      const cleanup = () => overlay.remove();
      const apiInput = overlay.querySelector("#akm-api");
      const passInput = overlay.querySelector("#akm-pass");
      const saveBtn = overlay.querySelector("#akm-save");
      const cancelBtn = overlay.querySelector("#akm-cancel");
      const demoBtn = overlay.querySelector("#akm-demo");

      cancelBtn.addEventListener("click", () => {
        cleanup();
        resolve("");
      });

      demoBtn.addEventListener("click", () => {
        cleanup();
        resolve("");
      });

      saveBtn.addEventListener("click", async () => {
        const apiKey = apiInput.value.trim();
        const password = passInput.value;
        if (!apiKey || !password) {
          alert("Please enter both API key and password");
          return;
        }

        const ok = await manager.storeKeys(apiKey, password);
        if (!ok) {
          alert(`Failed to save API key. ${manager.lastError || "Please check browser permissions and context."}`);
          return;
        }

        cleanup();
        resolve(apiKey);
      });
    });
  };
})();
