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
import { collection, doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/src/lib/firebase';
import {
  DATE_DEBUT_CAISSE_PAR_DEFAUT,
  moisImpayesPour,
  normaliserDateFirestore,
  nombreMoisAttendus,
} from '@/src/lib/contribution-months';

interface ActiviteRecente {
  id: string;
  type: 'contribution' | 'depense' | 'penalite' | 'emprunt' | 'remboursement' | 'membre';
  direction: 'entree' | 'sortie' | 'aucune';
  membre: string;
  montant: number;
  date: string;
  description: string;
}

export default function AdminDashboardPage() {
  const [totalContributions, setTotalContributions] = useState(0);
  const [totalDepenses, setTotalDepenses] = useState(0);
  const [totalAutresEntrees, setTotalAutresEntrees] = useState(0);
  const [totalEmpruntsAccordes, setTotalEmpruntsAccordes] = useState(0);
  const [membresActifs, setMembresActifs] = useState(0);
  const [membresEnRetard, setMembresEnRetard] = useState(0);
  const [activitesRecentes, setActivitesRecentes] = useState<ActiviteRecente[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let membresData: any[] = [];
    let contribsData: any[] = [];
    let contributionsSpecialesData: any[] = [];
    let depensesData: any[] = [];
    let empruntsData: any[] = [];
    let paiementsEmpruntsData: any[] = [];
    let paiementsPenalitesData: any[] = [];
    let dateDebutCaisse = DATE_DEBUT_CAISSE_PAR_DEFAUT;
    const toutesContributions = () => [
      ...contribsData,
      ...contributionsSpecialesData.map((contribution) => ({
        ...contribution,
        typeContribution: 'MOIS_SPECIAL',
        nombreMois: 1,
        moisCouverts: contribution.moisSpecial ? [contribution.moisSpecial] : [],
      })),
    ];
    const actualiserTotalContributions = () => {
      setTotalContributions(
        toutesContributions().reduce((acc, contribution) => acc + (Number(contribution.montantVerse) || 0), 0)
      );
    };

    // 1. Écouter les membres
    const unsubMembres = onSnapshot(collection(db, 'membres'), (snapshot) => {
      membresData = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      const actifs = membresData.filter((m) => m.statut !== 'INACTIF').length;
      setMembresActifs(actifs);
      calculerRetardsEtActivites(membresData, toutesContributions(), depensesData, empruntsData, paiementsEmpruntsData, paiementsPenalitesData, dateDebutCaisse);
    });

    // 2. Écouter les contributions
    const unsubContribs = onSnapshot(collection(db, 'contributions'), (snapshot) => {
      contribsData = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      actualiserTotalContributions();
      calculerRetardsEtActivites(membresData, toutesContributions(), depensesData, empruntsData, paiementsEmpruntsData, paiementsPenalitesData, dateDebutCaisse);
    });

    // 3. Écouter les contributions du mois spécial
    const unsubContributionsSpeciales = onSnapshot(collection(db, 'contributions_speciales'), (snapshot) => {
      contributionsSpecialesData = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      actualiserTotalContributions();
      calculerRetardsEtActivites(membresData, toutesContributions(), depensesData, empruntsData, paiementsEmpruntsData, paiementsPenalitesData, dateDebutCaisse);
    });

    // 4. Écouter les dépenses
    const unsubDepenses = onSnapshot(collection(db, 'depenses'), (snapshot) => {
      depensesData = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      const totalD = depensesData.reduce((acc, curr) => acc + (Number(curr.montant) || 0), 0);
      setTotalDepenses(totalD);
      calculerRetardsEtActivites(membresData, toutesContributions(), depensesData, empruntsData, paiementsEmpruntsData, paiementsPenalitesData, dateDebutCaisse);
    });

    const unsubEmprunts = onSnapshot(collection(db, 'emprunts'), (snapshot) => {
      empruntsData = snapshot.docs.map((document) => ({ id: document.id, ...document.data() }));
      setTotalEmpruntsAccordes(empruntsData.reduce((total, emprunt) => total + (Number(emprunt.montantEmprunte) || 0), 0));
      calculerRetardsEtActivites(membresData, toutesContributions(), depensesData, empruntsData, paiementsEmpruntsData, paiementsPenalitesData, dateDebutCaisse);
    });

    const unsubPaiementsEmprunts = onSnapshot(collection(db, 'paiements_emprunts'), (snapshot) => {
      paiementsEmpruntsData = snapshot.docs.map((document) => ({ id: document.id, ...document.data() }));
      setTotalAutresEntrees(
        paiementsEmpruntsData.reduce((total, paiement) => total + (Number(paiement.montantVerse) || 0), 0) +
        paiementsPenalitesData.reduce((total, paiement) => total + (Number(paiement.montantVerse) || 0), 0)
      );
      calculerRetardsEtActivites(membresData, toutesContributions(), depensesData, empruntsData, paiementsEmpruntsData, paiementsPenalitesData, dateDebutCaisse);
    });

    const unsubPaiementsPenalites = onSnapshot(collection(db, 'paiements_penalites'), (snapshot) => {
      paiementsPenalitesData = snapshot.docs.map((document) => ({ id: document.id, ...document.data() }));
      setTotalAutresEntrees(
        paiementsEmpruntsData.reduce((total, paiement) => total + (Number(paiement.montantVerse) || 0), 0) +
        paiementsPenalitesData.reduce((total, paiement) => total + (Number(paiement.montantVerse) || 0), 0)
      );
      calculerRetardsEtActivites(membresData, toutesContributions(), depensesData, empruntsData, paiementsEmpruntsData, paiementsPenalitesData, dateDebutCaisse);
    });

    const unsubConfig = onSnapshot(doc(db, 'settings', 'caisse_config'), (snapshot) => {
      if (snapshot.exists()) dateDebutCaisse = snapshot.data().dateDebutCaisse || DATE_DEBUT_CAISSE_PAR_DEFAUT;
      calculerRetardsEtActivites(membresData, toutesContributions(), depensesData, empruntsData, paiementsEmpruntsData, paiementsPenalitesData, dateDebutCaisse);
    });

    return () => {
      unsubMembres();
      unsubContribs();
      unsubContributionsSpeciales();
      unsubDepenses();
      unsubEmprunts();
      unsubPaiementsEmprunts();
      unsubPaiementsPenalites();
      unsubConfig();
    };
  }, []);

  const calculerRetardsEtActivites = (
    membres: any[],
    contributions: any[],
    depenses: any[],
    emprunts: any[],
    paiementsEmprunts: any[],
    paiementsPenalites: any[],
    dateDebutCaisse: string
  ) => {
    // Calcul du nombre de membres en retard
    let retardCount = 0;
    const moisAttendus = nombreMoisAttendus(dateDebutCaisse);
    membres.forEach((membre) => {
      const memberContribs = contributions.filter((c) => c.membreId === membre.id);
      if (moisImpayesPour(dateDebutCaisse, moisAttendus, memberContribs).length > 0) retardCount++;
    });
    setMembresEnRetard(retardCount);

    // Formater les contributions
    const formattedContribs: ActiviteRecente[] = contributions.map((c) => {
      const membreObj = membres.find((m) => m.id === c.membreId);
      const nomMembre = membreObj 
        ? (membreObj.nomComplet || `${membreObj.prenom || ''} ${membreObj.nom || ''}`.trim())
        : 'Membre';

      const dateStr = normaliserDateFirestore(c.datePaiement) || new Date().toISOString();

      return {
        id: `contribution-${c.id}`,
        type: 'contribution' as const,
        direction: 'entree' as const,
        membre: nomMembre,
        montant: Number(c.montantVerse) || 0,
        date: dateStr,
        description: c.typeContribution === 'MOIS_SPECIAL'
          ? `Mois spécial (${c.moisSpecial || 'date non précisée'})`
          : `Cotisation (${c.nombreMois || 1} mois)`,
      };
    });

    // Formater les dépenses
    const formattedDepenses: ActiviteRecente[] = depenses.map((d) => {
      const dateStr = normaliserDateFirestore(d.dateDepense) || new Date().toISOString();

      return {
        id: `depense-${d.id}`,
        type: 'depense' as const,
        direction: 'sortie' as const,
        membre: d.approuvePar || 'Admin',
        montant: Number(d.montant) || 0,
        date: dateStr,
        description: d.motif || 'Dépense caisse',
      };
    });

    const formattedEmprunts: ActiviteRecente[] = emprunts.map((emprunt) => ({
      id: `emprunt-${emprunt.id}`,
      type: 'emprunt',
      direction: 'sortie',
      membre: emprunt.nomMembre || 'Membre',
      montant: Number(emprunt.montantEmprunte) || 0,
      date: normaliserDateFirestore(emprunt.createdAt || emprunt.dateEmprunt) || new Date().toISOString(),
      description: 'Prise d’un emprunt',
    }));
    const formattedPaiementsEmprunts: ActiviteRecente[] = paiementsEmprunts.map((paiement) => ({
      id: `remboursement-${paiement.id}`,
      type: 'remboursement',
      direction: 'entree',
      membre: paiement.nomMembre || 'Membre',
      montant: Number(paiement.montantVerse) || 0,
      date: normaliserDateFirestore(paiement.datePaiement) || new Date().toISOString(),
      description: 'Paiement d’un emprunt',
    }));
    const formattedPaiementsPenalites: ActiviteRecente[] = paiementsPenalites.map((paiement) => {
      const membreObj = membres.find((m) => m.id === paiement.membreId);
      return {
        id: `penalite-${paiement.id}`,
        type: 'penalite',
        direction: 'entree',
        membre: membreObj?.nomComplet || `${membreObj?.prenom || ''} ${membreObj?.nom || ''}`.trim() || 'Membre',
        montant: Number(paiement.montantVerse) || 0,
        date: normaliserDateFirestore(paiement.datePaiement) || new Date().toISOString(),
        description: 'Paiement d’une pénalité',
      };
    });
    const formattedMembres: ActiviteRecente[] = membres
      .filter((membre) => membre.createdAt || membre.dateAdhesion)
      .map((membre) => ({
        id: `membre-${membre.id}`,
        type: 'membre',
        direction: 'aucune',
        membre: membre.nomComplet || `${membre.prenom || ''} ${membre.nom || ''}`.trim() || 'Membre',
        montant: 0,
        date: normaliserDateFirestore(membre.createdAt || membre.dateAdhesion),
        description: 'Ajout d’un membre',
      }));

    const toutesActivites = [
      ...formattedContribs,
      ...formattedDepenses,
      ...formattedEmprunts,
      ...formattedPaiementsEmprunts,
      ...formattedPaiementsPenalites,
      ...formattedMembres,
    ].sort((a, b) => Date.parse(b.date) - Date.parse(a.date));

    setActivitesRecentes(toutesActivites.slice(0, 5));
    setIsLoading(false);
  };

  const soldeActuel = totalContributions + totalAutresEntrees - totalDepenses - totalEmpruntsAccordes;
  const totalEntrees = totalContributions + totalAutresEntrees;
  const tauxDepenses = totalEntrees > 0 ? Math.round((totalDepenses / totalEntrees) * 100) : 0;

  return (
    <div className="space-y-8 pb-2">
      {/* En-tête du Dashboard */}
      <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-600 ring-1 ring-inset ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-slate-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-slate-900 dark:bg-white" />
            </span>
            Tableau de bord 
          </span>
          <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
            Suivez les mouvements et la situation globale de la Caisse
          </p>
        </div>
      </div>

      {/* Cartes KPI */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {/* Solde Total */}
        <div className="group relative min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white p-3.5 text-slate-900 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:shadow-none">
          <div className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full bg-slate-100/50 blur-2xl dark:bg-slate-800/50" />
          <div className="relative flex items-center justify-between gap-2">
            <span className="truncate text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Solde en caisse</span>
            <div className="shrink-0 rounded-lg bg-slate-100 p-1.5 text-slate-700 ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700">
              <Wallet size={15} />
            </div>
          </div>
          <p className="relative mt-2 whitespace-nowrap text-lg font-extrabold tabular-nums tracking-tight xl:text-xl">
            {soldeActuel.toLocaleString()} <span className="text-xs font-medium text-slate-500 dark:text-slate-400">FC</span>
          </p>
          <span className="relative mt-1.5 inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
            <ArrowUpRight size={12} /> Calcul en direct
          </span>
        </div>

        {/* Total Cotisations */}
        <div className="group relative min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
          <div className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full bg-slate-100/50 blur-2xl dark:bg-slate-800/50" />
          <div className="flex items-center justify-between gap-2">
            <span className="truncate text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Total cotisations</span>
            <div className="shrink-0 rounded-lg bg-slate-100 p-1.5 text-slate-700 ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700">
              <TrendingUp size={15} />
            </div>
          </div>
          <p className="relative mt-2 whitespace-nowrap text-lg font-extrabold tabular-nums tracking-tight xl:text-xl text-emerald-600 dark:text-emerald-400">
            +{totalContributions.toLocaleString()} <span className="text-xs font-normal text-slate-500 dark:text-slate-400">FC</span>
          </p>
          <p className="mt-1.5 text-[11px] text-slate-500 dark:text-slate-400">Cumul des entrées</p>
        </div>

        {/* Total Dépenses */}
        <div className="group relative min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
          <div className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full bg-slate-100/50 blur-2xl dark:bg-slate-800/50" />
          <div className="flex items-center justify-between gap-2">
            <span className="truncate text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Total dépenses</span>
            <div className="shrink-0 rounded-lg bg-slate-100 p-1.5 text-slate-700 ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700">
              <TrendingDown size={15} />
            </div>
          </div>
          <p className="relative mt-2 whitespace-nowrap text-lg font-extrabold tabular-nums tracking-tight xl:text-xl text-rose-600 dark:text-rose-400">
            -{totalDepenses.toLocaleString()} <span className="text-xs font-normal text-slate-500 dark:text-slate-400">FC</span>
          </p>
          <div className="mt-1.5 flex items-center gap-2">
            <div className="h-1 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
              <div className="h-full rounded-full bg-rose-600 dark:bg-rose-500" style={{ width: `${tauxDepenses}%` }} />
            </div>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">{tauxDepenses}%</span>
          </div>
        </div>

        {/* Retards de Paiement */}
        <div className="group relative min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
          <div className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full bg-slate-100/50 blur-2xl dark:bg-slate-800/50" />
          <div className="flex items-center justify-between gap-2">
            <span className="truncate text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Membres en retard</span>
            <div className="shrink-0 rounded-lg bg-slate-100 p-1.5 text-slate-700 ring-1 ring-inset ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700">
              <AlertTriangle size={15} />
            </div>
          </div>
          <p className="relative mt-2 whitespace-nowrap text-lg font-extrabold tabular-nums tracking-tight xl:text-xl text-rose-600 dark:text-rose-400">
            {membresEnRetard} <span className="text-xs font-normal text-slate-500 dark:text-slate-400">/ {membresActifs}</span>
          </p>
          <Link
            href="/dashboard/retards"
            className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-semibold text-slate-900 transition-colors hover:underline dark:text-white"
          >
            Voir les retards <ArrowRight size={12} aria-hidden="true" className="transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </div>

      {/* Section Activités Récentes */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-1 border-b border-slate-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <span className="h-5 w-1 rounded-full bg-slate-900 dark:bg-white" />
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
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {activitesRecentes.map((act) => {
              const estEntree = act.direction === 'entree';
              const estSortie = act.direction === 'sortie';
              return (
                <div
                  key={act.id}
                  className="flex flex-col gap-2 px-4 py-3.5 transition-colors hover:bg-slate-50 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-6 dark:hover:bg-slate-800/40"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div
                      className={`shrink-0 rounded-xl p-2.5 ring-1 ring-inset ${
                        estEntree
                          ? 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:ring-emerald-900/50'
                          : estSortie
                            ? 'bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:ring-rose-900/50'
                            : 'bg-slate-100 text-slate-600 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700'
                      }`}
                    >
                      {estEntree ? <ArrowUpRight size={18} /> : estSortie ? <ArrowDownRight size={18} /> : <ArrowRight size={18} />}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">{act.description}</p>
                        <span
                          className={`hidden shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide sm:inline-block ${
                            estEntree
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                              : estSortie
                                ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                                : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                          }`}
                        >
                          {estEntree ? 'Entrée' : estSortie ? 'Sortie' : 'Info'}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                        Par <strong className="font-semibold text-slate-700 dark:text-slate-300">{act.membre}</strong> ·{' '}
                        {isNaN(new Date(act.date).getTime())
                          ? act.date
                          : new Date(act.date).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' })}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`pl-12 text-sm font-bold tabular-nums sm:pl-0 sm:text-right ${
                      estEntree ? 'text-emerald-600 dark:text-emerald-400' : estSortie ? 'text-rose-600 dark:text-rose-400' : 'text-slate-500'
                    }`}
                  >
                    {act.direction === 'aucune' ? '—' : `${estEntree ? '+' : '-'}${act.montant.toLocaleString()} FC`}
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