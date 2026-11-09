"use client";

import React, { useEffect, useState } from "react";
import {
  User,
  Mail,
  Phone,
  Shield,
  Calendar,
  CheckCircle2,
  Clock,
  Loader2,
  Wallet,
  Pencil,
  Save,
  Upload,
} from "lucide-react";
import { getMembreByUid } from "../../../../services/dbService";
import { Membre } from "../../../../types";
import Modal from "../../../../components/ui/Modal";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../../../../lib/firebase";
import { uploadMemberPhoto } from "../../../../lib/member-photo";

export default function ProfilPage() {
  const [membre, setMembre] = useState<Membre | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [nomComplet, setNomComplet] = useState("");
  const [telephone, setTelephone] = useState("");
  const [email, setEmail] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    const loadProfile = async () => {
      const userStr = localStorage.getItem("caisse_user");
      if (!userStr) {
        setIsLoading(false);
        return;
      }
      const session = JSON.parse(userStr);
      const dataMembre = await getMembreByUid(session.id);
      if (dataMembre) setMembre(dataMembre);
      setIsLoading(false);
    };
    loadProfile();
  }, []);

  const openEdit = () => {
    if (!membre) return;
    if (photoPreview.startsWith("blob:")) URL.revokeObjectURL(photoPreview);
    setNomComplet(membre.nomComplet || `${membre.prenom || ""} ${membre.nom || ""}`.trim());
    setTelephone(membre.telephone || "");
    setEmail(membre.email || "");
    setPhotoPreview(membre.photoUrl || membre.avatarUrl || "");
    setPhotoFile(null);
    setSaveError("");
    setIsEditOpen(true);
  };

  const handlePhoto = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setSaveError("Format non accepté. Choisissez une image JPG, PNG ou WEBP.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setSaveError("La photo est trop volumineuse. La taille maximale est de 10 Mo.");
      return;
    }
    if (photoPreview.startsWith("blob:")) URL.revokeObjectURL(photoPreview);
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
    setSaveError("");
  };

  const saveProfile = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!membre || isSaving) return;
    setIsSaving(true);
    setSaveError("");
    try {
      const parts = nomComplet.trim().split(/\s+/);
      const prenom = parts.shift() || "";
      const nom = parts.join(" ") || prenom;
      const photoUrl = photoFile ? await uploadMemberPhoto(photoFile, membre.id) : (membre.photoUrl || membre.avatarUrl || "");
      await updateDoc(doc(db, "membres", membre.id), {
        nomComplet: nomComplet.trim(),
        prenom,
        nom,
        telephone: telephone.trim(),
        email: email.trim(),
        photoUrl,
        avatarUrl: photoUrl,
      });
      const updated = { ...membre, nomComplet: nomComplet.trim(), prenom, nom, telephone: telephone.trim(), email: email.trim(), photoUrl, avatarUrl: photoUrl };
      setMembre(updated);
      localStorage.setItem("caisse_user", JSON.stringify({
        id: membre.id,
        nomComplet: updated.nomComplet,
        telephone: updated.telephone,
        email: updated.email,
        photoUrl,
        role: updated.role || "MEMBRE",
      }));
      setIsEditOpen(false);
    } catch (error) {
      console.error("Erreur lors de la modification du profil :", error);
      setSaveError(error instanceof Error ? error.message : "La modification du profil a échoué.");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-3 text-slate-500">
        <Loader2 size={32} className="animate-spin text-blue-600" />
        <p className="text-xs font-semibold">Chargement des données de votre profil...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl space-y-8 pb-6">
      {/* En-tête */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Mon Profil</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Gérez vos informations personnelles et consultez votre statut d'adhésion à la Caisse Dev9.
          </p>
        </div>
        <button onClick={openEdit} className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800">
          <Pencil size={16} />
          Modifier mon profil
        </button>
      </div>

      {/* Disposition principale en deux colonnes (Style inspiré du modèle) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Colonne de gauche : Carte Avatar & Identité Principale */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-8 shadow-sm flex flex-col items-center text-center relative overflow-hidden">
          <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />
          
          <div className="relative mb-5">
            <div className="h-66 w-66 rounded-full bg-gradient-to-tr from-blue-600 to-emerald-500 p-1 shadow-xl">
              <div className="h-full w-full bg-white dark:bg-slate-900 rounded-full flex items-center justify-center font-black text-4xl text-blue-600 dark:text-blue-400 overflow-hidden">
                {membre?.photoUrl || membre?.avatarUrl ? (
                  <img src={membre.photoUrl || membre.avatarUrl} alt={membre.nomComplet} className="h-full w-full object-cover" />
                ) : (
                  membre?.nomComplet ? membre.nomComplet.charAt(0).toUpperCase() : "M"
                )}
              </div>
            </div>
          </div>

          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white">
            {membre?.nomComplet || `${membre?.prenom || ''} ${membre?.nom || ''}`}
          </h2>
          <p className="text-xs font-semibold text-slate-400 mt-1 uppercase tracking-wider">Caisse Dev9 Member</p>

          <div className="flex items-center justify-center gap-2 mt-4 flex-wrap">
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/50 dark:text-blue-300">
              <Shield size={13} /> {membre?.role || "MEMBRE"}
            </span>
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300">
              <CheckCircle2 size={13} /> {membre?.statut || "ACTIF"}
            </span>
          </div>

          {/* <div className="w-full border-t border-slate-100 dark:border-slate-800 mt-6 pt-6 text-left space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 font-medium">Téléphone</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">{membre?.telephone || "Non renseigné"}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 font-medium">E-mail</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">{membre?.email || "Non renseignée"}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 font-medium">Membre depuis</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">
                {membre?.createdAt ? new Date(membre.createdAt).toLocaleDateString("fr-FR", { month: "short", year: "numeric" }) : "N/A"}
              </span>
            </div>
          </div> */}
        </div>

        {/* Colonne de droite : Détails approfondis & Finances */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Détails de contact et informations */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Informations personnelles</h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 space-y-1">
                <div className="flex items-center gap-2 text-slate-400 font-medium">
                  <User size={14} />
                  <span>Nom complet</span>
                </div>
                <p className="font-bold text-slate-900 dark:text-white text-sm">
                  {membre?.nomComplet || `${membre?.prenom || ''} ${membre?.nom || ''}`}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 space-y-1">
                <div className="flex items-center gap-2 text-slate-400 font-medium">
                  <Phone size={14} />
                  <span>Numéro de téléphone</span>
                </div>
                <p className="font-bold text-slate-900 dark:text-white text-sm">
                  {membre?.telephone || "Non renseigné"}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 space-y-1">
                <div className="flex items-center gap-2 text-slate-400 font-medium">
                  <Mail size={14} />
                  <span>Adresse Email</span>
                </div>
                <p className="font-bold text-slate-900 dark:text-white text-sm">
                  {membre?.email || "Non renseignée"}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 space-y-1">
                <div className="flex items-center gap-2 text-slate-400 font-medium">
                  <Calendar size={14} />
                  <span>Date d'adhésion complète</span>
                </div>
                <p className="font-bold text-slate-900 dark:text-white text-sm">
                  {membre?.createdAt
                    ? new Date(membre.createdAt).toLocaleDateString("fr-FR", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })
                    : "Date non spécifiée"}
                </p>
              </div>
            </div>
          </div>

          {/* Récapitulatif Financier Personnel */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Statut de vos cotisations & finances</h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-4 rounded-2xl border border-emerald-100 dark:border-emerald-900/40 bg-emerald-50/50 dark:bg-emerald-950/20 space-y-1">
                <p className="text-emerald-700 dark:text-emerald-400 font-semibold flex items-center gap-1.5">
                  <Wallet size={14} /> Total Cotisé
                </p>
                <p className="font-black text-emerald-900 dark:text-emerald-300 text-lg">
                  {(membre?.montantTotalCotise || 0).toLocaleString()} FC
                </p>
              </div>

              <div className="p-4 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 space-y-1">
                <p className="text-slate-500 dark:text-slate-400 font-semibold flex items-center gap-1.5">
                  <CheckCircle2 size={14} /> Statut Cotisation
                </p>
                <p className="font-bold text-slate-900 dark:text-white text-base">
                  {membre?.statutCotisation || "À jour"}
                </p>
              </div>

              <div className="p-4 rounded-2xl border border-amber-100 dark:border-amber-900/40 bg-amber-50/50 dark:bg-amber-950/20 space-y-1">
                <p className="text-amber-700 dark:text-amber-400 font-semibold flex items-center gap-1.5">
                  <Clock size={14} /> Dette / Solde
                </p>
                <p className="font-black text-amber-900 dark:text-amber-300 text-lg">
                  {(membre?.detteActuelle || 0).toLocaleString()} FC
                </p>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Modal de Modification */}
      <Modal isOpen={isEditOpen} onClose={() => setIsEditOpen(false)} title="Modifier mon profil" maxWidth="md">
        <form onSubmit={saveProfile} className="space-y-4">
          <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/50">
            <div className="h-16 w-16 overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
              {photoPreview ? <img src={photoPreview} alt="Photo de profil" className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-slate-400"><User size={24} /></div>}
            </div>
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200">
              <Upload size={14} /> Changer la photo
              <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handlePhoto} className="hidden" />
            </label>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-300">Nom complet</label>
            <input value={nomComplet} onChange={(event) => setNomComplet(event.target.value)} required className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-950" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-300">Téléphone</label>
              <input value={telephone} onChange={(event) => setTelephone(event.target.value)} required className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-950" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-300">Adresse e-mail</label>
              <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-950" />
            </div>
          </div>
          <button type="submit" disabled={isSaving} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-bold text-white dark:bg-blue-600">
            <Save size={16} /> {isSaving ? "Enregistrement..." : "Enregistrer les modifications"}
          </button>
          {saveError && <p role="alert" className="text-center text-xs font-semibold text-rose-600 dark:text-rose-400">{saveError}</p>}
        </form>
      </Modal>
    </div>
  );
}