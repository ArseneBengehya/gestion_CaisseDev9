"use client";

import React, { useEffect, useState, useMemo } from "react";
import DataTable, { Column } from "../../../../components/ui/DataTable";
import Modal from "../../../../components/ui/Modal";
import {
  Loader2,
  FileText,
  CalendarCheck,
  Eye,
  CalendarX,
  CalendarPlus,
} from "lucide-react";
import { Contribution } from "../../../../types";
import { collection, doc, onSnapshot, query, where } from "firebase/firestore";
import { db } from "../../../../lib/firebase";
import {
  DATE_DEBUT_CAISSE_PAR_DEFAUT,
  normaliserDateFirestore,
  obtenirMoisCouvertsParContributions,
} from "../../../../lib/contribution-months";

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

export default function TransactionsPage() {
  const [rawContributions, setRawContributions] = useState<Contribution[]>([]);
  const [config, setConfig] = useState({ dateDebutCaisse: DATE_DEBUT_CAISSE_PAR_DEFAUT, cotisationMensuelle: 5000 });
  const [isLoading, setIsLoading] = useState(true);

  // États pour le Modal de détails de transaction
  const [selectedContribution, setSelectedContribution] = useState<Contribution | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isFull, setIsFull] = useState(false);

  // État pour les modaux des cartes KPI (payés, impayés, avance)
  const [monthModal, setMonthModal] = useState<"paid" | "unpaid" | "advance" | null>(null);

  useEffect(() => {
    const userStr = localStorage.getItem("caisse_user");
    if (!userStr) {
      setIsLoading(false);
      return;
    }

    let session: { id?: string };
    try {
      session = JSON.parse(userStr);
    } catch (error) {
      console.error("Session membre invalide :", error);
      setIsLoading(false);
      return;
    }

    if (!session.id) {
      setIsLoading(false);
      return;
    }

    const unsubscribeConfig = onSnapshot(doc(db, "settings", "caisse_config"), (configSnap) => {
      if (configSnap.exists()) {
        const data = configSnap.data();
        setConfig({
          dateDebutCaisse: data.dateDebutCaisse || DATE_DEBUT_CAISSE_PAR_DEFAUT,
          cotisationMensuelle: Number(data.cotisationMensuelle || 5000),
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
      setIsLoading(false);
    }, (error) => {
      console.error("Erreur lors du chargement des contributions Firestore :", error);
      setRawContributions([]);
        setIsLoading(false);
    });

    return () => {
      unsubscribeConfig();
      unsubscribeContributions();
    };
  }, []);

  const cotisations = useMemo(() => {
    const moisParContribution = obtenirMoisCouvertsParContributions(rawContributions, config.dateDebutCaisse);
    return rawContributions.flatMap<Contribution & { moisCouvertsText: string }>((contribution, index) => {
      const moisCouverts = moisParContribution[index];
      if (!moisCouverts.length) {
        return [{
          ...contribution,
          moisCouverts: [],
          moisCouvertsText: `${contribution.nombreMois || contribution.nombreMoisPayes || ""} ${formaterDateHeure(contribution.datePaiement)}`,
        }];
      }

      return moisCouverts.map((mois) => {
        const libelleMois = moisFrancais(mois);
        return {
          ...contribution,
          id: `${contribution.id}-${mois}`,
          moisCouvertsText: `${libelleMois} ${mois}`,
          moisCouverts: [libelleMois],
          montantTotal: Number(contribution.montantVerse ?? contribution.montantTotal ?? 0) / moisCouverts.length,
          montantVerse: Number(contribution.montantVerse ?? contribution.montantTotal ?? 0) / moisCouverts.length,
        };
      });
    });
  }, [rawContributions, config.dateDebutCaisse]);

  // Calcul dynamique des mois payés, impayés et en avance (synchronisé avec le Dashboard)
  const months = useMemo(() => {
    const paidKeys = new Set(obtenirMoisCouvertsParContributions(rawContributions, config.dateDebutCaisse).flat());

    const formatMonth = (key: string) => moisFrancais(key);
    const now = new Date();
    const moisCourant = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const paid = [...paidKeys].sort().map(formatMonth);
    
    const start = new Date(`${config.dateDebutCaisse}T00:00:00`);
    const due: string[] = [];
    const advance: string[] = [];
    const cursor = new Date(start.getFullYear(), start.getMonth(), 1);

    while (cursor <= now) {
      const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}`;
      if (!paidKeys.has(key)) due.push(formatMonth(key));
      cursor.setMonth(cursor.getMonth() + 1);
    }

    [...paidKeys].filter((key) => key > moisCourant).sort().forEach((key) => advance.push(formatMonth(key)));

    return { paid, unpaid: due, advance };
  }, [rawContributions, config]);

  // Définition des colonnes pour le DataTable officiel
  const columns: Column<any>[] = [
    {
      header: "Mois couverts",
      accessor: (item) => <span className="font-bold text-slate-900 dark:text-white">{item.moisCouverts?.join(", ") || (item.nombreMois || item.nombreMoisPayes ? `${item.nombreMois || item.nombreMoisPayes} mois` : "Mois non précisé")}</span>,
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
      header: "Montant total",
      accessor: (item) => <span className="font-black text-emerald-600 dark:text-emerald-400">+{(item.montantTotal ?? item.montantVerse ?? 0).toLocaleString()} FC</span>,
    },
    { 
      header: "Date de paiement", 
      accessor: (item) => <span className="text-slate-500">{formaterDateHeure(item.datePaiement)}</span> 
    },
    {
      header: "Statut",
      accessor: () => (
        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300">
          Validé
        </span>
      ),
    },
  ];

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-3 text-slate-500">
        <Loader2 size={32} className="animate-spin text-blue-600" />
        <p className="text-xs font-semibold">Chargement de vos transactions depuis Firestore...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-6">
      {/* 📊 CARTES KPI SYNCHRONISÉES AU-DESSUS DU TABLEAU */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {/* Mois payés */}
        <div className="group relative min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
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
            <p className="whitespace-nowrap text-lg font-extrabold tabular-nums tracking-tight text-rose-600 dark:text-rose-400">
              {months.unpaid.length} <span className="text-xs font-normal text-slate-500 dark:text-slate-400">mois</span>
            </p>
            <button onClick={() => setMonthModal("unpaid")} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-bold text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800 cursor-pointer">
              <Eye size={14} /> Voir
            </button>
          </div>
        </div>

        {/* Mois en avance */}
        <div className="group relative min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
          <div className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full bg-slate-100/50 blur-2xl dark:bg-slate-800/50" />
          <div className="flex items-center justify-between gap-2">
            <span className="truncate text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Mois en avance</span>
            <div className="shrink-0 rounded-lg bg-slate-100 p-1.5 text-slate-700 ring-1 ring-inset ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700">
              <CalendarPlus size={15} />
            </div>
          </div>
          <div className="flex items-center justify-between mt-2">
            <p className="whitespace-nowrap text-lg font-extrabold tabular-nums tracking-tight text-amber-600 dark:text-amber-400">
              {months.advance.length} <span className="text-xs font-normal text-slate-500 dark:text-slate-400">mois</span>
            </p>
            <button onClick={() => setMonthModal("advance")} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-bold text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800 cursor-pointer">
              <Eye size={14} /> Voir
            </button>
          </div>
        </div>
      </div>

      {/* En-tête */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Mes contributions</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          Suivez vos versements mensuels enregistrés dans votre caisse.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-8">
        {/* 📋 TABLEAU DES CONTRIBUTIONS */}
        {cotisations.length > 0 ? (
          <DataTable
            data={cotisations}
            columns={columns}
            searchKey="moisCouvertsText"
            searchPlaceholder="Rechercher par mois (ex: janvier, 2026)..."
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

      {/* 🪟 MODAL DÉTAILS DE LA CONTRIBUTION */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={`Détails - Transaction ${selectedContribution?.referenceTransaction || ""}`}
        maxWidth="lg"
        isFullScreen={isFull}
        setIsFullScreen={setIsFull}
      >
        {selectedContribution && (
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700">
                <p className="text-slate-400 font-medium">Mois couverts</p>
                <p className="font-bold text-slate-900 dark:text-white mt-0.5">{selectedContribution.moisCouverts?.join(", ")}</p>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700">
                <p className="text-slate-400 font-medium">Montant total</p>
                <p className="font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">{(selectedContribution.montantTotal ?? selectedContribution.montantVerse ?? 0).toLocaleString()} FC</p>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700">
                <p className="text-slate-400 font-medium">Mode de paiement</p>
                <p className="font-bold text-slate-900 dark:text-white mt-0.5">{selectedContribution.modePaiement}</p>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700">
                <p className="text-slate-400 font-medium">Date de paiement</p>
                <p className="font-bold text-slate-900 dark:text-white mt-0.5">{formaterDateHeure(selectedContribution.datePaiement)}</p>
              </div>
            </div>

            {selectedContribution.note && (
              <div className="p-3 bg-blue-50 dark:bg-blue-950/40 rounded-xl border border-blue-100 dark:border-blue-900 text-blue-900 dark:text-blue-200">
                <p className="font-bold mb-1">Note / Référence</p>
                <p>{selectedContribution.note}</p>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}