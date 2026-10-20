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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fadeIn">
      <div
        className={`bg-white rounded-xl shadow-2xl flex flex-col transition-all duration-300 ${
          isFullScreen
            ? 'w-full h-full rounded-none max-w-none max-h-none'
            : `w-full ${maxWidthClasses[maxWidth]} max-h-[90vh]`
        }`}
      >
        {/* Header du Modal */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h3 className="text-lg font-bold text-slate-800">{title}</h3>
          
          <div className="flex items-center gap-2">
            {/* Bouton Plein Écran (utile pour l'historique des contributions) */}
            {setIsFullScreen && (
              <button
                onClick={() => setIsFullScreen(!isFullScreen)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                title={isFullScreen ? "Réduire" : "Plein écran"}
              >
                {isFullScreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
              </button>
            )}

            {/* Bouton Fermer */}
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-red-500 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Corps du Modal (Scrollable) */}
        <div className="p-6 overflow-y-auto flex-1">{children}</div>
      </div>
    </div>
  );
}