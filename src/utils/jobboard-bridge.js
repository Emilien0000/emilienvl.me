// jobboard-bridge.js — communication webapp ↔ extension
// v2 : polling du progrès en temps réel + gestion erreurs enrichie

const EXTENSION_ID = 'mhhjagimonemfbndjladapcophgjginl';

class ExtensionBridge {
  constructor() {
    this._available = null;
    this._progressCallback = null; // appelé à chaque mise à jour de progression

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

  /**
   * Enregistre un callback appelé à chaque étape de la candidature.
   * @param {(progress: { msg: string, type: string, job: object }) => void} cb
   */
  onProgress(cb) {
    this._progressCallback = cb;
  }

  /**
   * Lance l'auto-apply en ouvrant l'onglet en arrière-plan.
   * Retourne le résultat final (succès ou erreur).
   * Appelle this._progressCallback à chaque étape intermédiaire.
   */
  async applyToJob(job) {
    if (!window.chrome?.runtime) {
      return { success: false, error: 'Extension Chrome non disponible.' };
    }

    return new Promise((resolve) => {
      const TIMEOUT = 120_000;
      let resolved = false;
      let progressInterval = null;
      let resultInterval = null;
      let lastProgressTs = null;

      const done = (result) => {
        if (resolved) return;
        resolved = true;
        clearInterval(progressInterval);
        clearInterval(resultInterval);
        clearTimeout(timeoutTimer);
        resolve(result);
      };

      const timeoutTimer = setTimeout(() => {
        done({ success: false, error: 'Timeout — la candidature a pris trop de temps (2 min).' });
      }, TIMEOUT);

      // Préparer le job dans le storage
      const jobData = { ...job, _autostart: true, _startedAt: Date.now() };
      try {
        chrome.storage.local.set({ pendingApplyJob: jobData, applyResult: null, applyProgress: null });
      } catch(e) {
        return done({ success: false, error: 'Impossible d\'écrire dans le storage : ' + e.message });
      }

      // Ouvrir l'onglet en arrière-plan avec le flag #jb-autostart
      const url = job.url + (job.url.includes('#') ? '&jb-autostart=1' : '#jb-autostart=1');
      try {
        chrome.runtime.sendMessage(EXTENSION_ID, { type: 'OPEN_TAB', url }, (res) => {
          if (chrome.runtime.lastError) window.open(url, '_blank', 'noopener');
        });
      } catch(e) {
        window.open(url, '_blank', 'noopener');
      }

      // Polling du PROGRÈS (toutes les 600ms)
      // Lit applyProgress dans le storage et appelle le callback si nouveau message
      progressInterval = setInterval(() => {
        if (resolved) return;
        try {
          chrome.storage.local.get(['applyProgress'], (r) => {
            const p = r.applyProgress;
            if (!p || p.ts === lastProgressTs) return;
            lastProgressTs = p.ts;
            if (this._progressCallback) {
              this._progressCallback({ msg: p.msg, type: p.type, jobUrl: job.url, job });
            }
          });
        } catch(e) {}
      }, 600);

      // Polling du RÉSULTAT FINAL (toutes les 1s)
      resultInterval = setInterval(() => {
        if (resolved) return;
        try {
          chrome.storage.local.get(['applyResult'], (r) => {
            const result = r.applyResult;
            if (!result) return;
            if (result._jobUrl && result._jobUrl !== job.url) return;
            chrome.storage.local.remove(['applyResult', 'pendingApplyJob', 'applyProgress']);
            done(result);
          });
        } catch(e) {
          done({ success: false, error: e.message });
        }
      }, 1000);
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