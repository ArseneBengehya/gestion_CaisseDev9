'use client';

import React, { useEffect } from 'react';
import { X, Maximize2, Minimize2 } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  isFullScreen?: boolean;
  setIsFullScreen?: (val: boolean) => void;
}

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = 'lg',
  isFullScreen = false,
  setIsFullScreen,
}: ModalProps) {
  // Empêcher le scroll en arrière-plan quand le modal est ouvert
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-3 backdrop-blur-[3px] animate-fadeIn sm:p-4">
      <div
        className={`flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-950/10 transition-all duration-300 dark:border-slate-800 dark:bg-slate-900 dark:shadow-black/30 ${
          isFullScreen
            ? 'w-full h-full rounded-none max-w-none max-h-none'
            : `w-full ${maxWidthClasses[maxWidth]} max-h-[90vh]`
        }`}
      >
        {/* Header du Modal */}
        <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-5 py-4 dark:border-slate-800 sm:px-6">
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 sm:text-lg">{title}</h3>
          
          <div className="flex items-center gap-2">
            {/* Bouton Plein Écran (utile pour l'historique des contributions) */}
            {setIsFullScreen && (
              <button
                onClick={() => setIsFullScreen(!isFullScreen)}
                className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                title={isFullScreen ? "Réduire" : "Plein écran"}
              >
                {isFullScreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
              </button>
            )}

            {/* Bouton Fermer */}
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-100"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Corps du Modal (Scrollable) */}
        <div className="min-h-0 flex-1 overflow-y-auto p-4 dark:text-slate-100 sm:p-6">{children}</div>
      </div>
    </div>
  );
}