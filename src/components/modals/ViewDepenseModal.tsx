'use client';

import React from 'react';
import { Tag, Calendar, UserCheck, Receipt } from 'lucide-react';
import Modal from '../ui/Modal';
import { Depense } from '@/src/types';

interface ViewDepenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  depense: Depense | null;
}

export default function ViewDepenseModal({
  isOpen,
  onClose,
  depense,
}: ViewDepenseModalProps) {
  if (!depense) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Détails de la Dépense" maxWidth="md">
      <div className="space-y-4">
        {/* En-tête avec Motif et Montant */}
        <div className="p-4 bg-rose-50 rounded-xl border border-rose-100 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-rose-600 uppercase">Montant Dépensé</p>
            <p className="text-2xl font-bold text-rose-700 mt-0.5">
              -{depense.montant.toLocaleString()} FC
            </p>
          </div>
          <div className="p-3 bg-rose-100 text-rose-600 rounded-lg">
            <Receipt size={24} />
          </div>
        </div>

        {/* Détails */}
        <div className="space-y-3 pt-2">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase">Motif / Justification</p>
            <p className="text-sm font-semibold text-slate-800 mt-1">{depense.motif}</p>
          </div>

          <div className="flex items-center gap-3 text-sm text-slate-600">
            <Tag size={18} className="text-slate-400" />
            <span>Catégorie : <strong className="text-slate-800">{depense.categorie}</strong></span>
          </div>

          <div className="flex items-center gap-3 text-sm text-slate-600">
            <Calendar size={18} className="text-slate-400" />
            <span>Date d'enregistrement : <strong className="text-slate-800">{depense.dateDepense}</strong></span>
          </div>

          <div className="flex items-center gap-3 text-sm text-slate-600">
            <UserCheck size={18} className="text-slate-400" />
            <span>Approuvé par : <strong className="text-slate-800">{depense.approuvePar}</strong></span>
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