import { useEffect, useState } from 'react';

/** Returns Date.now(), refreshed every `ms` so durations stay live. */
export default function useNow(ms = 30000) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(id);
  }, [ms]);
  return now;
}
