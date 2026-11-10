'use client';

import React from 'react';
import Modal from '../ui/Modal';
import {
  UserPlus,
  Save,
  Shield,
  Key,
  Image as ImageIcon,
  Send,
  Upload,
  X,
  UserRound,
} from 'lucide-react';

interface AddMembreModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    nomComplet: string;
    telephone: string;
    email: string;
    role: 'ADMIN' | 'MEMBRE';
    photoFile: File | null;
    motDePasse: string;
    envoyerWhatsApp: boolean;
  }) => void | Promise<void>;
}

const MAX_PHOTO_SIZE_BYTES = 5 * 1024 * 1024;
const ACCEPTED_PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

// Génère un mot de passe de 6 caractères, comme dans le formulaire d'origine.
const generatePassword = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let pass = '';
  for (let i = 0; i < 6; i++) {
    pass += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return pass;
};

export default function AddMembreModal({ isOpen, onClose, onSubmit }: AddMembreModalProps) {
  const [nomComplet, setNomComplet] = React.useState('');
  const [telephone, setTelephone] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [role, setRole] = React.useState<'ADMIN' | 'MEMBRE'>('MEMBRE');
  const [photoFile, setPhotoFile] = React.useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = React.useState('');
  const [motDePasse, setMotDePasse] = React.useState('');
  const [envoyerWhatsApp, setEnvoyerWhatsApp] = React.useState(true);
  const [isSaving, setIsSaving] = React.useState(false);
  const [photoError, setPhotoError] = React.useState('');
  const [submitError, setSubmitError] = React.useState('');
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (isOpen) {
      setMotDePasse(generatePassword());
      setPhotoError('');
      setSubmitError('');
    }
  }, [isOpen]);

  React.useEffect(() => {
    return () => {
      if (photoPreview.startsWith('blob:')) URL.revokeObjectURL(photoPreview);
    };
  }, [photoPreview]);


  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSaving || photoError) return;

    setIsSaving(true);
    setSubmitError('');
    try {
      await onSubmit({
        nomComplet: nomComplet.trim(),
        telephone: telephone.trim(),
        email: email.trim(),
        role,
        photoFile,
        motDePasse,
        envoyerWhatsApp,
      });

      setNomComplet('');
      setTelephone('');
      setEmail('');
      setRole('MEMBRE');
      setPhotoFile(null);
      setPhotoPreview('');
      setEnvoyerWhatsApp(true);
      setPhotoError('');
      setSubmitError('');
      onClose();
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "L'enregistrement du membre a échoué.");
    } finally {
      setIsSaving(false);
    }
  };

  const inputClassName =
    'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-200 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-slate-500 dark:focus:ring-slate-800';
  const labelClassName = 'mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-300';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Ajouter un nouveau membre" maxWidth="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3.5 dark:border-slate-700 dark:bg-slate-800/60">
          <div className="rounded-xl bg-white p-2.5 text-slate-600 shadow-sm dark:bg-slate-900 dark:text-slate-200">
            <UserPlus size={20} />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Nouveau membre & identifiants</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Un mot de passe sera généré et pourra être envoyé au membre.</p>
          </div>
        </div>

        <div>
          <label className={labelClassName}>Nom complet</label>
          <input
            value={nomComplet}
            onChange={(event) => setNomComplet(event.target.value)}
            required
            autoFocus
            placeholder="Entrer le nom complet du membre"
            className={inputClassName}
          />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className={labelClassName}>Téléphone (WhatsApp)</label>
            <input
              type="tel"
              value={telephone}
              onChange={(event) => setTelephone(event.target.value)}
              required
              placeholder="Tapez le numero"
              className={inputClassName}
            />
          </div>
          <div>
            <label className={labelClassName}>Adresse email (facultatif)</label>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="Entrez l'adresse mail"
              className={inputClassName}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className={labelClassName}><span className="inline-flex items-center gap-1.5"><Shield size={14} /> Rôle</span></label>
            <select value={role} onChange={(event) => setRole(event.target.value as 'ADMIN' | 'MEMBRE')} className={inputClassName}>
              <option value="MEMBRE">Membre simple</option>
              <option value="ADMIN">Administrateur</option>
            </select>
          </div>
        </div>

        {submitError && (
          <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300">
            {submitError}
          </p>
        )}

        <div className="flex justify-end gap-3 border-t border-slate-200 pt-4 dark:border-slate-800">
          <button type="button" onClick={onClose} disabled={isSaving} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">
            Annuler
          </button>
          <button type="submit" disabled={isSaving || Boolean(photoError)} className="inline-flex items-center gap-2 rounded-xl bg-slate-800 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-slate-200 dark:text-slate-900 dark:hover:bg-white">
            <Save size={16} /> {isSaving ? 'Enregistrement...' : 'Enregistrer le membre'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
