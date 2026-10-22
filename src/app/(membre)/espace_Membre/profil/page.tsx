"use client";

import React, { useState } from "react";
// Importation du Modal générique depuis le dossier ui
import Modal from "../../../../components/ui/Modal";
import {
  User,
  Mail,
  Phone,
  ShieldCheck,
  Edit,
  Camera,
  Trash2,
  Lock,
  Save,
  CheckCircle2,
} from "lucide-react";

export default function ProfilPage() {
  // 1. Les données du membre
  const [membre, setMembre] = useState({
    nomComplet: "Kambale Malikewa Michael",
    email: "michael.kambale@dev9.org",
    telephone: "+243 970 000 000",
    statut: "Actif",
    role: "Membre co-fondateur | Groupe Dev9",
    dateAdhesion: "Janvier 2025",
    photoUrl: null as string | null,
  });

  // 2. Les états pour gérer le Modal et les formulaires
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isFull, setIsFull] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Formulaire temporaire dans le modal
  const [formNom, setFormNom] = useState(membre.nomComplet);
  const [formEmail, setFormEmail] = useState(membre.email);
  const [formTel, setFormTel] = useState(membre.telephone);
  const [ancienPassword, setAncienPassword] = useState("");
  const [nouveauPassword, setNouveauPassword] = useState("");
  const [tempPhoto, setTempPhoto] = useState<string | null>(membre.photoUrl);

  // Gestion du changement de photo
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setTempPhoto(URL.createObjectURL(file));
    }
  };

  // Enregistrement des modifications du modal
  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Mettre à jour les infos du membre
    setMembre({
      ...membre,
      nomComplet: formNom,
      email: formEmail,
      telephone: formTel,
      photoUrl: tempPhoto,
    });

    // Fermer le modal et afficher le message de succès
    setIsModalOpen(false);
    setIsSuccess(true);
    setTimeout(() => setIsSuccess(false), 4000);
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* En-tête de la page */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Mon Profil</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Vos informations personnelles enregistrées au sein de la caisse.
          </p>
        </div>

        {/* Bouton qui ouvre le Modal d'édition */}
        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-sm transition-colors flex items-center gap-2"
        >
          <Edit size={15} /> Modifier mon profil
        </button>
      </div>

      {/* Alerte de succès */}
      {isSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl flex items-center gap-3 text-xs font-semibold animate-fadeIn">
          <CheckCircle2 size={18} className="text-emerald-600 flex-shrink-0" />
          <span>Vos informations ont été mises à jour avec succès !</span>
        </div>
      )}

      {/* 💳 CARTE DE PROFIL ÉPURÉE (Lecture seule) */}
      <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200/80 shadow-sm space-y-8">
        {/* Photo RONDE + Informations de base */}
        <div className="flex flex-col sm:flex-row items-center gap-6 pb-6 border-b border-slate-100">
          <div className="relative">
            {membre.photoUrl ? (
              <img
                src={membre.photoUrl}
                alt="Photo de profil"
                className="w-24 h-24 rounded-full object-cover border-4 border-slate-100 shadow-sm"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-slate-900 text-white flex items-center justify-center font-black text-3xl shadow-sm border-4 border-slate-100">
                {membre.nomComplet.charAt(0)}
              </div>
            )}
          </div>

          <div className="text-center sm:text-left space-y-1.5">
            <div className="flex items-center gap-3 justify-center sm:justify-start">
              <h2 className="text-xl font-bold text-slate-900">{membre.nomComplet}</h2>
              <span className="px-3 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                ● {membre.statut}
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium">{membre.role}</p>
            <p className="text-[11px] text-slate-400">Membre depuis : {membre.dateAdhesion}</p>
          </div>
        </div>

        {/* Grille des informations */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
          <div className="p-4 bg-slate-50/80 rounded-xl border border-slate-100 flex items-center gap-3.5">
            <div className="p-2.5 bg-white text-slate-700 rounded-lg shadow-sm">
              <User size={18} />
            </div>
            <div>
              <p className="text-slate-400 font-medium">Nom complet</p>
              <p className="font-bold text-slate-900 text-sm mt-0.5">{membre.nomComplet}</p>
            </div>
          </div>

          <div className="p-4 bg-slate-50/80 rounded-xl border border-slate-100 flex items-center gap-3.5">
            <div className="p-2.5 bg-white text-slate-700 rounded-lg shadow-sm">
              <Mail size={18} />
            </div>
            <div>
              <p className="text-slate-400 font-medium">Adresse E-mail</p>
              <p className="font-bold text-slate-900 text-sm mt-0.5">{membre.email}</p>
            </div>
          </div>

          <div className="p-4 bg-slate-50/80 rounded-xl border border-slate-100 flex items-center gap-3.5">
            <div className="p-2.5 bg-white text-slate-700 rounded-lg shadow-sm">
              <Phone size={18} />
            </div>
            <div>
              <p className="text-slate-400 font-medium">Numéro de téléphone</p>
              <p className="font-bold text-slate-900 text-sm mt-0.5">{membre.telephone}</p>
            </div>
          </div>

          <div className="p-4 bg-slate-50/80 rounded-xl border border-slate-100 flex items-center gap-3.5">
            <div className="p-2.5 bg-white text-slate-700 rounded-lg shadow-sm">
              <ShieldCheck size={18} />
            </div>
            <div>
              <p className="text-slate-400 font-medium">Statut du compte</p>
              <p className="font-bold text-emerald-600 text-sm mt-0.5">Compte Vérifié & Conforme</p>
            </div>
          </div>
        </div>
      </div>

      {/* 🪟 MODAL DE MODIFICATION DU PROFIL & SÉCURITÉ */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Modifier mes informations"
        maxWidth="lg"
        isFullScreen={isFull}
        setIsFullScreen={setIsFull}
      >
        <form onSubmit={handleSave} className="space-y-6 text-xs">
          {/* Photo ronde dans le modal */}
          <div className="flex items-center gap-4 pb-4 border-b border-slate-100">
            {tempPhoto ? (
              <img
                src={tempPhoto}
                alt="Aperçu"
                className="w-16 h-16 rounded-full object-cover border-2 border-slate-200"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xl">
                {formNom.charAt(0)}
              </div>
            )}
            <div className="space-y-1">
              <label
                htmlFor="photo-modal"
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors flex items-center gap-1.5 cursor-pointer w-max"
              >
                <Camera size={14} /> Changer la photo
              </label>
              <input
                type="file"
                id="photo-modal"
                accept="image/*"
                onChange={handlePhotoUpload}
                className="hidden"
              />
              {tempPhoto && (
                <button
                  type="button"
                  onClick={() => setTempPhoto(null)}
                  className="text-rose-600 font-semibold text-[11px] hover:underline"
                >
                  Supprimer la photo
                </button>
              )}
            </div>
          </div>

          {/* Champs d'édition */}
          <div className="space-y-4">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Nom complet</label>
              <input
                type="text"
                value={formNom}
                onChange={(e) => setFormNom(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-slate-700 mb-1">E-mail</label>
                <input
                  type="email"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Téléphone</label>
                <input
                  type="tel"
                  value={formTel}
                  onChange={(e) => setFormTel(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800"
                  required
                />
              </div>
            </div>

            {/* Sécurité */}
            <div className="pt-2 border-t border-slate-100 space-y-3">
              <p className="font-bold text-slate-900 text-xs">Changer le mot de passe (optionnel)</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <input
                  type="password"
                  placeholder="Ancien mot de passe"
                  value={ancienPassword}
                  onChange={(e) => setAncienPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800"
                />
                <input
                  type="password"
                  placeholder="Nouveau mot de passe"
                  value={nouveauPassword}
                  onChange={(e) => setNouveauPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800"
                />
              </div>
            </div>
          </div>

          {/* Boutons du Modal */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs rounded-xl transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-sm transition-colors flex items-center gap-1.5"
            >
              <Save size={14} /> Enregistrer
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}