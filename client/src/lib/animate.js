import animeModule from 'animejs';

// Resolve default export compatibility
let anime = animeModule;
if (anime && anime.default) {
  anime = anime.default;
}

const prefersReduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Robust helper to resolve selector/nodelist/element into standard DOM element array
const getElements = (targets) => {
  if (!targets) return [];
  if (typeof targets === 'string') {
    try {
      return Array.from(document.querySelectorAll(targets));
    } catch (e) {
      return [];
    }
  }
  if (targets instanceof NodeList) {
    return Array.from(targets);
  }
  if (Array.isArray(targets)) {
    return targets.flatMap(getElements);
  }
  return [targets];
};

// Safe wrapper for anime() with instant fallbacks
const safeAnime = (params) => {
  try {
    if (typeof anime === 'function') {
      return anime(params);
    }
  } catch (err) {
    console.error('Anime animation failed, falling back to instant styling:', err);
  }

  // Fallback behavior: immediately apply final target values
  if (params && params.targets) {
    const els = getElements(params.targets);
    els.forEach(el => {
      if (!el || !el.style) return;
      
      // Opacity
      if (params.opacity !== undefined) {
        const val = Array.isArray(params.opacity) ? params.opacity[params.opacity.length - 1] : params.opacity;
        el.style.opacity = val;
      }
      
      // Transforms
      let transformStr = el.style.transform || '';
      if (params.scale !== undefined) {
        const val = Array.isArray(params.scale) ? params.scale[params.scale.length - 1] : params.scale;
        transformStr = transformStr.replace(/scale\([^)]*\)/g, '') + ` scale(${val})`;
      }
      if (params.translateX !== undefined) {
        const val = Array.isArray(params.translateX) ? params.translateX[params.translateX.length - 1] : params.translateX;
        transformStr = transformStr.replace(/translateX\([^)]*\)/g, '') + ` translateX(${val}px)`;
      }
      if (params.translateY !== undefined) {
        const val = Array.isArray(params.translateY) ? params.translateY[params.translateY.length - 1] : params.translateY;
        transformStr = transformStr.replace(/translateY\([^)]*\)/g, '') + ` translateY(${val}px)`;
      }
      el.style.transform = transformStr.trim();
    });
  }
};

const safeSet = (targets, params) => {
  try {
    if (typeof anime === 'function' && typeof anime.set === 'function') {
      anime.set(targets, params);
      return;
    }
  } catch (err) {
    console.error('anime.set error: falling back to instant styling', err);
  }
  
  const els = getElements(targets);
  els.forEach(el => {
    if (!el || !el.style) return;
    Object.keys(params).forEach(key => {
      const val = params[key];
      if (key === 'opacity') {
        el.style.opacity = val;
      } else if (key === 'scale') {
        el.style.transform = (el.style.transform || '').replace(/scale\([^)]*\)/g, '') + ` scale(${val})`;
      } else if (key === 'translateX') {
        el.style.transform = (el.style.transform || '').replace(/translateX\([^)]*\)/g, '') + ` translateX(${val}px)`;
      } else if (key === 'translateY') {
        el.style.transform = (el.style.transform || '').replace(/translateY\([^)]*\)/g, '') + ` translateY(${val}px)`;
      } else {
        el.style[key] = val;
      }
    });
  });
};

const safeStagger = (staggerVal) => {
  try {
    if (typeof anime === 'function' && typeof anime.stagger === 'function') {
      return anime.stagger(staggerVal);
    }
  } catch (err) {
    console.error('anime.stagger error:', err);
  }
  return 0;
};

export const fadeUp = (els, stagger = 60) => {
  if (prefersReduced() || typeof anime !== 'function') {
    safeAnime({ targets: els, opacity: 1, translateY: 0, duration: 0 });
    return;
  }
  safeAnime({
    targets: els,
    opacity: [0, 1],
    translateY: [24, 0],
    duration: 600,
    easing: 'easeOutExpo',
    delay: safeStagger(stagger)
  });
};

export const fadeIn = (el, delay = 0) => {
  if (prefersReduced() || typeof anime !== 'function') {
    safeAnime({ targets: el, opacity: 1, duration: 0 });
    return;
  }
  safeAnime({
    targets: el,
    opacity: [0, 1],
    duration: 400,
    easing: 'easeOutExpo',
    delay
  });
};

export const scaleIn = (el) => {
  if (prefersReduced() || typeof anime !== 'function') {
    safeAnime({ targets: el, opacity: 1, scale: 1, duration: 0 });
    return;
  }
  safeAnime({
    targets: el,
    opacity: [0, 1],
    scale: [0.92, 1],
    duration: 600,
    easing: 'spring(1, 80, 10, 0)'
  });
};

