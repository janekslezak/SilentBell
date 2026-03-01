// ─── Debounced Drag Interactions Module ──────────────────────────
// Provides optimized touch/mouse drag handling with debouncing,
// throttling, and smooth value interpolation for the timer display.

// Default configuration
const DEFAULT_CONFIG = {
  // Debounce settings
  debounceMs: 16,           // ~60fps
  throttleMs: 16,           // ~60fps
  
  // Drag sensitivity
  pixelsPerUnit: 12,        // Pixels to drag for one unit change
  minDelta: 2,              // Minimum pixel delta to register
  
  // Value constraints
  minValue: 60,             // Minimum seconds (1 minute)
  maxValue: 28800,          // Maximum seconds (8 hours)
  
  // Smoothing
  smoothing: true,          // Enable value smoothing
  smoothingFactor: 0.3,     // Lower = smoother but more lag
  
  // Haptic feedback
  hapticFeedback: true,     // Enable vibration on value change
  hapticDuration: 10,       // Vibration duration in ms
  
  // Visual feedback
  visualFeedback: true      // Show drag indicator
};

// Drag handler class
class DragHandler {
  constructor(element, options = {}) {
    this.element = element;
    this.config = { ...DEFAULT_CONFIG, ...options };
    
    // State
    this.isDragging = false;
    this.startY = 0;
    this.startX = 0;
    this.currentY = 0;
    this.currentValue = 0;
    this.startValue = 0;
    this.dragUnit = 60;      // 60 for minutes (left), 1 for seconds (right)
    
    // Debounce state
    this.lastUpdateTime = 0;
    this.pendingUpdate = null;
    this.rafId = null;
    
    // Smoothing state
    this.smoothedValue = 0;
    this.targetValue = 0;
    
    // Callbacks
    this.onStart = options.onStart || (() => {});
    this.onMove = options.onMove || (() => {});
    this.onEnd = options.onEnd || (() => {});
    this.onValueChange = options.onValueChange || (() => {});
    
    // Bind methods
    this._handleTouchStart = this._handleTouchStart.bind(this);
    this._handleTouchMove = this._handleTouchMove.bind(this);
    this._handleTouchEnd = this._handleTouchEnd.bind(this);
    this._handleMouseDown = this._handleMouseDown.bind(this);
    this._handleMouseMove = this._handleMouseMove.bind(this);
    this._handleMouseUp = this._handleMouseUp.bind(this);
    this._updateValue = this._updateValue.bind(this);
    
    // Initialize
    this._init();
  }

  // Initialize event listeners
  _init() {
    if (!this.element) return;
    
    // Touch events
    this.element.addEventListener('touchstart', this._handleTouchStart, { passive: true });
    this.element.addEventListener('touchmove', this._handleTouchMove, { passive: true });
    this.element.addEventListener('touchend', this._handleTouchEnd, { passive: true });
    this.element.addEventListener('touchcancel', this._handleTouchEnd, { passive: true });
    
    // Mouse events
    this.element.addEventListener('mousedown', this._handleMouseDown);
    
    // Prevent default drag behavior
    this.element.addEventListener('dragstart', (e) => e.preventDefault());
    
    // Create visual indicator if enabled
    if (this.config.visualFeedback) {
      this._createVisualIndicator();
    }
  }

  // Create visual drag indicator
  _createVisualIndicator() {
    this.indicator = document.createElement('div');
    this.indicator.className = 'drag-indicator';
    this.indicator.style.cssText = `
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 100%;
      height: 100%;
      pointer-events: none;
      opacity: 0;
      transition: opacity 0.2s;
      z-index: 10;
    `;
    
    const inner = document.createElement('div');
    inner.className = 'drag-indicator-inner';
    inner.style.cssText = `
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 80px;
      height: 80px;
      border-radius: 50%;
      background: var(--accent, #88c0d0);
      opacity: 0.1;
      transition: transform 0.1s;
    `;
    
    this.indicator.appendChild(inner);
    this.element.style.position = 'relative';
    this.element.appendChild(this.indicator);
    this.indicatorInner = inner;
  }

