// ─── Wake Lock Module ────────────────────────────────────────────
// Handles screen wake lock for preventing sleep during meditation
// with audio playback. Supports native Wake Lock API (Android/Chrome)
// and fallback methods for iOS Safari.

import { state, set, get } from './state.js';
import { startSilentLoop, stopSilentLoop } from './silent-loop.js';

// Wake lock types
export const WAKE_LOCK_TYPES = {
  NATIVE: 'native',      // navigator.wakeLock API
  NOSLEEP: 'nosleep',    // NoSleep.js library
  VIDEO: 'video',        // Hidden video element (iOS fallback)
  AUDIO: 'audio',        // Silent audio loop
  NONE: 'none'           // No wake lock available
};

// Wake lock states
export const WAKE_LOCK_STATES = {
  INACTIVE: 'inactive',
  ACQUIRING: 'acquiring',
  ACTIVE: 'active',
  RELEASING: 'releasing',
  ERROR: 'error'
};

// Platform detection
function detectPlatform() {
  const ua = navigator.userAgent || '';
  const vendor = navigator.vendor || '';
  
  return {
    isIOS: /iPad|iPhone|iPod/.test(ua) && !window.MSStream,
    isSafari: /Safari/.test(ua) && /Apple Computer/.test(vendor) && !/Chrome/.test(ua),
    isAndroid: /Android/.test(ua),
    isChrome: /Chrome/.test(ua) && !/Edge|Edg/.test(ua),
    isFirefox: /Firefox/.test(ua),
    isStandalone: window.navigator.standalone === true || window.matchMedia('(display-mode: standalone)').matches
  };
}

// Wake Lock Manager class
class WakeLockManager {
  constructor() {
    this.platform = detectPlatform();
    this.nativeWakeLock = null;
    this.videoElement = null;
    this.noSleepInstance = null;
    this.state = WAKE_LOCK_STATES.INACTIVE;
    this.type = WAKE_LOCK_TYPES.NONE;
    this.reconnectTimer = null;
    this.visibilityHandler = null;
    this._listeners = new Set();
    
    this._init();
  }

  // Initialize and detect available methods
  _init() {
    // Check for native Wake Lock API (Android Chrome, modern browsers)
    if ('wakeLock' in navigator) {
      this.type = WAKE_LOCK_TYPES.NATIVE;
      this._setupNativeReconnect();
    }
    // Check for NoSleep.js availability
    else if (typeof window.NoSleep !== 'undefined') {
      this.type = WAKE_LOCK_TYPES.NOSLEEP;
    }
    // iOS Safari fallback with video element
    else if (this.platform.isIOS || this.platform.isSafari) {
      this.type = WAKE_LOCK_TYPES.VIDEO;
      this._initVideoFallback();
    }
    // Generic fallback with audio
    else {
      this.type = WAKE_LOCK_TYPES.AUDIO;
    }
    
    // Update state
    set('wakeLock.type', this.type);
    
    console.log(`WakeLock: Using ${this.type} method`);
  }

  // Setup native wake lock with visibility change handling
  _setupNativeReconnect() {
    this.visibilityHandler = () => {
      if (document.visibilityState === 'visible' && this.state === WAKE_LOCK_STATES.ACTIVE) {
        // Re-acquire wake lock when returning to visible state
        this._acquireNative().catch(err => {
          console.warn('WakeLock: Re-acquire failed:', err);
          this._fallbackToVideo();
        });
      }
    };
    
    document.addEventListener('visibilitychange', this.visibilityHandler);
  }

  // Initialize video fallback for iOS
  _initVideoFallback() {
    try {
      // Create hidden video element for iOS
      this.videoElement = document.createElement('video');
      this.videoElement.setAttribute('playsinline', '');
      this.videoElement.setAttribute('muted', '');
      this.videoElement.setAttribute('loop', '');
      this.videoElement.style.cssText = 'position:absolute;width:1px;height:1px;opacity:0;pointer-events:none;';
      
      // Use a minimal WebM video (1x1 pixel, 1 second)
      const webmBlob = this._generateMinimalWebM();
      this.videoElement.src = URL.createObjectURL(webmBlob);
      
      document.body.appendChild(this.videoElement);
    } catch (error) {
      console.warn('WakeLock: Video fallback init failed:', error);
      this.type = WAKE_LOCK_TYPES.AUDIO;
    }
  }

