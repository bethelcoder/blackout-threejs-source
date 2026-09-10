export class HUD {
  constructor() {
    this.aiStatusEl = document.getElementById('ai-status-value');
    this.objectiveEl = document.getElementById('objective-text');
    this.bannerEl = document.getElementById('level-banner');
    this.bannerTitleEl = document.getElementById('level-title');
    this.bannerSubtitleEl = document.getElementById('level-subtitle');
    this.levelComplete = false;
  }

  setAIStatus(state) {
    this.aiStatusEl.textContent = state;
    this.aiStatusEl.className = state.toLowerCase();
  }

  setObjective(text) {
    this.objectiveEl.textContent = text;
  }

  showLevelBanner(title, subtitle) {
    this.bannerTitleEl.textContent = title;
    this.bannerSubtitleEl.textContent = subtitle;
    this.bannerEl.classList.remove('hidden');
    // restart the CSS fade animation
    this.bannerEl.style.animation = 'none';
    void this.bannerEl.offsetWidth;
    this.bannerEl.style.animation = '';
  }

  markLevelComplete() {
    this.levelComplete = true;
  }

  resetLevelComplete() {
    this.levelComplete = false;
  }
}
