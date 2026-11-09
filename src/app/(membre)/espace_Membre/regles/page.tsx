"use client";

import React, { useEffect, useState } from "react";
import { ShieldCheck, BookOpen, Calendar, AlertCircle, Loader2, Coins } from "lucide-react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../../../../lib/firebase"; // Ajuste le chemin selon la profondeur
import { RegleCaisse } from "../../../../types";

export default function ReglesCaissePage() {
  const [regles, setRegles] = useState<RegleCaisse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [parametres, setParametres] = useState({ cotisationMensuelle: 5000, cotisationMoisSpecial: 10000, dateDebutCaisse: "2025-01-01" });

  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, "settings", "caisse_config"), (snapshot) => {
      if (!snapshot.exists()) {
        setRegles([]);
        setIsLoading(false);
        return;
      }
      const data = snapshot.data();
      setParametres({
        cotisationMensuelle: Number(data.cotisationMensuelle || 5000),
        cotisationMoisSpecial: Number(data.cotisationMoisSpecial || 10000),
        dateDebutCaisse: data.dateDebutCaisse || "2025-01-01",
      });
      const personnalisées = Array.isArray(data.reglesGroupe)
        ? data.reglesGroupe.map((regle: { id?: string; titre: string; contenu: string[] }) => ({
            id: regle.id || regle.titre,
            cotisationMensuelle: Number(data.cotisationMensuelle || 5000),
            devise: "FC",
            jourLimitePaiement: 5,
            penaliteRetardActive: false,
            montantPenalite: 0,
            frequenceRappelJours: 30,
            titre: regle.titre,
            contenu: Array.isArray(regle.contenu) ? regle.contenu : [],
          }))
        : [];
      setRegles(personnalisées as unknown as RegleCaisse[]);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-3 text-slate-500">
        <Loader2 size={32} className="animate-spin text-blue-600" />
        <p className="text-xs font-semibold">Chargement des règles de la caisse...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl space-y-8 pb-8">
      {/* En-tête */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-1">
        <div className="flex items-center gap-2">
          <span className="p-2 bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400 rounded-xl">
            <BookOpen size={20} />
          </span>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Règles & Politiques de la Caisse</h1>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Consultez les directives officielles, les taux d'intérêt et les conditions fixées par l'administration en temps réel.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Montant à payer par mois</p>
          <p className="mt-1 text-xl font-black text-slate-900 dark:text-white">{parametres.cotisationMensuelle.toLocaleString()} FC</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Montant du mois spécial</p>
          <p className="mt-1 text-xl font-black text-slate-900 dark:text-white">{parametres.cotisationMoisSpecial.toLocaleString()} FC</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Début de la caisse</p>
          <p className="mt-1 text-xl font-black text-slate-900 dark:text-white">{new Date(`${parametres.dateDebutCaisse}T00:00:00`).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}</p>
        </div>
      </div>

      {/* Liste des règles */}
      <div className="grid grid-cols-1 gap-4">
        {regles.length > 0 ? (
          regles.map((regle) => (
            <div key={regle.id} className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white text-sm">
                  <ShieldCheck size={18} className="text-emerald-600" />
                  <span>{regle.titre || "Règlement Officiel de la Caisse Dev9"}</span>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300">
                  Devise : {regle.devise || "FC"}
                </span>
              </div>

              {regle.contenu && regle.contenu.length > 0 && (
                <ul className="list-disc space-y-1 pl-5 text-xs text-slate-600 dark:text-slate-300">
                  {regle.contenu.map((ligne, index) => (
                    <li key={`${regle.id}-${index}`}>{ligne}</li>
                  ))}
                </ul>
              )}
            </div>
          ))
        ) : (
          <div className="bg-white dark:bg-slate-900 p-10 rounded-2xl border border-slate-200/80 dark:border-slate-800 text-center space-y-3 shadow-sm">
            <BookOpen size={28} className="mx-auto text-slate-300" />
            <h3 className="font-bold text-slate-900 dark:text-white text-sm">Aucune règle configurée pour l'instant</h3>
            <p className="text-xs text-slate-400">
              L'administrateur n'a pas encore publié les règles de la caisse dans la base de données.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}