// ─── Debounced Drag Handler Module ───────────────────────────────
// Provides smooth drag interactions for time adjustment.

class DragHandler {
  constructor(element, options = {}) {
    this.element = element;
    this.config = {
      pixelsPerUnit: 8,
      minDelta: 3,
      minValue: 60,
      maxValue: 28800,
      smoothing: true,
      smoothingFactor: 0.4,
      hapticFeedback: true,
      hapticDuration: 12,
      visualFeedback: true,
      ...options
    };
    
    this.isDragging = false;
    this.startY = 0;
    this.startX = 0;
    this.currentValue = 0;
    this.startValue = 0;
    this.dragUnit = 60;
    this.touchStartTime = 0;
    this.isTouch = false;
    this.verticalDrag = false;
    this.lastUpdateTime = 0;
    this.rafId = null;
    this.smoothedValue = 0;
    this.targetValue = 0;
    
    this.onStart = options.onStart || (() => {});
    this.onMove = options.onMove || (() => {});
    this.onEnd = options.onEnd || (() => {});
    this.onValueChange = options.onValueChange || (() => {});
    
    this._handleTouchStart = this._handleTouchStart.bind(this);
    this._handleTouchMove = this._handleTouchMove.bind(this);
    this._handleTouchEnd = this._handleTouchEnd.bind(this);
    this._handleMouseDown = this._handleMouseDown.bind(this);
    this._handleMouseMove = this._handleMouseMove.bind(this);
    this._handleMouseUp = this._handleMouseUp.bind(this);
    this._handleWheel = this._handleWheel.bind(this);
    
    this._init();
  }

  _init() {
    if (!this.element) return;
    
    this.element.addEventListener('touchstart', this._handleTouchStart, { passive: false });
    this.element.addEventListener('touchmove', this._handleTouchMove, { passive: false });
    this.element.addEventListener('touchend', this._handleTouchEnd, { passive: true });
    this.element.addEventListener('touchcancel', this._handleTouchEnd, { passive: true });
    this.element.addEventListener('mousedown', this._handleMouseDown);
    this.element.addEventListener('wheel', this._handleWheel, { passive: false });
    this.element.addEventListener('dragstart', (e) => e.preventDefault());
    
    this.element.style.touchAction = 'none';
    this.element.style.userSelect = 'none';
    this.element.style.webkitUserSelect = 'none';
  }

  _handleTouchStart(e) {
    if (this._shouldIgnore()) return;
    
    const touch = e.touches[0];
    this.isTouch = true;
    this.verticalDrag = false;
    
    const rect = this.element.getBoundingClientRect();
    this._startDrag(touch.clientX, touch.clientY, rect);
    this.touchStartTime = Date.now();
    
    if (e.target.closest('#display-wrap') || e.target.closest('#display')) {
      e.preventDefault();
    }
  }

  _handleTouchMove(e) {
    if (!this.isDragging) return;
    
    const touch = e.touches[0];
    const deltaX = touch.clientX - this.startX;
    const deltaY = this.startY - touch.clientY;
    
    if (!this.verticalDrag && (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5)) {
      this.verticalDrag = Math.abs(deltaY) >= Math.abs(deltaX);
    }
    
    if (this.verticalDrag) {
      e.preventDefault();
      this._updateDrag(touch.clientX, touch.clientY);
    }
  }

  _handleTouchEnd(e) {
    if (!this.isDragging) return;
    this.isTouch = false;
    this.verticalDrag = false;
    this._endDrag();
  }

  _handleMouseDown(e) {
    if (this._shouldIgnore()) return;
    if (this.isTouch) return;
    
    const rect = this.element.getBoundingClientRect();
    this._startDrag(e.clientX, e.clientY, rect);
    
    document.addEventListener('mousemove', this._handleMouseMove);
    document.addEventListener('mouseup', this._handleMouseUp);
    e.preventDefault();
  }

  _handleMouseMove(e) {
    if (!this.isDragging) return;
    this._updateDrag(e.clientX, e.clientY);
  }

  _handleMouseUp(e) {
    if (!this.isDragging) return;
    this._endDrag();
    document.removeEventListener('mousemove', this._handleMouseMove);
    document.removeEventListener('mouseup', this._handleMouseUp);
  }

  _handleWheel(e) {
    if (this._shouldIgnore()) return;
    e.preventDefault();
    
    const currentValue = this.config.getValue ? this.config.getValue() : 0;
    this.startValue = currentValue;
    this.smoothedValue = currentValue;
    this.targetValue = currentValue;
    this.currentValue = currentValue;
    
    const delta = e.deltaY > 0 ? -60 : 60;
    this.targetValue = Math.max(
      this.config.minValue,
      Math.min(this.config.maxValue, currentValue + delta)
    );
    
    this._applyValue(Math.round(this.targetValue));
    
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
    }
    
