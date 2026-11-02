'use client';

import React from 'react';
// import Modal from '@/components/ui/Modal';
import { LogOut, AlertCircle } from 'lucide-react';
import Modal from '../ui/Modal';

interface LogoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export default function LogoutModal({ isOpen, onClose, onConfirm }: LogoutModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Confirmation de Déconnexion" maxWidth="sm">
      <div className="space-y-4 pt-1">
        <div className="flex items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300">
          <AlertCircle size={24} className="shrink-0" />
          <p className="text-xs font-medium">
            Êtes-vous sûr de vouloir quitter la session d'administration ?
          </p>
        </div>

        <p className="text-sm text-slate-600 dark:text-slate-300">
          Vous devrez vous reconnecter avec vos identifiants pour accéder de nouveau à la gestion de la Caisse Dev9.
        </p>

        <div className="flex justify-end gap-3 border-t border-slate-200 pt-4 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="inline-flex items-center gap-2 rounded-lg bg-rose-700 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-rose-800"
          >
            <LogOut size={16} />
            Se Déconnecter
          </button>
        </div>
      </div>
    </Modal>
  );
}