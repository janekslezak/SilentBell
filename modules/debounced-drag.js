// ─── Debounced Drag Handler Module ───────────────────────────────
// Provides smooth drag interactions with debouncing and haptic feedback.

export function createDragHandler(element, options = {}) {
  const {
    pixelsPerUnit = 12,
    minDelta = 2,
    minValue = 60,
    maxValue = 28800,
    smoothing = true,
    smoothingFactor = 0.3,
    hapticFeedback = true,
    visualFeedback = true,
    getValue,
    shouldIgnore,
    onValueChange,
    onEnd
  } = options;
  
  let isDragging = false;
  let startX = 0;
  let startValue = 0;
  let currentValue = 0;
  let lastHapticX = 0;
  let rafId = null;
  let pendingDelta = 0;
  
  function getHapticInterval() {
    const range = maxValue - minValue;
    if (range > 3600) return 60;
    if (range > 1800) return 30;
    return 15;
  }
  
  function triggerHaptic(x) {
    if (!hapticFeedback) return;
    
    const interval = getHapticInterval();
    if (Math.abs(x - lastHapticX) >= interval) {
      if (navigator.vibrate) {
        navigator.vibrate(8);
      }
      lastHapticX = x;
    }
  }
  
  function applyVisualFeedback() {
    if (!visualFeedback) return;
    
    element.style.transform = 'scale(1.02)';
    element.style.transition = 'transform 0.1s ease';
    
    setTimeout(() => {
      element.style.transform = 'scale(1)';
    }, 100);
  }
  
  function updateValue(delta) {
    if (smoothing) {
      pendingDelta += delta * smoothingFactor;
      
      if (!rafId) {
        rafId = requestAnimationFrame(() => {
          const newValue = Math.max(minValue, Math.min(maxValue, 
            Math.round(currentValue - pendingDelta / pixelsPerUnit)));
          
          if (newValue !== currentValue) {
            currentValue = newValue;
            if (onValueChange) {
              onValueChange({
                value: currentValue,
                delta: pendingDelta,
                isDragging: true
              });
            }
          }
          
          pendingDelta = 0;
          rafId = null;
        });
      }
    } else {
      const newValue = Math.max(minValue, Math.min(maxValue, 
        Math.round(currentValue - delta / pixelsPerUnit)));
      
      if (newValue !== currentValue) {
        currentValue = newValue;
        if (onValueChange) {
          onValueChange({
            value: currentValue,
            delta: delta,
            isDragging: true
          });
        }
      }
    }
  }
  
  function onPointerDown(e) {
    if (shouldIgnore && shouldIgnore()) return;
    
    isDragging = true;
    startX = e.clientX;
    startValue = getValue ? getValue() : 0;
    currentValue = startValue;
    lastHapticX = startX;
    
    element.setPointerCapture(e.pointerId);
    element.style.cursor = 'grabbing';
    element.style.userSelect = 'none';
    
    applyVisualFeedback();
    
    e.preventDefault();
  }
  
  function onPointerMove(e) {
    if (!isDragging) return;
    
    const delta = e.clientX - startX;
    
    if (Math.abs(delta) >= minDelta) {
      updateValue(delta);
      triggerHaptic(e.clientX);
    }
    
    e.preventDefault();
  }
  
  function onPointerUp(e) {
    if (!isDragging) return;
    
    isDragging = false;
    element.releasePointerCapture(e.pointerId);
    element.style.cursor = '';
    element.style.userSelect = '';
    
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    
    pendingDelta = 0;
    
    if (onEnd) {
      onEnd({ value: currentValue });
    }
  }
  
  element.addEventListener('pointerdown', onPointerDown);
  element.addEventListener('pointermove', onPointerMove);
  element.addEventListener('pointerup', onPointerUp);
  element.addEventListener('pointercancel', onPointerUp);
  
  // Touch support for older devices
  element.addEventListener('touchstart', (e) => {
    if (shouldIgnore && shouldIgnore()) return;
    
    const touch = e.touches[0];
    isDragging = true;
    startX = touch.clientX;
    startValue = getValue ? getValue() : 0;
    currentValue = startValue;
    lastHapticX = startX;
    
    applyVisualFeedback();
  }, { passive: false });
  
  element.addEventListener('touchmove', (e) => {
    if (!isDragging) return;
    
    const touch = e.touches[0];
    const delta = touch.clientX - startX;
    
    if (Math.abs(delta) >= minDelta) {
      updateValue(delta);
      triggerHaptic(touch.clientX);
    }
    
    e.preventDefault();
  }, { passive: false });
  
  element.addEventListener('touchend', () => {
    if (!isDragging) return;
    
    isDragging = false;
    
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    
    pendingDelta = 0;
    
    if (onEnd) {
      onEnd({ value: currentValue });
    }
  });
  
  return {
    destroy() {
      element.removeEventListener('pointerdown', onPointerDown);
      element.removeEventListener('pointermove', onPointerMove);
      element.removeEventListener('pointerup', onPointerUp);
      element.removeEventListener('pointercancel', onPointerUp);
      
      if (rafId) {
        cancelAnimationFrame(rafId);
      }
    }
  };
}
