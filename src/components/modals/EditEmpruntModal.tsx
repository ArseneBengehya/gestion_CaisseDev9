'use client';

import React, { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import { Coins, Calendar, Percent, User } from 'lucide-react';
import { Emprunt } from '@/src/types';
import { dateEcheanceSelonDelai, PalierPret, trouverPalierPret } from '@/src/lib/loans';

interface EditEmpruntModalProps {
  isOpen: boolean;
  onClose: () => void;
  emprunt: Emprunt | null;
  paliers: PalierPret[];
  onSubmit: (empruntModifie: Emprunt) => void;
}

export default function EditEmpruntModal({
  isOpen,
  onClose,
  emprunt,
  paliers,
  onSubmit,
}: EditEmpruntModalProps) {
  const [montant, setMontant] = useState('');
  const [dateEcheance, setDateEcheance] = useState('');

  useEffect(() => {
    if (emprunt) {
      setMontant(emprunt.montantEmprunte.toString());
      setDateEcheance(emprunt.dateEcheance || '');
    }
  }, [emprunt]);

  if (!emprunt) return null;

  const montantNum = parseFloat(montant) || 0;
  const palier = trouverPalierPret(montantNum, paliers);
  const tauxNum = palier?.taux || 0;
  const dateEcheanceMax = palier && emprunt
    ? dateEcheanceSelonDelai(palier.delai, new Date(emprunt.createdAt || emprunt.dateEmprunt))
    : null;
  const montantInteret = (montantNum * tauxNum) / 100;
  const totalARembourser = montantNum + montantInteret;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!montant || !dateEcheance) {
      alert('Veuillez remplir tous les champs obligatoires.');
      return;
    }
    if (!palier) {
      alert('Le montant ne correspond à aucun palier configuré dans les paramètres.');
      return;
    }
    if (dateEcheanceMax && dateEcheance > dateEcheanceMax) {
      alert(`La date d’échéance doit respecter le délai de ${palier.delai} configuré.`);
      return;
    }
    if (totalARembourser < (emprunt.montantPaye || 0)) {
      alert('Le nouveau total ne peut pas être inférieur au montant déjà payé.');
      return;
    }

    onSubmit({
      ...emprunt,
      montantEmprunte: montantNum,
      tauxInteret: tauxNum,
      montantTotalARembourser: totalARembourser,
      montantRestant: Math.max(0, totalARembourser - (emprunt.montantPaye || 0)),
      dateEcheance,
    });

    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Modifier l'Emprunt" maxWidth="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
            Membre Emprunteur
          </label>
          <input
            type="text"
            disabled
            value={emprunt.nomMembre}
            className="w-full px-3 py-2 text-sm bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-lg cursor-not-allowed"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
            Montant de l'emprunt (FC)
          </label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
              <Coins size={16} />
            </span>
            <input
              type="number"
              required
              min="1000"
              value={montant}
              onChange={(e) => setMontant(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 font-medium"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
            Taux d'intérêt (%)
          </label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
              <Percent size={16} />
            </span>
            <input type="text" readOnly value={palier ? `${palier.taux}%` : ''} placeholder="Aucun palier pour ce montant" className="w-full pl-9 pr-3 py-2 text-sm text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg font-medium" />
          </div>
          {montantNum > 0 && !palier && <p className="mt-1 text-xs text-rose-600">Ce montant ne respecte aucun palier configuré.</p>}
        </div>

        {montantNum > 0 && (
          <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 rounded-xl space-y-1">
            <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase">
              Récapitulatif mis à jour
            </p>
            <div className="flex justify-between text-sm text-slate-700 dark:text-slate-300">
              <span>Intérêt ({tauxNum}%) :</span>
              <span className="font-bold">+{montantInteret.toLocaleString()} FC</span>
            </div>
            <div className="flex justify-between text-base font-extrabold text-amber-700 dark:text-amber-300 pt-1 border-t border-amber-200 dark:border-amber-900">
              <span>Total à rembourser :</span>
              <span>{totalARembourser.toLocaleString()} FC</span>
            </div>
          </div>
        )}

        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
            Date limite de remboursement (Échéance)
          </label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
              <Calendar size={16} />
            </span>
            <input
              type="date"
              required
              value={dateEcheance}
              min={new Date().toISOString().slice(0, 10)}
              max={dateEcheanceMax || undefined}
              onChange={(e) => setDateEcheance(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 font-medium"
            />
          </div>
        </div>

        <div className="pt-4 flex justify-end gap-3 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={!palier}
            className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-slate-700 dark:bg-slate-200 dark:text-slate-900 dark:hover:bg-white"
          >
            Mettre à jour
          </button>
        </div>
      </form>
    </Modal>
  );
}