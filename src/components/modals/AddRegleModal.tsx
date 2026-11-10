'use client';

import React, { useState } from 'react';
import Modal from '../ui/Modal';

interface AddRegleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (titre: string, contenu: string[]) => void | Promise<void>;
}

export default function AddRegleModal({ isOpen, onClose, onAdd }: AddRegleModalProps) {
  const [titre, setTitre] = useState('');
  const [contenu, setContenu] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titre.trim() || !contenu.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const lignes = contenu
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l.length > 0);

      await onAdd(titre.trim(), lignes);

      setTitre('');
      setContenu('');
      onClose();
    } catch (error) {
      console.error("Erreur lors de l'ajout de la règle :", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Ajouter une nouvelle règle">
      <form onSubmit={handleSubmit} className="space-y-4 p-1">
        <div>
          <label className="block text-xs font-semibold uppercase text-slate-700 dark:text-slate-300 mb-1.5">
            Titre de la section ou de la règle
          </label>
          <input
            type="text"
            required
            placeholder="Entrer le titre de la regle"
            value={titre}
            onChange={(e) => setTitre(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase text-slate-700 dark:text-slate-300 mb-1.5">
            Détails des règles (Séparez chaque point par un saut de ligne)
          </label>
          <textarea
            required
            rows={5}
            placeholder="Entrer les regles de cette section"
            value={contenu}
            onChange={(e) => setContenu(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/20 resize-none"
          />
        </div>

        <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-sm font-semibold rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 transition disabled:opacity-50"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 px-5 py-2 text-sm font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-white dark:bg-slate-200 dark:text-slate-900 dark:hover:bg-white transition shadow-sm disabled:opacity-50"
          >
            {isSubmitting ? 'Enregistrement...' : 'Valider et enregistrer'}
          </button>
        </div>
      </form>
    </Modal>
  );
}