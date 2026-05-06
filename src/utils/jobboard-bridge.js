// src/utils/jobboard-bridge.js

// 🚨 VÉRIFIE BIEN CET ID : Il doit correspondre à celui de ton extension !
const EXTENSION_ID = 'mhhjagimonemfbndjladapcophgjginl'; 

class ExtensionBridge {
  constructor() {
    this._available = true; 
  }

  async ping() { return true; }
  get isAvailable() { return this._available; }

  async applyToJob(job) {
    return new Promise((resolve) => {
      // Vérification si la connexion à l'extension existe
      if (!window.chrome?.runtime) {
        console.error("❌ Connexion à l'extension perdue. Actualisez la page (F5) !");
        return resolve({ success: false, error: 'Connexion perdue : Actualisez la page avec F5.' });
      }

      try {
        chrome.runtime.sendMessage(EXTENSION_ID, { type: 'OPEN_TAB', url: job.url }, (res) => {
          if (chrome.runtime.lastError) {
            console.error("❌ Erreur Bridge :", chrome.runtime.lastError.message);
            return resolve({ success: false, error: "Communication refusée. Vérifiez l'ID de l'extension et le port localhost (5173, 5174...)." });
          }
          
          console.log("✅ Ordre reçu par l'extension. Ouverture en arrière-plan.");
          resolve({ success: true, appliedAt: new Date().toISOString() });
        });
      } catch (e) {
        resolve({ success: false, error: e.message });
      }
    });
  }

  async getStatus() { return { queue: [], history: [] }; }
  onEasyApplyDetected(cb) { this._onEasyApplyDetected = cb; }
}

export const extensionBridge = new ExtensionBridge();