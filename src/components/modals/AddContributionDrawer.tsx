'use client';

import { Membre } from '@/src/types';
import React, { useState } from 'react';
import Drawer from '../ui/Drawer';
import { PiggyBank, Calendar as CalendarIcon, CreditCard, FileText, CheckCircle2, User, Check } from 'lucide-react';

interface AddContributionDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  membres: Membre[];
  montantMensuelDefaut?: number; // Ex: 5000 FC par mois
  onSubmit: (data: { 
    membreId: string; 
    nombreMois: number; 
    moisSelectionnes: string[]; 
    modePaiement: string; 
    note: string 
  }) => void;
}

export default function AddContributionDrawer({
  isOpen,
  onClose,
  membres,
  montantMensuelDefaut = 5000,
  onSubmit,
}: AddContributionDrawerProps) {
  const [membreId, setMembreId] = useState('');
  const [moisDebut, setMoisDebut] = useState(() => {
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${now.getFullYear()}-${month}`; // Format YYYY-MM
  });
  const [nombreMois, setNombreMois] = useState(1);
  const [modePaiement, setModePaiement] = useState('CASH');
  const [note, setNote] = useState('');

  // Génération automatique des mois couverts à partir du mois de début choisi
  const genererMoisCouverts = () => {
    if (!moisDebut) return [];
    const [yearStr, monthStr] = moisDebut.split('-');
    let year = parseInt(yearStr, 10);
    let month = parseInt(monthStr, 10) - 1; // 0-indexé

    const result: string[] = [];
    for (let i = 0; i < nombreMois; i++) {
      const date = new Date(year, month + i, 1);
      const mStr = String(date.getMonth() + 1).padStart(2, '0');
      const yStr = date.getFullYear();
      const moisNom = date.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' });
      result.push(`${yStr}-${mStr} (${moisNom})`);
    }
    return result;
  };

  const moisCouverts = genererMoisCouverts();
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
      moisSelectionnes: moisCouverts,
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
      <form onSubmit={handleSubmit} className="space-y-5 p-1">
        {/* Sélection du Membre */}
        <div>
          <label className="mb-1.5 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            <User size={14} className="text-blue-500" />
            Sélectionner le Membre
          </label>
          <select
            value={membreId}
            onChange={(e) => setMembreId(e.target.value)}
            required
            className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          >
            <option value="">-- Choisir un membre --</option>
            {membres.map((m) => (
              <option key={m.id} value={m.id}>
                {m.nomComplet || `${m.prenom} ${m.nom}`} ({m.telephone})
              </option>
            ))}
          </select>
        </div>

        {/* Choix du Mois de début & Nombre de mois */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="mb-1.5 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              <CalendarIcon size={14} className="text-blue-500" />
              A partir du mois
            </label>
            <input
              type="month"
              value={moisDebut}
              onChange={(e) => setMoisDebut(e.target.value)}
              required
              className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label className="mb-1.5 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Nombre de mois
            </label>
            <input
              type="number"
              min="1"
              value={nombreMois}
              onChange={(e) => setNombreMois(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            />
          </div>
        </div>

        {/* Aperçu sous forme de Calendrier/Badges des mois couverts */}
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Mois qui seront marqués comme PAYÉS :
          </label>
          <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto p-2 rounded-xl border border-slate-100 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/50">
            {moisCouverts.map((mois, index) => (
              <span
                key={index}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300 border border-blue-200 dark:border-blue-800/50"
              >
                <Check size={12} className="text-blue-600 dark:text-blue-400" />
                {mois.split(' ')[1] ? mois.split(' ')[1].replace('(', '').replace(')', '') : mois}
              </span>
            ))}
          </div>
        </div>

        {/* Affichage automatique du montant calculé */}
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-2 space-y-1 dark:border-emerald-500/20 dark:bg-emerald-500/10">
          <p className=" font-extrabold text-green-700 dark:text-emerald-300 flex items-center gap-2">
            <h1 className='text-sm'>Montant total payé: </h1> <h1 className='font-bold text-green-700'>{montantTotal.toLocaleString()}</h1> <span className="text-lg font-bold">FC</span>
          </p>
        </div>


        {/* Boutons d'action */}
        <div className="flex justify-end gap-3 border-t border-slate-200 pt-4 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Annuler
          </button>
          <button
            type="submit"
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm shadow-blue-500/20 transition hover:bg-blue-700"
          >
            <CheckCircle2 size={16} />
            Valider le versement
          </button>
        </div>
      </form>
    </Drawer>
  );
}