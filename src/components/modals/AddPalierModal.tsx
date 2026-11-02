'use client';

import React, { useState } from 'react';
import Modal from '../ui/Modal';

interface AddPalierModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (min: number, max: number | string, delai: string, taux: number) => void | Promise<void>;
}

export default function AddPalierModal({ isOpen, onClose, onAdd }: AddPalierModalProps) {
  const [min, setMin] = useState('');
  const [max, setMax] = useState('');
  const [delai, setDelai] = useState('');
  const [taux, setTaux] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!min || !delai || !taux || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const minVal = parseFloat(min);
      const maxVal = max.trim() === '' ? 'Et plus' : parseFloat(max);
      const tauxVal = parseFloat(taux);

      await onAdd(minVal, maxVal, delai.trim(), tauxVal);

      // Réinitialiser les champs
      setMin('');
      setMax('');
      setDelai('');
      setTaux('');
      onClose();
    } catch (error) {
      console.error('Erreur lors de l’ajout du palier :', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Nouveau pourcentage de remboursement">
      <form onSubmit={handleSubmit} className="space-y-4 p-1">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-700 dark:text-slate-300 mb-1">
              Du montant X (FC) *
            </label>
            <input
              type="number"
              required
              value={min}
              onChange={(e) => setMin(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900 dark:bg-slate-800 dark:border-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/20"
              placeholder="Ex: 20000"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-700 dark:text-slate-300 mb-1">
              Au montant Y (FC)
            </label>
            <input
              type="text"
              value={max}
              onChange={(e) => setMax(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900 dark:bg-slate-800 dark:border-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/20"
              placeholder="Ex: 50000 (Vide = 'Et plus')"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-700 dark:text-slate-300 mb-1">
              Délai de remboursement *
            </label>
            <input
              type="text"
              required
              value={delai}
              onChange={(e) => setDelai(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900 dark:bg-slate-800 dark:border-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/20"
              placeholder="Ex: 1 mois"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-700 dark:text-slate-300 mb-1">
              Taux d'intérêt (%) *
            </label>
            <input
              type="number"
              required
              value={taux}
              onChange={(e) => setTaux(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900 dark:bg-slate-800 dark:border-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/20"
              placeholder="Ex: 20"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-sm font-semibold rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 transition disabled:opacity-50"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 px-5 py-2 text-sm font-semibold rounded-xl bg-blue-600 hover:bg-blue-700 text-white transition shadow-sm disabled:opacity-50"
          >
            {isSubmitting ? 'Ajout...' : 'Ajouter le palier'}
          </button>
        </div>
      </form>
    </Modal>
  );
}