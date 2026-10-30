import { useEffect, useState } from 'react';

export function useReducedMotion() {
  const [reduced, setReduced] = useState(() => matchMedia('(prefers-reduced-motion: reduce)').matches);
  useEffect(() => {
    const media = matchMedia('(prefers-reduced-motion: reduce)');
    const change = () => setReduced(media.matches);
    media.addEventListener('change', change);
    return () => media.removeEventListener('change', change);
  }, []);
  return reduced;
}

export function useSiteMotion(root, reduced, contentVersion) {
  useEffect(() => {
    const element = root.current;
    if (!element || reduced) return;
    let frame = 0;
    const progress = element.querySelector('.vr-reading-progress');
    const carousel = element.querySelector('.vr-carousel');
    function paint() {
      frame = 0;
      const range = document.documentElement.scrollHeight - innerHeight;
      if (progress) progress.style.transform = `scaleX(${range > 0 ? Math.min(1, scrollY / range) : 0})`;
      if (carousel && scrollY < carousel.offsetTop + carousel.offsetHeight + 100) carousel.style.setProperty('--vr-parallax', `${Math.min(45, Math.max(0, scrollY * .12))}px`);
      element.classList.toggle('vr-has-scrolled', scrollY > 20);
    }
    const scroll = () => { if (!frame) frame = requestAnimationFrame(paint); };
    const observer = typeof IntersectionObserver === 'function' ? new IntersectionObserver(entries => {
      for (const entry of entries) if (entry.isIntersecting) { entry.target.classList.add('is-visible'); observer.unobserve(entry.target); }
    }, { threshold: .08, rootMargin: '0px 0px -24px 0px' }) : null;
    if (observer) {
      element.classList.add('vr-motion-enabled');
      for (const node of element.querySelectorAll('.vr-reveal')) observer.observe(node);
    }
    paint();
    addEventListener('scroll', scroll, { passive: true });
    addEventListener('resize', scroll, { passive: true });
    return () => {
      removeEventListener('scroll', scroll); removeEventListener('resize', scroll);
      cancelAnimationFrame(frame); observer?.disconnect();
      element.classList.remove('vr-motion-enabled');
      carousel?.style.removeProperty('--vr-parallax');
      progress?.style.removeProperty('transform');
    };
  }, [root, reduced, contentVersion]);
}