    this.rafId = requestAnimationFrame(() => {
      if (this.onEnd) {
        this.onEnd({ value: this.currentValue });
      }
      this.rafId = null;
    });
  }

  _shouldIgnore() {
    if (this.config.shouldIgnore) {
      return this.config.shouldIgnore();
    }
    return false;
  }

  _startDrag(clientX, clientY, rect) {
    this.isDragging = true;
    this.startY = clientY;
    this.startX = clientX;
    this.currentY = clientY;
    this.currentX = clientX;
    
    const relativeX = clientX - rect.left;
    this.dragUnit = relativeX < rect.width / 2 ? 60 : 1;
    
    this.startValue = this.config.getValue ? this.config.getValue() : 0;
    this.currentValue = this.startValue;
    this.smoothedValue = this.startValue;
    this.targetValue = this.startValue;
    
    this.lastUpdateTime = performance.now();
    
    this.onStart({
      x: clientX,
      y: clientY,
      value: this.startValue,
      unit: this.dragUnit
    });
  }

  _updateDrag(clientX, clientY) {
    this.currentY = clientY;
    this.currentX = clientX;
    
    const deltaY = this.startY - clientY;
    const absDelta = Math.abs(deltaY);
    
    if (absDelta < this.config.minDelta) return;
    
    const sensitivity = this.isTouch ? this.config.pixelsPerUnit : this.config.pixelsPerUnit * 1.5;
    const rawDelta = Math.round(deltaY / sensitivity);
    const newValue = this.startValue + rawDelta * this.dragUnit;
    
    this.targetValue = Math.max(
      this.config.minValue,
      Math.min(this.config.maxValue, newValue)
    );
    
    this._scheduleUpdate();
    
    this.onMove({
      x: clientX,
      y: clientY,
      deltaY,
      targetValue: this.targetValue,
      unit: this.dragUnit
    });
  }

  _endDrag() {
    this.isDragging = false;
    
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    
    if (this.smoothedValue !== this.currentValue) {
      this._applyValue(Math.round(this.smoothedValue));
    }
    
    this.onEnd({
      finalValue: Math.round(this.smoothedValue),
      startValue: this.startValue,
      unit: this.dragUnit
    });
  }

  _scheduleUpdate() {
    const now = performance.now();
    const elapsed = now - this.lastUpdateTime;
    
    if (elapsed < this.config.throttleMs || 16) {
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

  _updateValue() {
    this.lastUpdateTime = performance.now();
    
    if (this.config.smoothing) {
      const diff = this.targetValue - this.smoothedValue;
      this.smoothedValue += diff * this.config.smoothingFactor;
      
      if (Math.abs(diff) < 0.5) {
        this.smoothedValue = this.targetValue;
      }
    } else {
      this.smoothedValue = this.targetValue;
    }
    
    const roundedValue = Math.round(this.smoothedValue);
    if (roundedValue !== this.currentValue) {
      this._applyValue(roundedValue);
    }
  }

  _applyValue(value) {
    const oldValue = this.currentValue;
    this.currentValue = value;
    
    if (this.config.hapticFeedback && value !== oldValue) {
      this._triggerHaptic();
    }
    
    this.onValueChange({
      value,
      oldValue,
      delta: value - oldValue,
      unit: this.dragUnit
    });
  }

  _triggerHaptic() {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate(this.config.hapticDuration);
      } catch (e) {}
    }
  }

  setValue(value) {
    this.currentValue = value;
    this.smoothedValue = value;
    this.targetValue = value;
  }

  getValue() {
    return Math.round(this.smoothedValue);
  }

  destroy() {
    this.isDragging = false;
    
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
    }
    
    if (this.element) {
      this.element.removeEventListener('touchstart', this._handleTouchStart);
      this.element.removeEventListener('touchmove', this._handleTouchMove);
      this.element.removeEventListener('touchend', this._handleTouchEnd);
      this.element.removeEventListener('touchcancel', this._handleTouchEnd);
      this.element.removeEventListener('mousedown', this._handleMouseDown);
      this.element.removeEventListener('wheel', this._handleWheel);
    }
    
    document.removeEventListener('mousemove', this._handleMouseMove);
    document.removeEventListener('mouseup', this._handleMouseUp);
  }
}

export function createDragHandler(element, options) {
  return new DragHandler(element, options);
}

export { DragHandler };
