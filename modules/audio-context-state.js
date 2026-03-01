// ─── Audio Context State Machine Module ──────────────────────────
// Manages Web Audio API context state with a finite state machine,
// providing visual feedback and automatic recovery mechanisms.

import { state, set, get, subscribe } from './state.js';
import { startSilentLoop, stopSilentLoop } from './silent-loop.js';

// Audio context states
export const AUDIO_STATES = {
  // Web Audio API native states
  SUSPENDED: 'suspended',
  RUNNING: 'running',
  INTERRUPTED: 'interrupted', // iOS-specific
  CLOSED: 'closed',
  
  // Application states
  INITIALIZING: 'initializing',
  UNLOCKING: 'unlocking',
  ERROR: 'error',
  RECOVERING: 'recovering'
};

// State transition rules
const VALID_TRANSITIONS = {
  [AUDIO_STATES.SUSPENDED]: [AUDIO_STATES.RUNNING, AUDIO_STATES.UNLOCKING, AUDIO_STATES.ERROR, AUDIO_STATES.CLOSED],
  [AUDIO_STATES.RUNNING]: [AUDIO_STATES.SUSPENDED, AUDIO_STATES.INTERRUPTED, AUDIO_STATES.ERROR, AUDIO_STATES.CLOSED],
  [AUDIO_STATES.INTERRUPTED]: [AUDIO_STATES.RUNNING, AUDIO_STATES.SUSPENDED, AUDIO_STATES.RECOVERING, AUDIO_STATES.ERROR],
  [AUDIO_STATES.CLOSED]: [AUDIO_STATES.INITIALIZING],
  [AUDIO_STATES.INITIALIZING]: [AUDIO_STATES.SUSPENDED, AUDIO_STATES.RUNNING, AUDIO_STATES.ERROR],
  [AUDIO_STATES.UNLOCKING]: [AUDIO_STATES.RUNNING, AUDIO_STATES.SUSPENDED, AUDIO_STATES.ERROR],
  [AUDIO_STATES.ERROR]: [AUDIO_STATES.RECOVERING, AUDIO_STATES.INITIALIZING, AUDIO_STATES.CLOSED],
  [AUDIO_STATES.RECOVERING]: [AUDIO_STATES.RUNNING, AUDIO_STATES.SUSPENDED, AUDIO_STATES.ERROR]
};

// Audio context manager with state machine
class AudioContextStateMachine {
  constructor() {
    this._context = null;
    this._state = AUDIO_STATES.SUSPENDED;
    this._previousState = null;
    this._listeners = new Set();
    this._visualFallback = null;
    this._recoveryAttempts = 0;
    this._maxRecoveryAttempts = 3;
    this._recoveryTimer = null;
    this._stateHistory = [];
    this._maxHistorySize = 50;
    
    this._init();
  }

  // Initialize
  _init() {
    this._setupVisibilityHandler();
    this._setupPageLifecycleHandler();
    
    // Subscribe to global state
    subscribe('audio.contextState', (newState) => {
      if (newState !== this._state) {
        this._transitionTo(newState);
      }
    });
  }

  // Get current state
  getState() {
    return this._state;
  }

  // Get previous state
  getPreviousState() {
    return this._previousState;
  }

  // Check if state transition is valid
  _isValidTransition(fromState, toState) {
    const valid = VALID_TRANSITIONS[fromState];
    return valid && valid.includes(toState);
  }

  // Transition to new state
  _transitionTo(newState, reason = '') {
    const oldState = this._state;
    
    // Validate transition
    if (!this._isValidTransition(oldState, newState)) {
      console.warn(`AudioContext: Invalid transition ${oldState} -> ${newState}`);
      // Allow recovery transitions even if not in valid list
      if (newState !== AUDIO_STATES.RECOVERING && newState !== AUDIO_STATES.ERROR) {
        return false;
      }
    }
    
    // Update states
    this._previousState = oldState;
    this._state = newState;
    
    // Log to history
    this._logStateChange(oldState, newState, reason);
    
    // Update global state
    set('audio.contextState', newState);
    
    // Notify listeners
    this._notifyListeners(oldState, newState, reason);
    
    // Handle state-specific actions
    this._handleStateEntry(newState, oldState);
    
    return true;
  }

