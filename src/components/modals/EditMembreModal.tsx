'use client';

import React from 'react';
import Modal from '../ui/Modal';
import { Membre } from '@/src/types';
import { UserRound, Save, Shield, Upload, Image as ImageIcon } from 'lucide-react';

interface EditMembreModalProps {
  isOpen: boolean;
  onClose: () => void;
  membre: Membre | null;
  onSubmit: (membreModifie: Membre & { photoFile?: File | null }) => void | Promise<void>;
}

const MAX_PHOTO_SIZE_BYTES = 5 * 1024 * 1024;
const ACCEPTED_PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export default function EditMembreModal({ isOpen, onClose, membre, onSubmit }: EditMembreModalProps) {
  const [nomComplet, setNomComplet] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [telephone, setTelephone] = React.useState('');
  const [statut, setStatut] = React.useState<'ACTIF' | 'INACTIF'>('ACTIF');
  const [role, setRole] = React.useState<'ADMIN' | 'MEMBRE'>('MEMBRE');
  const [photoFile, setPhotoFile] = React.useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = React.useState('');
  const [photoError, setPhotoError] = React.useState('');
  const [submitError, setSubmitError] = React.useState('');
  const [isSaving, setIsSaving] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (!membre) return;
    setNomComplet(membre.nomComplet || `${membre.prenom || ''} ${membre.nom || ''}`.trim());
    setEmail(membre.email || '');
    setTelephone(membre.telephone || '');
    setStatut(membre.statut === 'INACTIF' ? 'INACTIF' : 'ACTIF');
    setRole(membre.role === 'ADMIN' ? 'ADMIN' : 'MEMBRE');
    setPhotoFile(null);
    setPhotoPreview(membre.photoUrl || membre.avatarUrl || '');
    setPhotoError('');
      setSubmitError('');
  }, [membre]);

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

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!membre || isSaving || photoError) return;

    setIsSaving(true);
    setSubmitError('');
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
        photoFile,
      });

      onClose();
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'La modification du membre a échoué.');
    } finally {
      setIsSaving(false);
    }
  };

  const inputClassName =
    'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-200 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-slate-500 dark:focus:ring-slate-800';
  const labelClassName = 'mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-300';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Modifier les informations du membre" maxWidth="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3.5 dark:border-slate-700 dark:bg-slate-800/60">
          <div className="rounded-xl bg-white p-2.5 text-slate-600 shadow-sm dark:bg-slate-900 dark:text-slate-200">
              {photoPreview ? (
                <img src={photoPreview}  className="h-9 w-9 rounded-full object-cover" />
              ) : (
                <UserRound  />
              )}
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{membre?.nomComplet}</p>
            {/* <p className="text-xs text-slate-500 dark:text-slate-400">Les informations et la photo sont synchronisées avec Firestore.</p> */}
          </div>
        </div>

        <div>
          <label className={labelClassName}>Nom complet</label>
          <input value={nomComplet} onChange={(event) => setNomComplet(event.target.value)} required placeholder="Ex. Arsène Bengehya" className={inputClassName} />
        </div>

        {/* <div>
          <label className={labelClassName}><span className="inline-flex items-center gap-1.5"><ImageIcon size={14} /> Photo de profil</span></label>
          <div className="flex items-center gap-3 rounded-2xl border border-dashed border-slate-300 bg-slate-50/80 p-3 dark:border-slate-700 dark:bg-slate-800/40">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-white text-slate-400 dark:border-slate-700 dark:bg-slate-900">
              {photoPreview ? (
                <img src={photoPreview} alt={`Photo de ${membre?.nomComplet || 'ce membre'}`} className="h-full w-full object-cover" />
              ) : (
                <UserRound size={25} />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{photoFile?.name || (photoPreview ? 'Photo actuelle' : 'Aucune photo sélectionnée')}</p>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">JPG, PNG ou WEBP · 5 Mo maximum. Sans nouveau fichier, la photo actuelle est conservée.</p>
              <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handlePhotoChange} className="sr-only" />
              <button type="button" onClick={() => fileInputRef.current?.click()} className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800">
                <Upload size={14} /> {photoPreview ? 'Changer la photo' : 'Choisir une photo'}
              </button>
            </div>
          </div>
          {photoError && <p role="alert" className="mt-2 text-xs font-medium text-rose-700 dark:text-rose-300">{photoError}</p>}
        </div> */}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className={labelClassName}>Téléphone</label>
            <input type="tel" value={telephone} onChange={(event) => setTelephone(event.target.value)} required className={inputClassName} />
          </div>
          <div>
            <label className={labelClassName}>Email</label>
            <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Ex. membre@gmail.com" className={inputClassName} />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className={labelClassName}>Statut du membre</label>
            <select value={statut} onChange={(event) => setStatut(event.target.value as 'ACTIF' | 'INACTIF')} className={inputClassName}>
              <option value="ACTIF">ACTIF</option>
              <option value="INACTIF">INACTIF</option>
            </select>
          </div>
          <div>
            <label className={labelClassName}><span className="inline-flex items-center gap-1.5"><Shield size={14} /> Rôle</span></label>
            <select value={role} onChange={(event) => setRole(event.target.value as 'ADMIN' | 'MEMBRE')} className={inputClassName}>
              <option value="MEMBRE">Membre</option>
              <option value="ADMIN">Admin</option>
            </select>
          </div>
        </div>

        {submitError && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300">{submitError}</p>}

        <div className="flex justify-end gap-3 border-t border-slate-200 pt-4 dark:border-slate-800">
          <button type="button" onClick={onClose} disabled={isSaving} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">Annuler</button>
          <button type="submit" disabled={isSaving || !membre || Boolean(photoError)} className="inline-flex items-center gap-2 rounded-xl bg-slate-800 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-slate-200 dark:text-slate-900 dark:hover:bg-white">
            <Save size={16} /> {isSaving ? 'Enregistrement...' : 'Mettre à jour'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
