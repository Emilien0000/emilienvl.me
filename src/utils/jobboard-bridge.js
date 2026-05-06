// src/utils/jobboard-bridge.js

const EXTENSION_ID = 'mhhjagimonemfbndjladapcophgjginl'; 

class ExtensionBridge {
  constructor() {
    this._available = true; 
  }

  async ping() { return true; }
  get isAvailable() { return this._available; }

  async applyToJob(job) {
    return new Promise((resolve) => {
      if (!window.chrome?.runtime) {
        console.error("❌ Connexion perdue.");
        return resolve({ success: false, error: 'Connexion perdue : Actualisez la page avec F5.' });
      }

      chrome.runtime.sendMessage(EXTENSION_ID, { type: 'OPEN_TAB', url: job.url }, (res) => {
        // 1. Erreur de connexion pure (ex: ID faux)
        if (chrome.runtime.lastError) {
          console.error("❌ Erreur Bridge :", chrome.runtime.lastError.message);
          return resolve({ success: false, error: "Communication refusée. Vérifiez l'ID." });
        }
        
        // 2. Erreur renvoyée volontairement par le background (ex: Origin non autorisée)
        if (res && res.error) {
          console.error("❌ Refus du background :", res.error);
          return resolve({ success: false, error: res.error }); // Va déclencher la notification rouge sur ton site !
        }
        
        console.log("✅ Onglet ouvert en arrière-plan.");
        resolve({ success: true, appliedAt: new Date().toISOString() });
      });
    });
  }

  async getStatus() { return { queue: [], history: [] }; }
  onEasyApplyDetected(cb) { this._onEasyApplyDetected = cb; }
}

export const extensionBridge = new ExtensionBridge();