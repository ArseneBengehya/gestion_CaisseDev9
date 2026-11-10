"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { collection, doc, getDoc, onSnapshot, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  Wallet,
  CalendarCheck,
  CalendarX,
  CalendarPlus,
  HandCoins,
  PiggyBank,
  Receipt,
  Eye,
  ArrowRight,
  Loader2,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import Modal from "@/components/ui/Modal";
import {
  DATE_DEBUT_CAISSE_PAR_DEFAUT,
  normaliserDateFirestore,
  obtenirMoisCouvertsParContributions,
} from "@/src/lib/contribution-months";

interface LoanRow {
  id: string;
  montantEmprunte: number;
  montantTotalARembourser: number;
  dateEmprunt: string;
  dateEcheance: string;
  statut: string;
  nomMembre: string;
}

interface ContributionRow {
  id: string;
  membreId?: string;
  montantVerse?: number;
  montantTotal?: number;
  datePaiement?: string;
  moisCouverts?: string[];
  nombreMois?: number;
  nombreMoisPayes?: number;
}

interface ExpenseRow {
  id: string;
  montant?: number;
  dateDepense?: string;
  motif?: string;
}

interface MovementRow {
  id: string;
  type: "contribution" | "depense" | "emprunt";
  date: string;
  amount: number;
  label: string;
}

