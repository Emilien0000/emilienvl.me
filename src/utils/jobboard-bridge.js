// jobboard-bridge.js — communication webapp ↔ extension
// Flow : START_APPLY (fire-and-forget) + WAIT_RESULT (long-poll) + GET_PROGRESS (polling 800ms)

const EXTENSION_ID = 'mhhjagimonemfbndjladapcophgjginl';
class ExtensionBridge {
  constructor() {
    this._available = null;
    this._onProgressCb = null; // Stocke la fonction qui affiche les notifications
    
    window.addEventListener('message', (e) => {
      if (e.data?.type === 'JB_EASY_APPLY_DETECTED') {
        this._onEasyApplyDetected?.(e.data.url);
      }
    });
  }

  async ping() {
    if (!window.chrome?.runtime) return false;
    return new Promise(resolve => {
      try {
        chrome.runtime.sendMessage(EXTENSION_ID, { type: 'PING' }, (res) => {
          if (chrome.runtime.lastError || !res?.ok) { this._available = false; resolve(false); }
          else { this._available = true; resolve(true); }
        });
      } catch { this._available = false; resolve(false); }
    });
  }

  get isAvailable() { return this._available; }

  // Permet à JobBoard.jsx de s'abonner aux mises à jour de progression
  onProgress(cb) {
    this._onProgressCb = cb;
  }

  async applyToJob(job) {
    if (!window.chrome?.runtime) {
      return { success: false, error: 'Extension Chrome non disponible.' };
    }

    return new Promise((resolve) => {
      const TIMEOUT = 120_000; // 2 minutes max
      let pollInterval = null;

      chrome.runtime.sendMessage(EXTENSION_ID, { type: 'START_APPLY', job }, (startRes) => {
        if (chrome.runtime.lastError) {
          return resolve({ success: false, error: 'Erreur de communication avec l\'extension.' });
        }

        // On interroge le background toutes les secondes (plus fluide pour la progression)
        pollInterval = setInterval(() => {
          chrome.runtime.sendMessage(EXTENSION_ID, { type: 'CHECK_RESULT', jobId: job.id, jobUrl: job.url }, (checkRes) => {
            if (chrome.runtime.lastError) return;

            // 🌟 Mise à jour visuelle des notifications en temps réel !
            if (checkRes && checkRes.progress && this._onProgressCb) {
              this._onProgressCb({ msg: checkRes.progress.msg, type: checkRes.progress.type, job });
            }

            if (checkRes && checkRes.done) {
              clearInterval(pollInterval);
              clearTimeout(timeoutTimer);
              resolve(checkRes.result);
            }
          });
        }, 1000);

        const timeoutTimer = setTimeout(() => {
          clearInterval(pollInterval);
          resolve({ success: false, error: 'Timeout — la candidature a pris trop de temps.' });
        }, TIMEOUT);
      });
    });
  }

  async getStatus() {
    if (!window.chrome?.runtime) return { queue: [], history: [] };
    return new Promise((resolve) => {
      try {
        chrome.runtime.sendMessage(EXTENSION_ID, { type: 'GET_STATUS' }, (res) => {
          resolve(res || { queue: [], history: [] });
        });
      } catch { resolve({ queue: [], history: [] }); }
    });
  }

  onEasyApplyDetected(cb) { this._onEasyApplyDetected = cb; }
}

export const extensionBridge = new ExtensionBridge();