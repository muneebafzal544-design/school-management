import { useEffect, useState } from 'react';

/**
 * Returns a debounced version of the value.
 * @param {*} value
 * @param {number} delay - ms
 */
export function useDebounce(value, delay = 300) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);

  return debounced;
}
