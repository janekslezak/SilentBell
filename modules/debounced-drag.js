// ─── Debounced Drag Handler Module ───────────────────────────────
// Provides smooth drag interactions with debouncing and haptic feedback.
// Updated to support both horizontal drag and vertical scroll for time adjustment.

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
  let startY = 0;
  let startValue = 0;
  let currentValue = 0;
  let lastHapticX = 0;
  let rafId = null;
  let pendingDelta = 0;
  
  // Touch handling state
  let touchStartX = 0;
  let touchStartY = 0;
  let isTouchDragging = false;
  
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
  
  // Pointer Events (Mouse/Touch unified)
  function onPointerDown(e) {
    if (shouldIgnore && shouldIgnore()) return;
    
    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;
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
    
    const deltaX = e.clientX - startX;
    const deltaY = startY - e.clientY; // Inverted: up increases time
    
    // Use whichever has larger movement
    const delta = Math.abs(deltaX) > Math.abs(deltaY) ? deltaX : deltaY;
    
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
  
  // Touch Events (for older devices and better mobile support)
  function onTouchStart(e) {
    if (shouldIgnore && shouldIgnore()) return;
    
    const touch = e.touches[0];
    touchStartX = touch.clientX;
    touchStartY = touch.clientY;
    startValue = getValue ? getValue() : 0;
    currentValue = startValue;
    lastHapticX = touchStartX;
    isTouchDragging = false;
    
    // Don't prevent default yet - let scroll happen if user wants to scroll page
  }
  
  function onTouchMove(e) {
    const touch = e.touches[0];
    const deltaX = touch.clientX - touchStartX;
    const deltaY = touchStartY - touch.clientY;
    
    // Determine if this is a drag or a scroll
    if (!isTouchDragging) {
      const absX = Math.abs(deltaX);
      const absY = Math.abs(deltaY);
      
      // If moving more horizontally, treat as time adjustment
      // If moving more vertically, treat as page scroll
      if (absX > absY && absX > minDelta) {
        isTouchDragging = true;
      } else if (absY > absX) {
        // Let default scroll happen
        return;
      }
    }
    
    if (isTouchDragging) {
      e.preventDefault();
      
      // Use vertical movement for time adjustment (more natural on phones)
      const delta = Math.abs(deltaX) > Math.abs(deltaY) ? deltaX : deltaY;
      
      if (Math.abs(delta) >= minDelta) {
        updateValue(delta);
        triggerHaptic(touch.clientX);
      }
    }
  }
  
  function onTouchEnd(e) {
    if (isTouchDragging) {
      isTouchDragging = false;
      
      if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      
      pendingDelta = 0;
      
      if (onEnd) {
        onEnd({ value: currentValue });
      }
    }
  }
  
  // Wheel/Scroll support for desktop
  function onWheel(e) {
    if (shouldIgnore && shouldIgnore()) return;
    
    // Prevent default to stop page scrolling when over timer
    e.preventDefault();
    
    const delta = e.deltaY > 0 ? -pixelsPerUnit : pixelsPerUnit;
    updateValue(delta * 2); // Multiply for faster adjustment with wheel
    
    // Debounce the end callback
    if (rafId) {
      cancelAnimationFrame(rafId);
    }
    
    rafId = requestAnimationFrame(() => {
      if (onEnd) {
        onEnd({ value: currentValue });
      }
      rafId = null;
    });
  }
  
  // Attach event listeners
  element.addEventListener('pointerdown', onPointerDown);
  element.addEventListener('pointermove', onPointerMove);
  element.addEventListener('pointerup', onPointerUp);
  element.addEventListener('pointercancel', onPointerUp);
  
  element.addEventListener('touchstart', onTouchStart, { passive: true });
  element.addEventListener('touchmove', onTouchMove, { passive: false });
  element.addEventListener('touchend', onTouchEnd);
  element.addEventListener('touchcancel', onTouchEnd);
  
  element.addEventListener('wheel', onWheel, { passive: false });
  
  return {
    destroy() {
      element.removeEventListener('pointerdown', onPointerDown);
      element.removeEventListener('pointermove', onPointerMove);
      element.removeEventListener('pointerup', onPointerUp);
      element.removeEventListener('pointercancel', onPointerUp);
      
      element.removeEventListener('touchstart', onTouchStart);
      element.removeEventListener('touchmove', onTouchMove);
      element.removeEventListener('touchend', onTouchEnd);
      element.removeEventListener('touchcancel', onTouchEnd);
      
      element.removeEventListener('wheel', onWheel);
      
      if (rafId) {
        cancelAnimationFrame(rafId);
      }
    }
  };
}
