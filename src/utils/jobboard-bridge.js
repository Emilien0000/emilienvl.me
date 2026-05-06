// jobboard-bridge.js — v4
// Architecture :
//   1. START_APPLY  → background (stocke le job, ouvre l'onglet)  [réponse immédiate]
//   2. GET_PROGRESS → background (lit applyProgress du storage)    [poll 800ms]
//   3. WAIT_RESULT  → background (bloque jusqu'au résultat, max 100s) [long-poll]
//
// Aucun accès direct à chrome.storage depuis la webapp.

const EXTENSION_ID = 'mhhjagimonemfbndjladapcophgjginl';

class ExtensionBridge {
  constructor() {
    this._available = null;
    this._progressCallback = null;
    window.addEventListener('message', (e) => {
      if (e.data?.type === 'JB_EASY_APPLY_DETECTED') this._onEasyApplyDetected?.(e.data.url);
    });
  }

  _send(msg, timeoutMs = 5000) {
    return new Promise((resolve) => {
      const t = setTimeout(() => resolve(null), timeoutMs);
      try {
        chrome.runtime.sendMessage(EXTENSION_ID, msg, (res) => {
          clearTimeout(t);
          if (chrome.runtime.lastError) resolve(null);
          else resolve(res);
        });
      } catch { clearTimeout(t); resolve(null); }
    });
  }

  async ping() {
    if (!window.chrome?.runtime) return false;
    const res = await this._send({ type: 'PING' });
    this._available = !!res?.ok;
    return this._available;
  }

  get isAvailable() { return this._available; }
  onProgress(cb) { this._progressCallback = cb; }

  async applyToJob(job) {
    if (!window.chrome?.runtime) {
      return { success: false, error: 'Extension Chrome non disponible.' };
    }

    return new Promise((resolve) => {
      const TIMEOUT = 110_000;
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
        done({ success: false, error: 'Timeout (110s) — la candidature a pris trop de temps.' });
      }, TIMEOUT);

      // ── Étape 1 : demander au background de démarrer (réponse immédiate) ──
      this._send({ type: 'START_APPLY', job }).then((res) => {
        if (!res?.ok) {
          done({ success: false, error: res?.error || 'Impossible de démarrer la candidature.' });
          return;
        }

        // ── Étape 2 : poll la progression intermédiaire (800ms) ──────────────
        progressInterval = setInterval(async () => {
          if (resolved) return;
          const r = await this._send({ type: 'GET_PROGRESS', jobUrl: job.url });
          const p = r?.progress;
          if (!p || p.ts === lastProgressTs) return;
          lastProgressTs = p.ts;
          this._progressCallback?.({ msg: p.msg, type: p.type, job });
        }, 800);

        // ── Étape 3 : long-poll le résultat final (le background bloque) ─────
        // On envoie WAIT_RESULT avec un timeout côté background de 100s.
        // Chrome autorise les réponses async dans onMessageExternal si on retourne true.
        this._send({ type: 'WAIT_RESULT', jobUrl: job.url }, 105_000).then((result) => {
          if (!result) {
            done({ success: false, error: 'Pas de réponse de l\'extension après 100s.' });
            return;
          }
          done(result);
        });
      });
    });
  }

  async getStatus() {
    if (!window.chrome?.runtime) return { queue: [], history: [] };
    return (await this._send({ type: 'GET_STATUS' })) || { queue: [], history: [] };
  }

  onEasyApplyDetected(cb) { this._onEasyApplyDetected = cb; }
}

export const extensionBridge = new ExtensionBridge();