  // Show visual indicator
  _showIndicator() {
    if (this.indicator) {
      this.indicator.style.opacity = '1';
    }
  }

  // Hide visual indicator
  _hideIndicator() {
    if (this.indicator) {
      this.indicator.style.opacity = '0';
    }
  }

  // Update indicator based on drag
  _updateIndicator(deltaY) {
    if (!this.indicatorInner) return;
    
    const scale = 1 + Math.min(Math.abs(deltaY) / 100, 0.3);
    const direction = deltaY > 0 ? -1 : 1;
    this.indicatorInner.style.transform = `translate(-50%, -50%) scale(${scale}) translateY(${direction * 5}px)`;
  }

  // Handle touch start
  _handleTouchStart(e) {
    if (this._shouldIgnore()) return;
    
    const touch = e.touches[0];
    const rect = this.element.getBoundingClientRect();
    
    this._startDrag(touch.clientX, touch.clientY, rect);
  }

  // Handle touch move
  _handleTouchMove(e) {
    if (!this.isDragging) return;
    
    const touch = e.touches[0];
    this._updateDrag(touch.clientX, touch.clientY);
  }

  // Handle touch end
  _handleTouchEnd(e) {
    if (!this.isDragging) return;
    
    this._endDrag();
  }

  // Handle mouse down
  _handleMouseDown(e) {
    if (this._shouldIgnore()) return;
    
    const rect = this.element.getBoundingClientRect();
    this._startDrag(e.clientX, e.clientY, rect);
    
    // Add global mouse listeners
    document.addEventListener('mousemove', this._handleMouseMove);
    document.addEventListener('mouseup', this._handleMouseUp);
    
    // Prevent text selection
    e.preventDefault();
  }

  // Handle mouse move
  _handleMouseMove(e) {
    if (!this.isDragging) return;
    
    this._updateDrag(e.clientX, e.clientY);
  }

  // Handle mouse up
  _handleMouseUp(e) {
    if (!this.isDragging) return;
    
    this._endDrag();
    
    // Remove global mouse listeners
    document.removeEventListener('mousemove', this._handleMouseMove);
    document.removeEventListener('mouseup', this._handleMouseUp);
  }

  // Check if drag should be ignored
  _shouldIgnore() {
    // Override in options
    if (this.config.shouldIgnore) {
      return this.config.shouldIgnore();
    }
    return false;
  }

  // Start drag operation
  _startDrag(clientX, clientY, rect) {
    this.isDragging = true;
    this.startY = clientY;
    this.startX = clientX;
    this.currentY = clientY;
    
    // Determine drag unit based on horizontal position
    const relativeX = clientX - rect.left;
    this.dragUnit = relativeX < rect.width / 2 ? 60 : 1;
    
    // Get initial value from config
    this.startValue = this.config.getValue ? this.config.getValue() : 0;
    this.currentValue = this.startValue;
    this.smoothedValue = this.startValue;
    this.targetValue = this.startValue;
    
    this.lastUpdateTime = performance.now();
    
    this._showIndicator();
    
    this.onStart({
      x: clientX,
      y: clientY,
      value: this.startValue,
      unit: this.dragUnit
    });
  }

  // Update drag operation
  _updateDrag(clientX, clientY) {
    this.currentY = clientY;
    
    const deltaY = this.startY - clientY;
    const absDelta = Math.abs(deltaY);
    
    // Apply minimum delta threshold
    if (absDelta < this.config.minDelta) return;
    
    // Calculate raw value change
    const rawDelta = Math.round(deltaY / this.config.pixelsPerUnit);
    const newValue = this.startValue + rawDelta * this.dragUnit;
    
    // Clamp to constraints
    this.targetValue = Math.max(
      this.config.minValue,
      Math.min(this.config.maxValue, newValue)
    );
    
    // Update visual indicator
    this._updateIndicator(deltaY);
    
    // Schedule value update with debouncing
    this._scheduleUpdate();
    
    this.onMove({
      x: clientX,
      y: clientY,
      deltaY,
      targetValue: this.targetValue,
      unit: this.dragUnit
    });
  }

