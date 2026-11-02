'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';
import { CheckCircle, AlertCircle, X } from 'lucide-react';

type NotificationType = 'success' | 'error';

interface NotificationContextProps {
  showNotification: (type: NotificationType, message: string) => void;
}

const NotificationContext = createContext<NotificationContextProps | undefined>(undefined);

export const NotificationProvider = ({ children }: { children: ReactNode }) => {
  const [notification, setNotification] = useState<{ type: NotificationType; message: string } | null>(null);

  const showNotification = (type: NotificationType, message: string) => {
    setNotification({ type, message });
    // Disparaît automatiquement après 5 secondes
    setTimeout(() => {
      setNotification(null);
    }, 5000);
  };

  return (
    <NotificationContext.Provider value={{ showNotification }}>
      {children}

      {/* UI GLOBALE DU TOAST (Fixée en bas à droite de l'écran) */}
      {notification && (
        <div className="fixed bottom-6 right-6 z-50 max-w-md animate-slide-up">
          <div
            className={`flex items-center justify-between gap-3 p-4 rounded-2xl border text-sm font-medium shadow-2xl backdrop-blur-md ${
              notification.type === 'success'
                ? 'bg-emerald-50/95 border-emerald-200 text-emerald-800 dark:bg-emerald-950/90 dark:border-emerald-900/60 dark:text-emerald-200'
                : 'bg-rose-50/95 border-rose-200 text-rose-800 dark:bg-rose-950/90 dark:border-rose-900/60 dark:text-rose-200'
            }`}
          >
            <div className="flex items-center gap-2.5">
              {notification.type === 'success' ? (
                <CheckCircle size={18} className="shrink-0 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <AlertCircle size={18} className="shrink-0 text-rose-600 dark:text-rose-400" />
              )}
              <span>{notification.message}</span>
            </div>
            <button
              onClick={() => setNotification(null)}
              className="rounded-lg p-1 transition hover:bg-black/5 dark:hover:bg-white/10"
              title="Fermer"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}
    </NotificationContext.Provider>
  );
};

// Hook personnalisé pour utiliser facilement les notifications partout
export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification doit être utilisé à l’intérieur d’un NotificationProvider');
  }
  return context;
};