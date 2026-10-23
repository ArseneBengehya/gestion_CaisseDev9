'use client';

import { Depense } from '@/src/types';
import React, { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
// import Modal from '@/components/ui/Modal';
// import { Depense } from '@/types';

interface EditDepenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  depense: Depense | null;
  onSubmit: (depenseModifiee: Depense) => void;
}

export default function EditDepenseModal({
  isOpen,
  onClose,
  depense,
  onSubmit,
}: EditDepenseModalProps) {
  const [motif, setMotif] = useState('');
  const [montant, setMontant] = useState('');
  const [categorie, setCategorie] = useState('Logistique');
  const [approuvePar, setApprouvePar] = useState('');

  // Remplir le formulaire avec les données existantes
  useEffect(() => {
    if (depense) {
      setMotif(depense.motif);
      setMontant(depense.montant.toString());
      setCategorie(depense.categorie);
      setApprouvePar(depense.approuvePar);
    }
  }, [depense]);

  if (!depense) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!motif || !montant || !approuvePar) {
      alert('Veuillez remplir tous les champs.');
      return;
    }

    onSubmit({
      ...depense,
      motif,
      montant: parseFloat(montant),
      categorie,
      approuvePar,
    });

    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Modifier la Dépense" maxWidth="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Motif de la dépense</label>
          <input
            type="text"
            required
            value={motif}
            onChange={(e) => setMotif(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Montant (FC)</label>
          <input
            type="number"
            required
            min="1"
            value={montant}
            onChange={(e) => setMontant(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Catégorie</label>
          <select
            value={categorie}
            onChange={(e) => setCategorie(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="Logistique">Logistique</option>
            <option value="Événement">Événement</option>
            <option value="Aide Sociale">Aide Sociale</option>
            <option value="Transport">Transport</option>
            <option value="Autre">Autre</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Approuvé par</label>
          <input
            type="text"
            required
            value={approuvePar}
            onChange={(e) => setApprouvePar(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            Annuler
          </button>
          <button
            type="submit"
            className="px-4 py-2 text-sm font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-lg shadow-sm transition-colors"
          >
            Mettre à jour
          </button>
        </div>
      </form>
    </Modal>
  );
}