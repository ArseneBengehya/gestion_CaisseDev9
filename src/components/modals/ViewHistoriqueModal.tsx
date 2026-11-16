'use client';

import React, { useState } from 'react';
import { Calendar, CreditCard, Clock } from 'lucide-react';
import { StatutMembreContribution } from '@/src/types';
import Modal from '../ui/Modal';

interface ViewHistoriqueModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: StatutMembreContribution | null;
}

export default function ViewHistoriqueModal({
  isOpen,
  onClose,
  data,
}: ViewHistoriqueModalProps) {
  const [isFullScreen, setIsFullScreen] = useState(true); // Par défaut en plein écran comme demandé

  if (!data) return null;
  const historyRows = [...(data.historiquePaiements || [])]
    .sort((a, b) => Date.parse(b.datePaiement) - Date.parse(a.datePaiement) || b.mois.localeCompare(a.mois));

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Historique des Contributions - ${data.membre.prenom} ${data.membre.nom}`}
      maxWidth="2xl"
      isFullScreen={isFullScreen}
      setIsFullScreen={setIsFullScreen}
    >
      <div className="space-y-6 max-w-4xl mx-auto">
        {/* Résumé du membre */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
          <div>
            <p className="text-xs font-medium text-slate-500">Total Versé</p>
            <p className="text-xl font-bold text-emerald-600 mt-1">
              {data.montantTotalCotise.toLocaleString()} FC
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">Mois Payés</p>
            <p className="text-xl font-bold text-blue-600 mt-1">
              {data.moisPayes.length} mois
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">Dette Actuelle</p>
            <p className={`text-xl font-bold mt-1 ${data.detteActuelle > 0 ? 'text-rose-600' : 'text-slate-700'}`}>
              {data.detteActuelle > 0 ? `${data.detteActuelle.toLocaleString()} FC` : 'Aucune'}
            </p>
          </div>
        </div>

        {/* Liste détaillée des mois couverts */}
        <div>
          <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-3">
            Détail des mois payés et validés
          </h4>

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-xs uppercase font-semibold">
                  <th className="px-6 py-3">Mois Concerné</th>
                  <th className="px-6 py-3">Montant</th>
                  <th className="px-6 py-3">Mode de Paiement</th>
                  <th className="px-6 py-3">Date et heure</th>
                  <th className="px-6 py-3">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-sm text-slate-700">
                {historyRows.map((paiement, index) => {
                  const [year, month] = paiement.mois.split('-').map(Number);
                  const moisLabel = year && month
                    ? new Date(year, month - 1, 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
                    : paiement.mois;
                  return (
                  <tr key={`${paiement.mois}-${paiement.datePaiement}-${index}`} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-medium flex items-center gap-2">
                      <Calendar size={16} className="text-blue-500" />
                      {moisLabel}
                    </td>
                    <td className="px-6 py-4 font-semibold text-emerald-600">{paiement.montant.toLocaleString('fr-FR')} FC</td>
                    <td className="px-6 py-4 flex items-center gap-1.5 text-slate-600">
                      <CreditCard size={16} className="text-slate-400" />
                      {paiement.modePaiement}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-slate-600">
                      {paiement.datePaiement
                        ? <span className="inline-flex items-center gap-1.5"><Clock size={14} className="text-slate-400" />{new Date(paiement.datePaiement).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}</span>
                        : '—'}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                        Payé
                      </span>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Avances / Mois futurs si existants */}
        {data.moisFutursPayes.length > 0 && (
          <div>
            <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-3">
              Paiements en avance (Mois Futurs)
            </h4>
            <div className="flex flex-wrap gap-2">
              {data.moisFutursPayes.map((mois, idx) => (
                <span key={idx} className="px-3 py-1 bg-purple-50 text-purple-700 border border-purple-200 rounded-lg text-xs font-semibold">
                  {mois} (Avance)
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}