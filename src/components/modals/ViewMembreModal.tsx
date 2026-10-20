'use client';

import React from 'react';
// import Modal from '@/components/ui/Modal';
// import { Membre } from '@/types';
import { Mail, Phone, Calendar } from 'lucide-react';
import Modal from '../ui/Modal';
import { Membre } from '@/src/types';

interface ViewMembreModalProps {
  isOpen: boolean;
  onClose: () => void;
  membre: Membre | null;
}

export default function ViewMembreModal({
  isOpen,
  onClose,
  membre,
}: ViewMembreModalProps) {
  if (!membre) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Détails du Membre" maxWidth="md">
      <div className="space-y-4">
        {/* En-tête avec Avatar et Statut */}
        <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
          <div className="w-12 h-12 rounded-full bg-blue-600 text-white font-bold text-lg flex items-center justify-center">
            {membre.prenom[0]}{membre.nom[0]}
          </div>
          <div>
            <h4 className="text-lg font-bold text-slate-800">
              {membre.prenom} {membre.nom}
            </h4>
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                membre.statut === 'ACTIF'
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-rose-100 text-rose-800'
              }`}
            >
              {membre.statut}
            </span>
          </div>
        </div>

        {/* Détails du Membre */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center gap-3 text-sm text-slate-600">
            <Mail size={18} className="text-slate-400" />
            <span>{membre.email}</span>
          </div>
          <div className="flex items-center gap-3 text-sm text-slate-600">
            <Phone size={18} className="text-slate-400" />
            <span>{membre.telephone}</span>
          </div>
          <div className="flex items-center gap-3 text-sm text-slate-600">
            <Calendar size={18} className="text-slate-400" />
            <span>
              Membre depuis le : <strong>{membre.dateAdhesion}</strong>
            </span>
          </div>
        </div>

        {/* Pied du Modal */}
        <div className="pt-4 flex justify-end border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-white bg-slate-800 hover:bg-slate-900 rounded-lg transition-colors"
          >
            Fermer
          </button>
        </div>
      </div>
    </Modal>
  );
}