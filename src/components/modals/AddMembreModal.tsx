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

  const handlePhotoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    if (!ACCEPTED_PHOTO_TYPES.includes(file.type)) {
      setPhotoError('Format non accepté. Choisissez une image JPG, PNG ou WEBP.');
      return;
    }
    if (file.size > MAX_PHOTO_SIZE_BYTES) {
      setPhotoError('La photo est trop volumineuse. La taille maximale est de 5 Mo.');
      return;
    }

    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
    setPhotoError('');
    setSubmitError('');
  };

  const removePhoto = () => {
    setPhotoFile(null);
    setPhotoPreview('');
    setPhotoError('');
    setSubmitError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

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
            placeholder="Ex. Arsène Bengehya"
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
              placeholder="Ex. +243..."
              className={inputClassName}
            />
          </div>
          <div>
            <label className={labelClassName}>Adresse email (facultatif)</label>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="Ex. membre@gmail.com"
              className={inputClassName}
            />
          </div>
        </div>

        {/* Sélection du fichier image : aucun lien à saisir */}
        <div>
          <label className={labelClassName}>
            <span className="inline-flex items-center gap-1.5"><ImageIcon size={14} /> Photo de profil (facultative)</span>
          </label>
          <div className="flex items-center gap-3 rounded-2xl border border-dashed border-slate-300 bg-slate-50/80 p-3 dark:border-slate-700 dark:bg-slate-800/40">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-white text-slate-400 dark:border-slate-700 dark:bg-slate-900">
              {photoPreview ? (
                <img src={photoPreview} alt="Aperçu de la photo du membre" className="h-full w-full object-cover" />
              ) : (
                <UserRound size={25} />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                {photoFile ? photoFile.name : 'Choisir une photo'}
              </p>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">JPG, PNG ou WEBP · 5 Mo maximum</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <input
                  ref={fileInputRef}
                  id="add-member-photo"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handlePhotoChange}
                  className="sr-only"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  <Upload size={14} /> {photoFile ? 'Changer' : 'Parcourir'}
                </button>
                {photoFile && (
                  <button type="button" onClick={removePhoto} className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-700">
                    <X size={13} /> Retirer
                  </button>
                )}
              </div>
            </div>
          </div>
          {photoError && <p role="alert" className="mt-2 text-xs font-medium text-rose-700 dark:text-rose-300">{photoError}</p>}
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className={labelClassName}><span className="inline-flex items-center gap-1.5"><Shield size={14} /> Rôle</span></label>
            <select value={role} onChange={(event) => setRole(event.target.value as 'ADMIN' | 'MEMBRE')} className={inputClassName}>
              <option value="MEMBRE">Membre simple</option>
              <option value="ADMIN">Administrateur</option>
            </select>
          </div>
          {/* <div>
            <label className={labelClassName}><span className="inline-flex items-center gap-1.5"><Key size={14} /> Mot de passe généré</span></label>
            <div className="flex gap-2">
              <input type="text" value={motDePasse} readOnly className={`${inputClassName} font-mono font-bold`} />
              <button
                type="button"
                onClick={() => setMotDePasse(generatePassword())}
                className="shrink-0 rounded-xl border border-slate-200 bg-slate-100 px-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                title="Régénérer le mot de passe"
              >
                ↻
              </button>
            </div>
          </div> */}
        </div>
{/* 
        <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-slate-200 px-3 py-3 text-xs font-medium text-slate-600 dark:border-slate-700 dark:text-slate-300">
          <input
            type="checkbox"
            checked={envoyerWhatsApp}
            onChange={(event) => setEnvoyerWhatsApp(event.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-slate-300 text-slate-700 focus:ring-slate-500"
          />
          <span className="flex items-start gap-2"><Send size={14} className="mt-0.5 shrink-0 text-slate-500" /> Envoyer les identifiants d'accès par WhatsApp au membre</span>
        </label> */}

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
