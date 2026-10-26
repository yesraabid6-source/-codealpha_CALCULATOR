/**
 * ==============================================================================
 * APEXCALC CORE CONTROLLER
 * ==============================================================================
 * Features:
 * - Synthesis Web Audio Click Sound (No external audio file required)
 * - Calculation History with local memory
 * - Copy to Clipboard with toast
 * - Auto Font-Size Resizing
 * - Flawless Floating Precision (0.1 + 0.2 = 0.3)
 * - Theme Persistence (Dark / Light)
 * - Full Keyboard navigation with visual feedback
 * ==============================================================================
 */

// ==============================================================================
// 1. SOUND GENERATOR (Web Audio API)
// ==============================================================================
class SoundFX {
  constructor() {
    this.enabled = true;
    this.audioCtx = null;
  }

  init() {
    if (!this.audioCtx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.audioCtx = new AudioContext();
    }
  }

  playClick(freq = 600) {
    if (!this.enabled) return;
    this.init();

    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }

    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, this.audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(150, this.audioCtx.currentTime + 0.04);

    gain.gain.setValueAtTime(0.15, this.audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.04);

    osc.connect(gain);
    gain.connect(this.audioCtx.destination);

    osc.start();
    osc.stop(this.audioCtx.currentTime + 0.04);
  }
}

// ==============================================================================
// 2. CALCULATOR ENGINE
// ==============================================================================
class Calculator {
  constructor(prevEl, currEl) {
    this.prevEl = prevEl;
    this.currEl = currEl;
    this.history = JSON.parse(localStorage.getItem('apex_history') || '[]');
    this.clear();
  }

  clear() {
    this.currentOperand = '0';
    this.previousOperand = '';
    this.operation = undefined;
    this.shouldResetScreen = false;
  }

  delete() {
    if (this.currentOperand === '0' || this.shouldResetScreen) return;
    if (this.currentOperand.length === 1 || (this.currentOperand.length === 2 && this.currentOperand.startsWith('-'))) {
      this.currentOperand = '0';
    } else {
      this.currentOperand = this.currentOperand.slice(0, -1);
    }
  }

  appendNumber(number) {
    if (this.shouldResetScreen) {
      this.currentOperand = '';
      this.shouldResetScreen = false;
    }
    if (number === '.' && this.currentOperand.includes('.')) return;
    if (this.currentOperand === '0' && number !== '.') {
      this.currentOperand = number.toString();
    } else {
      this.currentOperand += number.toString();
    }
  }

  chooseOperation(operation) {
    if (this.currentOperand === '' && this.previousOperand === '') return;
    if (this.currentOperand === '') {
      this.operation = operation;
      return;
    }
    if (this.previousOperand !== '') {
      this.compute();
    }
    this.operation = operation;
    this.previousOperand = this.currentOperand;
    this.currentOperand = '';
  }

  compute() {
    let computation;
    const prev = parseFloat(this.previousOperand);
    const current = parseFloat(this.currentOperand);

    if (isNaN(prev) || isNaN(current)) return;

    switch (this.operation) {
      case '+':
        computation = prev + current;
        break;
      case '-':
      case '−':
        computation = prev - current;
        break;
      case '×':
      case '*':
        computation = prev * current;
        break;
      case '÷':
      case '/':
        if (current === 0) {
          alert('Cannot divide by zero');
          this.clear();
          return;
        }
        computation = prev / current;
        break;
      default:
        return;
    }

    // Fix floating point math quirks (0.1 + 0.2 = 0.3)
    computation = parseFloat(computation.toPrecision(12));

    // Save to calculation history
    this.addHistoryRecord(`${prev} ${this.operation} ${current}`, computation);

    this.currentOperand = computation.toString();
    this.operation = undefined;
    this.previousOperand = '';
    this.shouldResetScreen = true;
  }

  percentage() {
    const val = parseFloat(this.currentOperand);
    if (isNaN(val)) return;
    this.currentOperand = (val / 100).toString();
  }

  toggleSign() {
    if (this.currentOperand === '0') return;
    this.currentOperand = (parseFloat(this.currentOperand) * -1).toString();
  }