  // End drag operation
  _endDrag() {
    this.isDragging = false;
    
    // Cancel any pending updates
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    
    // Apply final value
    if (this.smoothedValue !== this.currentValue) {
      this._applyValue(Math.round(this.smoothedValue));
    }
    
    this._hideIndicator();
    
    this.onEnd({
      finalValue: Math.round(this.smoothedValue),
      startValue: this.startValue,
      unit: this.dragUnit
    });
  }

  // Schedule value update with debouncing
  _scheduleUpdate() {
    const now = performance.now();
    const elapsed = now - this.lastUpdateTime;
    
    // Throttle updates
    if (elapsed < this.config.throttleMs) {
      if (!this.rafId) {
        this.rafId = requestAnimationFrame(() => {
          this.rafId = null;
          this._updateValue();
        });
      }
      return;
    }
    
    this._updateValue();
  }

  // Update value with smoothing
  _updateValue() {
    this.lastUpdateTime = performance.now();
    
    if (this.config.smoothing) {
      // Apply exponential smoothing
      const diff = this.targetValue - this.smoothedValue;
      this.smoothedValue += diff * this.config.smoothingFactor;
      
      // Snap to integer when close
      if (Math.abs(diff) < 0.5) {
        this.smoothedValue = this.targetValue;
      }
    } else {
      this.smoothedValue = this.targetValue;
    }
    
    // Only notify if value changed significantly
    const roundedValue = Math.round(this.smoothedValue);
    if (roundedValue !== this.currentValue) {
      this._applyValue(roundedValue);
    }
  }

  // Apply value change
  _applyValue(value) {
    const oldValue = this.currentValue;
    this.currentValue = value;
    
    // Trigger haptic feedback
    if (this.config.hapticFeedback && value !== oldValue) {
      this._triggerHaptic();
    }
    
    // Notify callback
    this.onValueChange({
      value,
      oldValue,
      delta: value - oldValue,
      unit: this.dragUnit
    });
  }

  // Trigger haptic feedback
  _triggerHaptic() {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate(this.config.hapticDuration);
      } catch (e) {
        // Ignore haptic errors
      }
    }
  }

  // Set current value externally
  setValue(value) {
    this.currentValue = value;
    this.smoothedValue = value;
    this.targetValue = value;
  }

  // Get current value
  getValue() {
    return Math.round(this.smoothedValue);
  }

  // Update configuration
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
  }

  // Destroy and cleanup
  destroy() {
    this.isDragging = false;
    
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
    }
    
    // Remove event listeners
    if (this.element) {
      this.element.removeEventListener('touchstart', this._handleTouchStart);
      this.element.removeEventListener('touchmove', this._handleTouchMove);
      this.element.removeEventListener('touchend', this._handleTouchEnd);
      this.element.removeEventListener('touchcancel', this._handleTouchEnd);
      this.element.removeEventListener('mousedown', this._handleMouseDown);
    }
    
    document.removeEventListener('mousemove', this._handleMouseMove);
    document.removeEventListener('mouseup', this._handleMouseUp);
    
    // Remove indicator
    if (this.indicator && this.indicator.parentNode) {
      this.indicator.parentNode.removeChild(this.indicator);
    }
  }
}

// Debounce utility function
export function debounce(func, wait, immediate = false) {
  let timeout;
  
  return function executedFunction(...args) {
    const later = () => {
      timeout = null;
      if (!immediate) func(...args);
    };
    
    const callNow = immediate && !timeout;
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    
    if (callNow) func(...args);
  };
}

// Throttle utility function
export function throttle(func, limit) {
  let inThrottle;
  
  return function executedFunction(...args) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

// RequestAnimationFrame throttle
export function rafThrottle(func) {
  let ticking = false;
  
  return function executedFunction(...args) {
    if (!ticking) {
      requestAnimationFrame(() => {
        func(...args);
        ticking = false;
      });
      ticking = true;
    }
  };
}

// Create drag handler factory
export function createDragHandler(element, options) {
  return new DragHandler(element, options);
}

// Export class and utilities
export { DragHandler };
export default DragHandler;
