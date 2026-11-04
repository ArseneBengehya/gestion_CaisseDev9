"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Wallet,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
  ChevronRight,
  FileText,
  Loader2,
  Bell,
  ShieldCheck,
} from "lucide-react";

// Importations Firebase et Services
import { auth } from "../../../lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { getMembreByUid, getContributionsByMembreId } from "../../../services/dbService";
import { Membre, Contribution, NotificationMembre } from "../../../types";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "../../../lib/firebase";

export default function EspaceMembreAccueil() {
  const [membre, setMembre] = useState<Membre | null>(null);
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [notifications, setNotifications] = useState<NotificationMembre[]>([]);
  const [totalGeneralCaisse, setTotalGeneralCaisse] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // 1. Écouter le total général de la caisse en temps réel depuis les contributions globales
    const unsubGlobalContribs = onSnapshot(collection(db, "contributions"), (snapshot) => {
      let sommeTotale = 0;
      snapshot.docs.forEach((docSnap) => {
        const data = docSnap.data();
        sommeTotale += Number(data.montantTotal || data.montantVerse || 0);
      });
      setTotalGeneralCaisse(sommeTotale);
    });

    // 2. Authentification et données du membre connecté
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const dataMembre = await getMembreByUid(user.uid);
        if (dataMembre) {
          setMembre(dataMembre);

          // Récupérer ses contributions personnelles
          const listContribs = await getContributionsByMembreId(dataMembre.id);
          setContributions(listContribs);

          // Écouter ses notifications en temps réel
          const notifsRef = collection(db, "notifications");
          const qNotifs = query(notifsRef, where("membreId", "in", [dataMembre.id, "TOUS"]));
          
          const unsubscribeNotifs = onSnapshot(qNotifs, (snapshot) => {
            const notifsList = snapshot.docs.map((doc) => ({
              id: doc.id,
              ...doc.data(),
            })) as NotificationMembre[];
            notifsList.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            setNotifications(notifsList);
          });

          setIsLoading(false);
          return () => unsubscribeNotifs();
        }
      }
      setIsLoading(false);
    });

    return () => {
      unsubGlobalContribs();
      unsubscribeAuth();
    };
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center space-y-3 text-slate-500">
        <Loader2 size={36} className="animate-spin text-blue-600" />
        <p className="text-xs font-semibold">Chargement de votre espace sécurisé...</p>
      </div>
    );
  }

  // 🧮 Calculs précis demandés
  const totalCotisePersonnel = contributions.reduce((acc, curr) => acc + (Number(curr.montantTotal) || 0), 0);
  
  // Mois actuels payés vs attendus (basés sur le calendrier)
  const moisActuelIndex = new Date().getMonth() + 1; // 1 à 12
  const moisPayesList = membre?.moisPayes || [];
  const nombreMoisPayesTotal = moisPayesList.length || contributions.reduce((acc, curr) => acc + (curr.moisCouverts?.length || 0), 0);

  // Calcul des retards et des avances
  const moisEnRetard = Math.max(0, moisActuelIndex - nombreMoisPayesTotal);
  const moisAvances = Math.max(0, nombreMoisPayesTotal - moisActuelIndex);

  return (
    <div className="space-y-8 pb-10">
      {/* En-tête style Dashboard CRM Pro */}
      <div className="flex flex-col gap-2 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tableau de bord</span>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white mt-1">
              Bonjour, {membre?.nomComplet || `${membre?.prenom || ''} ${membre?.nom || ''}` || "Membre"} ✨
            </h1>
          </div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300">
            <ShieldCheck size={14} /> Espace Membre Actif
          </span>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Suivi en temps réel de votre situation financière et des mouvements globaux de la Caisse Dev9.
        </p>
      </div>

      {/* 📊 CARTES KPI (Inspirées du modèle de design Dribbble) */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">Votre vue d'ensemble & Caisse</h2>
          <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
            <TrendingUp size={14} /> Synchronisé avec l'Admin
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* 1. Total Général de la Caisse */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
            <div className="absolute top-0 left-0 right-0 h-1 bg-blue-600" />
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total Caisse Dev9</span>
              <div className="p-2 bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400 rounded-xl">
                <Wallet size={18} />
              </div>
            </div>
            <p className="mt-3 text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              {totalGeneralCaisse.toLocaleString()} <span className="text-xs font-normal text-slate-400">FC</span>
            </p>
            <p className="mt-2 text-[11px] text-slate-400">Trésorerie globale actuelle</p>
          </div>

          {/* 2. Total Contributions Personnel */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
            <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-500" />
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Vos Cotisations</span>
              <div className="p-2 bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400 rounded-xl">
                <TrendingUp size={18} />
              </div>
            </div>
            <p className="mt-3 text-2xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">
              {totalCotisePersonnel.toLocaleString()} <span className="text-xs font-normal text-slate-400">FC</span>
            </p>
            <p className="mt-2 text-[11px] text-slate-400">Cumul de vos versements</p>
          </div>

          {/* 3. Mois en Retard */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
            <div className="absolute top-0 left-0 right-0 h-1 bg-rose-500" />
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Mois en Retard</span>
              <div className="p-2 bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400 rounded-xl">
                <AlertTriangle size={18} />
              </div>
            </div>
            <p className="mt-3 text-2xl font-black text-rose-600 dark:text-rose-400 tracking-tight">
              {moisEnRetard} <span className="text-xs font-normal text-slate-400">mois</span>
            </p>
            <p className="mt-2 text-[11px] text-slate-400">À régulariser auprès de la caisse</p>
          </div>

          {/* 4. Mois Avancés */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
            <div className="absolute top-0 left-0 right-0 h-1 bg-amber-500" />
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Mois Avancés / Futurs</span>
              <div className="p-2 bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400 rounded-xl">
                <Clock size={18} />
              </div>
            </div>
            <p className="mt-3 text-2xl font-black text-amber-600 dark:text-amber-400 tracking-tight">
              {moisAvances} <span className="text-xs font-normal text-slate-400">mois</span>
            </p>
            <p className="mt-2 text-[11px] text-slate-400">Avances sur échéances futures</p>
          </div>

        </div>
      </div>

      {/* SECTION NOTIFICATIONS & HISTORIQUE */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* 🔔 Centre de Notifications en Direct */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Bell size={18} className="text-blue-600" />
              <h2 className="font-bold text-slate-900 dark:text-white text-sm">Notifications Administrateur</h2>
            </div>
            <span className="px-2.5 py-0.5 bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 rounded-full text-[10px] font-bold">
              {notifications.length}
            </span>
          </div>

          <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
            {notifications.length > 0 ? (
              notifications.map((notif) => (
                <div key={notif.id} className="p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-blue-600" />
                      {notif.titre}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {new Date(notif.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    {notif.message}
                  </p>
                </div>
              ))
            ) : (
              <div className="text-center py-8 space-y-2">
                <p className="text-xs text-slate-400 font-medium">Aucune notification pour l'instant.</p>
                <p className="text-[11px] text-slate-400">Les mises à jour de l'admin apparaîtront ici.</p>
              </div>
            )}
          </div>
        </div>

        {/* 📋 Tableau des Dernières Transactions Personnelles */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <FileText size={18} className="text-blue-600" />
              <h2 className="font-bold text-slate-900 dark:text-white text-sm">Vos Dernières Contributions</h2>
            </div>
            <Link href="/espace_Membre/transactions" className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1">
              Voir tout <ChevronRight size={14} />
            </Link>
          </div>

          {contributions.length > 0 ? (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {contributions.slice(0, 4).map((item) => (
                <div key={item.id} className="py-3 flex items-center justify-between text-xs">
                  <div>
                    <p className="font-bold text-slate-900 dark:text-white">
                      Mois : {item.moisCouverts?.join(", ") || "N/A"}
                    </p>
                    <p className="text-slate-400 mt-0.5">Mode : {item.modePaiement} • {item.datePaiement}</p>
                  </div>
                  <span className="font-black text-emerald-600 dark:text-emerald-400 text-sm">
                    +{item.montantTotal?.toLocaleString()} FC
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-10 space-y-3">
              <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center mx-auto text-slate-400">
                <FileText size={20} />
              </div>
              <p className="text-xs text-slate-500 font-medium">Aucune contribution enregistrée à votre nom.</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}