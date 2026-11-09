"use client";

import React, { useEffect, useState } from "react";
import DataTable, { Column } from "../../../../components/ui/DataTable";
import Modal from "../../../../components/ui/Modal";
import {
  Loader2,
  FileText,
} from "lucide-react";
import { getMembreByUid, getContributionsByMembreId } from "../../../../services/dbService";
import { Contribution } from "../../../../types";

const moisFrancais = (cle: string): string => {
  const correspondance = cle.match(/^(\d{4})-(\d{1,2})(?:-\d{1,2})?/);
  if (!correspondance) return cle;
  const date = new Date(Number(correspondance[1]), Number(correspondance[2]) - 1, 1);
  return date.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
};

// Fonction utilitaire pour formater la date et l'heure en français
const formaterDateHeure = (dateStr?: string) => {
  if (!dateStr) return "Date non disponible";
  const dateObj = new Date(dateStr);
  if (isNaN(dateObj.getTime())) return dateStr; // Si le format est déjà personnalisé ou textuel

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
  const [cotisations, setCotisations] = useState<Contribution[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // États pour le Modal de détails
  const [selectedContribution, setSelectedContribution] = useState<Contribution | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isFull, setIsFull] = useState(false);

  useEffect(() => {
    const loadTransactions = async () => {
      const userStr = localStorage.getItem("caisse_user");
      if (!userStr) {
        setIsLoading(false);
        return;
      }
      const session = JSON.parse(userStr);
      const dataMembre = await getMembreByUid(session.id);
      if (dataMembre) {
        const listContributions = await getContributionsByMembreId(dataMembre.id);
        const lignesMensuelles = listContributions.flatMap((contribution) => {
          const nombreMois = contribution.nombreMois || contribution.nombreMoisPayes || 1;
          const moisCouverts = contribution.moisCouverts?.length
            ? contribution.moisCouverts
            : (() => {
                const date = contribution.datePaiement ? new Date(contribution.datePaiement) : new Date();
                return Array.from({ length: nombreMois }, (_, index) => {
                  const mois = new Date(date.getFullYear(), date.getMonth() + index, 1);
                  return `${mois.getFullYear()}-${String(mois.getMonth() + 1).padStart(2, "0")}`;
                });
              })();

          return moisCouverts.map((mois) => ({
            ...contribution,
            id: `${contribution.id}-${mois}`,
            moisCouverts: [moisFrancais(mois)],
            montantTotal: Number(contribution.montantVerse ?? contribution.montantTotal ?? 0) / (moisCouverts.length || 1),
            montantVerse: Number(contribution.montantVerse ?? contribution.montantTotal ?? 0) / (moisCouverts.length || 1),
          }));
        });
        setCotisations(lignesMensuelles);
      }
      setIsLoading(false);
    };
    loadTransactions();
  }, []);

  // Définition des colonnes pour le DataTable officiel
  const columns: Column<Contribution>[] = [
    {
      header: "Mois couverts",
      accessor: (item) => <span className="font-bold text-slate-900 dark:text-white">{item.moisCouverts?.join(", ") || `${item.nombreMois || item.nombreMoisPayes || 0} mois`}</span>,
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
              searchKey="referenceTransaction"
              searchPlaceholder="Rechercher par référence..."
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