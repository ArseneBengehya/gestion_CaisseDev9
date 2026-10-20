'use client';

import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  position?: 'right' | 'left';
}

export default function Drawer({
  isOpen,
  onClose,
  title,
  children,
  position = 'right',
}: DrawerProps) {
  // Empêcher le scroll en arrière-plan
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

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/50 backdrop-blur-sm animate-fadeIn">
      <div className="absolute inset-0 overflow-hidden" onClick={onClose}>
        <div
          className={`pointer-events-none fixed inset-y-0 flex max-w-full pl-10 ${
            position === 'right' ? 'right-0' : 'left-0'
          }`}
        >
          <div
            className="pointer-events-auto w-screen max-w-md transform bg-white shadow-2xl transition-transform duration-300 ease-in-out flex flex-col"
            onClick={(e) => e.stopPropagation()} // Évite de fermer en cliquant à l'intérieur
          >
            {/* Header du Drawer */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h3 className="text-lg font-bold text-slate-800">{title}</h3>
              <button
                onClick={onClose}
                className="text-slate-400 hover:text-red-500 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Corps du Drawer (Scrollable) */}
            <div className="p-6 overflow-y-auto flex-1">{children}</div>
          </div>
        </div>
      </div>
    </div>
  );
}