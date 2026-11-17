'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, User } from 'lucide-react';
import Modal from '@/src/components/ui/Modal';

export interface MembrePenalite {
  id: string;
  nomComplet: string;
  telephone: string;
  soldePenalites: number;
}

interface PayPenaliteModalProps {
  isOpen: boolean;
  onClose: () => void;
  membres: MembrePenalite[];
  isSubmitting: boolean;
  onSubmit: (membreId: string, montantVerse: number, modePaiement: string) => Promise<void>;
}

const formatMontant = (montant: number) => montant.toLocaleString('fr-FR');

export default function PayPenaliteModal({
  isOpen,
  onClose,
  membres,
  isSubmitting,
  onSubmit,
}: PayPenaliteModalProps) {
  const [membreId, setMembreId] = useState('');
  const [montant, setMontant] = useState('');
  const [modePaiement, setModePaiement] = useState('CASH');

  useEffect(() => {
    if (isOpen) {
      setMembreId('');
      setMontant('');
      setModePaiement('CASH');
    }
  }, [isOpen]);

  const membreSelectionne = useMemo(
    () => membres.find((membre) => membre.id === membreId),
    [membres, membreId]
  );
  const montantNumerique = Number(montant);
  const montantValide = Number.isSafeInteger(montantNumerique) && montantNumerique > 0;
  const depasseSolde = !!membreSelectionne && montantNumerique > membreSelectionne.soldePenalites;
  const paiementComplet = !!membreSelectionne &&
    montantValide &&
    montantNumerique === membreSelectionne.soldePenalites;

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!membreSelectionne || !montantValide || depasseSolde || isSubmitting) return;
    await onSubmit(membreId, montantNumerique, modePaiement);
  };

  return (
    <Modal isOpen={isOpen} onClose={() => !isSubmitting && onClose()} title="Payer une pénalité" maxWidth="md">
      <form onSubmit={handleSubmit} className="space-y-5">
        {membres.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center dark:border-slate-700">
            <AlertCircle className="mx-auto mb-2 text-slate-400" size={24} />
            <p className="text-sm text-slate-600 dark:text-slate-300">Aucun membre n’a de pénalité à payer.</p>
          </div>
        ) : (
          <>
            <div>
              <label className="mb-1.5 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                <User size={14} /> Membre avec une pénalité
              </label>
              <select
                value={membreId}
                onChange={(event) => {
                  setMembreId(event.target.value);
                  setMontant('');
                }}
                required
                disabled={isSubmitting}
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-slate-200 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus:ring-slate-700"
              >
                <option value="">-- Choisir un membre --</option>
                {membres.map((membre) => (
                  <option key={membre.id} value={membre.id}>
                    {membre.nomComplet}{membre.telephone ? ` (${membre.telephone})` : ''} — dû : {formatMontant(membre.soldePenalites)} FC
                  </option>
                ))}
              </select>
            </div>

            {membreSelectionne && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/60 dark:bg-amber-950/30">
                <p className="text-xs font-semibold uppercase tracking-wide text-amber-800 dark:text-amber-300">Solde des pénalités</p>
                <p className="mt-1 text-lg font-bold text-amber-900 dark:text-amber-200">{formatMontant(membreSelectionne.soldePenalites)} FC</p>
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">Montant payé (FC)</label>
                <input
                  type="number"
                  min="1"
                  max={membreSelectionne?.soldePenalites}
                  step="1"
                  value={montant}
                  onChange={(event) => setMontant(event.target.value)}
                  required
                  disabled={!membreSelectionne || isSubmitting}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-slate-200 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus:ring-slate-700"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">Mode de paiement</label>
                <select
                  value={modePaiement}
                  onChange={(event) => setModePaiement(event.target.value)}
                  disabled={isSubmitting}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-slate-200 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus:ring-slate-700"
                >
                  <option value="CASH">Espèces</option>
                  <option value="MOBILE_MONEY">Mobile Money</option>
                  <option value="VIREMENT">Virement</option>
                  <option value="AUTRE">Autre</option>
                </select>
              </div>
            </div>

            {montant !== '' && (
              <div className={`rounded-xl px-4 py-3 text-sm ${
                depasseSolde
                  ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300'
                  : paiementComplet
                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                    : montantValide
                      ? 'bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300'
                      : 'bg-slate-50 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
              }`}>
                {depasseSolde
                  ? 'Le montant dépasse le solde dû.'
                  : paiementComplet
                    ? 'Le solde sera entièrement payé.'
                    : montantValide
                      ? 'Paiement partiel : le solde restant sera conservé comme en cours de paiement.'
                      : 'Saisissez un montant entier supérieur à zéro.'}
              </div>
            )}

            <div className="flex justify-end gap-3 border-t border-slate-200 pt-4 dark:border-slate-800">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={!membreSelectionne || !montantValide || depasseSolde || isSubmitting}
                className="rounded-xl bg-blue-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-slate-200 dark:text-slate-900"
              >
                {isSubmitting ? 'Enregistrement...' : 'Enregistrer le paiement'}
              </button>
            </div>
          </>
        )}
      </form>
    </Modal>
  );
}