  // Log state change to history
  _logStateChange(from, to, reason) {
    this._stateHistory.push({
      timestamp: Date.now(),
      from,
      to,
      reason
    });
    
    if (this._stateHistory.length > this._maxHistorySize) {
      this._stateHistory.shift();
    }
  }

  // Handle entry into a state
  _handleStateEntry(newState, oldState) {
    switch (newState) {
      case AUDIO_STATES.RUNNING:
        this._recoveryAttempts = 0;
        this._hideVisualFallback();
        startSilentLoop();
        break;
        
      case AUDIO_STATES.SUSPENDED:
        if (oldState === AUDIO_STATES.RUNNING) {
          // Context was running but got suspended
          this._showVisualFallback('Audio suspended. Tap to resume.');
        }
        break;
        
      case AUDIO_STATES.INTERRUPTED:
        this._showVisualFallback('Audio interrupted. Tap to resume.');
        this._scheduleRecovery();
        break;
        
      case AUDIO_STATES.ERROR:
        this._showVisualFallback('Audio error. Tap to retry.');
        break;
        
      case AUDIO_STATES.RECOVERING:
        this._attemptRecovery();
        break;
        
      case AUDIO_STATES.CLOSED:
        this._cleanup();
        break;
    }
  }

  // Setup visibility change handler
  _setupVisibilityHandler() {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        // Page became visible - check context state
        if (this._context) {
          this._syncWithNativeState();
        }
      } else {
        // Page hidden - context may be suspended
        if (this._state === AUDIO_STATES.RUNNING) {
          this._transitionTo(AUDIO_STATES.SUSPENDED, 'page_hidden');
        }
      }
    });
  }

  // Setup page lifecycle handler (for frozen states)
  _setupPageLifecycleHandler() {
    if ('onfreeze' in document) {
      document.addEventListener('freeze', () => {
        if (this._state === AUDIO_STATES.RUNNING) {
          this._transitionTo(AUDIO_STATES.SUSPENDED, 'page_frozen');
        }
      });
      
      document.addEventListener('resume', () => {
        this._syncWithNativeState();
      });
    }
  }

  // Sync state machine with native AudioContext state
  _syncWithNativeState() {
    if (!this._context) return;
    
    const nativeState = this._context.state;
    const currentState = this._state;
    
    // Map native states to our states
    const stateMap = {
      'suspended': AUDIO_STATES.SUSPENDED,
      'running': AUDIO_STATES.RUNNING,
      'closed': AUDIO_STATES.CLOSED,
      'interrupted': AUDIO_STATES.INTERRUPTED
    };
    
    const mappedState = stateMap[nativeState] || AUDIO_STATES.ERROR;
    
    if (mappedState !== currentState) {
      this._transitionTo(mappedState, 'native_sync');
    }
  }

  // Get or create AudioContext
  getContext() {
    if (!this._context || this._context.state === 'closed') {
      this._createContext();
    }
    return this._context;
  }

  // Create new AudioContext
  _createContext() {
    this._transitionTo(AUDIO_STATES.INITIALIZING, 'creating_context');
    
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) {
        throw new Error('Web Audio API not supported');
      }
      
      this._context = new AudioContext();
      
      // Setup state change listener
      this._context.addEventListener('statechange', () => {
        this._syncWithNativeState();
      });
      
      // Store globally for debugging
      window.__audioContext__ = this._context;
      
      // Set initial state based on native state
      const nativeState = this._context.state;
      if (nativeState === 'running') {
        this._transitionTo(AUDIO_STATES.RUNNING, 'context_created');
      } else {
        this._transitionTo(AUDIO_STATES.SUSPENDED, 'context_created');
      }
      
      return this._context;
    } catch (error) {
      this._transitionTo(AUDIO_STATES.ERROR, `create_failed: ${error.message}`);
      throw error;
    }
  }

  // Ensure context is running
  async ensureRunning() {
    const ctx = this.getContext();
    
    if (ctx.state === 'running' && this._state === AUDIO_STATES.RUNNING) {
      return ctx;
    }
    
    if (ctx.state === 'suspended' || ctx.state === 'interrupted') {
      return this._resumeContext();
    }
    
    if (ctx.state === 'closed') {
      this._createContext();
      return this._resumeContext();
    }
    
    return ctx;
  }

  // Resume suspended context
  async _resumeContext() {
    if (!this._context) {
      throw new Error('No AudioContext available');
    }
    
    this._transitionTo(AUDIO_STATES.UNLOCKING, 'resuming');
    
    try {
      await this._context.resume();
      
      if (this._context.state === 'running') {
        this._transitionTo(AUDIO_STATES.RUNNING, 'resume_success');
        startSilentLoop();
        return this._context;
      } else {
        throw new Error(`Context state after resume: ${this._context.state}`);
      }
    } catch (error) {
      this._transitionTo(AUDIO_STATES.ERROR, `resume_failed: ${error.message}`);
      throw error;
    }
  }

  // Unlock audio (user interaction handler)
  async unlock() {
    try {
      this._transitionTo(AUDIO_STATES.UNLOCKING, 'user_interaction');
      
      const ctx = this.getContext();
      
      // Create and play a silent buffer
      const buffer = ctx.createBuffer(1, 512, ctx.sampleRate);
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      source.start(0);
      
      // Resume context
      await this._resumeContext();
      
      // Start silent loop for iOS
      startSilentLoop();
      
      return true;
    } catch (error) {
      console.warn('AudioContext unlock failed:', error);
      this._transitionTo(AUDIO_STATES.ERROR, `unlock_failed: ${error.message}`);
      return false;
    }
  }

  // Schedule automatic recovery
  _scheduleRecovery() {
    if (this._recoveryTimer) {
      clearTimeout(this._recoveryTimer);
    }
    
    this._recoveryTimer = setTimeout(() => {
      if (this._state === AUDIO_STATES.INTERRUPTED || this._state === AUDIO_STATES.SUSPENDED) {
        this._transitionTo(AUDIO_STATES.RECOVERING, 'scheduled_recovery');
      }
    }, 1000);
  }

  // Attempt recovery
  async _attemptRecovery() {
    if (this._recoveryAttempts >= this._maxRecoveryAttempts) {
      this._transitionTo(AUDIO_STATES.ERROR, 'max_recovery_attempts');
      return false;
    }
    
    this._recoveryAttempts++;
    
    try {
      // Try to resume existing context
      if (this._context && this._context.state !== 'closed') {
        await this._context.resume();
        
        if (this._context.state === 'running') {
          this._transitionTo(AUDIO_STATES.RUNNING, 'recovery_success');
          return true;
        }
      }
      
      // If that failed, create new context
      this._createContext();
      await this._resumeContext();
      
      return true;
    } catch (error) {
      console.warn(`Recovery attempt ${this._recoveryAttempts} failed:`, error);
      
      if (this._recoveryAttempts < this._maxRecoveryAttempts) {
        // Schedule another attempt
        setTimeout(() => {
          this._transitionTo(AUDIO_STATES.RECOVERING, 'retry');
        }, 500 * this._recoveryAttempts);
      } else {
        this._transitionTo(AUDIO_STATES.ERROR, 'recovery_failed');
      }
      
      return false;
    }
  }

  // Show visual fallback indicator
  _showVisualFallback(message) {
    if (!this._visualFallback) {
      this._createVisualFallback();
    }
    
    const fallback = this._visualFallback;
    fallback.querySelector('.audio-fallback-message').textContent = message;
    fallback.classList.add('visible');
  }

  // Hide visual fallback
  _hideVisualFallback() {
    if (this._visualFallback) {
      this._visualFallback.classList.remove('visible');
    }
  }

  // Create visual fallback element
  _createVisualFallback() {
    const el = document.createElement('div');
    el.className = 'audio-fallback-indicator';
    el.innerHTML = `
      <div class="audio-fallback-content">
        <span class="audio-fallback-icon">🔊</span>
        <span class="audio-fallback-message">Audio suspended</span>
        <button class="audio-fallback-button">Tap to Resume</button>
      </div>
    `;
    
    // Add styles
    const styles = document.createElement('style');
    styles.textContent = `
      .audio-fallback-indicator {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.7);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
        opacity: 0;
        visibility: hidden;
        transition: opacity 0.3s, visibility 0.3s;
      }
      .audio-fallback-indicator.visible {
        opacity: 1;
        visibility: visible;
      }
      .audio-fallback-content {
        background: var(--surface, #1a2232);
        padding: 24px 32px;
        border-radius: 12px;
        text-align: center;
        box-shadow: 0 4px 24px rgba(0, 0, 0, 0.4);
      }
      .audio-fallback-icon {
        font-size: 32px;
        display: block;
        margin-bottom: 12px;
      }
      .audio-fallback-message {
        display: block;
        color: var(--text, #eceff4);
        font-size: 16px;
        margin-bottom: 16px;
      }
      .audio-fallback-button {
        background: var(--accent, #88c0d0);
        color: var(--bg, #111820);
        border: none;
        padding: 12px 24px;
        border-radius: 8px;
        font-size: 16px;
        font-weight: 600;
        cursor: pointer;
        transition: transform 0.15s, opacity 0.15s;
      }
      .audio-fallback-button:active {
        transform: scale(0.95);
      }
    `;
    
    document.head.appendChild(styles);
    document.body.appendChild(el);
    
    // Handle button click
    el.querySelector('.audio-fallback-button').addEventListener('click', async () => {
      const success = await this.unlock();
      if (success) {
        this._hideVisualFallback();
      }
    });
    
    // Also unlock on any tap
    el.addEventListener('click', async (e) => {
      if (e.target === el) {
        const success = await this.unlock();
        if (success) {
          this._hideVisualFallback();
        }
      }
    });
    
    this._visualFallback = el;
  }

  // Add state change listener
  onChange(callback) {
    this._listeners.add(callback);
    return () => this._listeners.delete(callback);
  }

  // Notify listeners
  _notifyListeners(oldState, newState, reason) {
    const info = {
      oldState,
      newState,
      reason,
      context: this._context,
      timestamp: Date.now()
    };
    
    for (const listener of this._listeners) {
      try {
        listener(info);
      } catch (error) {
        console.warn('AudioContext listener error:', error);
      }
    }
  }

  // Get state history
  getHistory() {
    return [...this._stateHistory];
  }

  // Cleanup
  _cleanup() {
    stopSilentLoop();
    
    if (this._recoveryTimer) {
      clearTimeout(this._recoveryTimer);
      this._recoveryTimer = null;
    }
    
    if (this._visualFallback) {
      this._visualFallback.remove();
      this._visualFallback = null;
    }
    
    this._listeners.clear();
  }

  // Close context
  async close() {
    this._cleanup();
    
    if (this._context && this._context.state !== 'closed') {
      try {
        await this._context.close();
      } catch (e) {}
    }
    
    this._context = null;
    this._transitionTo(AUDIO_STATES.CLOSED, 'manual_close');
  }
}

// Create singleton instance
export const audioContextState = new AudioContextStateMachine();

// Convenience exports
export const getAudioContext = () => audioContextState.getContext();
export const ensureAudioContext = () => audioContextState.ensureRunning();
export const unlockAudio = () => audioContextState.unlock();
export const getAudioState = () => audioContextState.getState();
export const onAudioStateChange = (callback) => audioContextState.onChange(callback);
export const getAudioStateHistory = () => audioContextState.getHistory();
export const closeAudioContext = () => audioContextState.close();

// Legacy compatibility
export { AUDIO_STATES as AudioStates };
