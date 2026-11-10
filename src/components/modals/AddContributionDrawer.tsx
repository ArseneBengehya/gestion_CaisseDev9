'use client';

import { Membre } from '@/src/types';
import React, { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, User, Check, CheckCircle2, ChevronLeft, ChevronRight } from 'lucide-react';
import Modal from '../ui/Modal';

interface AddContributionDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  membres: Membre[];
  montantMensuelDefaut?: number;
  dateDebutCaisse?: string; // Ex: "2024-08-09"
  moisDejaPayesParMembre?: Record<string, string[]>; // Ex: { membreId: ["2025-01", "2025-02"] }
  onSubmit: (data: {
    membreId: string;
    nombreMois: number;
    moisSelectionnes: string[];
    modePaiement: string;
    note: string;
  }) => void;
}

const MOIS_COURTS = ['Janv.', 'Févr.', 'Mars', 'Avr.', 'Mai', 'Juin', 'Juil.', 'Août', 'Sept.', 'Oct.', 'Nov.', 'Déc.'];
const MOIS_LONGS = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];

const makeKey = (year: number, monthIndex: number) =>
  `${year}-${String(monthIndex + 1).padStart(2, '0')}`;

const labelFromKey = (key: string) => {
  const [y, m] = key.split('-').map(Number);
  return `${MOIS_LONGS[m - 1]} ${y}`;
};

