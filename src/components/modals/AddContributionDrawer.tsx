'use client';

import { Membre } from '@/src/types';
import React, { useState } from 'react';
import Drawer from '../ui/Drawer';

interface AddContributionDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  membres: Membre[];
  montantMensuelDefaut?: number; // Ex: 5000 FC par mois
  onSubmit: (data: { membreId: string; nombreMois: number; modePaiement: string; note: string }) => void;
}

export default function AddContributionDrawer({
  isOpen,
  onClose,
  membres,
  montantMensuelDefaut = 5000,
  onSubmit,
}: AddContributionDrawerProps) {
  const [membreId, setMembreId] = useState('');
  const [nombreMois, setNombreMois] = useState(1);
  const [modePaiement, setModePaiement] = useState('CASH');
  const [note, setNote] = useState('');

  const montantTotal = nombreMois * montantMensuelDefaut;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!membreId) {
      alert('Veuillez sélectionner un membre.');
      return;
    }

    onSubmit({
      membreId,
      nombreMois,
      modePaiement,
      note,
    });

    // Réinitialisation
    setMembreId('');
    setNombreMois(1);
    setModePaiement('CASH');
    setNote('');
    onClose();
  };

  return (
    <Drawer isOpen={isOpen} onClose={onClose} title="Enregistrer une Contribution">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Sélection du Membre */}
        <div>
          <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
            Sélectionner le Membre
          </label>
          <select
            value={membreId}
            onChange={(e) => setMembreId(e.target.value)}
            required
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="">-- Choisir un membre --</option>
            {membres.map((m) => (
              <option key={m.id} value={m.id}>
                {m.prenom} {m.nom} ({m.telephone})
              </option>
            ))}
          </select>
        </div>

        {/* Nombre de mois payés */}
        <div>
          <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
            Nombre de mois couverts
          </label>
          <input
            type="number"
            min="1"
            max="12"
            value={nombreMois}
            onChange={(e) => setNombreMois(parseInt(e.target.value) || 1)}
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Affichage automatique du montant calculé */}
        <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl space-y-1">
          <p className="text-xs font-medium text-blue-600 uppercase">Montant Total à Payer</p>
          <p className="text-2xl font-bold text-blue-900">
            {montantTotal.toLocaleString()} FC
          </p>
          <p className="text-xs text-blue-500">
            ({nombreMois} mois × {montantMensuelDefaut.toLocaleString()} FC)
          </p>
        </div>

        {/* Mode de paiement */}
        <div>
          <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
            Mode de Paiement
          </label>
          <select
            value={modePaiement}
            onChange={(e) => setModePaiement(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="CASH">Espèces (Cash)</option>
            <option value="MOBILE_MONEY">Mobile Money</option>
            <option value="VIREMENT">Virement Bancaire</option>
          </select>
        </div>

        {/* Note optionnelle */}
        <div>
          <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
            Note / Commentaire (Optionnel)
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            placeholder="Ex: Paiement en avance pour les mois de..."
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Boutons d'action */}
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
            className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors"
          >
            Valider le versement
          </button>
        </div>
      </form>
    </Drawer>
  );
}