  addHistoryRecord(expression, result) {
    this.history.unshift({ expression, result });
    if (this.history.length > 30) this.history.pop();
    localStorage.setItem('apex_history', JSON.stringify(this.history));
    renderHistory();
  }

  formatDisplayNumber(number) {
    const stringNumber = number.toString();
    const integerDigits = parseFloat(stringNumber.split('.')[0]);
    const decimalDigits = stringNumber.split('.')[1];

    let integerDisplay;
    if (isNaN(integerDigits)) {
      integerDisplay = '';
    } else {
      integerDisplay = integerDigits.toLocaleString('en', { maximumFractionDigits: 0 });
    }

    if (decimalDigits != null) {
      return `${integerDisplay}.${decimalDigits}`;
    } else {
      return integerDisplay;
    }
  }

  updateDisplay() {
    this.currEl.textContent = this.formatDisplayNumber(this.currentOperand);
    
    // Auto scale font size if number is very long
    const length = this.currEl.textContent.length;
    if (length > 12) {
      this.currEl.style.fontSize = '1.4rem';
    } else if (length > 8) {
      this.currEl.style.fontSize = '1.9rem';
    } else {
      this.currEl.style.fontSize = '2.5rem';
    }

    if (this.operation != null) {
      this.prevEl.textContent = `${this.formatDisplayNumber(this.previousOperand)} ${this.operation}`;
    } else {
      this.prevEl.textContent = '';
    }
  }
}

