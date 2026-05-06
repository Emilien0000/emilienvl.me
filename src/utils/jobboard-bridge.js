// jobboard-bridge.js
// ─────────────────────────────────────────────────────────────────────────────
// Coller ce fichier dans src/utils/ de votre webapp React.
// Il détecte si l'extension est installée et envoie les commandes d'auto-apply.
//
// Usage dans JobBoard.jsx :
//   import { extensionBridge } from '../utils/jobboard-bridge';
//   const isExtInstalled = await extensionBridge.ping();
//   const result = await extensionBridge.applyToJob(job);
// ─────────────────────────────────────────────────────────────────────────────

// ⚠️  Remplacez par l'ID réel de votre extension après publication dans le Chrome Web Store
// ou en mode développeur (visible dans chrome://extensions/)
const EXTENSION_ID = 'mhhjagimonemfbndjladapcophgjginl';

class ExtensionBridge {
  constructor() {
    this._available = null;
    // Écouter les messages retour de l'extension (via window.postMessage du content script)
    window.addEventListener('message', (e) => {
      if (e.data?.type === 'JB_EASY_APPLY_DETECTED') {
        this._onEasyApplyDetected?.(e.data.url);
      }
    });
  }

  /**
   * Vérifie si l'extension est installée et accessible.
   * @returns {Promise<boolean>}
   */
  async ping() {
    if (!window.chrome?.runtime) return false;
    return new Promise(resolve => {
      try {
        chrome.runtime.sendMessage(EXTENSION_ID, { type: 'PING' }, (res) => {
          if (chrome.runtime.lastError || !res?.ok) {
            this._available = false;
            resolve(false);
          } else {
            this._available = true;
            resolve(true);
          }
        });
      } catch {
        this._available = false;
        resolve(false);
      }
    });
  }

  get isAvailable() { return this._available; }

  /**
   * Déclenche l'auto-apply pour une offre Indeed Easy Apply.
   * @param {object} job - { id, url, title, company, ... }
   * @returns {Promise<{success: boolean, error?: string, appliedAt?: string}>}
   */
  async applyToJob(job) {
    if (!window.chrome?.runtime) {
      return { success: false, error: 'Extension Chrome non disponible.' };
    }

    return new Promise((resolve) => {
      // On délègue TOUTE l'orchestration au background.js via TRIGGER_APPLY
      // Cela active automatiquement les notifications natives Chrome !
      chrome.runtime.sendMessage(EXTENSION_ID, { type: 'TRIGGER_APPLY', job }, (res) => {
        if (chrome.runtime.lastError) {
          resolve({ success: false, error: chrome.runtime.lastError.message });
        } else if (!res) {
          resolve({ success: false, error: 'Aucune réponse de l\'extension' });
        } else {
          resolve(res); // Contient { success, error, appliedAt }
        }
      });
    });
  }

  /**
   * Récupère le statut et l'historique depuis l'extension.
   */
  async getStatus() {
    if (!window.chrome?.runtime) return { queue: [], history: [] };
    return new Promise((resolve) => {
      try {
        chrome.runtime.sendMessage(EXTENSION_ID, { type: 'GET_STATUS' }, (res) => {
          resolve(res || { queue: [], history: [] });
        });
      } catch {
        resolve({ queue: [], history: [] });
      }
    });
  }

  /**
   * Callback appelé quand le content script détecte une offre Easy Apply.
   * @param {function} cb - (url: string) => void
   */
  onEasyApplyDetected(cb) {
    this._onEasyApplyDetected = cb;
  }
}

export const extensionBridge = new ExtensionBridge();

// ─────────────────────────────────────────────────────────────────────────────
// PATCH pour JobBoard.jsx — Modifications à apporter dans handleApply()
// ─────────────────────────────────────────────────────────────────────────────
//
// Remplacez votre fonction handleApply (ou onApply dans JobCard) par :
//
// const handleApply = useCallback(async (job) => {
//   // Si Easy Apply Indeed ET extension disponible → auto-apply
//   if (job.isDirect && job.url?.includes('indeed') && extAvailable) {
//     setApplyingIds(prev => new Set([...prev, job.id]));
//     const result = await extensionBridge.applyToJob(job);
//     setApplyingIds(prev => { const n = new Set(prev); n.delete(job.id); return n; });
//
//     if (result.success) {
//       setApplied(prev => [{ job, appliedAt: result.appliedAt, method: 'auto' }, ...prev]);
//       // Optionnel : supprimer du feed
//       setJobs(prev => prev.filter(j => j.id !== job.id));
//     } else {
//       alert(`❌ Candidature échouée : ${result.error}`);
//     }
//     return;
//   }
//
//   // Sinon : marquer manuellement comme appliqué (comportement existant)
//   setApplied(prev => [{ job, appliedAt: new Date().toISOString(), method: 'manual' }, ...prev]);
// }, [extAvailable, setJobs, setApplied]);
//
// Et dans useEffect au montage :
//   extensionBridge.ping().then(ok => setExtAvailable(ok));
//
// ─────────────────────────────────────────────────────────────────────────────
