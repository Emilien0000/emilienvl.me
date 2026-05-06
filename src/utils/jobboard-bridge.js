// src/utils/jobboard-bridge.js

// 🚨 VÉRIFIE BIEN CET ID : Il doit correspondre à celui dans chrome://extensions/
const EXTENSION_ID = 'mhhjagimonemfbndjladapcophgjginl'; 

class ExtensionBridge {
  constructor() {
    this._available = true; // On force à true pour empêcher le "Plan B" de la webapp
  }

  async ping() {
    return true; // On force à true pour les mêmes raisons
  }

  get isAvailable() { return this._available; }

  async applyToJob(job) {
    if (!window.chrome?.runtime) {
      return { success: false, error: 'Navigateur incompatible avec l\'extension.' };
    }

    return new Promise((resolve) => {
      // Envoi de l'ordre d'ouverture silencieuse au background
      chrome.runtime.sendMessage(EXTENSION_ID, { type: 'OPEN_TAB', url: job.url }, (res) => {
        
        if (chrome.runtime.lastError) {
          // Si on rentre ici, c'est que l'ID de l'extension est faux OU que ton URL de site n'est pas autorisée.
          console.error("❌ Erreur Bridge :", chrome.runtime.lastError.message);
          resolve({ success: false, error: "Communication refusée. Vérifiez l'ID de l'extension." });
          return;
        }
        
        // Si tout s'est bien passé, l'onglet s'ouvre en background.
        console.log("✅ Ordre reçu par l'extension. Ouverture en arrière-plan.");
        // On renvoie un "faux" succès immédiat pour que le JobBoard affiche la validation sans changer d'onglet
        resolve({ success: true, appliedAt: new Date().toISOString() });
      });
    });
  }

  async getStatus() { return { queue: [], history: [] }; }
  onEasyApplyDetected(cb) { this._onEasyApplyDetected = cb; }
}

export const extensionBridge = new ExtensionBridge();