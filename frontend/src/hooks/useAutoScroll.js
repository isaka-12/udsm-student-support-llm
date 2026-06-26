import { useRef, useEffect } from 'react';

export function useAutoScroll(deps) {
  const ref = useRef(null);
  useEffect(() => {
    ref.current?.scrollIntoView({ behavior: 'smooth' });
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps
  return ref;
}
