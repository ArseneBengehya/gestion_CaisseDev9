'use client';

import React from 'react';
import Modal from '../ui/Modal';
import { Membre } from '@/src/types';
import { User, Phone, Mail, CheckCircle, AlertCircle, Calendar } from 'lucide-react';

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
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Profil du Membre"
      maxWidth="md"
    >
      <div className="space-y-6">
        {/* En-tête profil */}
        <div className="flex items-center gap-4 rounded-xl bg-slate-50 p-4 dark:bg-slate-800/50">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-xl font-bold text-white shadow-md">
            {(membre.nomComplet || membre.nom || 'M').charAt(0).toUpperCase()}
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              {membre.nomComplet || `${membre.prenom} ${membre.nom}`}
            </h3>
            <span
              className={`inline-flex items-center gap-1 mt-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                membre.statut === 'ACTIF'
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300'
                  : 'bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-300'
              }`}
            >
              {membre.statut === 'ACTIF' ? <CheckCircle size={12} /> : <AlertCircle size={12} />}
              {membre.statut || 'ACTIF'}
            </span>
          </div>
        </div>

        {/* Coordonnées */}
        <div className="space-y-3 rounded-xl border border-slate-200 p-4 dark:border-slate-800">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Coordonnées
          </h4>

          <div className="flex items-center gap-3 text-sm text-slate-700 dark:text-slate-300">
            <Phone size={18} className="text-slate-400" />
            <span>{membre.telephone || 'Non renseigné'}</span>
          </div>

          <div className="flex items-center gap-3 text-sm text-slate-700 dark:text-slate-300">
            <Mail size={18} className="text-slate-400" />
            <span>{membre.email || 'Non renseigné'}</span>
          </div>

          {membre.createdAt && (
            <div className="flex items-center gap-3 text-sm text-slate-500 dark:text-slate-400">
              <Calendar size={18} className="text-slate-400" />
              <span>Membre depuis le {new Date(membre.createdAt).toLocaleDateString('fr-FR')}</span>
            </div>
          )}
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 px-5 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Fermer
          </button>
        </div>
      </div>
    </Modal>
  );
}