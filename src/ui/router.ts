import { useEffect, useState } from 'react';

/** Tiny hash router — works on GitHub Pages without server rewrites. */
const read = () => (location.hash.replace(/^#/, '') || '/').split('?')[0] || '/';

export function usePath(): string {
  const [p, setP] = useState(read);
  useEffect(() => {
    const on = () => setP(read());
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return p;
}

export function navigate(to: string) {
  if (read() !== to) location.hash = to;
}
