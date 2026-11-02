'use client';

import React from 'react';
import { X, Percent, Trash2, ShieldAlert } from 'lucide-react';

interface PalierPret {
  id: string | number;
  min: number;
  max: number | string;
  delai: string;
  taux: number;
}

interface ViewPaliersModalProps {
  isOpen: boolean;
  onClose: () => void;
  paliers: PalierPret[];
  onRemovePalier: (id: string | number) => void;
}

export default function ViewPaliersModal({
  isOpen,
  onClose,
  paliers,
  onRemovePalier,
}: ViewPaliersModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
        {/* En-tête de la Modale */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              Pourcentages & Taux d'Emprunt
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Liste des tranches et des taux d'intérêt configurés pour la caisse.
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Contenu - Liste des paliers */}
        <div className="my-5 max-h-[60vh] space-y-3 overflow-y-auto pr-1">
          {paliers.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
              <ShieldAlert className="text-slate-400 mb-2" size={28} />
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Aucun pourcentage de remboursement fixé pour le moment.
              </p>
            </div>
          ) : (
            paliers.map((palier) => (
              <div
                key={palier.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 transition-all hover:bg-slate-100/80 dark:border-slate-800 dark:bg-slate-800/50 dark:hover:bg-slate-800"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-200 text-slate-800 font-bold text-xs dark:bg-slate-700 dark:text-slate-200">
                    <Percent size={16} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                      De {Number(palier.min).toLocaleString()} FC à{' '}
                      {typeof palier.max === 'number'
                        ? `${palier.max.toLocaleString()} FC`
                        : palier.max}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Délai accordé :{' '}
                      <span className="font-semibold text-slate-700 dark:text-slate-300">
                        {palier.delai}
                      </span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                    +{palier.taux}%
                  </span>
                  <button
                    type="button"
                    onClick={() => onRemovePalier(palier.id)}
                    className="p-2 text-rose-600 hover:bg-rose-100 dark:hover:bg-rose-950/50 rounded-lg transition"
                    title="Supprimer ce palier"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Pied de Modale */}
        <div className="flex justify-end pt-3 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-xs font-bold rounded-xl bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 transition-colors"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}