export const slideInRight = (el) => {
  if (prefersReduced() || typeof anime !== 'function') {
    safeAnime({ targets: el, opacity: 1, translateX: 0, duration: 0 });
    return;
  }
  safeAnime({
    targets: el,
    opacity: [0, 1],
    translateX: [40, 0],
    duration: 380,
    easing: 'easeOutExpo'
  });
};

export const slideInLeft = (els, stagger = 40) => {
  if (prefersReduced() || typeof anime !== 'function') {
    safeAnime({ targets: els, opacity: 1, translateX: 0, duration: 0 });
    return;
  }
  safeAnime({
    targets: els,
    opacity: [0, 1],
    translateX: [-40, 0],
    duration: 380,
    easing: 'easeOutExpo',
    delay: safeStagger(stagger)
  });
};

export const staggerCards = (els) => fadeUp(els, 80);

export const countUp = (el, end, duration = 1000) => {
  if (prefersReduced() || typeof anime !== 'function') {
    if (el) el.innerHTML = end;
    return;
  }
  try {
    anime({
      targets: el,
      innerHTML: [0, end],
      duration,
      easing: 'easeOutExpo',
      round: 1
    });
  } catch (err) {
    console.error('countUp error:', err);
    if (el) el.innerHTML = end;
  }
};

export const ripple = (btn, event) => {
  if (prefersReduced() || typeof anime !== 'function') return;
  try {
    const rect = btn.getBoundingClientRect();
    const circle = document.createElement('div');
    const size = Math.max(rect.width, rect.height);
    
    circle.style.width = circle.style.height = `${size}px`;
    circle.style.left = `${event.clientX - rect.left - size / 2}px`;
    circle.style.top = `${event.clientY - rect.top - size / 2}px`;
    circle.style.position = 'absolute';
    circle.style.borderRadius = '50%';
    circle.style.backgroundColor = 'rgba(255, 255, 255, 0.3)';
    circle.style.pointerEvents = 'none';
    
    if (btn.style.position === 'static' || !btn.style.position) {
      btn.style.position = 'relative';
    }
    btn.style.overflow = 'hidden';
    btn.appendChild(circle);
    
    anime({
      targets: circle,
      scale: [0, 3],
      opacity: [1, 0],
      duration: 600,
      easing: 'easeOutExpo',
      complete: () => {
        circle.remove();
      }
    });
  } catch (err) {
    console.error('ripple error:', err);
  }
};

export function appearBtn(el, delay = 0) {
  if (prefersReduced() || typeof anime !== 'function') {
    safeAnime({ targets: el, opacity: 1, scale: 1, duration: 0 });
    const label = el.querySelector('.btn-label');
    if (label) safeAnime({ targets: label, opacity: 1, translateY: 0, duration: 0 });
    return;
  }
  
  try {
    safeSet(el, { scale: 0.75, opacity: 0 });
    anime({
      targets: el,
      scale: [0.75, 1],
      opacity: [0, 1],
      duration: 340,
      delay,
      easing: 'spring(1, 80, 10, 0)',
    });
    
    const label = el.querySelector('.btn-label');
    if (label) {
      safeSet(label, { opacity: 0, translateY: 4 });
      anime({ 
        targets: label, 
        opacity: 1, 
        translateY: 0, 
        duration: 200, 
        delay: delay + 60, 
        easing: 'easeOutQuad' 
      });
    }
  } catch (err) {
    console.error('appearBtn error:', err);
    safeAnime({ targets: el, opacity: 1, scale: 1, duration: 0 });
    const label = el.querySelector('.btn-label');
    if (label) safeAnime({ targets: label, opacity: 1, translateY: 0, duration: 0 });
  }
}

export function morphBtnLabel(el, newText, newClass) {
  if (prefersReduced() || typeof anime !== 'function') {
    const label = el.querySelector('.btn-label');
    if (label) label.textContent = newText;
    el.className = `apply-btn ${newClass}`;
    return;
  }

  const label = el.querySelector('.btn-label');
  if (!label) {
    el.className = `apply-btn ${newClass}`;
    return;
  }

  try {
    anime({
      targets: label,
      opacity: [1, 0],
      translateY: [0, -8],
      duration: 140,
      easing: 'easeInQuad',
      complete: () => {
        label.textContent = newText;
        el.className = `apply-btn ${newClass}`;
        anime({ 
          targets: label, 
          opacity: [0, 1], 
          translateY: [8, 0], 
          duration: 180, 
          easing: 'easeOutQuad' 
        });
      }
    });
  } catch (err) {
    console.error('morphBtnLabel error:', err);
    label.textContent = newText;
    el.className = `apply-btn ${newClass}`;
  }
}
