'use client';

import React, { useMemo, useState } from 'react';
import { CalendarDays, CheckCircle2, User } from 'lucide-react';
import type { AllocationCotisation, Membre } from '@/src/types';
import {
  genererEtatsMoisCotisation,
  normaliserMoisSpecial,
  repartirPaiementNormal,
  repartirPaiementSpecial,
  type ContributionPaymentRecord,
} from '@/src/lib/contribution-payments';
import { DATE_DEBUT_CAISSE_PAR_DEFAUT } from '@/src/lib/contribution-months';
import Modal from '../ui/Modal';

interface AddContributionDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  membres: Membre[];
  contributions: (ContributionPaymentRecord & { membreId?: string })[];
  montantMensuelDefaut?: number;
  montantMoisSpecial?: number;
  moisSpecialConfigure?: string;
  typeContribution?: 'standard' | 'mois-special';
  dateDebutCaisse?: string;
  onSubmit: (data: {
    membreId: string;
    nombreMois: number;
    moisSelectionnes: string[];
    montantVerse: number;
    repartition: AllocationCotisation[];
    modePaiement: string;
    note: string;
    typeContribution?: 'standard' | 'mois-special';
    moisSpecial?: string;
  }) => void;
}

const monthKeyFor = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

const formatMonth = (monthKey: string) => {
  const [year, month] = monthKey.split('-').map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
};

