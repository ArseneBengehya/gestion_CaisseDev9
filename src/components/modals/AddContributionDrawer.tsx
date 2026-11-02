'use client';

import { Membre } from '@/src/types';
import React, { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, User, Check, CheckCircle2 } from 'lucide-react';
import Modal from '../ui/Modal';

interface AddContributionDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  membres: Membre[];
  montantMensuelDefaut?: number;
  dateDebutCaisse?: string; // Ex: "2024-08-09"
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
  dateDebutCaisse = '2025-01-01',
  onSubmit,
}: AddContributionDrawerProps) {
  const [membreId, setMembreId] = useState('');
  
  // Extraction propre de l'année et du mois (ex: "2024-08-09" -> "2024-08")
  const formatMoisAnnee = (dateStr: string) => {
    if (!dateStr) return '2025-01';
    return dateStr.substring(0, 7);
  };

  const minMoisCaisse = formatMoisAnnee(dateDebutCaisse);

  const [moisDebut, setMoisDebut] = useState(minMoisCaisse);
  const [nombreMois, setNombreMois] = useState(1);
  const [modePaiement, setModePaiement] = useState('CASH');
  const [note, setNote] = useState('');

  // ⚠️ CRUCIAL : Met à jour le mois de début à chaque fois que le modal s'ouvre OU que la config Firestore change
  useEffect(() => {
    if (dateDebutCaisse) {
      const nouveauMin = formatMoisAnnee(dateDebutCaisse);
      setMoisDebut(nouveauMin);
    }
  }, [isOpen, dateDebutCaisse]);

  // Génération des mois payés
  const genererMoisCouverts = () => {
    if (!moisDebut) return [];
    const [yearStr, monthStr] = moisDebut.split('-');
    let year = parseInt(yearStr, 10);
    let month = parseInt(monthStr, 10) - 1;

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

    if (moisDebut < minMoisCaisse) {
      alert(`Impossible de choisir un mois antérieur au lancement de la caisse (${minMoisCaisse}).`);
      return;
    }

    onSubmit({
      membreId,
      nombreMois,
      moisSelectionnes: moisCouverts,
      modePaiement,
      note,
    });

    setMembreId('');
    setNombreMois(1);
    setModePaiement('CASH');
    setNote('');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Enregistrer une Contribution">
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
              À partir du mois de :
            </label>
            <input
              type="month"
              value={moisDebut}
              min={minMoisCaisse} 
              onChange={(e) => setMoisDebut(e.target.value)}
              required
              className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            />
            <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
              Début de la caisse : <span className="font-semibold text-blue-600 dark:text-blue-400">{minMoisCaisse}</span>
            </p>
          </div>

          <div>
            <label className="mb-1.5 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Nombre de mois
            </label>
            <input
              type="number"
              placeholder="Entrer le nombre de mois"
              min="1"
              value={nombreMois}
              onChange={(e) => setNombreMois(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            />
          </div>
        </div>

        {/* Aperçu sous forme de Badges des mois couverts */}
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Mois qui seront marqués comme PAYÉS :
          </label>
          <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto p-2 rounded-xl border border-slate-100 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/50">
            {moisCouverts.map((mois, index) => (
              <span
                key={index}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300 border border-blue-200 dark:border-blue-800/50"
              >
                <Check size={12} className="text-blue-600 dark:text-blue-400" />
                {mois}
              </span>
            ))}
          </div>
        </div>

        {/* Affichage automatique du montant calculé */}
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3 space-y-1 dark:border-emerald-500/20 dark:bg-emerald-500/10">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
              Montant total à verser :
            </span>
            <span className="text-base font-extrabold text-emerald-700 dark:text-emerald-300">
              {montantTotal.toLocaleString()} FC
            </span>
          </div>
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
            className="inline-flex items-center gap-2 rounded-xl bg-slate-800 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-700 dark:bg-slate-200 dark:text-slate-900 dark:hover:bg-white"
          >
            <CheckCircle2 size={16} />
            Valider le versement
          </button>
        </div>
      </form>
    </Modal>
  );
}