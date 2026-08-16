// =========================================================
// QLIZE CLIENT QA TELEMETRY & FEEDBACK CONTROLLER
// Activación automática cuando MODO_QA="true"
// =========================================================

const IS_QA_ENABLED = (typeof __MODO_QA__ !== 'undefined' && __MODO_QA__ === true) ||
  (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_MODO_QA === 'true');

class QAManager {
  constructor() {
    this.enabled = IS_QA_ENABLED;
    this.sessionId = null;
    this.currentContext = null;
    this.selectedRating = 5;
    this.isPromptOpen = false;

    if (this.enabled) {
      this.initSession();
    }
  }

  isEnabled() {
    return this.enabled;
  }

  initSession() {
    if (!this.enabled || typeof window === 'undefined') return;

    try {
      let sId = window.sessionStorage.getItem('qlize_qa_session_id');
      if (!sId) {
        sId = 'sess_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7);
        window.sessionStorage.setItem('qlize_qa_session_id', sId);
      }
      this.sessionId = sId;

      fetch('/api/qa/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: this.sessionId,
          userAgent: navigator.userAgent
        })
      }).catch(() => {});
    } catch {
      // Ignorar errores de red en testing/offline
    }
  }

  logEvent(eventType, data = {}) {
    if (!this.enabled || typeof window === 'undefined') return;

    const payload = {
      sessionId: this.sessionId || 'anon',
      eventType,
      mode: data.mode || 'N/A',
      stage: data.stage || 'N/A',
      score: data.score || 0,
      syncRatio: data.syncRatio ?? 1.0,
      lives: data.lives ?? 3,
      durationSec: data.durationSec || 0,
      details: data.details || ''
    };

    fetch('/api/qa/event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).catch(() => {});
  }

  showFeedbackPrompt({ mode = 'Modo Juego', stage = 'N/A', score = 0, syncRatio = 1.0, onComplete = () => {} }) {
    if (!this.enabled || typeof document === 'undefined' || this.isSessionSuppressed()) {
      onComplete();
      return;
    }

    const modal = document.getElementById('modal-qa-feedback');
    if (!modal) {
      onComplete();
      return;
    }

    this.currentContext = { mode, stage, score, syncRatio, onComplete };
    this.selectedRating = 5;
    this.isPromptOpen = true;

    // Actualizar textos del contexto
    const ctxText = document.getElementById('qa-feedback-context');
    if (ctxText) {
      ctxText.innerText = `${mode} • ${stage} | ${Math.round(score)}m | Sincronía: ${Math.round(syncRatio * 100)}%`;
    }

    const commentInput = document.getElementById('qa-feedback-comment');
    if (commentInput) {
      commentInput.value = '';
    }

    this.updateRatingUI(5);
    modal.classList.remove('hidden');

    this.logEvent('feedback_prompt_shown', { mode, stage, score, syncRatio });
  }

  isSessionSuppressed() {
    if (this.suppressForSession) return true;
    try {
      if (typeof sessionStorage !== 'undefined' && sessionStorage.getItem('qlize_qa_suppress_session') === 'true') {
        this.suppressForSession = true;
        return true;
      }
    } catch {}
    return false;
  }

  updateRatingUI(rating) {
    this.selectedRating = rating;
    const buttons = document.querySelectorAll('.qa-star-btn');
    buttons.forEach((btn) => {
      const val = parseInt(btn.getAttribute('data-val') || '0', 10);
      if (val <= rating) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    const ratingLabel = document.getElementById('qa-rating-label');
    if (ratingLabel) {
      const labels = ['', 'Muy insatisfecho', 'Poco entretenido', 'Aceptable', 'Muy bueno', '¡Excelente!'];
      ratingLabel.innerText = `${rating} / 5 — ${labels[rating] || ''}`;
    }
  }

  submitFeedback(comment = '') {
    if (!this.currentContext) return;

    const payload = {
      sessionId: this.sessionId || 'anon',
      mode: this.currentContext.mode,
      stage: this.currentContext.stage,
      rating: this.selectedRating,
      comment: comment.trim(),
      score: this.currentContext.score,
      syncRatio: this.currentContext.syncRatio
    };

    fetch('/api/qa/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).catch(() => {});

    this.closeModal();
  }

  omitFeedback() {
    if (this.currentContext) {
      this.logEvent('feedback_omitted', {
        mode: this.currentContext.mode,
        stage: this.currentContext.stage
      });
    }
    this.closeModal();
  }

  suppressSessionFeedback() {
    this.suppressForSession = true;
    try {
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.setItem('qlize_qa_suppress_session', 'true');
      }
    } catch {}
    if (this.currentContext) {
      this.logEvent('feedback_suppressed_session', {
        mode: this.currentContext.mode,
        stage: this.currentContext.stage
      });
    }
    this.closeModal();
  }

  closeModal() {
    const modal = document.getElementById('modal-qa-feedback');
    if (modal) modal.classList.add('hidden');

    this.isPromptOpen = false;
    if (this.currentContext && typeof this.currentContext.onComplete === 'function') {
      const cb = this.currentContext.onComplete;
      this.currentContext = null;
      cb();
    } else {
      this.currentContext = null;
    }
  }
}

export const qa = new QAManager();
