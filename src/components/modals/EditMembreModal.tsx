'use client';

import React from 'react';
import Modal from '../ui/Modal';
import { Membre } from '@/src/types';
import { UserRound, Save, Shield } from 'lucide-react';

interface EditMembreModalProps {
  isOpen: boolean;
  onClose: () => void;
  membre: Membre | null;
  onSubmit: (membreModifie: Membre) => void | Promise<void>;
}

export default function EditMembreModal({
  isOpen,
  onClose,
  membre,
  onSubmit,
}: EditMembreModalProps) {
  const [nomComplet, setNomComplet] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [telephone, setTelephone] = React.useState('');
  const [statut, setStatut] = React.useState<'ACTIF' | 'INACTIF'>('ACTIF');
  const [role, setRole] = React.useState<'ADMIN' | 'MEMBRE'>('MEMBRE');
  const [isSaving, setIsSaving] = React.useState(false);

  React.useEffect(() => {
    if (membre) {
      setNomComplet(membre.nomComplet || `${membre.prenom || ''} ${membre.nom || ''}`.trim());
      setEmail(membre.email || '');
      setTelephone(membre.telephone || '');
      setStatut(membre.statut === 'INACTIF' ? 'INACTIF' : 'ACTIF');
      setRole((membre as any).role === 'ADMIN' ? 'ADMIN' : 'MEMBRE');
    }
  }, [membre]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!membre || isSaving) return;

    setIsSaving(true);

    try {
      const parts = nomComplet.trim().split(' ');
      const prenom = parts[0] || '';
      const nom = parts.slice(1).join(' ') || prenom;

      await onSubmit({
        ...membre,
        nom,
        prenom,
        nomComplet: nomComplet.trim(),
        email: email.trim(),
        telephone: telephone.trim(),
        statut,
        role,
      } as any);

      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Modifier les informations du membre"
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-500/20 dark:bg-amber-500/10">
          <div className="rounded-lg bg-white p-2 text-amber-600 dark:bg-slate-800 dark:text-amber-400">
            <UserRound size={20} />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
              Modifier un membre
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Les modifications seront enregistrées dans Firestore.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Nom complet
            </label>
            <input
              value={nomComplet}
              onChange={(e) => setNomComplet(e.target.value)}
              required
              placeholder="Ex. Arsène Bengehya"
              className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Téléphone
              </label>
              <input
                type="tel"
                value={telephone}
                onChange={(e) => setTelephone(e.target.value)}
                required
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Ex. membre@gmail.com"
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Statut du membre
              </label>
              <select
                value={statut}
                onChange={(e) => setStatut(e.target.value as 'ACTIF' | 'INACTIF')}
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              >
                <option value="ACTIF">ACTIF</option>
                <option value="INACTIF">INACTIF</option>
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1">
                <Shield size={14} className="text-amber-500" />
                Rôle
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as 'ADMIN' | 'MEMBRE')}
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              >
                <option value="MEMBRE">Membre</option>
                <option value="ADMIN">Admin</option>
              </select>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 border-t border-slate-200 pt-4 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Annuler
          </button>

          <button
            type="submit"
            disabled={isSaving || !membre}
            className="inline-flex items-center gap-2 rounded-xl bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Save size={16} />
            {isSaving ? 'Enregistrement...' : 'Mettre à jour'}
          </button>
        </div>
      </form>
    </Modal>
  );
}