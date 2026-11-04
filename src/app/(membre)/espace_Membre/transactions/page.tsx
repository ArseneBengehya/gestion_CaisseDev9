"use client";

import React, { useEffect, useState } from "react";
import DataTable, { Column } from "../../../../components/ui/DataTable";
import Modal from "../../../../components/ui/Modal";
import {
  Wallet,
  HandCoins,
  Calculator,
  CheckCircle2,
  Send,
  Info,
  Loader2,
  FileText,
} from "lucide-react";
import { auth } from "../../../../lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { getMembreByUid, getContributionsByMembreId, creerDemandeEmprunt } from "../../../../services/dbService";
import { Contribution, Membre } from "../../../../types";

export default function TransactionsPage() {
  const [membreActuel, setMembreActuel] = useState<Membre | null>(null);
  const [cotisations, setCotisations] = useState<Contribution[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // États pour le Modal de détails
  const [selectedContribution, setSelectedContribution] = useState<Contribution | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isFull, setIsFull] = useState(false);

  // États pour le Formulaire d'Emprunt
  const [montantEmprunt, setMontantEmprunt] = useState<number | "">("");
  const [butEmprunt, setButEmprunt] = useState("");
  const [demandeEnvoyee, setDemandeEnvoyee] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const dataMembre = await getMembreByUid(user.uid);
        if (dataMembre) {
          setMembreActuel(dataMembre);
          // Récupération des contributions réelles depuis Firestore
          const listContributions = await getContributionsByMembreId(dataMembre.id);
          setCotisations(listContributions);
        }
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // 🧮 Logique de calcul des intérêts selon le règlement officiel de la caisse
  const calculerInteretEtDelai = (montant: number) => {
    if (montant >= 20000 && montant <= 50000) {
      return { taux: 20, delaiMax: "1 mois", surplus: montant * 0.2, total: montant * 1.2 };
    } else if (montant >= 60000 && montant <= 70000) {
      return { taux: 15, delaiMax: "2 mois", surplus: montant * 0.15, total: montant * 1.15 };
    } else if (montant >= 80000 && montant <= 90000) {
      return { taux: 10, delaiMax: "3 mois", surplus: montant * 0.1, total: montant * 1.1 };
    } else if (montant >= 100000) {
      return { taux: 5, delaiMax: "4 mois", surplus: montant * 0.05, total: montant * 1.05 };
    }
    return null;
  };

  const infoCalcul = typeof montantEmprunt === "number" ? calculerInteretEtDelai(montantEmprunt) : null;

  const handleSubmitEmprunt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!montantEmprunt || !butEmprunt || !membreActuel || !infoCalcul) return;

    setIsSubmitting(true);
    try {
      const success = await creerDemandeEmprunt({
        membreId: membreActuel.id,
        nomMembre: membreActuel.nomComplet || `${membreActuel.prenom} ${membreActuel.nom}`,
        montantEmprunte: Number(montantEmprunt),
        tauxInteret: infoCalcul.taux,
        montantTotalARembourser: infoCalcul.total,
        dateEmprunt: new Date().toISOString(),
        dateEcheance: infoCalcul.delaiMax,
        statut: "En cours",
        note: butEmprunt,
      } as any);

      if (success) {
        setDemandeEnvoyee(true);
        setMontantEmprunt("");
        setButEmprunt("");
      }
    } catch (error) {
      console.error("Erreur lors de la soumission de l'emprunt:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Définition des colonnes pour le DataTable officiel
  const columns: Column<Contribution>[] = [
    {
      header: "Mois couverts",
      accessor: (item) => <span className="font-bold text-slate-900 dark:text-white">{item.moisCouverts?.join(", ") || "N/A"}</span>,
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
      accessor: (item) => <span className="font-black text-emerald-600 dark:text-emerald-400">+{item.montantTotal?.toLocaleString()} FC</span>,
    },
    { header: "Date de paiement", accessor: (item) => <span className="text-slate-500">{item.datePaiement}</span> },
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
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Mes Contributions & Emprunts</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          Suivez vos versements mensuels enregistrés dans Firestore et effectuez une demande d'emprunt réglementaire.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* 📋 TABLEAU DES CONTRIBUTIONS */}
        <div className="lg:col-span-2">
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

        {/* 💸 FORMULAIRE DE DEMANDE D'EMPRUNT */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-5">
          <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
            <div className="p-2 bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400 rounded-xl">
              <HandCoins size={20} />
            </div>
            <div>
              <h2 className="font-bold text-slate-900 dark:text-white text-base">Demander un Emprunt</h2>
              <p className="text-[11px] text-slate-400">Financement soumis aux conditions du conseil</p>
            </div>
          </div>

          {demandeEnvoyee ? (
            <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/40 p-5 rounded-2xl text-center space-y-3">
              <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900 text-emerald-600 dark:text-emerald-300 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 size={24} />
              </div>
              <h3 className="font-bold text-emerald-900 dark:text-emerald-300 text-sm">Demande transmise avec succès !</h3>
              <p className="text-xs text-emerald-700 dark:text-emerald-400 leading-relaxed">
                Votre demande a bien été envoyée et sera traitée par l'administration.
              </p>
              <button
                onClick={() => setDemandeEnvoyee(false)}
                className="w-full py-2 bg-emerald-600 text-white rounded-xl font-bold text-xs hover:bg-emerald-700 transition-colors"
              >
                Faire une autre demande
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmitEmprunt} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Demandeur</label>
                <input
                  type="text"
                  value={membreActuel?.nomComplet || ""}
                  disabled
                  className="w-full px-3.5 py-2.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium text-slate-600 dark:text-slate-300 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Montant souhaité (FC)</label>
                <input
                  type="number"
                  placeholder="Ex: 50000"
                  value={montantEmprunt}
                  onChange={(e) => setMontantEmprunt(e.target.value ? Number(e.target.value) : "")}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium text-slate-800 dark:text-white"
                  min="20000"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Motif / But de l'emprunt</label>
                <textarea
                  placeholder="Expliquez brièvement le projet..."
                  value={butEmprunt}
                  onChange={(e) => setButEmprunt(e.target.value)}
                  rows={2}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium text-slate-800 dark:text-white"
                  required
                />
              </div>

              {infoCalcul ? (
                <div className="bg-blue-50/80 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/40 p-3.5 rounded-xl space-y-1.5 text-blue-900 dark:text-blue-200">
                  <div className="flex items-center gap-1.5 font-bold">
                    <Calculator size={14} />
                    <span>Calcul automatique de la Caisse</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Taux appliqué :</span>
                    <span className="font-bold">+{infoCalcul.taux}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Surplus (Intérêt) :</span>
                    <span className="font-bold">{infoCalcul.surplus.toLocaleString()} FC</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Délai de remboursement :</span>
                    <span className="font-bold">{infoCalcul.delaiMax}</span>
                  </div>
                  <div className="border-t border-blue-200/60 dark:border-blue-900 pt-1.5 flex justify-between font-black text-slate-900 dark:text-white text-sm">
                    <span>Total à rembourser :</span>
                    <span className="text-blue-700 dark:text-blue-400">{infoCalcul.total.toLocaleString()} FC</span>
                  </div>
                </div>
              ) : montantEmprunt !== "" && Number(montantEmprunt) < 20000 ? (
                <p className="text-[11px] text-rose-500 font-medium flex items-center gap-1">
                  <Info size={12} /> Montant minimum d'emprunt : 20 000 FC.
                </p>
              ) : null}

              <button
                type="submit"
                disabled={!infoCalcul || isSubmitting}
                className={`w-full py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-colors ${
                  infoCalcul && !isSubmitting
                    ? "bg-slate-900 hover:bg-slate-800 text-white dark:bg-blue-600 dark:hover:bg-blue-700 shadow-sm"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed"
                }`}
              >
                {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                <span>Soumettre la demande</span>
              </button>
            </form>
          )}
        </div>
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
                <p className="font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">{selectedContribution.montantTotal?.toLocaleString()} FC</p>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700">
                <p className="text-slate-400 font-medium">Mode de paiement</p>
                <p className="font-bold text-slate-900 dark:text-white mt-0.5">{selectedContribution.modePaiement}</p>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700">
                <p className="text-slate-400 font-medium">Date de paiement</p>
                <p className="font-bold text-slate-900 dark:text-white mt-0.5">{selectedContribution.datePaiement}</p>
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