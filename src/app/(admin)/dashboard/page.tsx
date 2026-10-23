'use client';

import React, { useState, useEffect } from 'react';
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  ArrowRight,
} from 'lucide-react';
import Link from 'next/link';

// Import Firestore
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '@/src/lib/firebase';

interface ActiviteRecente {
  id: string;
  type: 'contribution' | 'depense';
  membre: string;
  montant: number;
  date: string;
  description: string;
}

export default function AdminDashboardPage() {
  const [totalContributions, setTotalContributions] = useState(0);
  const [totalDepenses, setTotalDepenses] = useState(0);
  const [membresActifs, setMembresActifs] = useState(0);
  const [membresEnRetard, setMembresEnRetard] = useState(0);
  const [activitesRecentes, setActivitesRecentes] = useState<ActiviteRecente[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let membresData: any[] = [];
    let contribsData: any[] = [];
    let depensesData: any[] = [];

    // 1. Écouter les membres
    const unsubMembres = onSnapshot(collection(db, 'membres'), (snapshot) => {
      membresData = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      const actifs = membresData.filter((m) => m.statut !== 'INACTIF').length;
      setMembresActifs(actifs);
      calculerRetardsEtActivites(membresData, contribsData, depensesData);
    });

    // 2. Écouter les contributions
    const unsubContribs = onSnapshot(collection(db, 'contributions'), (snapshot) => {
      contribsData = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      const totalC = contribsData.reduce((acc, curr) => acc + (Number(curr.montantVerse) || 0), 0);
      setTotalContributions(totalC);
      calculerRetardsEtActivites(membresData, contribsData, depensesData);
    });

    // 3. Écouter les dépenses
    const unsubDepenses = onSnapshot(collection(db, 'depenses'), (snapshot) => {
      depensesData = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      const totalD = depensesData.reduce((acc, curr) => acc + (Number(curr.montant) || 0), 0);
      setTotalDepenses(totalD);
      calculerRetardsEtActivites(membresData, contribsData, depensesData);
    });

    return () => {
      unsubMembres();
      unsubContribs();
      unsubDepenses();
    };
  }, []);

  const calculerRetardsEtActivites = (membres: any[], contributions: any[], depenses: any[]) => {
    if (membres.length === 0) return;

    const moisActuel = new Date().getMonth() + 1;

    // Calcul du nombre de membres en retard
    let retardCount = 0;
    membres.forEach((membre) => {
      const memberContribs = contributions.filter((c) => c.membreId === membre.id);
      const totalMoisPayes = memberContribs.reduce((sum, c) => sum + (Number(c.nombreMois) || 0), 0);
      if (totalMoisPayes < moisActuel) {
        retardCount++;
      }
    });
    setMembresEnRetard(retardCount);

    // Formater les contributions
    const formattedContribs: ActiviteRecente[] = contributions.map((c) => {
      const membreObj = membres.find((m) => m.id === c.membreId);
      const nomMembre = membreObj 
        ? (membreObj.nomComplet || `${membreObj.prenom || ''} ${membreObj.nom || ''}`.trim())
        : 'Membre';

      let dateStr = new Date().toISOString().split('T')[0];
      if (c.datePaiement) {
        dateStr = String(c.datePaiement).split('T')[0];
      }

      return {
        id: c.id,
        type: 'contribution',
        membre: nomMembre,
        montant: Number(c.montantVerse) || 0,
        date: dateStr,
        description: `Cotisation (${c.nombreMois || 1} mois)`,
      };
    });

    // Formater les dépenses
    const formattedDepenses: ActiviteRecente[] = depenses.map((d) => {
      let dateStr = new Date().toISOString().split('T')[0];
      if (d.dateDepense) {
        dateStr = String(d.dateDepense).split('T')[0];
      }

      return {
        id: d.id,
        type: 'depense',
        membre: d.approuvePar || 'Admin',
        montant: Number(d.montant) || 0,
        date: dateStr,
        description: d.motif || 'Dépense caisse',
      };
    });

    // Fusion correcte avec spread operator
    const toutesActivites = [...formattedContribs, ...formattedDepenses].sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    setActivitesRecentes(toutesActivites.slice(0, 5));
    setIsLoading(false);
  };

  const soldeActuel = totalContributions - totalDepenses;
  const tauxDepenses = totalContributions > 0 ? Math.round((totalDepenses / totalContributions) * 100) : 0;

  return (
    <div className="space-y-8 pb-2">
      {/* En-tête du Dashboard */}
      <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-blue-700 ring-1 ring-inset ring-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:ring-blue-900">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-500 opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-blue-500" />
            </span>
            Tableau de bord (Temps réel)
          </span>
          <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
            Suivez les mouvements et la situation globale de la Caisse Dev9.
          </p>
        </div>
      </div>

      {/* Cartes KPI */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {/* Solde Total */}
        <div className="group relative min-w-0 overflow-hidden rounded-xl bg-blue-600 p-3.5 text-white shadow-md shadow-blue-700/20 transition-all hover:-translate-y-0.5 hover:shadow-lg dark:bg-slate-900 dark:shadow-none dark:ring-1 dark:ring-blue-400/20">
          <div className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full bg-white/10 blur-2xl" />
          <div className="relative flex items-center justify-between gap-2">
            <span className="truncate text-[11px] font-semibold uppercase tracking-wide text-blue-100">Solde en caisse</span>
            <div className="shrink-0 rounded-lg bg-white/15 p-1.5 ring-1 ring-white/20">
              <Wallet size={15} />
            </div>
          </div>
          <p className="relative mt-2 whitespace-nowrap text-lg font-extrabold tabular-nums tracking-tight xl:text-xl">
            {soldeActuel.toLocaleString()} <span className="text-xs font-medium text-blue-100">FC</span>
          </p>
          <span className="relative mt-1.5 inline-flex items-center gap-1 text-[11px] font-medium text-emerald-200">
            <ArrowUpRight size={12} /> Calcul en direct
          </span>
        </div>

        {/* Total Cotisations */}
        <div className="group relative min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-slate-700 dark:bg-slate-900">
          <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-emerald-400 to-emerald-600" />
          <div className="flex items-center justify-between gap-2">
            <span className="truncate text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Total cotisations</span>
            <div className="shrink-0 rounded-lg bg-emerald-50 p-1.5 text-emerald-700 ring-1 ring-inset ring-emerald-100 dark:bg-emerald-950/60 dark:text-emerald-300 dark:ring-emerald-900">
              <TrendingUp size={15} />
            </div>
          </div>
          <p className="mt-2 whitespace-nowrap text-lg font-extrabold tabular-nums tracking-tight text-emerald-700 xl:text-xl dark:text-emerald-400">
            +{totalContributions.toLocaleString()} <span className="text-xs font-normal text-slate-500 dark:text-slate-400">FC</span>
          </p>
          <p className="mt-1.5 text-[11px] text-slate-500 dark:text-slate-400">Cumul des entrées</p>
        </div>

        {/* Total Dépenses */}
        <div className="group relative min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-slate-700 dark:bg-slate-900">
          <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-rose-400 to-rose-600" />
          <div className="flex items-center justify-between gap-2">
            <span className="truncate text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Total dépenses</span>
            <div className="shrink-0 rounded-lg bg-rose-50 p-1.5 text-rose-700 ring-1 ring-inset ring-rose-100 dark:bg-rose-950/60 dark:text-rose-300 dark:ring-rose-900">
              <TrendingDown size={15} />
            </div>
          </div>
          <p className="mt-2 whitespace-nowrap text-lg font-extrabold tabular-nums tracking-tight text-rose-700 xl:text-xl dark:text-rose-400">
            -{totalDepenses.toLocaleString()} <span className="text-xs font-normal text-slate-500 dark:text-slate-400">FC</span>
          </p>
          <div className="mt-1.5 flex items-center gap-2">
            <div className="h-1 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
              <div className="h-full rounded-full bg-gradient-to-r from-rose-400 to-rose-600" style={{ width: `${tauxDepenses}%` }} />
            </div>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">{tauxDepenses}%</span>
          </div>
        </div>

        {/* Retards de Paiement */}
        <div className="group relative min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-slate-700 dark:bg-slate-900">
          <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-amber-400 to-amber-600" />
          <div className="flex items-center justify-between gap-2">
            <span className="truncate text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Membres en retard</span>
            <div className="shrink-0 rounded-lg bg-amber-50 p-1.5 text-amber-700 ring-1 ring-inset ring-amber-100 dark:bg-amber-950/60 dark:text-amber-300 dark:ring-amber-900">
              <AlertTriangle size={15} />
            </div>
          </div>
          <p className="mt-2 whitespace-nowrap text-lg font-extrabold tabular-nums tracking-tight text-amber-700 xl:text-xl dark:text-amber-400">
            {membresEnRetard} <span className="text-xs font-normal text-slate-500 dark:text-slate-400">/ {membresActifs}</span>
          </p>
          <Link
            href="/dashboard/retards"
            className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700 transition-colors hover:text-blue-800 dark:text-blue-300 dark:hover:text-blue-200"
          >
            Voir les retards <ArrowRight size={12} aria-hidden="true" className="transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </div>

      {/* Section Activités Récentes */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="flex flex-col gap-1 border-b border-slate-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 dark:border-slate-700">
          <div className="flex items-center gap-2.5">
            <span className="h-5 w-1 rounded-full bg-gradient-to-b from-blue-500 to-emerald-500" />
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Derniers mouvements de caisse</h3>
          </div>
          <span className="inline-flex w-fit items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            {activitesRecentes.length} récentes opérations
          </span>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-slate-500">Chargement des données du tableau de bord...</div>
        ) : activitesRecentes.length === 0 ? (
          <div className="p-8 text-center text-slate-500">Aucun mouvement enregistré pour le moment.</div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-700">
            {activitesRecentes.map((act) => {
              const estEntree = act.type === 'contribution';
              return (
                <div
                  key={act.id}
                  className="flex flex-col gap-2 px-4 py-3.5 transition-colors hover:bg-slate-50 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-6 dark:hover:bg-slate-800/50"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div
                      className={`shrink-0 rounded-xl p-2.5 ring-1 ring-inset ${
                        estEntree
                          ? 'bg-emerald-50 text-emerald-700 ring-emerald-100 dark:bg-emerald-950/60 dark:text-emerald-300 dark:ring-emerald-900'
                          : 'bg-rose-50 text-rose-700 ring-rose-100 dark:bg-rose-950/60 dark:text-rose-300 dark:ring-rose-900'
                      }`}
                    >
                      {estEntree ? <ArrowUpRight size={18} /> : <ArrowDownRight size={18} />}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">{act.description}</p>
                        <span
                          className={`hidden shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide sm:inline-block ${
                            estEntree
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                              : 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                          }`}
                        >
                          {estEntree ? 'Entrée' : 'Sortie'}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                        Par <strong className="font-semibold text-slate-700 dark:text-slate-300">{act.membre}</strong> ·{' '}
                        {isNaN(new Date(act.date).getTime()) 
                          ? act.date 
                          : new Date(`${act.date}T00:00:00`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`pl-12 text-sm font-bold tabular-nums sm:pl-0 sm:text-right ${
                      estEntree ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                    }`}
                  >
                    {estEntree ? '+' : '-'}
                    {act.montant.toLocaleString()} FC
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}