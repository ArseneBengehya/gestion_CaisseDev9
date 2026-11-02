'use client';

import React, { useState } from 'react';
import { Trash2 } from 'lucide-react';

interface ConfirmDeleteModalProps {
  isOpen: boolean;
  title?: string;
  itemName: string;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
}

export default function ConfirmDeleteModal({
  isOpen,
  title = 'Confirmer la suppression',
  itemName,
  onClose,
  onConfirm,
}: ConfirmDeleteModalProps) {
  const [isChecked, setIsChecked] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    if (!isChecked || isDeleting) return;
    setIsDeleting(true);
    try {
      await onConfirm();
      setIsChecked(false);
      onClose();
    } catch (error) {
      console.error('Erreur lors de la suppression :', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleClose = () => {
    setIsChecked(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
        <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
          <div className="rounded-xl bg-rose-50 p-2.5 dark:bg-rose-950/50">
            <Trash2 size={22} />
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">
            {title}
          </h3>
        </div>

        <p className="text-sm text-slate-600 dark:text-slate-300">
          Voulez-vous vraiment supprimer{' '}
          <span className="font-bold text-slate-900 dark:text-white">
            {itemName}
          </span>{' '}
          ? Cette action est irréversible.
        </p>

        {/* Case à cocher de sécurité */}
        <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs font-medium text-slate-700 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-300">
          <input
            type="checkbox"
            checked={isChecked}
            onChange={(e) => setIsChecked(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-rose-600 focus:ring-rose-500"
          />
          <span>Je confirme vouloir effectuer cette suppression définitive</span>
        </label>

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={handleClose}
            disabled={isDeleting}
            className="px-4 py-2 text-sm font-semibold rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 transition disabled:opacity-50"
          >
            Annuler
          </button>
          <button
            type="button"
            disabled={!isChecked || isDeleting}
            onClick={handleConfirm}
            className="px-4 py-2 text-sm font-semibold rounded-xl bg-rose-600 hover:bg-rose-700 text-white shadow-sm transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isDeleting ? 'Suppression...' : 'Supprimer'}
          </button>
        </div>
      </div>
    </div>
  );
}