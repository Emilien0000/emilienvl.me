// jobboard-bridge.js — communication webapp ↔ extension
// Flow : START_APPLY (fire-and-forget) + WAIT_RESULT (long-poll) + GET_PROGRESS (polling 800ms)

const EXTENSION_ID = 'mhhjagimonemfbndjladapcophgjginl';

class ExtensionBridge {
  constructor() {
    this._available      = null;
    this._onProgress     = null;
    this._progressTimer  = null;
  }

  // ── Ping ──────────────────────────────────────────────────────────────────

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

  // ── onProgress callback ───────────────────────────────────────────────────
  // Appelé par JobBoard.jsx pour recevoir les mises à jour de progression.
  // On démarre un polling GET_PROGRESS toutes les 800ms dès qu'un apply est en cours.

  onProgress(cb) {
    this._onProgress = cb;
  }

  _startProgressPolling(job) {
    this._stopProgressPolling();
    this._progressTimer = setInterval(() => {
      if (!window.chrome?.runtime) return;
      try {
        chrome.runtime.sendMessage(EXTENSION_ID, { type: 'GET_PROGRESS' }, (res) => {
          if (chrome.runtime.lastError) return;
          if (res?.progress && this._onProgress) {
            this._onProgress({ ...res.progress, job });
          }
        });
      } catch {}
    }, 800);
  }

  _stopProgressPolling() {
    if (this._progressTimer) {
      clearInterval(this._progressTimer);
      this._progressTimer = null;
    }
  }

  // ── applyToJob ────────────────────────────────────────────────────────────
  // 1. Envoie START_APPLY → le background ouvre l'onglet + orchestre l'apply
  // 2. Démarre le polling de progression
  // 3. Attend le résultat via WAIT_RESULT (long-poll, Chrome garde le canal ouvert)

  async applyToJob(job) {
    if (!window.chrome?.runtime) {
      return { success: false, error: 'Extension Chrome non disponible.' };
    }

    return new Promise((resolve) => {
      const TIMEOUT = 120_000; // 2 minutes max
      let pollInterval = null;

      // 1. On dit au background de démarrer le job
      chrome.runtime.sendMessage(EXTENSION_ID, { type: 'START_APPLY', job }, (startRes) => {
        if (chrome.runtime.lastError) {
          return resolve({ success: false, error: 'Erreur de communication avec l\'extension.' });
        }

        // 2. On interroge le background toutes les 2 secondes pour voir si c'est fini
        pollInterval = setInterval(() => {
          chrome.runtime.sendMessage(EXTENSION_ID, { type: 'CHECK_RESULT', jobId: job.id, jobUrl: job.url }, (checkRes) => {
            if (chrome.runtime.lastError) return; // Si l'extension dort une milliseconde, on ignore

            if (checkRes && checkRes.done) {
              clearInterval(pollInterval);
              clearTimeout(timeoutTimer);
              resolve(checkRes.result);
            }
          });
        }, 2000);

        // 3. Sécurité : Timeout général
        const timeoutTimer = setTimeout(() => {
          clearInterval(pollInterval);
          resolve({ success: false, error: 'Timeout — la candidature a pris trop de temps.' });
        }, TIMEOUT);
      });
    });
  }

  // ── getStatudds ─────────────────────────────────────────────────────────────

  async getStatus() {
    if (!window.chrome?.runtime) return { queue: [], history: [] };
    return new Promise(resolve => {
      try {
        chrome.runtime.sendMessage(EXTENSION_ID, { type: 'GET_STATUS' }, (res) => {
          resolve(res || { queue: [], history: [] });
        });
      } catch {
        resolve({ queue: [], history: [] });
      }
    });
  }
}

export const extensionBridge = new ExtensionBridge();