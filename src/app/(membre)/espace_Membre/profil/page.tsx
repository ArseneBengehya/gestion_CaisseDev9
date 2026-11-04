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
} from "lucide-react";
import { auth } from "../../../../lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { getMembreByUid } from "../../../../services/dbService";
import { Membre } from "../../../../types";

export default function ProfilPage() {
  const [membre, setMembre] = useState<Membre | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const dataMembre = await getMembreByUid(user.uid);
        if (dataMembre) {
          setMembre(dataMembre);
        }
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-3 text-slate-500">
        <Loader2 size={32} className="animate-spin text-blue-600" />
        <p className="text-xs font-semibold">Chargement des données de votre profil...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl space-y-8 pb-6">
      {/* En-tête */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Mon Profil</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          Gérez vos informations personnelles et consultez votre statut d'adhésion à la Caisse Dev9.
        </p>
      </div>

      {/* Carte d'identité du membre */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-6">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-emerald-500 p-0.5 shadow-md">
              <div className="h-full w-full bg-white dark:bg-slate-900 rounded-[14px] flex items-center justify-center font-black text-2xl text-blue-600 dark:text-blue-400">
                {membre?.nomComplet ? membre.nomComplet.charAt(0).toUpperCase() : "M"}
              </div>
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                {membre?.nomComplet || `${membre?.prenom || ''} ${membre?.nom || ''}`}
              </h2>
              <div className="flex items-center gap-2 mt-1">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/50 dark:text-blue-300">
                  <Shield size={12} /> {membre?.role || "MEMBRE"}
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300">
                  <CheckCircle2 size={12} /> {membre?.statut || "ACTIF"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Grille des informations personnelles */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 space-y-1">
            <div className="flex items-center gap-2 text-slate-400 font-medium">
              <User size={14} />
              <span>Nom complet</span>
            </div>
            <p className="font-bold text-slate-900 dark:text-white text-sm">
              {membre?.nomComplet || `${membre?.prenom || ''} ${membre?.nom || ''}`}
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 space-y-1">
            <div className="flex items-center gap-2 text-slate-400 font-medium">
              <Phone size={14} />
              <span>Numéro de téléphone</span>
            </div>
            <p className="font-bold text-slate-900 dark:text-white text-sm">
              {membre?.telephone || "Non renseigné"}
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 space-y-1">
            <div className="flex items-center gap-2 text-slate-400 font-medium">
              <Mail size={14} />
              <span>Adresse Email</span>
            </div>
            <p className="font-bold text-slate-900 dark:text-white text-sm">
              {membre?.email || "Non renseignée"}
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 space-y-1">
            <div className="flex items-center gap-2 text-slate-400 font-medium">
              <Calendar size={14} />
              <span>Membre depuis</span>
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

        {/* Récapitulatif Financier Personnel */}
        <div className="border-t border-slate-100 dark:border-slate-800 pt-6 space-y-3">
          <h3 className="font-bold text-slate-900 dark:text-white text-sm">Statut de vos cotisations</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-3.5 rounded-xl border border-emerald-100 dark:border-emerald-900/40 bg-emerald-50/50 dark:bg-emerald-950/20">
              <p className="text-emerald-700 dark:text-emerald-400 font-semibold flex items-center gap-1.5">
                <Wallet size={14} /> Total Cotisé
              </p>
              <p className="font-black text-emerald-900 dark:text-emerald-300 text-base mt-1">
                {(membre?.montantTotalCotise || 0).toLocaleString()} FC
              </p>
            </div>

            <div className="p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
              <p className="text-slate-500 dark:text-slate-400 font-semibold flex items-center gap-1.5">
                <CheckCircle2 size={14} /> Statut Cotisation
              </p>
              <p className="font-bold text-slate-900 dark:text-white text-sm mt-1">
                {membre?.statutCotisation || "À jour"}
              </p>
            </div>

            <div className="p-3.5 rounded-xl border border-amber-100 dark:border-amber-900/40 bg-amber-50/50 dark:bg-amber-950/20">
              <p className="text-amber-700 dark:text-amber-400 font-semibold flex items-center gap-1.5">
                <Clock size={14} /> Solde Débiteurs / Dette
              </p>
              <p className="font-black text-amber-900 dark:text-amber-300 text-base mt-1">
                {(membre?.detteActuelle || 0).toLocaleString()} FC
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}