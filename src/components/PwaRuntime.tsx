'use client';

import { useEffect, useState } from 'react';

export default function PwaRuntime() {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    const updateConnectivity = () => setIsOffline(!navigator.onLine);
    updateConnectivity();
    window.addEventListener('online', updateConnectivity);
    window.addEventListener('offline', updateConnectivity);

    if (process.env.NODE_ENV === 'production' && 'serviceWorker' in navigator) {
      void navigator.serviceWorker.register('/sw.js', {
        scope: '/',
        updateViaCache: 'none',
      }).catch((error: unknown) => {
        console.error('Impossible d’enregistrer le service worker PWA :', error);
      });
    }

    return () => {
      window.removeEventListener('online', updateConnectivity);
      window.removeEventListener('offline', updateConnectivity);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="bg-amber-100 px-4 py-2 text-center text-sm font-medium text-amber-950 dark:bg-amber-950 dark:text-amber-100"
    >
      Mode hors ligne : les données déjà mises en cache restent accessibles. Certaines opérations nécessitent une connexion.
    </div>
  );
}