  // Generate minimal WebM video blob
  _generateMinimalWebM() {
    // Minimal WebM file (1x1 pixel, 1 second)
    const webmData = new Uint8Array([
      0x1A, 0x45, 0xDF, 0xA3, 0x9F, 0x42, 0x86, 0x81, 0x01, 0x42, 0xF7, 0x81,
      0x01, 0x42, 0xF2, 0x81, 0x04, 0x42, 0xF3, 0x81, 0x08, 0x42, 0x82, 0x84,
      0x77, 0x65, 0x62, 0x6D, 0x42, 0x87, 0x81, 0x02, 0x42, 0x85, 0x81, 0x02,
      0x18, 0x53, 0x80, 0x67, 0x01, 0x00, 0x00, 0x00, 0x00, 0x11, 0x4D, 0x9B,
      0x74, 0xBA, 0x4D, 0xBB, 0x8B, 0x53, 0xAB, 0x84, 0x15, 0x49, 0xA9, 0x66,
      0x53, 0xAC, 0x81, 0xA1, 0x4D, 0xBB, 0x8C, 0x53, 0xAB, 0x84, 0x16, 0x54,
      0xAE, 0x6B, 0x53, 0xAC, 0x81, 0xA2, 0xEC, 0x01, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x4C, 0xEC, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x4C
    ]);
    
    return new Blob([webmData], { type: 'video/webm' });
  }

  // Add state change listener
  onChange(callback) {
    this._listeners.add(callback);
    return () => this._listeners.delete(callback);
  }

  // Notify listeners
  _notify() {
    const info = {
      state: this.state,
      type: this.type,
      isActive: this.state === WAKE_LOCK_STATES.ACTIVE
    };
    
    for (const listener of this._listeners) {
      try {
        listener(info);
      } catch (error) {
        console.warn('WakeLock listener error:', error);
      }
    }
    
    // Update global state
    set('wakeLock.isActive', info.isActive);
  }

  // Set internal state
  _setState(newState) {
    if (this.state !== newState) {
      this.state = newState;
      this._notify();
    }
  }

  // Acquire wake lock
  async acquire() {
    if (this.state === WAKE_LOCK_STATES.ACTIVE || this.state === WAKE_LOCK_STATES.ACQUIRING) {
      return true;
    }
    
    this._setState(WAKE_LOCK_STATES.ACQUIRING);
    
    try {
      switch (this.type) {
        case WAKE_LOCK_TYPES.NATIVE:
          await this._acquireNative();
          break;
        case WAKE_LOCK_TYPES.NOSLEEP:
          await this._acquireNoSleep();
          break;
        case WAKE_LOCK_TYPES.VIDEO:
          await this._acquireVideo();
          break;
        case WAKE_LOCK_TYPES.AUDIO:
          await this._acquireAudio();
          break;
        default:
          throw new Error('No wake lock method available');
      }
      
      this._setState(WAKE_LOCK_STATES.ACTIVE);
      
      // Start silent loop for audio continuity
      startSilentLoop();
      
      return true;
    } catch (error) {
      console.warn('WakeLock.acquire failed:', error);
      this._setState(WAKE_LOCK_STATES.ERROR);
      
      // Try fallback
      return this._tryFallback();
    }
  }

  // Acquire native wake lock
  async _acquireNative() {
    if (!navigator.wakeLock) {
      throw new Error('Native wake lock not available');
    }
    
    // Release existing if any
    if (this.nativeWakeLock) {
      try {
        await this.nativeWakeLock.release();
      } catch (e) {}
    }
    
    this.nativeWakeLock = await navigator.wakeLock.request('screen');
    
    // Handle release event
    this.nativeWakeLock.addEventListener('release', () => {
      console.log('WakeLock: Native lock released');
      if (this.state === WAKE_LOCK_STATES.ACTIVE) {
        this._setState(WAKE_LOCK_STATES.INACTIVE);
      }
    });
    
    console.log('WakeLock: Native lock acquired');
  }

  // Acquire NoSleep.js wake lock
  async _acquireNoSleep() {
    if (!window.NoSleep) {
      throw new Error('NoSleep.js not available');
    }
    
    if (!this.noSleepInstance) {
      this.noSleepInstance = new window.NoSleep();
    }
    
    await this.noSleepInstance.enable();
    console.log('WakeLock: NoSleep lock acquired');
  }

  // Acquire video fallback wake lock
  async _acquireVideo() {
    if (!this.videoElement) {
      throw new Error('Video element not initialized');
    }
    
    try {
      this.videoElement.muted = true;
      this.videoElement.volume = 0;
      await this.videoElement.play();
      console.log('WakeLock: Video lock acquired');
    } catch (error) {
      // iOS may block autoplay, try with user interaction hint
      if (this.platform.isIOS) {
        console.warn('WakeLock: Video autoplay blocked, using audio fallback');
        throw error; // Will trigger fallback
      }
      throw error;
    }
  }