export default function EspaceMembrePage() {
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("Membre");
  const [totalContributions, setTotalContributions] = useState(0);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [memberContributions, setMemberContributions] = useState<ContributionRow[]>([]);
  const [loans, setLoans] = useState<LoanRow[]>([]);
  const [config, setConfig] = useState({ dateDebutCaisse: DATE_DEBUT_CAISSE_PAR_DEFAUT, cotisationMensuelle: 5000 });
  const [movements, setMovements] = useState<MovementRow[]>([]);
  const [monthModal, setMonthModal] = useState<"paid" | "unpaid" | "advance" | null>(null);
  const [loanModal, setLoanModal] = useState(false);

  useEffect(() => {
    const session = JSON.parse(localStorage.getItem("caisse_user") || "{}");
    if (!session.id) {
      setLoading(false);
      return;
    }

    const unsubscribers: Array<() => void> = [];

    unsubscribers.push(onSnapshot(doc(db, "settings", "caisse_config"), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setConfig({
          dateDebutCaisse: data.dateDebutCaisse || DATE_DEBUT_CAISSE_PAR_DEFAUT,
          cotisationMensuelle: Number(data.cotisationMensuelle || 5000),
        });
      }
    }));

    unsubscribers.push(onSnapshot(collection(db, "contributions"), (snapshot) => {
      const rows = snapshot.docs.map((item): ContributionRow => ({ id: item.id, ...item.data() }));
      setTotalContributions(rows.reduce((sum, row) => sum + Number(row.montantVerse ?? row.montantTotal ?? 0), 0));
      setMemberContributions(rows.filter((row) => row.membreId === session.id));
      setMovements((current) => [
        ...current.filter((item) => item.type !== "contribution"),
        ...rows.map((row): MovementRow => ({ id: row.id, type: "contribution", date: normaliserDateFirestore(row.datePaiement), amount: Number(row.montantVerse || row.montantTotal || 0), label: "Contribution enregistrée" })),
      ]);
    }));

    unsubscribers.push(onSnapshot(collection(db, "depenses"), (snapshot) => {
      const rows = snapshot.docs.map((item): ExpenseRow => ({ id: item.id, ...item.data() }));
      setTotalExpenses(rows.reduce((sum, row) => sum + Number(row.montant || 0), 0));
      setMovements((current) => [
        ...current.filter((item) => item.type !== "depense"),
        ...rows.map((row): MovementRow => ({ id: row.id, type: "depense", date: normaliserDateFirestore(row.dateDepense), amount: Number(row.montant || 0), label: `Dépense : ${row.motif || "Sans motif"}` })),
      ]);
    }));

    unsubscribers.push(onSnapshot(query(collection(db, "emprunts"), where("membreId", "==", session.id)), (snapshot) => {
      const rows = snapshot.docs.map((item) => ({ id: item.id, ...item.data() } as LoanRow));
      setLoans(rows);
      setMovements((current) => [
        ...current.filter((item) => item.type !== "emprunt"),
        ...rows.map((row): MovementRow => ({ id: row.id, type: "emprunt", date: normaliserDateFirestore(row.dateEmprunt), amount: Number(row.montantEmprunte || 0), label: `Emprunt ${row.statut || ""}` })),
      ]);
    }));

    getDoc(doc(db, "membres", session.id)).then((snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setName(data.nomComplet || `${data.prenom || ""} ${data.nom || ""}`.trim() || "Membre");
      }
      setLoading(false);
    }).catch((error) => {
      console.error("Erreur lors du chargement du membre :", error);
      setLoading(false);
    });

    return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
  }, []);

  const months = useMemo(() => {
    const paidKeys = new Set(obtenirMoisCouvertsParContributions(memberContributions, config.dateDebutCaisse).flat());

    const formatMonth = (key: string) => new Date(`${key}-01T00:00:00`).toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
    const paid = [...paidKeys].sort().map(formatMonth);
    const start = new Date(`${config.dateDebutCaisse}T00:00:00`);
    const now = new Date();
    const due: string[] = [];
    const advance: string[] = [];
    const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
    while (cursor <= now) {
      const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}`;
      if (!paidKeys.has(key)) due.push(formatMonth(key));
      cursor.setMonth(cursor.getMonth() + 1);
    }
     [...paidKeys].sort().forEach((key) => {
      const monthDate = new Date(`${key}-01T00:00:00`);
      if (monthDate > new Date(now.getFullYear(), now.getMonth(), 1)) advance.push(formatMonth(key));
    });
    return { paid, unpaid: due, advance };
  }, [memberContributions, config]);

  const memberTotal = memberContributions.reduce((sum, row) => sum + Number(row.montantVerse ?? row.montantTotal ?? 0), 0);
  const activeLoans = loans.filter((loan) => loan.statut !== "Remboursé");
  const activeLoanTotal = activeLoans.reduce((sum, loan) => sum + Number(loan.montantTotalARembourser ?? loan.montantEmprunte ?? 0), 0);
  const balance = totalContributions - totalExpenses;
  const sortedMovements = [...movements].sort((a, b) => (Date.parse(b.date) || 0) - (Date.parse(a.date) || 0)).slice(0, 10);

  if (loading) return <div className="flex min-h-[50vh] items-center justify-center"><Loader2 className="animate-spin text-blue-600" /></div>;

  return (
    <div className="space-y-8 pb-2">
      {/* En-tête du Dashboard Membre */}
      <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-600 ring-1 ring-inset ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-slate-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-slate-900 dark:bg-white" />
            </span>
            Espace Personnel — {name}
          </span>
          <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
            Bienvenue dans votre espace personnel Caisse Dev9.
          </p>
        </div>
      </div>

      {/* Cartes KPI (Harmonisées avec le style admin) */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {/* Solde en caisse */}
        <div className="group relative min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white p-3.5 text-slate-900 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:shadow-none">
          <div className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full bg-slate-100/50 blur-2xl dark:bg-slate-800/50" />
          <div className="relative flex items-center justify-between gap-2">
            <span className="truncate text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Solde en caisse</span>
            <div className="shrink-0 rounded-lg bg-slate-100 p-1.5 text-slate-700 ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700">
              <PiggyBank size={15} />
            </div>
          </div>
          <p className="relative mt-2 whitespace-nowrap text-lg font-extrabold tabular-nums tracking-tight xl:text-xl">
            {balance.toLocaleString()} <span className="text-xs font-medium text-slate-500 dark:text-slate-400">FC</span>
          </p>
          <span className="relative mt-1.5 inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 dark:text-slate-400">
            <ArrowUpRight size={12} /> Global caisse
          </span>
        </div>

        {/* Total dépenses */}
        <div className="group relative min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
          <div className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full bg-slate-100/50 blur-2xl dark:bg-slate-800/50" />
          <div className="flex items-center justify-between gap-2">
            <span className="truncate text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Total dépenses</span>
            <div className="shrink-0 rounded-lg bg-slate-100 p-1.5 text-slate-700 ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700">
              <Receipt size={15} />
            </div>
          </div>
          <p className="relative mt-2 whitespace-nowrap text-lg font-extrabold tabular-nums tracking-tight xl:text-xl text-rose-600 dark:text-rose-400">
            -{totalExpenses.toLocaleString()} <span className="text-xs font-normal text-slate-500 dark:text-slate-400">FC</span>
          </p>
          <p className="mt-1.5 text-[11px] text-slate-500 dark:text-slate-400">Sorties globales</p>
        </div>

        {/* Ma contribution totale */}
        <div className="group relative min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
          <div className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full bg-slate-100/50 blur-2xl dark:bg-slate-800/50" />
          <div className="flex items-center justify-between gap-2">
            <span className="truncate text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Ma contribution</span>
            <div className="shrink-0 rounded-lg bg-slate-100 p-1.5 text-slate-700 ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700">
              <Wallet size={15} />
            </div>
          </div>
          <p className="relative mt-2 whitespace-nowrap text-lg font-extrabold tabular-nums tracking-tight xl:text-xl">
            +{memberTotal.toLocaleString()} <span className="text-xs font-normal text-black-500 dark:text-slate-400">FC</span>
          </p>
          <p className="mt-1.5 text-[11px] text-slate-500 dark:text-slate-400">Mes versements cumulés</p>
        </div>

        

        {/* Emprunts actifs */}
        <div className="group relative min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
          <div className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full bg-slate-100/50 blur-2xl dark:bg-slate-800/50" />
          <div className="flex items-center justify-between gap-2">
            <span className="truncate text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Emprunts actifs</span>
            <div className="shrink-0 rounded-lg bg-slate-100 p-1.5 text-slate-700 ring-1 ring-inset ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700">
              <HandCoins size={15} />
            </div>
          </div>
          <p className="relative mt-2 whitespace-nowrap text-lg font-extrabold tabular-nums tracking-tight xl:text-xl text-black dark:text-slate-400">
            {activeLoanTotal.toLocaleString()} <span className="text-xs font-normal text-black dark:text-slate-400">FC</span>
          </p>
          <button onClick={() => setLoanModal(true)} className="inline-flex ml-63 gap-1 text-[11px] font-semibold text-slate-900 transition-colors hover:underline dark:text-white cursor-pointer">
            <Eye size={16} /> 
          </button>
        </div>
      </div>

      {/* Section Derniers mouvements de la caisse */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-1 border-b border-slate-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <span className="h-5 w-1 rounded-full bg-slate-900 dark:bg-white" />
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Derniers mouvements de la caisse</h3>
          </div>
          <Link href="/espace_Membre/transactions" className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:underline dark:text-blue-400">
            Voir toutes les transactions <ArrowRight size={14} />
          </Link>
        </div>

        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {sortedMovements.length ? (
            sortedMovements.map((movement) => {
              const isExpense = movement.type === "depense";
              return (
                <div key={`${movement.type}-${movement.id}`} className="flex flex-col gap-2 px-4 py-3.5 transition-colors hover:bg-slate-50 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-6 dark:hover:bg-slate-800/40">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className={`shrink-0 rounded-xl p-2.5 ring-1 ring-inset ${!isExpense ? "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:ring-emerald-900/50" : "bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:ring-rose-900/50"}`}>
                      {!isExpense ? <ArrowUpRight size={18} /> : <ArrowDownRight size={18} />}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">{movement.label}</p>
                      <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                        {movement.date ? new Date(movement.date).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }) : "Date non disponible"}
                      </p>
                    </div>
                  </div>
                  {movement.amount > 0 && (
                    <span className={`pl-12 text-sm font-bold tabular-nums sm:pl-0 sm:text-right ${isExpense ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"}`}>
                      {isExpense ? "-" : "+"}{movement.amount.toLocaleString()} FC
                    </span>
                  )}
                </div>
              );
            })
          ) : (
            <p className="p-8 text-center text-sm text-slate-500">Aucun mouvement enregistré.</p>
          )}
        </div>
      </div>

      {/* Modaux */}
      <Modal isOpen={monthModal !== null} onClose={() => setMonthModal(null)} title={monthModal === "paid" ? "Mois payés" : monthModal === "unpaid" ? "Mois impayés" : "Mois en avance"} maxWidth="sm">
        <div className="space-y-2">
          {(monthModal === "paid" ? months.paid : monthModal === "unpaid" ? months.unpaid : months.advance).length ? (
            (monthModal === "paid" ? months.paid : monthModal === "unpaid" ? months.unpaid : months.advance).map((month) => (
              <div key={month} className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-200">{month}</div>
            ))
          ) : <p className="py-6 text-center text-sm text-slate-500">Aucun mois dans cette catégorie.</p>}
        </div>
      </Modal>

      <Modal isOpen={loanModal} onClose={() => setLoanModal(false)} title="Détail de mes emprunts" maxWidth="lg">
        {loans.length ? (
          <div className="space-y-3">
            {loans.map((loan) => (
              <div key={loan.id} className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-black text-slate-900 dark:text-white">{Number(loan.montantEmprunte || 0).toLocaleString()} FC</p>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-200">{loan.statut}</span>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <span>Total à rembourser : <b className="text-slate-700 dark:text-slate-200">{Number(loan.montantTotalARembourser || 0).toLocaleString()} FC</b></span>
                  <span>Échéance : <b className="text-slate-700 dark:text-slate-200">{loan.dateEcheance || "-"}</b></span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="py-8 text-center text-sm text-slate-500">Aucun emprunt enregistré.</p>
        )}
      </Modal>
    </div>
  );
}