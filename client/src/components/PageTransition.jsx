import React, { useEffect, useRef } from 'react';
import animeModule from 'animejs';

let anime = animeModule;
if (anime && anime.default) {
  anime = anime.default;
}

const PageTransition = ({ children }) => {
  const containerRef = useRef(null);

  useEffect(() => {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    
    if (prefersReduced || typeof anime !== 'function') {
      if (containerRef.current) {
        containerRef.current.style.opacity = 1;
        containerRef.current.style.transform = 'translateY(0)';
      }
      return;
    }

    try {
      anime({
        targets: containerRef.current,
        opacity: [0, 1],
        translateY: [8, 0],
        duration: 250,
        easing: 'easeOutExpo',
      });
    } catch (err) {
      console.error('PageTransition animation error:', err);
      if (containerRef.current) {
        containerRef.current.style.opacity = 1;
        containerRef.current.style.transform = 'translateY(0)';
      }
    }
  }, [children]); // Re-run when route/children change

  return (
    <div ref={containerRef} style={{ opacity: 0 }}>
      {children}
    </div>
  );
};

export default PageTransition;
