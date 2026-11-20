'use client';

import React, { useEffect, useState } from 'react';
import { AlertTriangle, ArrowRight, ArrowUpRight, CalendarDays, ShieldAlert, TrendingUp, Wallet } from 'lucide-react';
import { collection, doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/src/lib/firebase';
import { ContributionMonthRecord, DATE_DEBUT_CAISSE_PAR_DEFAUT } from '@/src/lib/contribution-months';
import { genererEtatsMoisCotisation, normaliserMoisSpecial } from '@/src/lib/contribution-payments';
import DebtCalendar, { MonthlyDebtMember } from '@/src/components/ui/DebtCalendar';
import ExportCsvButton from '@/src/components/ui/ExportCsvButton';
import PageSkeleton from '@/src/components/ui/PageSkeleton';
import type { CsvColumn } from '@/src/lib/export-csv';
import Link from 'next/link';

interface DashboardMember {
  id: string;
  nomComplet: string;
  prenom: string;
  nom: string;
  statut: string;
}

interface DashboardContribution extends ContributionMonthRecord {
  id: string;
  membreId: string;
  montantVerse: number;
  nombreMois: number;
  typeContribution?: string;
  moisSpecial?: string;
  repartition?: unknown;
}

interface DashboardExpense {
  montant: number;
}

interface DashboardLoan {
  montantEmprunte: number;
  montantRestant: number;
}

interface DashboardPayment {
  montantVerse: number;
}

interface DashboardPenalty {
  montantDu: number;
  montantPaye: number;
}

interface DashboardExportRow {
  type: string;
  month: string;
  member: string;
  amount: number;
  detail: string;
}

const monthKeyFor = (date: Date): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

const nextMonthKey = (key: string): string => {
  const [year, month] = key.split('-').map(Number);
  return month === 12
    ? `${year + 1}-01`
    : `${year}-${String(month + 1).padStart(2, '0')}`;
};

const incrementMonthKey = (key: string): string => nextMonthKey(key);

const amountForMonth = (
  month: string,
  monthlyAmount: number,
  specialAmount: number,
  specialMonth: string
): number => (month && specialMonth && month.endsWith(`-${normaliserMoisSpecial(specialMonth)}`)
  ? specialAmount
  : monthlyAmount);

export default function AdminDashboardPage() {
  const [soldeActuel, setSoldeActuel] = useState(0);
  const [membresActifs, setMembresActifs] = useState(0);
  const [membresEnRetard, setMembresEnRetard] = useState(0);
  const [totalNormal, setTotalNormal] = useState(0);
  const [totalDettes, setTotalDettes] = useState(0);
  const [avanceMoisProchain, setAvanceMoisProchain] = useState(0);
  const [montantAvance, setMontantAvance] = useState(0);
  const [dettesParMois, setDettesParMois] = useState<Record<string, MonthlyDebtMember[]>>({});
  const [dateDebutCaisse, setDateDebutCaisse] = useState(DATE_DEBUT_CAISSE_PAR_DEFAUT);
  const [moisActuel, setMoisActuel] = useState(monthKeyFor(new Date()));
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let membres: DashboardMember[] = [];
    let contributionsRegulieres: DashboardContribution[] = [];
    let contributionsSpeciales: DashboardContribution[] = [];
    let depenses: DashboardExpense[] = [];
    let emprunts: DashboardLoan[] = [];
    let paiementsEmprunts: DashboardPayment[] = [];
    let paiementsPenalites: DashboardPayment[] = [];
    let penalites: DashboardPenalty[] = [];
    let cotisationMensuelle = 5000;
    let cotisationMoisSpecial = 10000;
    let moisSpecial = '';
    let dateDebut = DATE_DEBUT_CAISSE_PAR_DEFAUT;
    let loadedSources = 0;
    const sourceCount = 9;

    const markSourceLoaded = () => {
      loadedSources += 1;
      if (loadedSources >= sourceCount) setIsLoading(false);
    };

    const refreshDashboard = () => {
      const contributions = [...contributionsRegulieres, ...contributionsSpeciales];
      const currentMonth = monthKeyFor(new Date());
      const nextMonth = nextMonthKey(currentMonth);
      setMoisActuel(currentMonth);
      setDateDebutCaisse(dateDebut);

      const membresActifs = membres.filter((membre) => membre.statut !== 'INACTIF');
      setMembresActifs(membresActifs.length);

      let totalCotisationsEnDette = 0;
      let totalAvanceProchainMois = 0;
      let totalAvanceMoisFuturs = 0;
      let totalMembresEnRetard = 0;
      const dettes: Record<string, MonthlyDebtMember[]> = {};
      const startMonth = /^\d{4}-\d{2}/.test(dateDebut)
        ? dateDebut.slice(0, 7)
        : DATE_DEBUT_CAISSE_PAR_DEFAUT.slice(0, 7);
      const moisAttendus: string[] = [];
      let cursor = startMonth;
      while (cursor <= currentMonth) {
        moisAttendus.push(cursor);
        cursor = incrementMonthKey(cursor);
      }
      const montantNormalParMembre = moisAttendus.reduce(
        (total, month) => total + amountForMonth(month, cotisationMensuelle, cotisationMoisSpecial, moisSpecial),
        0
      );
      setTotalNormal(membresActifs.length * montantNormalParMembre);

      membres.forEach((membre) => {
        const contributionsMembre = contributions.filter((contribution) => contribution.membreId === membre.id);
        const monthStates = genererEtatsMoisCotisation(
          contributionsMembre,
          dateDebut,
          currentMonth,
          cotisationMensuelle,
          moisSpecial,
          cotisationMoisSpecial,
          1
        );
        const statesByMonth = new Map(monthStates.map((month) => [month.mois, month]));
        if (
          membre.statut !== 'INACTIF' &&
          monthStates.some((month) => month.mois <= currentMonth && month.statut !== 'PAYE')
        ) {
          totalMembresEnRetard += 1;
        }
        const nom = membre.nomComplet || `${membre.prenom} ${membre.nom}`.trim() || 'Membre';
        moisAttendus.forEach((month) => {
          const monthState = statesByMonth.get(month);
          if (!monthState || monthState.statut === 'PAYE') return;
          const montant = Math.max(0, monthState.montantRequis - monthState.montantPaye);
          totalCotisationsEnDette += montant;
          if (!dettes[month]) dettes[month] = [];
          dettes[month].push({ id: membre.id, nom, montant });
        });
        totalAvanceProchainMois += statesByMonth.get(nextMonth)?.montantPaye || 0;
        totalAvanceMoisFuturs += monthStates
          .filter((month) => month.mois > currentMonth)
          .reduce((total, month) => total + month.montantPaye, 0);
      });

      const penalisationsRestantes = penalites.reduce(
        (total, penalite) => total + Math.max(0, (Number(penalite.montantDu) || 0) - (Number(penalite.montantPaye) || 0)),
        0
      );
      const totalContributions = contributions.reduce(
        (total, contribution) => total + (Number(contribution.montantVerse) || 0),
        0
      );
      const totalAutresEntrees = paiementsEmprunts.reduce(
        (total, paiement) => total + (Number(paiement.montantVerse) || 0),
        0
      ) + paiementsPenalites.reduce(
        (total, paiement) => total + (Number(paiement.montantVerse) || 0),
        0
      );
      const totalDepenses = depenses.reduce((total, depense) => total + (Number(depense.montant) || 0), 0);
      const totalEmpruntsAccordes = emprunts.reduce(
        (total, emprunt) => total + (Number(emprunt.montantEmprunte) || 0),
        0
      );
      const montantDettesEmprunts = emprunts.reduce(
        (total, emprunt) => total + (Number(emprunt.montantRestant) || 0),
        0
      );

      setSoldeActuel(totalContributions + totalAutresEntrees - totalDepenses - totalEmpruntsAccordes);
      setMembresEnRetard(totalMembresEnRetard);
      setTotalDettes(totalCotisationsEnDette + penalisationsRestantes + montantDettesEmprunts);
      setAvanceMoisProchain(totalAvanceProchainMois);
      setMontantAvance(totalAvanceMoisFuturs);
      setDettesParMois(dettes);
    };

    const unsubMembres = onSnapshot(collection(db, 'membres'), (snapshot) => {
      membres = snapshot.docs.map((document) => {
        const data = document.data();
        return {
          id: document.id,
          nomComplet: typeof data.nomComplet === 'string' ? data.nomComplet : '',
          prenom: typeof data.prenom === 'string' ? data.prenom : '',
          nom: typeof data.nom === 'string' ? data.nom : '',
          statut: typeof data.statut === 'string' ? data.statut : 'ACTIF',
        };
      });
      refreshDashboard();
      markSourceLoaded();
    });

    const unsubContributions = onSnapshot(collection(db, 'contributions'), (snapshot) => {
      contributionsRegulieres = snapshot.docs.map((document) => {
        const data = document.data();
        const moisCouverts = Array.isArray(data.moisSelectionnes)
          ? data.moisSelectionnes
          : Array.isArray(data.moisCouverts)
            ? data.moisCouverts
            : undefined;
        return {
          id: document.id,
          membreId: typeof data.membreId === 'string' ? data.membreId : '',
          montantVerse: Number(data.montantVerse ?? data.montantTotal) || 0,
          nombreMois: Number(data.nombreMois ?? data.nombreMoisPayes) || 0,
          moisCouverts,
          datePaiement: data.datePaiement,
          typeContribution: typeof data.typeContribution === 'string' ? data.typeContribution : undefined,
          moisSpecial: typeof data.moisSpecial === 'string' ? data.moisSpecial : undefined,
          repartition: data.repartition,
        };
      });
      refreshDashboard();
      markSourceLoaded();
    });

    const unsubContributionsSpeciales = onSnapshot(collection(db, 'contributions_speciales'), (snapshot) => {
      const specialContributions = snapshot.docs.map((document) => {
        const data = document.data();
        const month = typeof data.moisSpecial === 'string' ? data.moisSpecial : '';
        return {
          id: document.id,
          membreId: typeof data.membreId === 'string' ? data.membreId : '',
          montantVerse: Number(data.montantVerse ?? data.montantTotal) || 0,
          nombreMois: 1,
          moisCouverts: month ? [month] : [],
          datePaiement: data.datePaiement,
          typeContribution: 'MOIS_SPECIAL',
          moisSpecial: month,
        };
      });
      contributionsSpeciales = specialContributions;
      refreshDashboard();
      markSourceLoaded();
    });

    const unsubDepenses = onSnapshot(collection(db, 'depenses'), (snapshot) => {
      depenses = snapshot.docs.map((document) => ({ montant: Number(document.data().montant) || 0 }));
      refreshDashboard();
      markSourceLoaded();
    });

    const unsubEmprunts = onSnapshot(collection(db, 'emprunts'), (snapshot) => {
      emprunts = snapshot.docs.map((document) => {
        const data = document.data();
        const montantTotalARembourser = Number(data.montantTotalARembourser) || 0;
        const montantPaye = Number(
          data.montantPaye ?? (data.statut === 'Remboursé' ? montantTotalARembourser : 0)
        ) || 0;
        const montantRestant = data.montantRestant === undefined || data.montantRestant === null
          ? Math.max(0, montantTotalARembourser - montantPaye)
          : Math.max(0, Number(data.montantRestant) || 0);
        return {
          montantEmprunte: Number(data.montantEmprunte) || 0,
          montantRestant,
        };
      });
      refreshDashboard();
      markSourceLoaded();
    });

    const unsubPaiementsEmprunts = onSnapshot(collection(db, 'paiements_emprunts'), (snapshot) => {
      paiementsEmprunts = snapshot.docs.map((document) => ({ montantVerse: Number(document.data().montantVerse) || 0 }));
      refreshDashboard();
      markSourceLoaded();
    });

    const unsubPaiementsPenalites = onSnapshot(collection(db, 'paiements_penalites'), (snapshot) => {
      paiementsPenalites = snapshot.docs.map((document) => ({ montantVerse: Number(document.data().montantVerse) || 0 }));
      refreshDashboard();
      markSourceLoaded();
    });

    const unsubPenalites = onSnapshot(collection(db, 'penalites'), (snapshot) => {
      penalites = snapshot.docs.map((document) => {
        const data = document.data();
        return {
          montantDu: Number(data.montantDu) || 0,
          montantPaye: Number(data.montantPaye) || 0,
        };
      });
      refreshDashboard();
      markSourceLoaded();
    });

    const unsubConfig = onSnapshot(doc(db, 'settings', 'caisse_config'), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        dateDebut = typeof data.dateDebutCaisse === 'string' ? data.dateDebutCaisse : DATE_DEBUT_CAISSE_PAR_DEFAUT;
        cotisationMensuelle = Number(data.cotisationMensuelle) || 5000;
        cotisationMoisSpecial = Number(data.cotisationMoisSpecial) || 10000;
        moisSpecial = normaliserMoisSpecial(typeof data.moisSpecial === 'string' ? data.moisSpecial : '');
      }
      refreshDashboard();
      markSourceLoaded();
    });

    return () => {
      unsubMembres();
      unsubContributions();
      unsubContributionsSpeciales();
      unsubDepenses();
      unsubEmprunts();
      unsubPaiementsEmprunts();
      unsubPaiementsPenalites();
      unsubPenalites();
      unsubConfig();
    };
  }, []);

  const moisProchain = nextMonthKey(moisActuel);

  const summaryRows: DashboardExportRow[] = [
    { type: 'Résumé', month: '', member: '', amount: soldeActuel, detail: 'Total actuel — solde en caisse' },
    { type: 'Résumé', month: '', member: '', amount: totalNormal, detail: 'Montant attendu depuis le début de la caisse, mois spécial inclus' },
    { type: 'Résumé', month: '', member: '', amount: totalDettes, detail: 'Montant en dette — prêts restants, cotisations et pénalités' },
    { type: 'Résumé', month: moisProchain, member: '', amount: avanceMoisProchain, detail: 'Avances enregistrées pour le mois prochain' },
  ];
  const debtRows: DashboardExportRow[] = Object.entries(dettesParMois).flatMap(([month, debtors]) =>
    debtors.map((debtor) => ({
      type: 'Dette mensuelle',
      month,
      member: debtor.nom,
      amount: debtor.montant,
      detail: `${debtor.nom} est en dette pour ${month}`,
    }))
  );
  const exportRows = [...summaryRows, ...debtRows];
  const exportColumns: CsvColumn<DashboardExportRow>[] = [
    { header: 'Type', value: (row) => row.type },
    { header: 'Mois', value: (row) => row.month },
    { header: 'Membre', value: (row) => row.member },
    { header: 'Montant (FC)', value: (row) => row.amount },
    { header: 'Détail', value: (row) => row.detail },
  ];

  return (
    <div className="space-y-6 pb-2">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Tableau de bord</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Vue synthétique de la caisse et suivi mensuel des dettes.
          </p>
        </div>
        <ExportCsvButton
          filename="tableau-de-bord-caisse"
          columns={exportColumns}
          rows={exportRows}
          label="Exporter le rapport"
          disabled={isLoading}
        />
      </div>

      {isLoading ? (
        <PageSkeleton layout="dashboard" />
      ) : (
        <>
      <section className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        <div className="group relative min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white p-3.5 text-slate-900 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:shadow-none">
          <div className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full bg-slate-100/50 blur-2xl dark:bg-slate-800/50" />
          <div className="relative flex items-center justify-between gap-2">
            <span className="truncate text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Solde en caisse</span>
            <div className="shrink-0 rounded-lg bg-emerald-50 p-1.5 text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900/50">
              <Wallet size={15} />
            </div>
          </div>
          <p className="relative mt-2 whitespace-nowrap text-lg font-extrabold tabular-nums tracking-tight xl:text-xl">
            {isLoading ? '…' : `${soldeActuel.toLocaleString('fr-FR')} FC`}
          </p>
          <span className="relative mt-1.5 inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
            <ArrowUpRight size={12} /> Calcul en direct
          </span>
        </div>

        <div className="group relative min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
          <div className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full bg-slate-100/50 blur-2xl dark:bg-slate-800/50" />
          <div className="flex items-center justify-between gap-2">
            <span className="truncate text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Montant normal</span>
            <div className="shrink-0 rounded-lg  p-1.5 text-green-950 ring-1 ring-green-200 bg-green-100 dark:bg-green-950 dark:text-white dark:ring-green-950">
              <CalendarDays size={15} />
            </div>
          </div>
          <p className="relative mt-2 whitespace-nowrap text-lg font-extrabold tabular-nums tracking-tight">
            {isLoading ? '…' : `${totalNormal.toLocaleString('fr-FR')} FC`}
          </p>
          <p className="mt-1.5 text-[11px] text-slate-500 dark:text-slate-400">Depuis le début, mois spécial inclus</p>
        </div>

        <div className="group relative min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
          <div className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full bg-slate-100/50 blur-2xl dark:bg-slate-800/50" />
          <div className="flex items-center justify-between gap-2">
            <span className="truncate text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Montant en dette</span>
            <div className="shrink-0 rounded-lg bg-rose-50 p-1.5 text-rose-700 ring-1 ring-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:ring-rose-900/50">
              <ShieldAlert size={15} />
            </div>
          </div>
          <p className="relative mt-2 whitespace-nowrap text-lg font-extrabold tabular-nums tracking-tight xl:text-">
            {isLoading ? '…' : `${totalDettes.toLocaleString('fr-FR')} FC`}
          </p>
          <p className="mt-1.5 truncate text-[11px] text-slate-500 dark:text-slate-400">Prêts, cotisations et pénalités</p>
        </div>

        <div className="group relative min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
          <div className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full bg-slate-100/50 blur-2xl dark:bg-slate-800/50" />
          <div className="flex items-center justify-between gap-2">
            <span className="truncate text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Montant en avance</span>
            <div className="shrink-0 rounded-lg bg-emerald-50 p-1.5 text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900/50">
              <TrendingUp size={15} />
            </div>
          </div>
          <p className="relative mt-2 whitespace-nowrap text-lg font-extrabold tabular-nums tracking-tight">
            {isLoading ? '…' : `${montantAvance.toLocaleString('fr-FR')} FC`}
          </p>
          <p className="mt-1.5 text-[11px] text-slate-500 dark:text-slate-400">Mois futurs déjà payés</p>
        </div>

        <div className="group relative col-span-2 min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 md:col-span-1">
          <div className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full bg-slate-100/50 blur-2xl dark:bg-slate-800/50" />
          <div className="flex items-center justify-between gap-2">
            <span className="truncate text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Membres en retard</span>
            <div className="shrink-0 rounded-lg bg-rose-50 p-1.5 text-rose-700 ring-1 ring-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:ring-rose-900/50">
              <AlertTriangle size={15} />
            </div>
          </div>
          <p className="relative mt-2 whitespace-nowrap text-lg font-extrabold tabular-nums tracking-tight text-rose-600 xl:text-xl dark:text-rose-400">
            {isLoading ? '…' : membresEnRetard} <span className="text-xs font-normal text-slate-500 dark:text-slate-400">/ {isLoading ? '…' : membresActifs}</span>
          </p>
          <Link
            href="/dashboard/retards"
            className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-semibold text-slate-900 transition-colors hover:underline dark:text-white"
          >
            Voir les retards <ArrowRight size={12} aria-hidden="true" className="transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </section>

      <DebtCalendar
        dettesParMois={dettesParMois}
        moisActuel={moisActuel}
        moisDebutCaisse={dateDebutCaisse.slice(0, 7)}
      />
        </>
      )}
    </div>
  );
}
