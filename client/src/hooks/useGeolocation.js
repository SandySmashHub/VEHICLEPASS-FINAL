import { useCallback, useEffect, useState } from 'react';

const toPosition = (p) => ({
  lat: p.coords.latitude,
  lng: p.coords.longitude,
  accuracy: p.coords.accuracy,
  speed: p.coords.speed,
  timestamp: p.timestamp,
});

export function geoErrorMessage(err) {
  if (err.code === 1) {
    return window.isSecureContext
      ? 'Location permission was denied. Allow location access for this site in your browser settings and try again.'
      : 'Location needs a secure (HTTPS) connection. Open the app over HTTPS.';
  }
  if (err.code === 2) return 'Your location is unavailable right now. Check that GPS or location services are turned on.';
  if (err.code === 3) return 'Getting your location timed out. Move to an open area and try again.';
  return err.message || 'Could not read your location.';
}

/** Thin wrapper around the browser Geolocation API with permission state and readable errors. */
export default function useGeolocation() {
  const supported = typeof navigator !== 'undefined' && 'geolocation' in navigator;
  const [position, setPosition] = useState(null);
  const [error, setError] = useState('');
  const [permission, setPermission] = useState('unknown'); // unknown | prompt | granted | denied

  useEffect(() => {
    let status;
    navigator.permissions?.query({ name: 'geolocation' })
      .then((s) => { status = s; setPermission(s.state); s.onchange = () => setPermission(s.state); })
      .catch(() => {});
    return () => { if (status) status.onchange = null; };
  }, []);

  /** Resolves with a fresh fix (asks for permission on first use). Rejects with a readable Error. */
  const getCurrent = useCallback(
    () =>
      new Promise((resolve, reject) => {
        if (!supported) {
          const msg = 'This browser does not support geolocation.';
          setError(msg);
          return reject(new Error(msg));
        }
        navigator.geolocation.getCurrentPosition(
          (p) => { const pos = toPosition(p); setPosition(pos); setError(''); resolve(pos); },
          (err) => { const msg = geoErrorMessage(err); setError(msg); reject(new Error(msg)); },
          { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
        );
      }),
    [supported]
  );

  return { position, error, permission, supported, getCurrent };
}
