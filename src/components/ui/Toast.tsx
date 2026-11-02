'use client';

import React from 'react';
import { CheckCircle, AlertCircle, X } from 'lucide-react';

interface ToastProps {
  type: 'success' | 'error';
  message: string;
  onClose: () => void;
}

export default function Toast({ type, message, onClose }: ToastProps) {
  return (
    <div className="fixed bottom-6 right-6 z-[9999] max-w-md animate-bounce-once">
      <div
        className={`flex items-center justify-between gap-3 p-4 rounded-2xl border text-sm font-semibold shadow-2xl backdrop-blur-md transition-all ${
          type === 'success'
            ? 'bg-emerald-500/95 text-white border-emerald-400 shadow-emerald-900/20'
            : 'bg-rose-500/95 text-white border-rose-400 shadow-rose-900/20'
        }`}
      >
        <div className="flex items-center gap-2.5">
          {type === 'success' ? (
            <CheckCircle size={20} className="shrink-0 text-white" />
          ) : (
            <AlertCircle size={20} className="shrink-0 text-white" />
          )}
          <span>{message}</span>
        </div>
        <button
          onClick={onClose}
          className="rounded-lg p-1 transition hover:bg-white/20"
          title="Fermer"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}