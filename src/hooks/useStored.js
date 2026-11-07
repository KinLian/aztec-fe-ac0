import { useEffect, useState } from 'react';

/** useState that remembers its value in localStorage (safe when storage is blocked). */
export function useStored(key, initial) {
  const [value, setValue] = useState(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw) return { ...initial, ...JSON.parse(raw) };
    } catch {
      /* ignore */
    }
    return initial;
  });
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* ignore */
    }
  }, [key, value]);
  return [value, setValue];
}

/** Current time, refreshed every `ms`. */
export function useNow(ms = 60000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return now;
}
