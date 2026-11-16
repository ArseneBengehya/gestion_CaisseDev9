'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, HandCoins, User } from 'lucide-react';
import { Emprunt } from '@/src/types';
import Modal from '@/src/components/ui/Modal';

interface PayEmpruntModalProps {
  isOpen: boolean;
  onClose: () => void;
  emprunts: Emprunt[];
  isSubmitting: boolean;
  onSubmit: (empruntId: string, montantVerse: number, modePaiement: string) => Promise<void>;
}

const montantRestantPour = (emprunt: Emprunt): number =>
  Math.max(0, Number(emprunt.montantRestant ?? (emprunt.montantTotalARembourser - (emprunt.montantPaye || 0))) || 0);

export default function PayEmpruntModal({
  isOpen,
  onClose,
  emprunts,
  isSubmitting,
  onSubmit,
}: PayEmpruntModalProps) {
  const [membreId, setMembreId] = useState('');
  const [empruntId, setEmpruntId] = useState('');
  const [montant, setMontant] = useState('');
  const [modePaiement, setModePaiement] = useState('CASH');

  const empruntsActifs = useMemo(
    () => emprunts.filter((emprunt) => montantRestantPour(emprunt) > 0),
    [emprunts]
  );
  const membresAvecEmprunt = useMemo(
    () => Array.from(new Map(empruntsActifs.map((emprunt) => [
      emprunt.membreId,
      { id: emprunt.membreId, nom: emprunt.nomMembre },
    ])).values()),
    [empruntsActifs]
  );
  const empruntsMembre = empruntsActifs.filter((emprunt) => emprunt.membreId === membreId);
  const empruntSelectionne = empruntsMembre.find((emprunt) => emprunt.id === empruntId) || null;
  const montantNumerique = Number(montant);
  const montantValide = Number.isSafeInteger(montantNumerique) && montantNumerique > 0;
  const depasseSolde = !!empruntSelectionne && montantNumerique > montantRestantPour(empruntSelectionne);

  useEffect(() => {
    if (isOpen) {
      setMembreId('');
      setEmpruntId('');
      setMontant('');
      setModePaiement('CASH');
    }
  }, [isOpen]);

  useEffect(() => {
    if (empruntsMembre.length === 1) setEmpruntId(empruntsMembre[0].id);
    else if (!empruntsMembre.some((emprunt) => emprunt.id === empruntId)) setEmpruntId('');
  }, [empruntsMembre, empruntId]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!empruntSelectionne || !montantValide || depasseSolde || isSubmitting) return;
    await onSubmit(empruntSelectionne.id, montantNumerique, modePaiement);
  };

  return (
    <Modal isOpen={isOpen} onClose={() => !isSubmitting && onClose()} title="Enregistrer un remboursement" maxWidth="md">
      <form onSubmit={handleSubmit} className="space-y-5">
        {membresAvecEmprunt.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center dark:border-slate-700">
            <AlertCircle className="mx-auto mb-2 text-slate-400" size={24} />
            <p className="text-sm text-slate-600 dark:text-slate-300">Aucun emprunt ne reste à rembourser.</p>
          </div>
        ) : (
          <>
            <div>
              <label className="mb-1.5 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                <User size={14} /> Membre ayant un emprunt
              </label>
              <select
                value={membreId}
                onChange={(event) => {
                  setMembreId(event.target.value);
                  setEmpruntId('');
                  setMontant('');
                }}
                required
                disabled={isSubmitting}
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-slate-200 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              >
                <option value="">-- Choisir un membre --</option>
                {membresAvecEmprunt.map((membre) => (
                  <option key={membre.id} value={membre.id}>{membre.nom}</option>
                ))}
              </select>
            </div>

            {membreId && empruntsMembre.length > 1 && (
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">Emprunt à rembourser</label>
                <select
                  value={empruntId}
                  onChange={(event) => {
                    setEmpruntId(event.target.value);
                    setMontant('');
                  }}
                  required
                  disabled={isSubmitting}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-slate-200 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                >
                  <option value="">-- Choisir un emprunt --</option>
                  {empruntsMembre.map((emprunt) => (
                    <option key={emprunt.id} value={emprunt.id}>
                      {emprunt.montantEmprunte.toLocaleString('fr-FR')} FC empruntés — solde {montantRestantPour(emprunt).toLocaleString('fr-FR')} FC
                    </option>
                  ))}
                </select>
              </div>
            )}

            {empruntSelectionne && (
              <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-900/60 dark:bg-blue-950/30">
                <p className="text-xs font-semibold uppercase tracking-wide text-blue-800 dark:text-blue-300">Solde à rembourser</p>
                <p className="mt-1 text-lg font-bold text-blue-900 dark:text-blue-200">{montantRestantPour(empruntSelectionne).toLocaleString('fr-FR')} FC</p>
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  <HandCoins size={14} /> Montant payé (FC)
                </label>
                <input
                  type="number"
                  min="1"
                  max={empruntSelectionne ? montantRestantPour(empruntSelectionne) : undefined}
                  step="1"
                  value={montant}
                  onChange={(event) => setMontant(event.target.value)}
                  required
                  disabled={!empruntSelectionne || isSubmitting}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-slate-200 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">Mode de paiement</label>
                <select
                  value={modePaiement}
                  onChange={(event) => setModePaiement(event.target.value)}
                  disabled={isSubmitting}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-slate-200 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                >
                  <option value="CASH">Espèces</option>
                  <option value="MOBILE_MONEY">Mobile Money</option>
                  <option value="VIREMENT">Virement</option>
                  <option value="AUTRE">Autre</option>
                </select>
              </div>
            </div>

            {montant !== '' && (
              <p className={`rounded-xl px-4 py-3 text-sm ${depasseSolde ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300' : 'bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300'}`}>
                {depasseSolde
                  ? 'Le montant dépasse le solde restant.'
                  : montantValide && empruntSelectionne && montantNumerique === montantRestantPour(empruntSelectionne)
                    ? 'Ce paiement mettra l’emprunt à jour.'
                    : montantValide
                      ? 'Le solde restant sera conservé en cours.'
                      : 'Saisissez un montant entier supérieur à zéro.'}
              </p>
            )}

            <div className="flex justify-end gap-3 border-t border-slate-200 pt-4 dark:border-slate-800">
              <button type="button" onClick={onClose} disabled={isSubmitting} className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50 dark:text-slate-300 dark:hover:bg-slate-800">Annuler</button>
              <button type="submit" disabled={!empruntSelectionne || !montantValide || depasseSolde || isSubmitting} className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-slate-900">
                {isSubmitting ? 'Enregistrement...' : 'Enregistrer le paiement'}
              </button>
            </div>
          </>
        )}
      </form>
    </Modal>
  );
}
