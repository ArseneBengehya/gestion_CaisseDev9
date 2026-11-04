"use client";

import React, { useEffect, useState } from "react";
import { ShieldCheck, BookOpen, Calendar, AlertCircle, Loader2, Coins } from "lucide-react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../../../../lib/firebase"; // Ajuste le chemin selon la profondeur
import { RegleCaisse } from "../../../../types";

export default function ReglesCaissePage() {
  const [regles, setRegles] = useState<RegleCaisse[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Écoute en temps réel de la collection 'regles' dans Firestore
    const unsubscribe = onSnapshot(collection(db, "regles"), (snapshot) => {
      const reglesData = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      })) as RegleCaisse[];
      setRegles(reglesData);
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

      {/* Liste des règles */}
      <div className="grid grid-cols-1 gap-4">
        {regles.length > 0 ? (
          regles.map((regle) => (
            <div key={regle.id} className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white text-sm">
                  <ShieldCheck size={18} className="text-emerald-600" />
                  <span>Règlement Officiel de la Caisse Dev9</span>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300">
                  Devise : {regle.devise || "FC"}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 space-y-1">
                  <p className="text-slate-400 font-medium flex items-center gap-1.5">
                    <Coins size={14} /> Cotisation Mensuelle
                  </p>
                  <p className="font-black text-slate-900 dark:text-white text-base">
                    {(regle.cotisationMensuelle || 0).toLocaleString()} {regle.devise || "FC"}
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 space-y-1">
                  <p className="text-slate-400 font-medium flex items-center gap-1.5">
                    <Calendar size={14} /> Jour Limite de Paiement
                  </p>
                  <p className="font-black text-slate-900 dark:text-white text-base">
                    Le {regle.jourLimitePaiement || 5} de chaque mois
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 space-y-1">
                  <p className="text-slate-400 font-medium flex items-center gap-1.5">
                    <AlertCircle size={14} /> Pénalités de Retard
                  </p>
                  <p className="font-black text-slate-900 dark:text-white text-base">
                    {regle.penaliteRetardActive ? `Actives (${regle.montantPenalite || 0} ${regle.devise || "FC"})` : "Inactives"}
                  </p>
                </div>
              </div>
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