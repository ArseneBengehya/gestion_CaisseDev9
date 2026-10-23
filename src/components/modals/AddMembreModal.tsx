'use client';

import React from 'react';
import Modal from '../ui/Modal';
import { UserPlus, Save, Shield, Key, Image as ImageIcon, Send } from 'lucide-react';

interface AddMembreModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    nomComplet: string;
    telephone: string;
    email: string;
    role: 'ADMIN' | 'MEMBRE';
    photoUrl: string;
    motDePasse: string;
    envoyerWhatsApp: boolean;
  }) => void | Promise<void>;
}

// Fonction utilitaire pour générer un mot de passe aléatoire de 6 caractères
const generatePassword = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let pass = '';
  for (let i = 0; i < 6; i++) {
    pass += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return pass;
};

export default function AddMembreModal({
  isOpen,
  onClose,
  onSubmit,
}: AddMembreModalProps) {
  const [nomComplet, setNomComplet] = React.useState('');
  const [telephone, setTelephone] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [role, setRole] = React.useState<'ADMIN' | 'MEMBRE'>('MEMBRE');
  const [photoUrl, setPhotoUrl] = React.useState('');
  const [motDePasse, setMotDePasse] = React.useState('');
  const [envoyerWhatsApp, setEnvoyerWhatsApp] = React.useState(true);
  const [isSaving, setIsSaving] = React.useState(false);

  // Générer automatiquement un mot de passe à l'ouverture
  React.useEffect(() => {
    if (isOpen) {
      setMotDePasse(generatePassword());
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (isSaving) return;

    setIsSaving(true);

    try {
      await onSubmit({
        nomComplet: nomComplet.trim(),
        telephone: telephone.trim(),
        email: email.trim(),
        role,
        photoUrl: photoUrl.trim(),
        motDePasse,
        envoyerWhatsApp,
      });

      setNomComplet('');
      setTelephone('');
      setEmail('');
      setRole('MEMBRE');
      setPhotoUrl('');
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Ajouter un nouveau membre"
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex items-center gap-3 rounded-xl border border-blue-200 bg-blue-50 p-3.5 dark:border-blue-500/20 dark:bg-blue-500/10">
          <div className="rounded-lg bg-white p-2 text-blue-600 dark:bg-slate-800 dark:text-blue-400">
            <UserPlus size={20} />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
              Nouveau membre & Identifiants
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Un mot de passe sera généré et envoyé au membre.
            </p>
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">
            Nom complet
          </label>
          <input
            value={nomComplet}
            onChange={(e) => setNomComplet(e.target.value)}
            required
            autoFocus
            placeholder="Ex. Arsène Bengehya"
            className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">
              Téléphone (WhatsApp)
            </label>
            <input
              type="tel"
              value={telephone}
              onChange={(e) => setTelephone(e.target.value)}
              required
              placeholder="Ex. +243..."
              className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">
              Adresse Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Ex. membre@gmail.com"
              className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            />
          </div>
        </div>

        {/* Photo URL */}
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <ImageIcon size={14} className="text-blue-500" />
            Lien de la photo de profil (Optionnel)
          </label>
          <input
            type="url"
            value={photoUrl}
            onChange={(e) => setPhotoUrl(e.target.value)}
            placeholder="https://exemple.com/photo.jpg"
            className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Shield size={14} className="text-blue-500" />
              Rôle
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as 'ADMIN' | 'MEMBRE')}
              className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            >
              <option value="MEMBRE">Membre Simple</option>
              <option value="ADMIN">Administrateur</option>
            </select>
          </div>

          {/* Mot de passe généré */}
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Key size={14} className="text-amber-500" />
              Mot de passe (Généré)
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={motDePasse}
                readOnly
                className="w-full rounded-xl border border-slate-200 bg-slate-100 dark:bg-slate-800 px-3.5 py-2 text-sm font-mono font-bold text-slate-900 dark:text-white outline-none"
              />
              <button
                type="button"
                onClick={() => setMotDePasse(generatePassword())}
                className="px-2.5 py-2 text-xs font-semibold bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 rounded-xl"
                title="Régénérer"
              >
                🔄
              </button>
            </div>
          </div>
        </div>

        {/* Option envoi WhatsApp */}
        <div className="flex items-center gap-2 pt-2">
          <input
            type="checkbox"
            id="sendWa"
            checked={envoyerWhatsApp}
            onChange={(e) => setEnvoyerWhatsApp(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
          />
          <label htmlFor="sendWa" className="text-xs font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1">
            <Send size={12} className="text-emerald-500" />
            Envoyer les identifiants d'accès par WhatsApp au membre
          </label>
        </div>

        <div className="flex justify-end gap-3 border-t border-slate-200 pt-4 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Annuler
          </button>

          <button
            type="submit"
            disabled={isSaving}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Save size={16} />
            {isSaving ? 'Enregistrement...' : 'Enregistrer le membre'}
          </button>
        </div>
      </form>
    </Modal>
  );
}