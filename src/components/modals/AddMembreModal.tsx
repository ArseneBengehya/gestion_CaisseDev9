'use client';

import React from 'react';
import Modal from '../ui/Modal';
// import Modal from '@/components/ui/Modal';

interface AddMembreModalProps {
  isOpen: boolean;
  onClose: () => void;
  formData: { nom: string; prenom: string; email: string; telephone: string };
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export default function AddMembreModal({
  isOpen,
  onClose,
  formData,
  onChange,
  onSubmit,
}: AddMembreModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Ajouter un nouveau membre" maxWidth="md">
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Nom</label>
          <input
            type="text"
            name="nom"
            required
            value={formData.nom}
            onChange={onChange}
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Prénom</label>
          <input
            type="text"
            name="prenom"
            required
            value={formData.prenom}
            onChange={onChange}
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Email</label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={onChange}
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Téléphone</label>
          <input
            type="text"
            name="telephone"
            required
            value={formData.telephone}
            onChange={onChange}
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            Annuler
          </button>
          <button
            type="submit"
            className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors"
          >
            Enregistrer
          </button>
        </div>
      </form>
    </Modal>
  );
}