// ==============================================================================
// 3. UI SETUP & EVENT LISTENERS
// ==============================================================================
document.addEventListener('DOMContentLoaded', () => {
  const prevEl = document.getElementById('previousOperand');
  const currEl = document.getElementById('currentOperand');
  const soundFX = new SoundFX();
  const calc = new Calculator(prevEl, currEl);

  // Sound Toggle Button
  const soundBtn = document.getElementById('soundToggleBtn');
  soundBtn.addEventListener('click', () => {
    soundFX.enabled = !soundFX.enabled;
    soundBtn.innerHTML = soundFX.enabled 
      ? '<i class="fa-solid fa-volume-high"></i>' 
      : '<i class="fa-solid fa-volume-xmark"></i>';
    showToast(soundFX.enabled ? 'Sound Enabled' : 'Sound Muted');
  });

  // Theme Toggle Button
  const themeBtn = document.getElementById('themeToggleBtn');
  const htmlTag = document.documentElement;
  const savedTheme = localStorage.getItem('apex_theme') || 'dark';
  htmlTag.setAttribute('data-theme', savedTheme);
  updateThemeIcon(savedTheme);

  themeBtn.addEventListener('click', () => {
    const current = htmlTag.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    htmlTag.setAttribute('data-theme', next);
    localStorage.setItem('apex_theme', next);
    updateThemeIcon(next);
    showToast(`Switched to ${next} mode`);
  });

  function updateThemeIcon(theme) {
    themeBtn.innerHTML = theme === 'dark' 
      ? '<i class="fa-solid fa-moon"></i>' 
      : '<i class="fa-solid fa-sun"></i>';
  }

  // Copy Result to Clipboard
  const copyBtn = document.getElementById('copyResultBtn');
  copyBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(calc.currentOperand);
    showToast('Result copied to clipboard!');
  });

  // History Drawer Controls
  const historyPanel = document.getElementById('historyPanel');
  const historyToggleBtn = document.getElementById('historyToggleBtn');
  const closeHistoryBtn = document.getElementById('closeHistoryBtn');
  const clearHistoryBtn = document.getElementById('clearHistoryBtn');

  historyToggleBtn.addEventListener('click', () => {
    historyPanel.classList.add('open');
    renderHistory();
  });

  closeHistoryBtn.addEventListener('click', () => {
    historyPanel.classList.remove('open');
  });

  clearHistoryBtn.addEventListener('click', () => {
    calc.history = [];
    localStorage.removeItem('apex_history');
    renderHistory();
    showToast('History cleared');
  });

  window.renderHistory = function() {
    const historyList = document.getElementById('historyList');
    if (!calc.history.length) {
      historyList.innerHTML = '<p class="empty-history">No calculations yet</p>';
      return;
    }
    historyList.innerHTML = calc.history.map((item, idx) => `
      <div class="history-item" data-idx="${idx}">
        <span class="hist-expr">${item.expression} =</span>
        <span class="hist-result">${item.result}</span>
      </div>
    `).join('');

    // Clicking an old calculation brings the result back onto screen
    historyList.querySelectorAll('.history-item').forEach(el => {
      el.addEventListener('click', () => {
        const idx = el.dataset.idx;
        calc.currentOperand = calc.history[idx].result.toString();
        calc.shouldResetScreen = true;
        calc.updateDisplay();
        historyPanel.classList.remove('open');
        showToast('Result loaded to screen');
      });
    });
  };

  // Toast Function
  let toastTimer;
  function showToast(msg) {
    const toast = document.getElementById('toast');
    const toastMsg = document.getElementById('toastMsg');
    clearTimeout(toastTimer);
    toastMsg.textContent = msg;
    toast.classList.add('show');
    toastTimer = setTimeout(() => toast.classList.remove('show'), 2200);
  }

  // Keypad Click Listeners
  document.querySelectorAll('[data-number]').forEach(btn => {
    btn.addEventListener('click', () => {
      soundFX.playClick(650);
      calc.appendNumber(btn.dataset.number);
      calc.updateDisplay();
    });
  });

  document.querySelectorAll('[data-operator]').forEach(btn => {
    btn.addEventListener('click', () => {
      soundFX.playClick(800);
      calc.chooseOperation(btn.dataset.operator);
      calc.updateDisplay();
    });
  });

  document.querySelectorAll('[data-action]').forEach(btn => {
    btn.addEventListener('click', () => {
      soundFX.playClick(500);
      const action = btn.dataset.action;
      switch (action) {
        case 'all-clear': calc.clear(); break;
        case 'delete': calc.delete(); break;
        case 'calculate': calc.compute(); break;
        case 'percentage': calc.percentage(); break;
        case 'negate': calc.toggleSign(); break;
      }
      calc.updateDisplay();
    });
  });

  // Physical Keyboard Listener
  window.addEventListener('keydown', (e) => {
    let matchedBtn = null;

    if ((e.key >= '0' && e.key <= '9') || e.key === '.') {
      soundFX.playClick(650);
      calc.appendNumber(e.key);
      matchedBtn = document.querySelector(`[data-number="${e.key}"]`);
    } else if (e.key === '+') {
      soundFX.playClick(800);
      calc.chooseOperation('+');
      matchedBtn = document.querySelector('[data-operator="+"]');
    } else if (e.key === '-') {
      soundFX.playClick(800);
      calc.chooseOperation('−');
      matchedBtn = document.querySelector('[data-operator="-"]');
    } else if (e.key === '*') {
      soundFX.playClick(800);
      calc.chooseOperation('×');
      matchedBtn = document.querySelector('[data-operator="×"]');
    } else if (e.key === '/') {
      e.preventDefault();
      soundFX.playClick(800);
      calc.chooseOperation('÷');
      matchedBtn = document.querySelector('[data-operator="÷"]');
    } else if (e.key === 'Enter' || e.key === '=') {
      e.preventDefault();
      soundFX.playClick(900);
      calc.compute();
      matchedBtn = document.querySelector('[data-action="calculate"]');
    } else if (e.key === 'Backspace') {
      soundFX.playClick(450);
      calc.delete();
      matchedBtn = document.querySelector('[data-action="delete"]');
    } else if (e.key === 'Escape') {
      soundFX.playClick(400);
      calc.clear();
      matchedBtn = document.querySelector('[data-action="all-clear"]');
    } else if (e.key === '%') {
      soundFX.playClick(750);
      calc.percentage();
      matchedBtn = document.querySelector('[data-action="percentage"]');
    }

    if (matchedBtn) {
      matchedBtn.classList.add('pressed');
      setTimeout(() => matchedBtn.classList.remove('pressed'), 120);
    }

    calc.updateDisplay();
  });
});