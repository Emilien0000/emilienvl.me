// jobboard-bridge.js — communication webapp ↔ extension
// v3 : tout passe par chrome.runtime.sendMessage (pas de storage direct depuis la webapp)
//      Le background gère le storage. La webapp poll via GET_PROGRESS.

const EXTENSION_ID = 'mhhjagimonemfbndjladapcophgjginl';

class ExtensionBridge {
  constructor() {
    this._available = null;
    this._progressCallback = null;

    window.addEventListener('message', (e) => {
      if (e.data?.type === 'JB_EASY_APPLY_DETECTED') {
        this._onEasyApplyDetected?.(e.data.url);
      }
    });
  }

  // ── Utilitaire sendMessage ─────────────────────────────────────────────────
  _send(msg) {
    return new Promise((resolve) => {
      try {
        chrome.runtime.sendMessage(EXTENSION_ID, msg, (res) => {
          if (chrome.runtime.lastError) resolve(null);
          else resolve(res);
        });
      } catch { resolve(null); }
    });
  }

  // ── Ping ──────────────────────────────────────────────────────────────────
  async ping() {
    if (!window.chrome?.runtime) return false;
    const res = await this._send({ type: 'PING' });
    this._available = !!res?.ok;
    return this._available;
  }

  get isAvailable() { return this._available; }

  // ── Callback de progression ────────────────────────────────────────────────
  onProgress(cb) { this._progressCallback = cb; }

  // ── applyToJob ─────────────────────────────────────────────────────────────
  // Délègue TOUT au background (storage, onglet, apply).
  // La webapp poll GET_PROGRESS toutes les 800ms pour les étapes intermédiaires.
  // La Promise se résout quand le background répond au TRIGGER_APPLY.
  async applyToJob(job) {
    if (!window.chrome?.runtime) {
      return { success: false, error: 'Extension Chrome non disponible.' };
    }

    return new Promise((resolve) => {
      const TIMEOUT = 120_000;
      let resolved = false;
      let progressInterval = null;
      let lastProgressTs = null;

      const done = (result) => {
        if (resolved) return;
        resolved = true;
        clearInterval(progressInterval);
        clearTimeout(timeoutTimer);
        resolve(result);
      };

      const timeoutTimer = setTimeout(() => {
        done({ success: false, error: 'Timeout — la candidature a pris trop de temps (2 min).' });
      }, TIMEOUT);

      // ── Polling des étapes de progression (toutes les 800ms) ──────────────
      // Le background expose GET_PROGRESS qui lit applyProgress depuis son storage
      progressInterval = setInterval(async () => {
        if (resolved) return;
        const res = await this._send({ type: 'GET_PROGRESS' });
        if (!res?.progress) return;
        const p = res.progress;
        if (p.ts === lastProgressTs) return;
        lastProgressTs = p.ts;
        if (this._progressCallback) {
          this._progressCallback({ msg: p.msg, type: p.type, job });
        }
      }, 800);

      // ── Déclencher la candidature via le background (bloquant jusqu'au résultat) ──
      // TRIGGER_APPLY est déjà géré dans background.js et fait tout le travail
      this._send({ type: 'TRIGGER_APPLY', job }).then((result) => {
        if (!result) {
          done({ success: false, error: 'Pas de réponse de l\'extension. Vérifie qu\'elle est bien activée.' });
          return;
        }
        done(result);
      });
    });
  }

  async getStatus() {
    if (!window.chrome?.runtime) return { queue: [], history: [] };
    const res = await this._send({ type: 'GET_STATUS' });
    return res || { queue: [], history: [] };
  }

  onEasyApplyDetected(cb) { this._onEasyApplyDetected = cb; }
}

export const extensionBridge = new ExtensionBridge();