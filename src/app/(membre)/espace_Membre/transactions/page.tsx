"use client";

import React, { useEffect, useState, useMemo } from "react";
import DataTable, { Column } from "../../../../components/ui/DataTable";
import Modal from "../../../../components/ui/Modal";
import {
  FileText,
  CalendarCheck,
  Eye,
  CalendarX,
  CalendarPlus,
  Wallet,
  ShieldAlert,
  Banknote,
} from "lucide-react";
import type { AllocationCotisation, Contribution } from "../../../../types";
import PageSkeleton from "../../../../components/ui/PageSkeleton";
import { collection, doc, onSnapshot, query, where } from "firebase/firestore";
import { db } from "../../../../lib/firebase";
import { Penalite, soldePenalite } from "../../../../lib/penalties";
import {
  DATE_DEBUT_CAISSE_PAR_DEFAUT,
  normaliserDateFirestore,
  obtenirMoisCouvertsParContributions,
} from "../../../../lib/contribution-months";
import {
  genererEtatsMoisCotisation,
  normaliserMoisSpecial,
} from "../../../../lib/contribution-payments";

const moisFrancais = (cle: string): string => {
  const correspondance = cle.match(/^(\d{4})-(\d{1,2})/);
  if (!correspondance) return cle;
  const mois = Number(correspondance[2]);
  if (mois < 1 || mois > 12) return cle;
  const date = new Date(Number(correspondance[1]), mois - 1, 1);
  return date.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
};

// Fonction utilitaire pour formater la date et l'heure en français
const formaterDateHeure = (dateStr?: string) => {
  if (!dateStr) return "Date non disponible";
  const dateObj = new Date(dateStr);
  if (isNaN(dateObj.getTime())) return dateStr;

  const optionsDate: Intl.DateTimeFormatOptions = {
    day: "numeric",
    month: "long",
    year: "numeric",
  };
  const optionsHeure: Intl.DateTimeFormatOptions = {
    hour: "2-digit",
    minute: "2-digit",
  };

  const dateFormatee = dateObj.toLocaleDateString("fr-FR", optionsDate);
  const heureFormatee = dateObj.toLocaleTimeString("fr-FR", optionsHeure);

  return `${dateFormatee} à ${heureFormatee}`;
};

interface ContributionMonthRow {
  id: string;
  moisCleTri: string;
  moisCouvertsText: string;
  statutMois: string;
  montantRequis: number;
  montantMoisPaye: number;
  montantRestant: number;
  modePaiement: string;
  datePaiement: string;
}

interface EmpruntPaymentRow {
  id: string;
  empruntId: string;
  montantVerse: number;
  modePaiement: string;
  datePaiement: string;
}

