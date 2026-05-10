// jobboard-bridge.js — communication webapp ↔ extension
// Flow : START_APPLY (fire-and-forget) + WAIT_RESULT (long-poll) + GET_PROGRESS (polling 800ms)

const EXTENSION_ID = 'mhhjagimonemfbndjladapcophgjginl';
class ExtensionBridge {
  constructor() {
    this._available = null;
    this._onProgressCb = null;
    this._bgPollInterval = null; // Poll permanent pour les confirmations SF manuelles

    window.addEventListener('message', (e) => {
      if (e.data?.type === 'JB_EASY_APPLY_DETECTED') {
        this._onEasyApplyDetected?.(e.data.url);
      }
    });
  }

  // Poll permanent : tourne même sans START_APPLY en cours.
  // Attrape les confirmations SuccessFactors quand l'utilisateur postule manuellement.
  _startBgPoll() {
    if (this._bgPollInterval) return;
    this._bgPollInterval = setInterval(() => {
      if (!window.chrome?.runtime || !this._onProgressCb) return;
      chrome.runtime.sendMessage(EXTENSION_ID, { type: 'CHECK_MANUAL_CONFIRM' }, (res) => {
        if (chrome.runtime.lastError || !res?.confirmed) return;
        this._onProgressCb({ msg: '✅ Candidature validée sur le site recruteur !', type: 'success', job: res.job });
      });
    }, 2000);
  }

  async ping() {
    if (!window.chrome?.runtime) return false;
    return new Promise(resolve => {
      try {
        chrome.runtime.sendMessage(EXTENSION_ID, { type: 'PING' }, (res) => {
          // 👇 AJOUTE CETTE LIGNE ICI 👇
          this._startBgPoll();
          
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
      const TIMEOUT = 190_000; // 2 minutes max
      let pollInterval = null;

      chrome.runtime.sendMessage(EXTENSION_ID, { type: 'START_APPLY', job }, (startRes) => {
        if (chrome.runtime.lastError) {
          return resolve({ success: false, error: 'Erreur de communication avec l\'extension.' });
        }

        // On interroge le background toutes les secondes
        pollInterval = setInterval(() => {
          chrome.runtime.sendMessage(EXTENSION_ID, { type: 'CHECK_RESULT', jobId: job.id, jobUrl: job.url }, (checkRes) => {
            if (chrome.runtime.lastError) return;

            // Mise à jour de la progression affichée dans le JobBoard
            if (checkRes?.progress && this._onProgressCb) {
              this._onProgressCb({ msg: checkRes.progress.msg, type: checkRes.progress.type, job });

              // 🌟 FIX : On ne résout PLUS de manière anticipée sur progress type 'success'/'external'.
              // Pour Atos/Thales (flux LinkedIn → Atos → SuccessFactors), un progress 'external'
              // intermédiaire (émis par linkedin.js avant la redirection) ne doit PAS valider la carte.
              // Seul checkRes.done = true (envoyé par background.js en fin réelle) est authoritative.
            }

            if (checkRes?.done) {
              clearInterval(pollInterval);
              clearTimeout(timeoutTimer);
              if (this._onProgressCb) {
                const r = checkRes.result;
                if (r?.success) {
                  const msg = r.type === 'external'
                    ? '🟣 Site recruteur ouvert — marqué comme postulé.'
                    : '✅ Candidature envoyée !';
                  const type = r.type === 'external' ? 'external' : 'success';
                  this._onProgressCb({ msg, type, job });
                } else if (r && !r.success) {
                  this._onProgressCb({ msg: `❌ ${r.error || 'Échec'}`, type: 'error', job });
                }
              }
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