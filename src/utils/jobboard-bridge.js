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

      // On demande juste au background d'ouvrir l'onglet en arrière-plan (active: false)
      chrome.runtime.sendMessage(EXTENSION_ID, { type: 'OPEN_TAB', url: job.url }, (res) => {
        if (chrome.runtime.lastError) {
          console.error("❌ Erreur Bridge :", chrome.runtime.lastError.message);
          return resolve({ success: false, error: "Communication refusée. Vérifiez l'ID et les ports." });
        }
        
        console.log("✅ Onglet ouvert en arrière-plan. L'extension prend le relais !");
        // On valide immédiatement côté Webapp. 
        resolve({ success: true, appliedAt: new Date().toISOString() });
      });
    });
  }

  async getStatus() { return { queue: [], history: [] }; }
  onEasyApplyDetected(cb) { this._onEasyApplyDetected = cb; }
}

export const extensionBridge = new ExtensionBridge();