export default function TransactionsPage() {
  const [rawContributions, setRawContributions] = useState<Contribution[]>([]);
  const [contributionsSpeciales, setContributionsSpeciales] = useState<Contribution[]>([]);
  const [penalites, setPenalites] = useState<Penalite[]>([]);
  const [paiementsEmprunts, setPaiementsEmprunts] = useState<EmpruntPaymentRow[]>([]);
  const [config, setConfig] = useState({
    dateDebutCaisse: DATE_DEBUT_CAISSE_PAR_DEFAUT,
    cotisationMensuelle: 5000,
    cotisationMoisSpecial: 10000,
    moisSpecial: "",
    moisSpecialActifDepuis: "",
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isPenaltiesLoading, setIsPenaltiesLoading] = useState(true);
  const [penaltiesLoadError, setPenaltiesLoadError] = useState(false);
  const [isLoanPaymentsLoading, setIsLoanPaymentsLoading] = useState(true);
  const [loanPaymentsLoadError, setLoanPaymentsLoadError] = useState(false);
  const [activeTab, setActiveTab] = useState<"cotisations" | "penalites" | "emprunts">("cotisations");

  // États pour le Modal de détails de transaction
  const [selectedContribution, setSelectedContribution] = useState<ContributionMonthRow | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isFull, setIsFull] = useState(false);

  // État pour les modaux des cartes KPI (payés, impayés, avance)
  const [monthModal, setMonthModal] = useState<"paid" | "unpaid" | "advance" | null>(null);

  useEffect(() => {
    const userStr = localStorage.getItem("caisse_user");
    if (!userStr) {
      setIsLoading(false);
      setIsPenaltiesLoading(false);
      setIsLoanPaymentsLoading(false);
      return;
    }

    let session: { id?: string };
    try {
      session = JSON.parse(userStr);
    } catch (error) {
      console.error("Session membre invalide :", error);
      setIsLoading(false);
      setIsPenaltiesLoading(false);
      setIsLoanPaymentsLoading(false);
      return;
    }

    if (!session.id) {
      setIsLoading(false);
      setIsPenaltiesLoading(false);
      setIsLoanPaymentsLoading(false);
      return;
    }

    let hasLoadedContributions = false;
    let hasLoadedSpecialContributions = false;
    const finishContributionsLoading = () => {
      if (hasLoadedContributions && hasLoadedSpecialContributions) {
        setIsLoading(false);
      }
    };

    const unsubscribeConfig = onSnapshot(doc(db, "settings", "caisse_config"), (configSnap) => {
      if (configSnap.exists()) {
        const data = configSnap.data();
        setConfig({
          dateDebutCaisse: data.dateDebutCaisse || DATE_DEBUT_CAISSE_PAR_DEFAUT,
          cotisationMensuelle: Number(data.cotisationMensuelle || 5000),
          cotisationMoisSpecial: Number(data.cotisationMoisSpecial || 10000),
          moisSpecial: normaliserMoisSpecial(typeof data.moisSpecial === "string" ? data.moisSpecial : ""),
          moisSpecialActifDepuis: data.moisSpecialActif === true && typeof data.moisSpecialActifDepuis === "string"
            ? data.moisSpecialActifDepuis
            : "",
        });
      }
    });

    const contributionsQuery = query(
      collection(db, "contributions"),
      where("membreId", "==", session.id)
    );
    const unsubscribeContributions = onSnapshot(contributionsQuery, (snapshot) => {
      const listContributions = snapshot.docs.map((contributionDoc) => {
        const data = contributionDoc.data();
        const nombreMois = Number(data.nombreMois ?? data.nombreMoisPayes ?? 0);
        const montant = Number(data.montantVerse ?? data.montantTotal ?? 0);
        return {
          ...data,
          id: contributionDoc.id,
          nombreMois,
          nombreMoisPayes: nombreMois,
          montantVerse: montant,
          montantTotal: montant,
          moisCouverts: Array.isArray(data.moisCouverts) ? data.moisCouverts : [],
          datePaiement: normaliserDateFirestore(data.datePaiement),
        } as Contribution;
      });

      setRawContributions(listContributions);
      hasLoadedContributions = true;
      finishContributionsLoading();
    }, (error) => {
      console.error("Erreur lors du chargement des contributions Firestore :", error);
      setRawContributions([]);
      hasLoadedContributions = true;
      finishContributionsLoading();
    });

    const specialContributionsQuery = query(
      collection(db, "contributions_speciales"),
      where("membreId", "==", session.id)
    );
    const unsubscribeSpecialContributions = onSnapshot(specialContributionsQuery, (snapshot) => {
      setContributionsSpeciales(snapshot.docs.map((specialDoc) => {
        const data = specialDoc.data();
        const moisSpecial = typeof data.moisSpecial === "string" ? data.moisSpecial : "";
        const montantVerse = Number(data.montantVerse ?? data.montantTotal ?? 0);
        const repartition: AllocationCotisation[] = moisSpecial
          ? [{ mois: moisSpecial, montantVerse, type: "SPECIALE" }]
          : [];
        return {
          ...data,
          id: specialDoc.id,
          membreId: data.membreId || session.id!,
          nombreMois: 0,
          nombreMoisPayes: 0,
          montantVerse,
          montantTotal: montantVerse,
          moisCouverts: moisSpecial ? [moisSpecial] : [],
          moisSpecial,
          typeContribution: "MOIS_SPECIAL",
          repartition,
          modePaiement: data.modePaiement || "Non précisé",
          datePaiement: normaliserDateFirestore(data.datePaiement),
        } as Contribution;
      }));
      hasLoadedSpecialContributions = true;
      finishContributionsLoading();
    }, (error) => {
      console.error("Erreur lors du chargement des contributions spéciales Firestore :", error);
      setContributionsSpeciales([]);
      hasLoadedSpecialContributions = true;
      finishContributionsLoading();
    });

    const penalitesQuery = query(
      collection(db, "penalites"),
      where("membreId", "==", session.id)
    );
    const unsubscribePenalites = onSnapshot(penalitesQuery, (snapshot) => {
      setPenalites(snapshot.docs.map((penaliteDoc) => {
        const data = penaliteDoc.data();
        return {
          id: penaliteDoc.id,
          membreId: data.membreId || session.id!,
          moisDeclenchement: Number(data.moisDeclenchement) || 0,
          moisDeclenchementKey: data.moisDeclenchementKey || "",
          montantDu: Number(data.montantDu) || 0,
          montantPaye: Number(data.montantPaye) || 0,
          statut: data.statut || "A_PAYER",
          dateCreation: data.dateCreation || "",
          dateDernierPaiement: data.dateDernierPaiement,
        };
      }));
      setPenaltiesLoadError(false);
      setIsPenaltiesLoading(false);
    }, (error) => {
      console.error("Erreur lors du chargement des pénalités Firestore :", error);
      setPenalites([]);
      setPenaltiesLoadError(true);
      setIsPenaltiesLoading(false);
    });

    const empruntPaymentsQuery = query(
      collection(db, "paiements_emprunts"),
      where("membreId", "==", session.id)
    );
    const unsubscribeEmpruntPayments = onSnapshot(empruntPaymentsQuery, (snapshot) => {
      setPaiementsEmprunts(snapshot.docs.map((paymentDoc) => {
        const data = paymentDoc.data();
        return {
          id: paymentDoc.id,
          empruntId: typeof data.empruntId === "string" ? data.empruntId : "",
          montantVerse: Number(data.montantVerse) || 0,
          modePaiement: typeof data.modePaiement === "string" ? data.modePaiement : "Non précisé",
          datePaiement: normaliserDateFirestore(data.datePaiement),
        };
      }));
      setLoanPaymentsLoadError(false);
      setIsLoanPaymentsLoading(false);
    }, (error) => {
      console.error("Erreur lors du chargement des remboursements d’emprunt :", error);
      setPaiementsEmprunts([]);
      setLoanPaymentsLoadError(true);
      setIsLoanPaymentsLoading(false);
    });

    return () => {
      unsubscribeConfig();
      unsubscribeContributions();
      unsubscribeSpecialContributions();
      unsubscribePenalites();
      unsubscribeEmpruntPayments();
    };
  }, []);

  const cotisations = useMemo(() => {
    const allContributions = [...rawContributions, ...contributionsSpeciales];
    const moisParContribution = obtenirMoisCouvertsParContributions(allContributions, config.dateDebutCaisse);
    const futureEnd = new Date();
    futureEnd.setMonth(futureEnd.getMonth() + 120);
    const monthStates = genererEtatsMoisCotisation(
      allContributions,
      config.dateDebutCaisse,
      `${futureEnd.getFullYear()}-${String(futureEnd.getMonth() + 1).padStart(2, "0")}`,
      config.cotisationMensuelle,
      config.moisSpecial,
      config.cotisationMoisSpecial,
      0,
      config.moisSpecialActifDepuis
    );
    const contributionsByMonth = new Map<string, Contribution[]>();
    allContributions.forEach((contribution, index) => {
      const months = Array.isArray(contribution.repartition) && contribution.repartition.length > 0
        ? contribution.repartition.map((allocation) => allocation.mois)
        : moisParContribution[index] || [];
      months.forEach((month) => {
        const payments = contributionsByMonth.get(month) || [];
        payments.push(contribution);
        contributionsByMonth.set(month, payments);
      });
    });

    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    return monthStates
      .filter((month) => month.mois <= currentMonth || month.montantPaye > 0)
      .map((month): ContributionMonthRow => {
        const payments = (contributionsByMonth.get(month.mois) || [])
          .sort((a, b) => (Date.parse(b.datePaiement) || 0) - (Date.parse(a.datePaiement) || 0));
        const paymentModes = [...new Set(payments.map((payment) => payment.modePaiement).filter(Boolean))];
        return {
          id: month.mois,
          moisCleTri: month.mois,
          moisCouvertsText: `${moisFrancais(month.mois)} `,
          statutMois: month.statut,
          montantRequis: month.montantRequis,
          montantMoisPaye: month.montantPaye,
          montantRestant: Math.max(0, month.montantRequis - month.montantPaye),
          modePaiement: paymentModes.join(", ") || "—",
          datePaiement: payments[0]?.datePaiement || "",
        };
      })
      .sort((a, b) => b.moisCleTri.localeCompare(a.moisCleTri));
  }, [rawContributions, contributionsSpeciales, config]);

  // Calcul dynamique des mois payés, impayés et en avance (synchronisé avec le Dashboard)
  const months = useMemo(() => {
    const now = new Date();
    const moisCourant = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const futureEnd = new Date(now.getFullYear(), now.getMonth() + 120, 1);
    const states = genererEtatsMoisCotisation(
      [...rawContributions, ...contributionsSpeciales],
      config.dateDebutCaisse,
      `${futureEnd.getFullYear()}-${String(futureEnd.getMonth() + 1).padStart(2, "0")}`,
      config.cotisationMensuelle,
      config.moisSpecial,
      config.cotisationMoisSpecial,
      0,
      config.moisSpecialActifDepuis
    );
    const paid = states.filter((month) => month.statut === "PAYE").map((month) => `${moisFrancais(month.mois)} · PAYE`);
    const due = states
      .filter((month) => month.mois <= moisCourant && month.statut !== "PAYE")
      .map((month) => `${moisFrancais(month.mois)} · ${month.statut} (${month.montantPaye.toLocaleString("fr-FR")} / ${month.montantRequis.toLocaleString("fr-FR")} FC)`);
    const advance = states
      .filter((month) => month.mois > moisCourant && month.statut === "PAYE")
      .map((month) => `${moisFrancais(month.mois)} · PAYE`);
    return { paid, unpaid: due, advance };
  }, [rawContributions, contributionsSpeciales, config]);

  // Définition des colonnes pour le DataTable officiel
  const columns: Column<ContributionMonthRow>[] = [
    {
      header: "Mois couverts",
      accessor: (item) => <span className="font-semibold  text-xs">{item.moisCouvertsText}</span>,
    },
    {
      header: "Mode de paiement",
      accessor: (item) => (
        <span className="px-2.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-md font-medium text-[11px]">
          {item.modePaiement}
        </span>
      ),
    },
    {
      header: "Montant de la cotisation",
      accessor: (item) => (
        <div className="min-w-36">
          <p className="font-semibold">{item.montantRequis.toLocaleString("fr-FR")} FC</p>
          <p className="mt-1 text-xs text-slate-500">
            Payé : {item.montantMoisPaye.toLocaleString("fr-FR")} FC · Reste : {item.montantRestant.toLocaleString("fr-FR")} FC
          </p>
        </div>
      ),
    },
    {
      header: "Dernier paiement",
      accessor: (item) => <span className="text-slate-500">{item.datePaiement ? formaterDateHeure(item.datePaiement) : "—"}</span>
    },
    {
      header: "Statut",
      accessor: (item) => {
        const status = item.statutMois;
        const label = status === "PAYE" ? "PAYE" : status === "EN_COURS" ? "EN_COURS" : "ATTENTE";
        const color = status === "PAYE"
          ? "bg-emerald-50 text-emerald-700  dark:bg-emerald-950/50 dark:text-emerald-300"
          : status === "EN_COURS"
            ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300"
            : "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300";
        return <span className={` py-1 px-1 text-[11px] lowercase font-bold ${color}`}>{label}</span>;
      },
    },
  ];

  const penaltyColumns: Column<Penalite>[] = [
    {
      header: "Période déclenchée",
      accessor: (item) => item.moisDeclenchementKey ? moisFrancais(item.moisDeclenchementKey) : "—",
    },
    {
      header: "Montant dû",
      accessor: (item) => <span className="font-semibold">{item.montantDu.toLocaleString("fr-FR")} FC</span>,
    },
    {
      header: "Montant payé",
      accessor: (item) => <span className="font-semibold ">{item.montantPaye.toLocaleString("fr-FR")} FC</span>,
    },
    {
      header: "Solde",
      accessor: (item) => {
        const solde = soldePenalite(item);
        return <span className={`font-semibold ${solde > 0 }`}>{solde.toLocaleString("fr-FR")} FC</span>;
      },
    },
    {
      header: "Statut",
      accessor: (item) => {
        const solde = soldePenalite(item);
        const statut = solde === 0 ? "Payée" : item.montantPaye > 0 ? "En cours" : "En attente";
        const className = solde === 0
          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
          : item.montantPaye > 0
            ? "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
            : "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300";
        return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${className}`}>{statut}</span>;
      },
    },
  ];

  const totalPenalitesDues = penalites.reduce((total, penalite) => total + penalite.montantDu, 0);
  const totalPenalitesPayees = penalites.reduce((total, penalite) => total + penalite.montantPaye, 0);
  const totalPenalitesRestantes = penalites.reduce((total, penalite) => total + soldePenalite(penalite), 0);
  const totalRemboursementsEmprunts = paiementsEmprunts.reduce((total, paiement) => total + paiement.montantVerse, 0);
  const empruntPaymentColumns: Column<EmpruntPaymentRow>[] = [
    {
      header: "Date du paiement",
      accessor: (item) => item.datePaiement ? formaterDateHeure(item.datePaiement) : "—",
    },
    {
      header: "Mode de paiement",
      accessor: "modePaiement",
    },
    {
      header: "Montant remboursé",
      accessor: (item) => <span className="font-semibold">{item.montantVerse.toLocaleString("fr-FR")} FC</span>,
    },
  ];

  if (isLoading) {
    return <PageSkeleton layout="cards-table" cards={3} columns={5} rows={6} />;
  }

  return (
    <div className="space-y-8 pb-6">
      <div className="flex w-fit max-w-full rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
        <button
          type="button"
          onClick={() => setActiveTab("cotisations")}
          className={`inline-flex items-center gap-2 rounded-lg px-3  text-xs font-semibold transition-all ${
            activeTab === "cotisations"
              ? "bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-white"
              : "text-slate-600 hover:text-slate-900 dark:text-slate-400"
          }`}
        >
          <Wallet size={15} /> Contributions
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("penalites")}
          className={`inline-flex items-center gap-2 rounded-lg px-2 py-2 text-xs font-semibold transition-all ${
            activeTab === "penalites"
              ? "bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-white"
              : "text-slate-600 hover:text-slate-900 dark:text-slate-400"
          }`}
        >
          <ShieldAlert size={15} /> Pénalités
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("emprunts")}
          className={`inline-flex items-center gap-2 rounded-lg px-2 text-xs font-semibold transition-all ${
            activeTab === "emprunts"
              ? "bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-white"
              : "text-slate-600 hover:text-slate-900 dark:text-slate-400"
          }`}
        >
          <Banknote size={15} /> Emprunts
        </button>
      </div>

      {activeTab === "cotisations" ? (
        <>

      {/* En-tête */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Mes contributions</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          Suivez vos versements mensuels enregistrés dans votre caisse.
        </p>
      </div>
      
      {/* 📊 CARTES KPI SYNCHRONISÉES */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {/* Mois payés */}
        <div className="group relative min-w-0 md:grid-cols-2 xl:grid-cols-2 grid-cols-3 overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
          <div className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full bg-slate-100/50 blur-2xl dark:bg-slate-800/50" />
          <div className="flex items-center justify-between gap-2">
            <span className="truncate text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Mois payés</span>
            <div className="shrink-0 rounded-lg bg-slate-100 p-1.5 text-slate-700 ring-1 ring-inset ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700">
              <CalendarCheck size={15} />
            </div>
          </div>
          <div className="flex items-center justify-between mt-2">
            <p className="whitespace-nowrap text-lg font-extrabold tabular-nums tracking-tight text-slate-900 dark:text-white">
              {months.paid.length} <span className="text-xs font-normal text-slate-500 dark:text-slate-400">mois</span>
            </p>
            <button onClick={() => setMonthModal("paid")} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-bold text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800 cursor-pointer">
              <Eye size={14} /> Voir
            </button>
          </div>
        </div>

        {/* Mois impayés */}
        <div className="group relative min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
          <div className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full bg-slate-100/50 blur-2xl dark:bg-slate-800/50" />
          <div className="flex items-center justify-between gap-2">
            <span className="truncate text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Mois impayés</span>
            <div className="shrink-0 rounded-lg bg-slate-100 p-1.5 text-slate-700 ring-1 ring-inset ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700">
              <CalendarX size={15} />
            </div>
          </div>
          <div className="flex items-center justify-between mt-2">
            <p className="whitespace-nowrap text-lg font-extrabold tabular-nums tracking-tight ">
              {months.unpaid.length} <span className="text-xs font-normal text-slate-500 dark:text-slate-400">mois</span>
            </p>
            <button onClick={() => setMonthModal("unpaid")} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-bold text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800 cursor-pointer">
              <Eye size={14} /> Voir
            </button>
          </div>
        </div>

        {/* Mois en avance */}
        <div className="group relative col-span-2 min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 md:col-span-1">
          <div className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full bg-slate-100/50 blur-2xl dark:bg-slate-800/50" />
          <div className="flex items-center justify-between gap-2">
            <span className="truncate text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Mois en avance</span>
            <div className="shrink-0 rounded-lg bg-slate-100 p-1.5 text-slate-700 ring-1 ring-inset ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700">
              <CalendarPlus size={15} />
            </div>
          </div>
          <div className="flex items-center justify-between mt-2">
            <p className="whitespace-nowrap text-lg font-extrabold tabular-nums tracking-tight text-slate-900 dark:text-white">
              {months.advance.length} <span className="text-xs font-normal text-slate-500 dark:text-slate-400">mois</span>
            </p>
            <button onClick={() => setMonthModal("advance")} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-bold text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800 cursor-pointer">
              <Eye size={14} /> Voir
            </button>
          </div>
        </div>
      </div>



      <div className="grid grid-cols-1 gap-8">
        {/* 📋 TABLEAU DES CONTRIBUTIONS */}
        {cotisations.length > 0 ? (
          <DataTable
            data={cotisations}
            columns={columns}
            searchKey="moisCouvertsText"
            searchPlaceholder="Rechercher un mois ..."
            onView={(item) => {
              setSelectedContribution(item);
              setIsModalOpen(true);
            }}
          />
        ) : (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-8 text-center space-y-3 shadow-sm">
            <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 text-slate-400 rounded-2xl flex items-center justify-center mx-auto">
              <FileText size={24} />
            </div>
            <h3 className="font-bold text-slate-900 dark:text-white text-sm">Aucune contribution trouvée</h3>
            <p className="text-xs text-slate-400">
              Aucune transaction n'a encore été enregistrée à votre nom dans la base de données Firestore.
            </p>
          </div>
        )}
      </div>
        </>
      ) : activeTab === "penalites" ? (
        <section className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Mes pénalités</h1>
            <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
              Consultez les pénalités enregistrées et leur solde actuel.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {[
              { label: "Total dû", value: totalPenalitesDues, color: "" },
              { label: "Total payé", value: totalPenalitesPayees, color: "" },
              { label: "Solde restant", value: totalPenalitesRestantes, color: "" },
            ].map((item) => (
              <div key={item.label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{item.label}</p>
                <p className={`mt-2 text-xl font-extrabold tabular-nums ${item.color}`}>{item.value.toLocaleString("fr-FR")} <span className="text-xs font-normal text-slate-500">FC</span></p>
              </div>
            ))}
          </div>

          {isPenaltiesLoading ? (
            <PageSkeleton layout="cards-table" cards={3} columns={5} rows={5} />
          ) : penaltiesLoadError ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-8 text-center dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300">
              Impossible de charger vos pénalités pour le moment.
            </div>
          ) : penalites.length > 0 ? (
            <DataTable
              data={[...penalites].sort((a, b) => b.moisDeclenchementKey.localeCompare(a.moisDeclenchementKey))}
              columns={penaltyColumns}
              searchKey="moisDeclenchementKey"
              searchPlaceholder="Rechercher par période..."
            />
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-slate-800">
                <ShieldAlert size={24} />
              </div>
              <h3 className="mt-3 text-sm font-bold text-slate-900 dark:text-white">Aucune pénalité enregistrée</h3>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Votre situation est à jour.</p>
            </div>
          )}
        </section>
      ) : (
        <section className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Mes remboursements d’emprunt</h1>
            <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
              Les paiements enregistrés par la caisse apparaissent ici en temps réel.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Total remboursé</p>
              <p className="mt-2 text-xl font-extrabold tabular-nums">
                {totalRemboursementsEmprunts.toLocaleString("fr-FR")} <span className="text-xs font-normal text-slate-500">FC</span>
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Paiements enregistrés</p>
              <p className="mt-2 text-xl font-extrabold tabular-nums">{paiementsEmprunts.length}</p>
            </div>
          </div>

          {isLoanPaymentsLoading ? (
            <PageSkeleton layout="cards-table" cards={0} columns={3} rows={5} />
          ) : loanPaymentsLoadError ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-8 text-center text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300">
              Impossible de charger vos remboursements d’emprunt.
            </div>
          ) : paiementsEmprunts.length > 0 ? (
            <DataTable
              data={[...paiementsEmprunts].sort((a, b) => (Date.parse(b.datePaiement) || 0) - (Date.parse(a.datePaiement) || 0))}
              columns={empruntPaymentColumns}
              searchKey="modePaiement"
              searchPlaceholder="Rechercher un mode de paiement..."
            />
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-slate-800">
                <Banknote size={24} />
              </div>
              <h3 className="mt-3 text-sm font-bold text-slate-900 dark:text-white">Aucun remboursement enregistré</h3>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Les paiements saisis par la caisse s’afficheront ici.</p>
            </div>
          )}
        </section>
      )}

      {/* 🪟 MODAL POUR LES LISTES DE MOIS (PAYÉS / IMPAYÉS / AVANCE) */}
      <Modal
        isOpen={monthModal !== null}
        onClose={() => setMonthModal(null)}
        title={monthModal === "paid" ? "Mois payés" : monthModal === "unpaid" ? "Mois impayés" : "Mois en avance"}
        maxWidth="sm"
      >
        <div className="space-y-2">
          {(monthModal === "paid" ? months.paid : monthModal === "unpaid" ? months.unpaid : months.advance).length ? (
            (monthModal === "paid" ? months.paid : monthModal === "unpaid" ? months.unpaid : months.advance).map((month) => (
              <div key={month} className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-200">
                {month}
              </div>
            ))
          ) : (
            <p className="py-6 text-center text-sm text-slate-500">Aucun mois dans cette catégorie.</p>
          )}
        </div>
      </Modal>

      {/* MODAL DÉTAILS DE LA CONTRIBUTION */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={`Détails - ${selectedContribution?.moisCouvertsText || "Contribution"}`}
        maxWidth="lg"
        isFullScreen={isFull}
        setIsFullScreen={setIsFull}
      >
        {selectedContribution && (
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700">
                <p className="text-slate-400 font-medium">Mois concerné</p>
                <p className="font-bold text-slate-900 dark:text-white mt-0.5">{selectedContribution.moisCouvertsText}</p>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700">
                <p className="text-slate-400 font-medium">Montant requis</p>
                <p className="font-bold mt-0.5">{selectedContribution.montantRequis.toLocaleString("fr-FR")} FC</p>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700">
                <p className="text-slate-400 font-medium">Montant payé</p>
                <p className="font-bold text-slate-900 dark:text-white mt-0.5">{selectedContribution.montantMoisPaye.toLocaleString("fr-FR")} FC</p>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700">
                <p className="text-slate-400 font-medium">Reste à payer</p>
                <p className="font-bold text-slate-900 dark:text-white mt-0.5">{selectedContribution.montantRestant.toLocaleString("fr-FR")} FC</p>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700">
                <p className="text-slate-400 font-medium">Mode(s) de paiement</p>
                <p className="font-bold text-slate-900 dark:text-white mt-0.5">{selectedContribution.modePaiement}</p>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700">
                <p className="text-slate-400 font-medium">Dernier paiement</p>
                <p className="font-bold text-slate-900 dark:text-white mt-0.5">{selectedContribution.datePaiement ? formaterDateHeure(selectedContribution.datePaiement) : "Aucun paiement"}</p>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}