export default function AddContributionDrawer({
  isOpen,
  onClose,
  membres,
  montantMensuelDefaut = 0,
  dateDebutCaisse = '',
  moisDejaPayesParMembre = {},
  onSubmit,
}: AddContributionDrawerProps) {
  const startKey = dateDebutCaisse ? dateDebutCaisse.substring(0, 7) : '2025-01';
  const startYear = parseInt(startKey.split('-')[0], 10);
  const currentYear = new Date().getFullYear();
  const maxYear = Math.max(currentYear, startYear) + 3;

  const [membreId, setMembreId] = useState('');
  const [annee, setAnnee] = useState(Math.max(startYear, currentYear));
  const [selection, setSelection] = useState<string[]>([]);
  const [modePaiement, setModePaiement] = useState('CASH');
  const [note, setNote] = useState('');

  const paidSet = new Set(moisDejaPayesParMembre[membreId] ?? []);

  // Réinitialisation à chaque ouverture du modal
  useEffect(() => {
    if (isOpen) {
      setMembreId('');
      setSelection([]);
      setModePaiement('CASH');
      setNote('');
      setAnnee(Math.max(startYear, currentYear));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Au changement de membre : on vide la sélection et on affiche l'année du premier mois impayé
  useEffect(() => {
    setSelection([]);
    if (!membreId) return;

    const paid = new Set(moisDejaPayesParMembre[membreId] ?? []);
    let y = startYear;
    let m = parseInt(startKey.split('-')[1], 10) - 1;

    for (let i = 0; i < 600; i++) {
      if (!paid.has(makeKey(y, m))) break;
      m++;
      if (m > 11) {
        m = 0;
        y++;
      }
    }
    setAnnee(Math.min(y, maxYear));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [membreId]);

  const toggleMois = (key: string) => {
    setSelection((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key].sort()
    );
  };

  const nombreMois = selection.length;
  const montantTotal = nombreMois * montantMensuelDefaut;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!membreId) {
      alert('Veuillez sélectionner un membre.');
      return;
    }
    if (selection.length === 0) {
      alert('Veuillez sélectionner au moins un mois à payer.');
      return;
    }

    onSubmit({
      membreId,
      nombreMois,
      moisSelectionnes: selection,
      modePaiement,
      note,
    });

    setMembreId('');
    setSelection([]);
    setModePaiement('CASH');
    setNote('');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Enregistrer une Contribution">
      <form onSubmit={handleSubmit} className="space-y-4 p-1">
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
            <option value="">Choisir un membre</option>
            {membres.map((m) => (
              <option key={m.id} value={m.id}>
                {m.nomComplet || `${m.prenom} ${m.nom}`}
              </option>
            ))}
          </select>
        </div>

        {/* Grille des mois (compacte) */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              <CalendarIcon size={14} className="text-blue-500" />
              Choisir les mois à payer
            </label>

            <div className="flex items-center gap-0.5">
              <button
                type="button"
                onClick={() => setAnnee((a) => Math.max(startYear, a - 1))}
                disabled={annee <= startYear}
                className="rounded-md p-1 text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-30 dark:text-slate-300 dark:hover:bg-slate-800"
                aria-label="Année précédente"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="min-w-[3rem] text-center text-sm font-bold text-slate-900 dark:text-white">{annee}</span>
              <button
                type="button"
                onClick={() => setAnnee((a) => Math.min(maxYear, a + 1))}
                disabled={annee >= maxYear}
                className="rounded-md p-1 text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-30 dark:text-slate-300 dark:hover:bg-slate-800"
                aria-label="Année suivante"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-6">
            {MOIS_COURTS.map((nom, i) => {
              const key = makeKey(annee, i);
              const dejaPaye = !!membreId && paidSet.has(key);
              const avantDebut = key < startKey;
              const choisi = selection.includes(key);
              const disabled = !membreId || dejaPaye || avantDebut;

              let style =
                'border-slate-200 bg-white text-slate-800 hover:border-blue-400 hover:bg-blue-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800';
              if (choisi) {
                style = 'border-blue-600 bg-blue-600 text-white shadow-sm dark:border-blue-500 dark:bg-blue-600';
              } else if (dejaPaye) {
                style =
                  'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-500';
              } else if (avantDebut || !membreId) {
                style =
                  'cursor-not-allowed border-slate-100 bg-slate-50 text-slate-300 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-600';
              }

              return (
                <button
                  key={key}
                  type="button"
                  disabled={disabled}
                  onClick={() => toggleMois(key)}
                  title={dejaPaye ? 'Déjà payé' : avantDebut ? 'Avant le lancement de la caisse' : labelFromKey(key)}
                  className={`flex h-8 items-center justify-center gap-1 rounded-lg border px-1.5 text-xs font-semibold transition ${style}`}
                >
                  {nom}
                  {dejaPaye && <Check size={11} className="shrink-0" />}
                </button>
              );
            })}
          </div>

          <p className="mt-2 text-[11px] leading-snug text-slate-500 dark:text-slate-400">
            {membreId
              ? 'En gris : mois déjà payés (✓) ou antérieurs au lancement de la caisse.'
              : 'Sélectionnez d’abord un membre pour voir les mois disponibles.'}{' '}
            Début de la caisse : <span className="font-semibold text-blue-600 dark:text-blue-400">{labelFromKey(startKey)}</span>
          </p>
        </div>

        {/* Aperçu des mois choisis */}
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Mois qui seront marqués comme PAYÉS ({nombreMois}) :
          </label>
          <div className="flex max-h-20 min-h-[2.5rem] flex-wrap gap-1.5 overflow-y-auto rounded-xl border border-slate-100 bg-slate-50 p-2 dark:border-slate-800 dark:bg-slate-900/50">
            {selection.length === 0 ? (
              <span className="px-1 py-0.5 text-xs text-slate-400">Aucun mois sélectionné.</span>
            ) : (
              selection.map((key) => (
                <span
                  key={key}
                  className="inline-flex items-center gap-1 rounded-md border border-blue-200 bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800 dark:border-blue-800/50 dark:bg-blue-950/80 dark:text-blue-300"
                >
                  <Check size={11} className="text-blue-600 dark:text-blue-400" />
                  {labelFromKey(key)}
                </span>
              ))
            )}
          </div>
        </div>

        {/* Montant calculé */}
        <div className="space-y-1 rounded-xl border border-emerald-200 bg-emerald-50/60 p-3 dark:border-emerald-500/20 dark:bg-emerald-500/10">
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
            disabled={selection.length === 0}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-800 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-slate-200 dark:text-slate-900 dark:hover:bg-white"
          >
            <CheckCircle2 size={16} />
            Valider le versement
          </button>
        </div>
      </form>
    </Modal>
  );
}