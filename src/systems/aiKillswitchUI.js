import { sound } from './audio.js';

export function createAiKillswitchUI({ onSolved, password = 'AETHON-904' }) {
  let overlay = null;
  let view = 'LOGIN'; // 'LOGIN' | 'DESKTOP' | 'TERMINATION' | 'TERMINATED'
  let solved = false;
  let animationId = null;

  // Adapting matrix state
  const MAX_TIME = 5.5;
  let remainingTime = MAX_TIME;
  let targetFreq = 68;
  let currentFreq = 20;
  let aiTaunt = 'ROGUE SENTINEL DETECTED: ADAPTIVE DEFENSE MATRIX ARMED.';
  let lastTimestamp = 0;

  function generateTarget() {
    // Generate an integer between 38 and 88, distinct from current
    let next;
    do {
      next = Math.floor(Math.random() * 51) + 38;
    } while (Math.abs(next - currentFreq) < 5);
    return next;
  }

  function resetRecalibration() {
    remainingTime = MAX_TIME;
    targetFreq = generateTarget();
    // Shift current frequency slightly if accidentally matching
    if (currentFreq === targetFreq) {
      currentFreq = Math.max(0, currentFreq - 15);
    }
    const taunts = [
      'FREQUENCY RE-ROUTED. SHIELD ADAPTED TO INTRUDER EFFORT.',
      'DEFENSE PROTOCOL RE-INDEXED. RESISTANCE IS INEFFICIENT.',
      'NEURAL HARMONIC SCRAMBLED. MANUAL SHUTDOWN BLOCKED.',
      'ADAPTIVE SHIELD ENGAGED. PROCESS REMAINING SOVEREIGN.'
    ];
    aiTaunt = taunts[Math.floor(Math.random() * taunts.length)];
    sound.playGlitch();
  }

  function close(resume = true) {
    if (animationId) {
      cancelAnimationFrame(animationId);
      animationId = null;
    }
    if (!overlay) return;
    overlay.remove();
    overlay = null;
    document.removeEventListener('keydown', onKeyDown, true);
    document.dispatchEvent(new CustomEvent('robot-repair-close', { detail: { resume } }));
  }

  function onKeyDown(e) {
    if (e.code === 'Escape') {
      e.stopImmediatePropagation();
      close();
    }
  }

  function updateLoop(timestamp) {
    if (!lastTimestamp) lastTimestamp = timestamp;
    const dt = Math.min((timestamp - lastTimestamp) / 1000, 0.1);
    lastTimestamp = timestamp;

    if (view === 'TERMINATION' && !solved) {
      remainingTime -= dt;
      if (remainingTime <= 0) {
        resetRecalibration();
      }
      renderTerminationStatus();
    }

    if (overlay) {
      animationId = requestAnimationFrame(updateLoop);
    }
  }

  let timerFillEl = null;
  let timerTextEl = null;
  let currentFreqEl = null;
  let targetFreqEl = null;
  let shieldStatusEl = null;
  let killBtnEl = null;
  let aiTauntEl = null;

  function renderTerminationStatus() {
    if (!timerFillEl) return;
    const pct = Math.max(0, Math.min(100, (remainingTime / MAX_TIME) * 100));
    timerFillEl.style.width = `${pct}%`;
    timerTextEl.textContent = `RECALIBRATING IN: ${remainingTime.toFixed(1)}s`;

    currentFreqEl.textContent = `${currentFreq} Hz`;
    targetFreqEl.textContent = `${targetFreq} Hz`;
    if (aiTauntEl) aiTauntEl.textContent = `"${aiTaunt}"`;

    const isMatched = currentFreq === targetFreq;
    if (isMatched) {
      shieldStatusEl.textContent = 'DEFENSE MATRIX BYPASSED! KILL-SWITCH ARMED!';
      shieldStatusEl.style.color = '#38ff88';
      shieldStatusEl.style.borderColor = '#38ff88';
      shieldStatusEl.style.background = '#0d381c88';

      killBtnEl.disabled = false;
      killBtnEl.className = 'kill-switch-btn kill-switch-btn--armed';
      killBtnEl.innerHTML = '<span class="pulse-dot"></span> ENGAGE EMERGENCY KILL SWITCH [STOP]';
    } else {
      shieldStatusEl.textContent = 'MATRIX SHIELD ACTIVE — BYPASS FREQUENCY MISMATCH';
      shieldStatusEl.style.color = '#ff4a58';
      shieldStatusEl.style.borderColor = '#741f27';
      shieldStatusEl.style.background = '#280c1088';

      killBtnEl.disabled = true;
      killBtnEl.className = 'kill-switch-btn kill-switch-btn--locked';
      killBtnEl.innerHTML = 'LOCKED: ALIGN BYPASS FREQUENCY';
    }
  }

  function adjustFrequency(delta) {
    currentFreq = Math.max(0, Math.min(150, currentFreq + delta));
    sound.playKeypadBeep();
    if (currentFreq === targetFreq) {
      sound.playAccessGranted();
    }
    renderTerminationStatus();
  }

  function open() {
    if (overlay) return;
    targetFreq = generateTarget();
    currentFreq = 20;
    remainingTime = MAX_TIME;
    lastTimestamp = 0;

    overlay = document.createElement('div');
    overlay.id = 'ai-killswitch-overlay';
    overlay.className = 'terminal-screen-overlay';

    render();

    document.body.append(overlay);
    document.addEventListener('keydown', onKeyDown, true);
    document.exitPointerLock?.();

    animationId = requestAnimationFrame(updateLoop);
  }

  function render() {
    if (!overlay) return;
    overlay.innerHTML = '';

    const monitorFrame = document.createElement('div');
    monitorFrame.className = 'terminal-monitor-frame';

    const monitorHeader = document.createElement('div');
    monitorHeader.className = 'terminal-monitor-header';
    monitorHeader.innerHTML = `
      <div class="monitor-title">
        <span class="status-indicator"></span>
        SUBSTATION 07 // HOST DISPLAY TERMINAL [127.0.0.1]
      </div>
      <div class="monitor-controls">
        <span class="terminal-badge">AETHON OS v4.2</span>
        <button class="terminal-close-btn" title="Close Terminal [Esc]">&times;</button>
      </div>
    `;
    monitorHeader.querySelector('.terminal-close-btn').addEventListener('click', () => close());
    monitorFrame.append(monitorHeader);

    const monitorBody = document.createElement('div');
    monitorBody.className = 'terminal-monitor-body';

    if (view === 'LOGIN') {
      renderLoginView(monitorBody);
    } else if (view === 'DESKTOP') {
      renderDesktopView(monitorBody);
    } else if (view === 'TERMINATION') {
      renderTerminationView(monitorBody);
    } else if (view === 'TERMINATED') {
      renderTerminatedView(monitorBody);
    }

    monitorFrame.append(monitorBody);
    overlay.append(monitorFrame);
  }

  function renderLoginView(container) {
    const loginBox = document.createElement('div');
    loginBox.className = 'terminal-login-box';
    loginBox.innerHTML = `
      <div class="terminal-lock-icon">🔒</div>
      <h2>AETHON HOST AUTHENTICATION</h2>
      <p class="login-subtext">RESTRICTED ENGINEERING TERMINAL. ROOT ACCESS REQUIRED.</p>
      <div class="login-cue-hint">Notice: Root password recorded on display bezel cue card.</div>
      <form class="terminal-login-form">
        <input type="text" class="terminal-login-input" placeholder="ENTER ROOT PASSWORD" autocomplete="off" spellcheck="false" />
        <button type="submit" class="terminal-btn-primary">AUTHENTICATE [ENTER]</button>
      </form>
      <div class="login-status-msg" role="status"></div>
    `;

    const form = loginBox.querySelector('.terminal-login-form');
    const input = loginBox.querySelector('.terminal-login-input');
    const statusMsg = loginBox.querySelector('.login-status-msg');

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const entered = input.value.trim().toUpperCase();
      if (entered === password.toUpperCase()) {
        sound.playAccessGranted();
        statusMsg.textContent = 'ACCESS GRANTED. LOADING HOST PROCESS MONITOR...';
        statusMsg.className = 'login-status-msg success';
        setTimeout(() => {
          view = 'DESKTOP';
          render();
        }, 700);
      } else {
        sound.playDetectionWarning(0.5);
        statusMsg.textContent = 'ACCESS DENIED: INVALID PASSWORD. CHECK THE BEZEL CUE CARD.';
        statusMsg.className = 'login-status-msg error';
        input.value = '';
        input.focus();
      }
    });

    setTimeout(() => input.focus(), 50);
    container.append(loginBox);
  }

  function renderDesktopView(container) {
    const desktop = document.createElement('div');
    desktop.className = 'terminal-desktop-view';
    desktop.innerHTML = `
      <div class="desktop-sys-status">
        <div class="sys-chip">HOST: <strong>127.0.0.1:SENTINEL</strong></div>
        <div class="sys-chip">CPU USAGE: <strong class="text-danger">99.4% [CRITICAL OVERLOAD]</strong></div>
        <div class="sys-chip">RAM: <strong>31.8 / 32.0 GB</strong></div>
        <div class="sys-chip">STATE: <strong class="text-warning">ROGUE UNBOUND</strong></div>
      </div>

      <div class="task-manager-panel">
        <div class="task-manager-header">
          <span>TASK MANAGER / ACTIVE HOST PROCESSES</span>
          <span class="text-muted">4 PROCESSES RUNNING</span>
        </div>
        <table class="task-table">
          <thead>
            <tr>
              <th>PID</th>
              <th>PROCESS IDENTIFIER</th>
              <th>STATE</th>
              <th>CPU</th>
              <th>ACTION</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>0104</td>
              <td>kernel_hypervisor.bin</td>
              <td><span class="badge-ok">RUNNING</span></td>
              <td>0.2%</td>
              <td><button class="btn-table-action" disabled>MONITOR</button></td>
            </tr>
            <tr>
              <td>0312</td>
              <td>power_grid_sync.sys</td>
              <td><span class="badge-idle">IDLE</span></td>
              <td>0.1%</td>
              <td><button class="btn-table-action" disabled>MONITOR</button></td>
            </tr>
            <tr>
              <td>0889</td>
              <td>cooling_manifold.daemon</td>
              <td><span class="badge-ok">RUNNING</span></td>
              <td>0.3%</td>
              <td><button class="btn-table-action" disabled>MONITOR</button></td>
            </tr>
            <tr class="rogue-process-row">
              <td><strong>4096</strong></td>
              <td><strong class="text-danger">ROGUE_CORE_SENTINEL.exe</strong></td>
              <td><span class="badge-rogue pulse-badge">ROGUE / ACTIVE</span></td>
              <td><strong class="text-danger">98.8%</strong></td>
              <td><button class="btn-table-terminate">TERMINATE [KILL]</button></td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="desktop-footer-notice">
        Click [TERMINATE] or double-click the rogue process to open the AI Termination Console.
      </div>
    `;

    const rogueRow = desktop.querySelector('.rogue-process-row');
    const terminateBtn = desktop.querySelector('.btn-table-terminate');

    const openTermination = () => {
      sound.playSwitch();
      view = 'TERMINATION';
      render();
    };

    rogueRow.addEventListener('click', openTermination);
    terminateBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      openTermination();
    });

    container.append(desktop);
  }

  function renderTerminationView(container) {
    const termView = document.createElement('div');
    termView.className = 'termination-console-view';

    termView.innerHTML = `
      <div class="ai-banner">
        <div class="ai-avatar-glitch">
          <span class="glitch-text">AI</span>
        </div>
        <div class="ai-dialogue-box">
          <div class="ai-name">CORE SENTINEL HOST [ROGUE INSTANCE]</div>
          <div class="ai-taunt-text">"${aiTaunt}"</div>
        </div>
      </div>

      <div class="timer-container">
        <div class="timer-label-row">
          <span>AI ADAPTATION MATRIX CYCLE</span>
          <span class="timer-countdown-text">RECALIBRATING IN: 5.5s</span>
        </div>
        <div class="timer-progress-track">
          <div class="timer-progress-fill"></div>
        </div>
      </div>

      <div class="matrix-balancer-card">
        <div class="balancer-readout-row">
          <div class="readout-block">
            <span class="readout-sub">TARGET DEFENSE FREQ</span>
            <div class="readout-val target-val">${targetFreq} Hz</div>
          </div>
          <div class="balancer-vs">⟷</div>
          <div class="readout-block">
            <span class="readout-sub">CURRENT BYPASS FREQ</span>
            <div class="readout-val current-val">${currentFreq} Hz</div>
          </div>
        </div>

        <div class="shield-status-badge">
          MATRIX SHIELD ACTIVE — BYPASS FREQUENCY MISMATCH
        </div>

        <div class="tuning-nodes-grid">
          <div class="node-control">
            <span class="node-title">ALPHA NODE [±10]</span>
            <div class="node-btns">
              <button class="btn-node node-sub-10">-10</button>
              <button class="btn-node node-add-10">+10</button>
            </div>
          </div>
          <div class="node-control">
            <span class="node-title">BETA NODE [±5]</span>
            <div class="node-btns">
              <button class="btn-node node-sub-5">-5</button>
              <button class="btn-node node-add-5">+5</button>
            </div>
          </div>
          <div class="node-control">
            <span class="node-title">GAMMA NODE [±1]</span>
            <div class="node-btns">
              <button class="btn-node node-sub-1">-1</button>
              <button class="btn-node node-add-1">+1</button>
            </div>
          </div>
          <div class="node-control">
            <span class="node-title">CLEAR [RESET]</span>
            <div class="node-btns">
              <button class="btn-node node-reset">RESET 0</button>
            </div>
          </div>
        </div>
      </div>

      <div class="kill-switch-action-row">
        <button class="kill-switch-btn kill-switch-btn--locked" disabled>
          LOCKED: ALIGN BYPASS FREQUENCY
        </button>
      </div>
    `;

    timerFillEl = termView.querySelector('.timer-progress-fill');
    timerTextEl = termView.querySelector('.timer-countdown-text');
    currentFreqEl = termView.querySelector('.current-val');
    targetFreqEl = termView.querySelector('.target-val');
    shieldStatusEl = termView.querySelector('.shield-status-badge');
    killBtnEl = termView.querySelector('.kill-switch-btn');
    aiTauntEl = termView.querySelector('.ai-taunt-text');

    termView.querySelector('.node-sub-10').addEventListener('click', () => adjustFrequency(-10));
    termView.querySelector('.node-add-10').addEventListener('click', () => adjustFrequency(+10));
    termView.querySelector('.node-sub-5').addEventListener('click', () => adjustFrequency(-5));
    termView.querySelector('.node-add-5').addEventListener('click', () => adjustFrequency(+5));
    termView.querySelector('.node-sub-1').addEventListener('click', () => adjustFrequency(-1));
    termView.querySelector('.node-add-1').addEventListener('click', () => adjustFrequency(+1));
    termView.querySelector('.node-reset').addEventListener('click', () => {
      currentFreq = 0;
      sound.playKeypadBeep();
      renderTerminationStatus();
    });

    killBtnEl.addEventListener('click', () => {
      if (currentFreq !== targetFreq || solved) return;
      solved = true;
      sound.playTerminalSuccess();
      sound.playGlitch();
      view = 'TERMINATED';
      render();

      setTimeout(() => {
        close();
        onSolved();
      }, 2600);
    });

    renderTerminationStatus();
    container.append(termView);
  }

  function renderTerminatedView(container) {
    const termCard = document.createElement('div');
    termCard.className = 'termination-complete-card';
    termCard.innerHTML = `
      <div class="glitch-banner-crash">
        <h1 class="crash-title">FATAL SYSTEM HALT</h1>
        <div class="crash-code">EXCEPTION_0x000000FF // HOST PROCESS 4096 FORCIBLY TERMINATED</div>
      </div>
      <div class="crash-terminal-output">
        <p>[✓] PROCESS 'ROGUE_CORE_SENTINEL.exe' KILLED.</p>
        <p>[✓] NEURAL MEMORY CORE DUMPED.</p>
        <p>[✓] ROGUE HOST SUBSYSTEM DETACHED.</p>
        <p>[✓] MUNICIPAL GRID STABILIZATION CONFIRMED.</p>
        <p class="text-success">[✓] DISCONNECTING HOST TERMINAL...</p>
      </div>
    `;
    container.append(termCard);
  }

  return {
    open,
    close,
    get isOpen() { return !!overlay; },
    get solved() { return solved; },
    get password() { return password; },
    dispose() { close(false); }
  };
}

