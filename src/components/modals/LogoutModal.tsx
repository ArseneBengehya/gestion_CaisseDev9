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
        <div className="flex items-center gap-3 p-3 bg-rose-50 text-rose-700 rounded-xl border border-rose-100">
          <AlertCircle size={24} className="shrink-0" />
          <p className="text-xs font-medium">
            Êtes-vous sûr de vouloir quitter la session d'administration ?
          </p>
        </div>

        <p className="text-sm text-slate-600">
          Vous devrez vous reconnecter avec vos identifiants pour accéder de nouveau à la gestion de la Caisse Dev9.
        </p>

        <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-sm transition-colors"
          >
            <LogOut size={16} />
            Se Déconnecter
          </button>
        </div>
      </div>
    </Modal>
  );
}