  // Acquire audio fallback wake lock
  async _acquireAudio() {
    // Silent loop is started in acquire()
    console.log('WakeLock: Audio lock acquired');
    return true;
  }

  // Try fallback method
  async _tryFallback() {
    const fallbackOrder = [
      WAKE_LOCK_TYPES.NOSLEEP,
      WAKE_LOCK_TYPES.VIDEO,
      WAKE_LOCK_TYPES.AUDIO
    ];
    
    for (const fallbackType of fallbackOrder) {
      if (fallbackType === this.type) continue;
      
      try {
        console.log(`WakeLock: Trying fallback ${fallbackType}`);
        this.type = fallbackType;
        
        if (fallbackType === WAKE_LOCK_TYPES.VIDEO && !this.videoElement) {
          this._initVideoFallback();
        }
        
        await this.acquire();
        return true;
      } catch (error) {
        console.warn(`WakeLock: Fallback ${fallbackType} failed:`, error);
      }
    }
    
    return false;
  }

  // Fallback to video method
  async _fallbackToVideo() {
    if (this.type === WAKE_LOCK_TYPES.VIDEO) return;
    
    try {
      await this.release();
      this.type = WAKE_LOCK_TYPES.VIDEO;
      if (!this.videoElement) {
        this._initVideoFallback();
      }
      await this.acquire();
    } catch (error) {
      console.warn('WakeLock: Video fallback failed:', error);
    }
  }

  // Release wake lock
  async release() {
    if (this.state === WAKE_LOCK_STATES.INACTIVE) {
      return true;
    }
    
    this._setState(WAKE_LOCK_STATES.RELEASING);
    
    try {
      // Stop silent loop
      stopSilentLoop();
      
      // Release native wake lock
      if (this.nativeWakeLock) {
        try {
          await this.nativeWakeLock.release();
        } catch (e) {}
        this.nativeWakeLock = null;
      }
      
      // Release NoSleep
      if (this.noSleepInstance) {
        try {
          this.noSleepInstance.disable();
        } catch (e) {}
      }
      
      // Stop video
      if (this.videoElement) {
        try {
          this.videoElement.pause();
          this.videoElement.currentTime = 0;
        } catch (e) {}
      }
      
      console.log('WakeLock: Released');
    } catch (error) {
      console.warn('WakeLock.release error:', error);
    } finally {
      this._setState(WAKE_LOCK_STATES.INACTIVE);
    }
    
    return true;
  }

  // Check if wake lock is active
  isActive() {
    return this.state === WAKE_LOCK_STATES.ACTIVE;
  }

  // Get current status
  getStatus() {
    return {
      state: this.state,
      type: this.type,
      isActive: this.isActive(),
      platform: this.platform
    };
  }

  // Cleanup resources
  destroy() {
    this.release();
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    if (this.visibilityHandler) {
      document.removeEventListener('visibilitychange', this.visibilityHandler);
      this.visibilityHandler = null;
    }
    
    if (this.videoElement) {
      try {
        this.videoElement.pause();
        URL.revokeObjectURL(this.videoElement.src);
        this.videoElement.remove();
      } catch (e) {}
      this.videoElement = null;
    }
    
    this._listeners.clear();
  }
}

// Create singleton instance
export const wakeLock = new WakeLockManager();

// Convenience exports
export const acquireWakeLock = () => wakeLock.acquire();
export const releaseWakeLock = () => wakeLock.release();
export const isWakeLockActive = () => wakeLock.isActive();
export const getWakeLockStatus = () => wakeLock.getStatus();
export const onWakeLockChange = (callback) => wakeLock.onChange(callback);

// iOS-specific helper for audio playback with screen off
export async function enableIOSAudioPlayback() {
  const platform = detectPlatform();
  
  if (!platform.isIOS && !platform.isSafari) {
    return true; // Not iOS, no special handling needed
  }
  
  try {
    // Ensure wake lock is acquired
    await acquireWakeLock();
    
    // For iOS, we need to keep the audio context running
    // The silent loop helps maintain audio session
    startSilentLoop();
    
    // Set up visibility change handler to resume audio context
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        // Audio context may have been suspended
        if (window.__audioContext__ && window.__audioContext__.state === 'suspended') {
          window.__audioContext__.resume().catch(() => {});
        }
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibility);
    
    return true;
  } catch (error) {
    console.warn('iOS audio playback setup failed:', error);
    return false;
  }
}

// Export platform detection for other modules
export { detectPlatform };
