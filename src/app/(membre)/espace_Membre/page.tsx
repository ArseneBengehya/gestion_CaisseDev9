"use client";

import React, { useState } from "react";
import Modal from "../../../components/ui/Modal";
import {
  Landmark,
  PiggyBank,
  AlertCircle,
  TrendingUp,
  Eye,
  ShieldAlert,
  Info,
  Banknote,
  Target,
} from "lucide-react";

export default function MonEspacePage() {
  // Données de simulation pour le membre
  const stats = {
    caisseGenerale: "1 850 000 FC",
    totalCotiseMembre: "125 000 FC",
    montantImpaye: "10 000 FC",
    moisImpayes: ["Mai 2026 (5000 FC)", "Juin 2026 (5000 FC)"],
    montantAvance: "15 000 FC",
    moisAvances: ["Novembre 2026 (5000 FC)", "Décembre 2026 (10000 FC - Soutien)"],
  };

  // Gestion des modals
  const [modalType, setModalType] = useState<"impayes" | "avances" | null>(null);
  const [isFull, setIsFull] = useState(false);

  return (
    <div className="space-y-8">
      {/* En-tête de la page */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Tableau de bord</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Aperçu global de la caisse et de votre situation financière.
        </p>
      </div>

      {/* 📊 GRILLE DE CARTES PRINCIPALES (Design inspiré de Bompay) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* 1. Caisse Générale */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow">
          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-800 flex items-center justify-center mb-4">
            <Landmark size={20} />
          </div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Caisse Générale
          </p>
          <p className="text-2xl font-black text-slate-900 mt-1">
            {stats.caisseGenerale}
          </p>
          <p className="text-[11px] text-slate-400 mt-2">
            Fonds total disponible du groupe
          </p>
        </div>

        {/* 2. Total Cotisé par le membre */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4">
            <PiggyBank size={20} />
          </div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Ma Contribution Total
          </p>
          <p className="text-2xl font-black text-emerald-600 mt-1">
            {stats.totalCotiseMembre}
          </p>
          <p className="text-[11px] text-slate-400 mt-2">
            Cumul de vos versements
          </p>
        </div>

        {/* 3. Mois Requis (Impayés) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-start mb-4">
              <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                <AlertCircle size={20} />
              </div>
              <button
                onClick={() => setModalType("impayes")}
                className="flex items-center gap-1 text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 px-2.5 py-1 rounded-lg transition-colors"
              >
                <Eye size={14} /> Vue
              </button>
            </div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Mois Requis (Retard)
            </p>
            <p className="text-2xl font-black text-rose-600 mt-1">
              {stats.montantImpaye}
            </p>
          </div>
          <p className="text-[11px] text-rose-500 font-medium mt-2">
            {stats.moisImpayes.length} mois en attente de paiement
          </p>
        </div>

        {/* 4. Mois en Avance */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-start mb-4">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <TrendingUp size={20} />
              </div>
              <button
                onClick={() => setModalType("avances")}
                className="flex items-center gap-1 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-lg transition-colors"
              >
                <Eye size={14} /> Vue
              </button>
            </div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Mois en Avance
            </p>
            <p className="text-2xl font-black text-blue-600 mt-1">
              {stats.montantAvance}
            </p>
          </div>
          <p className="text-[11px] text-blue-500 font-medium mt-2">
            {stats.moisAvances.length} mois prépayés
          </p>
        </div>
      </div>

      {/* 📜 SECTION RÈGLES & VISION DE LA CAISSE */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Vision & Règles Générales */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
            <div className="p-2 rounded-lg bg-slate-100 text-slate-800">
              <Target size={18} />
            </div>
            <h3 className="font-bold text-slate-900 text-base">
              Vision & Règles Générales
            </h3>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            La caisse sert exclusivement de <b>capital de départ</b> pour le
            lancement officiel de l'entreprise. Aucun intérêt personnel n'est
            autorisé.
          </p>
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs text-slate-700 space-y-1.5">
            <p>• <b>Dépôt mensuel :</b> 5 000 FC / mois auprès du caissier.</p>
            <p>• <b>Mois spécial :</b> 25$ une fois l'an pour accélérer la croissance.</p>
          </div>
        </div>

        {/* Conditions d'Emprunt */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
              <Banknote size={18} />
            </div>
            <h3 className="font-bold text-slate-900 text-base">
              Règles des Emprunts
            </h3>
          </div>
          <p className="text-xs text-slate-600">
            Possibilité d'emprunter selon le barème officiel :
          </p>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between p-2 bg-blue-50/50 rounded-lg text-blue-900">
              <span>20k - 50k FC</span>
              <span className="font-bold">+20% (1 mois)</span>
            </div>
            <div className="flex justify-between p-2 bg-blue-50/50 rounded-lg text-blue-900">
              <span>60k - 70k FC</span>
              <span className="font-bold">+15% (2 mois)</span>
            </div>
            <div className="flex justify-between p-2 bg-blue-50/50 rounded-lg text-blue-900">
              <span>80k - 90k FC</span>
              <span className="font-bold">+10% (3 mois)</span>
            </div>
            <div className="flex justify-between p-2 bg-blue-50/50 rounded-lg text-blue-900">
              <span>100k FC et +</span>
              <span className="font-bold">+5% (4 mois)</span>
            </div>
          </div>
        </div>

        {/* Échelle des Pénalités */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
            <div className="p-2 rounded-lg bg-rose-50 text-rose-600">
              <ShieldAlert size={18} />
            </div>
            <h3 className="font-bold text-slate-900 text-base">
              Barème des Pénalités
            </h3>
          </div>
          <p className="text-xs text-slate-600">
            En cas d'infraction au règlement :
          </p>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between p-2 bg-rose-50/50 rounded-lg text-rose-900">
              <span>Type C (💧 Goutte d'eau)</span>
              <span className="font-bold">-2% parts</span>
            </div>
            <div className="flex justify-between p-2 bg-rose-50/50 rounded-lg text-rose-900">
              <span>Type B (🩸 Goutte de sang)</span>
              <span className="font-bold">-5% parts</span>
            </div>
            <div className="flex justify-between p-2 bg-rose-50/50 rounded-lg text-rose-900">
              <span>Type A (Haute faute)</span>
              <span className="font-bold">-10% parts</span>
            </div>
            <div className="flex justify-between p-2 bg-rose-50/50 rounded-lg text-rose-900">
              <span>Type S (Critique)</span>
              <span className="font-bold">Exclusion</span>
            </div>
          </div>
        </div>
      </div>

      {/* 🪟 MODAL DÉTAILS DES MOIS REQUIS / EN AVANCE */}
      <Modal
        isOpen={modalType !== null}
        onClose={() => setModalType(null)}
        title={
          modalType === "impayes"
            ? "Détails des Mois Requis (Impayés)"
            : "Détails des Mois en Avance"
        }
        maxWidth="md"
        isFullScreen={isFull}
        setIsFullScreen={setIsFull}
      >
        <div className="space-y-4">
          {modalType === "impayes" ? (
            <div>
              <p className="text-sm text-slate-600 mb-3">
                Voici la liste des mois non encore régularisés auprès du caissier :
              </p>
              <div className="space-y-2">
                {stats.moisImpayes.map((m, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-rose-50 border border-rose-100 rounded-xl text-xs font-semibold text-rose-900 flex justify-between items-center"
                  >
                    <span>{m}</span>
                    <span className="bg-rose-200 text-rose-800 px-2 py-0.5 rounded-full text-[10px]">
                      En retard
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div>
              <p className="text-sm text-slate-600 mb-3">
                Voici la liste des mois que vous avez payés par avance :
              </p>
              <div className="space-y-2">
                {stats.moisAvances.map((m, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-blue-50 border border-blue-100 rounded-xl text-xs font-semibold text-blue-900 flex justify-between items-center"
                  >
                    <span>{m}</span>
                    <span className="bg-blue-200 text-blue-800 px-2 py-0.5 rounded-full text-[10px]">
                      Réglé
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}