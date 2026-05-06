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

    this._startProgressPolling(job);

    // ── Étape 1 : démarrer la candidature (réponse immédiate "ok") ──────────
    const started = await new Promise(resolve => {
      try {
        chrome.runtime.sendMessage(EXTENSION_ID, { type: 'START_APPLY', job }, (res) => {
          if (chrome.runtime.lastError) {
            resolve({ ok: false, error: chrome.runtime.lastError.message });
          } else {
            resolve(res || { ok: false, error: 'Pas de réponse du background' });
          }
        });
      } catch (e) {
        resolve({ ok: false, error: e.message });
      }
    });

    if (!started.ok) {
      this._stopProgressPolling();
      return { success: false, error: started.error || 'Impossible de contacter l\'extension.' };
    }

    // ── Étape 2 : attendre le résultat via long-poll (100s max côté background) ─
    // On ajoute un timeout côté bridge de 110s pour laisser le background expirer proprement.
    const result = await new Promise(resolve => {
      const safetyTimer = setTimeout(() => {
        resolve({ success: false, error: 'Timeout côté webapp (110s).' });
      }, 110_000);

      try {
        chrome.runtime.sendMessage(
          EXTENSION_ID,
          { type: 'WAIT_RESULT', jobUrl: job.url },
          (res) => {
            clearTimeout(safetyTimer);
            if (chrome.runtime.lastError) {
              resolve({ success: false, error: chrome.runtime.lastError.message });
            } else {
              resolve(res || { success: false, error: 'Résultat vide.' });
            }
          }
        );
      } catch (e) {
        clearTimeout(safetyTimer);
        resolve({ success: false, error: e.message });
      }
    });

    this._stopProgressPolling();
    return result;
  }

  // ── getStatus ─────────────────────────────────────────────────────────────

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