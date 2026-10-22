"use client";

import React, { useState } from "react";
import Modal from "../../../../components/ui/Modal";
import {
  Wallet,
  Eye,
  HandCoins,
  Calculator,
  CheckCircle2,
  Send,
  Info,
} from "lucide-react";

interface Contribution {
  id: string;
  mois: string;
  montant: string;
  datePaiement: string;
  statut: "Payé" | "Impayé" | "Futur Payé";
  type: "Régulier (5000 FC)" | "Soutien Exceptionnel (25$)";
  moyenPaiement?: string;
  reference?: string;
}

export default function TransactionsPage() {
  // Liste des cotisations
  const cotisations: Contribution[] = [
    { id: "1", mois: "Janvier 2026", montant: "5 000 FC", datePaiement: "05/01/2026", statut: "Payé", type: "Régulier (5000 FC)", moyenPaiement: "Cash", reference: "REF-001" },
    { id: "2", mois: "Février 2026", montant: "5 000 FC", datePaiement: "03/02/2026", statut: "Payé", type: "Régulier (5000 FC)", moyenPaiement: "Mobile Money", reference: "REF-002" },
    { id: "3", mois: "Mars 2026", montant: "25 $", datePaiement: "10/03/2026", statut: "Payé", type: "Soutien Exceptionnel (25$)", moyenPaiement: "Cash", reference: "REF-003" },
    { id: "4", mois: "Avril 2026", montant: "5 000 FC", datePaiement: "02/04/2026", statut: "Payé", type: "Régulier (5000 FC)", moyenPaiement: "Mobile Money", reference: "REF-004" },
    { id: "5", mois: "Mai 2026", montant: "5 000 FC", datePaiement: "-", statut: "Impayé", type: "Régulier (5000 FC)" },
    { id: "6", mois: "Juin 2026", montant: "5 000 FC", datePaiement: "-", statut: "Impayé", type: "Régulier (5000 FC)" },
  ];

  // États pour le Modal de détails
  const [selectedContribution, setSelectedContribution] = useState<Contribution | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isFull, setIsFull] = useState(false);

  // États pour le Formulaire d'Emprunt
  const [nomPrenom, setNomPrenom] = useState("Kambale Malikewa Michael");
  const [montantEmprunt, setMontantEmprunt] = useState<number | "">("");
  const [butEmprunt, setButEmprunt] = useState("");
  const [demandeEnvoyee, setDemandeEnvoyee] = useState(false);

  // 🧮 Logique de calcul des intérêts selon le règlement officiel
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
    return null; // Si montant < 20 000 FC
  };

  const infoCalcul = typeof montantEmprunt === "number" ? calculerInteretEtDelai(montantEmprunt) : null;

  // Soumission de la demande
  const handleSubmitEmprunt = (e: React.FormEvent) => {
    e.preventDefault();
    if (!montantEmprunt || !butEmprunt) return;
    setDemandeEnvoyee(true);
  };

  return (
    <div className="space-y-8">
      {/* En-tête */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Mes Contributions & Emprunts</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Suivez vos versement mensuels et effectuez une demande d'emprunt au besoin.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* 📋 TABLEAU DES CONTRIBUTIONS (2 colonnes sur grand écran) */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden flex flex-col justify-between">
          <div>
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-slate-100 text-slate-800 rounded-xl">
                  <Wallet size={20} />
                </div>
                <h2 className="font-bold text-slate-900 text-base">Historique des Cotisations</h2>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50/80 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-100">
                  <tr>
                    <th className="py-3.5 px-5">Mois</th>
                    <th className="py-3.5 px-5">Type</th>
                    <th className="py-3.5 px-5">Montant</th>
                    <th className="py-3.5 px-5">Date</th>
                    <th className="py-3.5 px-5">Statut</th>
                    <th className="py-3.5 px-5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {cotisations.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-4 px-5 font-bold text-slate-900">{item.mois}</td>
                      <td className="py-4 px-5">
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md font-medium text-[11px]">
                          {item.type}
                        </span>
                      </td>
                      <td className="py-4 px-5 font-black text-slate-900">{item.montant}</td>
                      <td className="py-4 px-5 text-slate-400">{item.datePaiement}</td>
                      <td className="py-4 px-5">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                            item.statut === "Payé"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-rose-50 text-rose-700 border border-rose-200"
                          }`}
                        >
                          {item.statut}
                        </span>
                      </td>
                      <td className="py-4 px-5 text-right">
                        <button
                          onClick={() => {
                            setSelectedContribution(item);
                            setIsModalOpen(true);
                          }}
                          className="px-2.5 py-1 bg-slate-100 text-slate-700 hover:bg-slate-900 hover:text-white rounded-lg font-semibold text-[11px] transition-colors flex items-center gap-1 ml-auto"
                        >
                          <Eye size={12} /> Voir
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* 💸 FORMULAIRE DE DEMANDE D'EMPRUNT (1 colonne) */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-5">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <HandCoins size={20} />
            </div>
            <div>
              <h2 className="font-bold text-slate-900 text-base">Demander un Emprunt</h2>
              <p className="text-[11px] text-slate-400">Financement sous conditions du conseil</p>
            </div>
          </div>

          {demandeEnvoyee ? (
            <div className="bg-emerald-50 border border-emerald-200 p-5 rounded-2xl text-center space-y-3">
              <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 size={24} />
              </div>
              <h3 className="font-bold text-emerald-900 text-sm">Demande transmise avec succès !</h3>
              <p className="text-xs text-emerald-700 leading-relaxed">
                Votre demande d'emprunt a été envoyée à l'administrateur. Vous recevrez une réponse après étude par le conseil.
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
                <label className="block font-bold text-slate-700 mb-1">Demandeur</label>
                <input
                  type="text"
                  value={nomPrenom}
                  onChange={(e) => setNomPrenom(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Montant souhaité (FC)</label>
                <input
                  type="number"
                  placeholder="Ex: 50000"
                  value={montantEmprunt}
                  onChange={(e) => setMontantEmprunt(e.target.value ? Number(e.target.value) : "")}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800"
                  min="20000"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Motif / But de l'emprunt</label>
                <textarea
                  placeholder="Expliquez brièvement le projet..."
                  value={butEmprunt}
                  onChange={(e) => setButEmprunt(e.target.value)}
                  rows={2}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800"
                  required
                />
              </div>

              {/* Simulation des Intérêts en temps réel */}
              {infoCalcul ? (
                <div className="bg-blue-50/80 border border-blue-100 p-3.5 rounded-xl space-y-1.5 text-blue-900">
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
                  <div className="border-t border-blue-200/60 pt-1.5 flex justify-between font-black text-slate-900 text-sm">
                    <span>Total à rembourser :</span>
                    <span className="text-blue-700">{infoCalcul.total.toLocaleString()} FC</span>
                  </div>
                </div>
              ) : montantEmprunt !== "" && Number(montantEmprunt) < 20000 ? (
                <p className="text-[11px] text-rose-500 font-medium flex items-center gap-1">
                  <Info size={12} /> Montant minimum d'emprunt : 20 000 FC.
                </p>
              ) : null}

              <button
                type="submit"
                disabled={!infoCalcul}
                className={`w-full py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-colors ${
                  infoCalcul
                    ? "bg-slate-900 text-white hover:bg-slate-800 shadow-sm"
                    : "bg-slate-100 text-slate-400 cursor-not-allowed"
                }`}
              >
                <Send size={14} /> Soumettre la demande
              </button>
            </form>
          )}
        </div>
      </div>

      {/* 🪟 MODAL DÉTAILS CONTRIBUTION (Utilise le modal d'Arsène) */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={`Détails - ${selectedContribution?.mois || ""}`}
        maxWidth="lg"
        isFullScreen={isFull}
        setIsFullScreen={setIsFull}
      >
        {selectedContribution && (
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <p className="text-slate-400 font-medium">Mois concerné</p>
                <p className="font-bold text-slate-900 mt-0.5">{selectedContribution.mois}</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <p className="text-slate-400 font-medium">Montant</p>
                <p className="font-bold text-emerald-600 mt-0.5">{selectedContribution.montant}</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <p className="text-slate-400 font-medium">Statut</p>
                <p className="font-bold text-slate-900 mt-0.5">{selectedContribution.statut}</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <p className="text-slate-400 font-medium">Date de paiement</p>
                <p className="font-bold text-slate-900 mt-0.5">{selectedContribution.datePaiement}</p>
              </div>
            </div>

            {selectedContribution.reference && (
              <div className="p-3 bg-blue-50 rounded-xl border border-blue-100 text-blue-900">
                <p className="font-bold mb-1">Récépissé de versement</p>
                <p>Moyen : <b>{selectedContribution.moyenPaiement}</b></p>
                <p>Référence : <b>{selectedContribution.reference}</b></p>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}