export default function AddContributionDrawer({
  isOpen,
  onClose,
  membres,
  contributions,
  montantMensuelDefaut = 5000,
  montantMoisSpecial = 10000,
  moisSpecialConfigure = '',
  typeContribution = 'standard',
  dateDebutCaisse = DATE_DEBUT_CAISSE_PAR_DEFAUT,
  onSubmit,
}: AddContributionDrawerProps) {
  const [membreId, setMembreId] = useState('');
  const [montantSaisi, setMontantSaisi] = useState('');
  const [moisSpecialChoisi, setMoisSpecialChoisi] = useState('');
  const [modePaiement, setModePaiement] = useState('CASH');

  const futureMonths = typeContribution === 'mois-special'
    ? 120
    : Math.ceil((Math.max(0, Number(montantSaisi)) / Math.max(1, montantMensuelDefaut)) * 12 / 11) + 12;
  const monthStates = useMemo(() => {
    const memberContributions = contributions.filter((contribution) => contribution.membreId === membreId);
    const forecastEnd = new Date();
    forecastEnd.setMonth(forecastEnd.getMonth() + futureMonths);
    return genererEtatsMoisCotisation(
      memberContributions,
      dateDebutCaisse,
      monthKeyFor(forecastEnd),
      montantMensuelDefaut,
      normaliserMoisSpecial(moisSpecialConfigure),
      montantMoisSpecial
    );
  }, [contributions, dateDebutCaisse, futureMonths, membreId, montantMensuelDefaut, montantMoisSpecial, moisSpecialConfigure]);

  const preview = useMemo(
    () => repartirPaiementNormal(Number(montantSaisi), monthStates),
    [montantSaisi, monthStates]
  );
  const availableSpecialMonths = monthStates.filter((month) =>
    month.type === 'SPECIALE' && month.statut !== 'PAYE'
  );
  const selectedSpecialMonth = availableSpecialMonths.find((month) => month.mois === moisSpecialChoisi)
    ?? availableSpecialMonths[0];
  const specialAllocation = selectedSpecialMonth
    ? repartirPaiementSpecial(Number(montantSaisi), selectedSpecialMonth)
    : null;
  const specialRemaining = selectedSpecialMonth
    ? Math.max(0, selectedSpecialMonth.montantRequis - selectedSpecialMonth.montantPaye)
    : 0;

  const handleClose = () => {
    setMembreId('');
    setMontantSaisi('');
    setMoisSpecialChoisi('');
    setModePaiement('CASH');
    onClose();
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const amount = Number(montantSaisi);
    if (!membreId) {
      alert('Veuillez sélectionner un membre.');
      return;
    }
    if (!Number.isSafeInteger(amount) || amount <= 0) {
      alert('Saisissez un montant entier supérieur à zéro.');
      return;
    }

    if (typeContribution === 'mois-special') {
      if (!selectedSpecialMonth || !specialAllocation) {
        alert('Aucun mois spécial impayé n’est disponible pour ce membre.');
        return;
      }
      if (amount > specialRemaining) {
        alert(`Le montant dépasse le solde de ce mois spécial (${specialRemaining.toLocaleString('fr-FR')} FC).`);
        return;
      }
      onSubmit({
        membreId,
        nombreMois: 0,
        moisSelectionnes: [],
        montantVerse: amount,
        repartition: [specialAllocation],
        modePaiement,
        note: '',
        typeContribution,
        moisSpecial: selectedSpecialMonth.mois,
      });
    } else {
      if (preview.allocations.length === 0 || preview.montantRestant > 0) {
        alert('Aucun mois normal disponible pour affecter la totalité de ce montant.');
        return;
      }
      onSubmit({
        membreId,
        nombreMois: preview.moisSoldes.length,
        moisSelectionnes: preview.moisSoldes,
        montantVerse: amount,
        repartition: preview.allocations,
        modePaiement,
        note: '',
      });
    }

    setMembreId('');
    setMontantSaisi('');
    setModePaiement('CASH');
    onClose();
  };

  const allocations = typeContribution === 'mois-special'
    ? specialAllocation ? [specialAllocation] : []
    : preview.allocations;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={typeContribution === 'mois-special' ? 'Enregistrer un Mois spécial' : 'Enregistrer une Contribution'}
    >
      <form onSubmit={handleSubmit} className="space-y-5 p-1">
        <div>
          <label className="mb-1.5 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            <User size={14} className="" />
            Sélectionner le membre
          </label>
          <select
            value={membreId}
            onChange={(event) => setMembreId(event.target.value)}
            required
            className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          >
            <option value="">-- Choisir un membre --</option>
            {membres.map((membre) => (
              <option key={membre.id} value={membre.id}>
                {membre.nomComplet || `${membre.prenom} ${membre.nom}`}
              </option>
            ))}
          </select>
        </div>

        {typeContribution === 'mois-special' && (
          <div>
            <label className="mb-1.5 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              <CalendarDays size={14} className="" />
              Année du mois spécial
            </label>
            <select
              value={selectedSpecialMonth?.mois || ''}
              onChange={(event) => setMoisSpecialChoisi(event.target.value)}
              required
              disabled={availableSpecialMonths.length === 0}
              className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            >
              {availableSpecialMonths.length === 0 ? (
                <option value="">Aucun mois spécial impayé</option>
              ) : availableSpecialMonths.map((month) => (
                <option key={month.mois} value={month.mois}>{formatMonth(month.mois)}</option>
              ))}
            </select>
            <p className="mt-1 text-xs text-slate-500">
              Montant requis : {montantMoisSpecial.toLocaleString('fr-FR')} FC. Les versements partiels sont acceptés.
            </p>
          </div>
        )}

        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            Montant à payer (FC)
          </label>
          <input
            type="number"
            min="1"
            step="1"
            required
            value={montantSaisi}
            onChange={(event) => setMontantSaisi(event.target.value)}
            placeholder="Ex. 35 000"
            className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:ring-2  dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          />
        </div>

        <div className="rounded-xl flex flex-col gap-1 border border-slate-200 bg-slate-50 px-4 py-3 text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
          {typeContribution === 'mois-special' ? (
            <p className="text-sm ">
              Solde après ce versement : {Math.max(0, specialRemaining - (specialAllocation?.montantVerse || 0)).toLocaleString('fr-FR')} FC
            </p>
          ) : (
            <>
              <p className="text-sm font-semibold ">
                {preview.moisSoldes.length} mois soldé{preview.moisSoldes.length > 1 ? 's' : ''}
                {preview.moisEnCours ? ` · avance de ${preview.montantAvance.toLocaleString('fr-FR')} FC sur ${formatMonth(preview.moisEnCours)}` : ''}
              </p>
              {preview.montantRestant > 0 && (
                <div className="mt-1 flex items-center justify-between gap-2 text-xs">
                  <span>Montant non affecté :</span>
                  <span className="font-medium tabular-nums">
                    {preview.montantRestant.toLocaleString('fr-FR')} FC
                  </span>
                </div>
              )}
            </>
          )}
          {allocations.length > 0 && (
            <ul className="mt-2 space-y-1 text-xs ">
              {allocations.map((allocation) => (
                <li key={allocation.mois}>
                  {formatMonth(allocation.mois)} : {allocation.montantVerse.toLocaleString('fr-FR')} FC
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">Mode de paiement</label>
          <select value={modePaiement} onChange={(event) => setModePaiement(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white">
            <option value="CASH">Cash</option>
            {/* <option value="MOBILE_MONEY">Mobile Money</option>
            <option value="VIREMENT">Virement</option> */}
          </select>
        </div>

        <div className="flex justify-end gap-3 border-t border-slate-200 pt-4 dark:border-slate-800">
          <button type="button" onClick={handleClose} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-300">
            Annuler
          </button>
          <button
            type="submit"
            disabled={!membreId || !Number(montantSaisi) || (typeContribution === 'mois-special' && (!selectedSpecialMonth || !specialAllocation))}
            className="inline-flex items-center gap-2 rounded-xl  px-5 py-2.5 text-sm font-semibold text-white hover:bg-gray-600 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-slate-200 dark:text-slate-900"
          >
            <CheckCircle2 size={16} />
            Valider le versement
          </button>
        </div>
      </form>
    </Modal>
  );
}
