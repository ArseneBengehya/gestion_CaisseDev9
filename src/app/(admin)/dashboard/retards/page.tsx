'use client';

import React, { useState, useEffect } from 'react';
import { AlertTriangle, Send, PhoneCall, ShieldAlert, Loader2, CheckCircle2 } from 'lucide-react';
import { Membre } from '@/src/types';

// Import Firestore
import { collection, onSnapshot, doc } from 'firebase/firestore';
import { db } from '@/src/lib/firebase';

interface ContributionData {
  id: string;
  membreId: string;
  nombreMois: number;
  montantVerse: number;
  datePaiement: string;
}

interface MembreEnRetard {
  id: string;
  nomComplet: string;
  telephone: string;
  moisEnRetard: number;
  montantCotisationDuh: number;
  penalite: number;
  totalDuh: number;
  moisImpayesNoms: string[];
}

export default function RetardsPage() {
  const [membres, setMembres] = useState<Membre[]>([]);
  const [contributions, setContributions] = useState<ContributionData[]>([]);
  const [membresRetard, setMembresRetard] = useState<MembreEnRetard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [sentSuccessId, setSentSuccessId] = useState<string | null>(null);

  const [caisseConfig, setCaisseConfig] = useState({
    dateDebutCaisse: '2025-01-01',
    cotisationMensuelle: 5000,
  });

  // 1. Écouter la configuration de la Caisse Dev9
  useEffect(() => {
    const unsubConfig = onSnapshot(doc(db, 'settings', 'caisse_config'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setCaisseConfig({
          dateDebutCaisse: data.dateDebutCaisse || '2025-01-01',
          cotisationMensuelle: Number(data.cotisationMensuelle) || 5000,
        });
      }
    });

    return () => unsubConfig();
  }, []);

  // 2. Écouter la liste des membres (Transtypage direct pour éviter les erreurs de types strictes)
// 2. Écouter la liste des membres (corrigé avec 'as any')
  useEffect(() => {
    const unsubMembres = onSnapshot(collection(db, 'membres'), (snapshotMembres) => {
      const list = snapshotMembres.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          nom: data.nom || '',
          prenom: data.prenom || '',
          nomComplet: data.nomComplet || `${data.prenom || ''} ${data.nom || ''}`.trim(),
          telephone: data.telephone || '',
          email: data.email || '',
          statut: data.statut || 'ACTIF',
          dateAdhesion: data.createdAt || new Date().toISOString().split('T')[0],
          detteActuelle: 0,
          montantTotalCotise: 0,
          moisPayes: [],
          avancesMoisFuturs: 0,
          statutCotisation: 'RETARD',
        } as any;
      });

      setMembres(list);
    });

    return () => unsubMembres();
  }, []);

  // 3. Écouter les contributions enregistrées
  useEffect(() => {
    const unsubContributions = onSnapshot(collection(db, 'contributions'), (snapshotContribs) => {
      const list: ContributionData[] = snapshotContribs.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          membreId: data.membreId || '',
          nombreMois: Number(data.nombreMois) || 0,
          montantVerse: Number(data.montantVerse) || 0,
          datePaiement: data.datePaiement || '',
        };
      });

      setContributions(list);
      setIsLoading(false);
    });

    return () => unsubContributions();
  }, []);

  // 4. Calculer les retards de manière réactive
  useEffect(() => {
    if (membres.length === 0) return;

    const dateDebut = new Date(caisseConfig.dateDebutCaisse);
    const maintenant = new Date();

    const moisAttendusTotal = Math.max(
      1,
      (maintenant.getFullYear() - dateDebut.getFullYear()) * 12 +
        (maintenant.getMonth() - dateDebut.getMonth()) +
        1
    );

    const MONTANT_MENSUEL = caisseConfig.cotisationMensuelle;

    const resultats: MembreEnRetard[] = membres
      .map((membre) => {
        const memberContribs = contributions.filter((c) => c.membreId === membre.id);
        const totalMoisPayes = memberContribs.reduce(
          (sum, c) => sum + (c.nombreMois || 0),
          0
        );

        const moisEnRetard = Math.max(0, moisAttendusTotal - totalMoisPayes);
        const montantCotisationDuh = moisEnRetard * MONTANT_MENSUEL;
        const penalite = moisEnRetard > 0 ? moisEnRetard * 1000 : 0;
        const totalDuh = montantCotisationDuh + penalite;

        const moisImpayesNoms: string[] = [];
        for (let i = totalMoisPayes; i < moisAttendusTotal; i++) {
          const d = new Date(dateDebut.getFullYear(), dateDebut.getMonth() + i, 1);
          moisImpayesNoms.push(d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }));
        }

        return {
          id: membre.id,
          nomComplet: membre.nomComplet || `${membre.prenom || ''} ${membre.nom || ''}`.trim(),
          telephone: membre.telephone || '',
          moisEnRetard,
          montantCotisationDuh,
          penalite,
          totalDuh,
          moisImpayesNoms,
        };
      })
      .filter((m) => m.moisEnRetard > 0);

    setMembresRetard(resultats);
  }, [membres, contributions, caisseConfig]);

  // Appeler l'API de relance automatique
  const handleSendAutomaticRelance = async (membre: MembreEnRetard) => {
    if (!membre.telephone) {
      alert("Ce membre n'a pas de numéro de téléphone enregistré.");
      return;
    }

    setSendingId(membre.id);

    try {
      const response = await fetch('/api/relance-whatsapp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(membre),
      });

      const resData = await response.json();

      if (response.ok) {
        setSentSuccessId(membre.id);
        setTimeout(() => setSentSuccessId(null), 4000);
      } else {
        const messageErreur = resData.error || "Impossible d'envoyer la relance";
        alert(`Erreur d'envoi : ${messageErreur}`);
      }
    } catch (error) {
      console.error("Erreur lors de la relance :", error);
      alert("Erreur réseau lors de l'envoi de la relance.");
    } finally {
      setSendingId(null);
    }
  };

  const totalDettes = membresRetard.reduce((acc, curr) => acc + curr.totalDuh, 0);

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
            Suivi des Retards & Relances Automatiques
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Calculs synchronisés depuis le lancement de la caisse au{' '}
            <strong>{caisseConfig.dateDebutCaisse}</strong> ({caisseConfig.cotisationMensuelle.toLocaleString()} FC/mois).
          </p>
        </div>
      </div>

      {/* Cartes KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-xl flex items-center justify-between shadow-sm">
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">
              Créances à Recouvrer
            </p>
            <p className="text-2xl font-bold text-rose-600 dark:text-rose-400 mt-1">
              {totalDettes.toLocaleString()} FC
            </p>
          </div>
          <div className="p-3 bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400 rounded-lg">
            <ShieldAlert size={24} />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-xl flex items-center justify-between shadow-sm">
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">
              Membres en Retard
            </p>
            <p className="text-2xl font-bold text-slate-800 dark:text-white mt-1">
              {membresRetard.length} Membre(s)
            </p>
          </div>
          <div className="p-3 bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400 rounded-lg">
            <AlertTriangle size={24} />
          </div>
        </div>
      </div>

      {/* Liste des membres en retard */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-800 dark:text-white">
            Relances Automatiques WhatsApp API
          </h3>
          <span className="text-xs text-slate-500">
            Envoi sécurisé via le serveur
          </span>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-slate-500">Analyse des retards en cours...</div>
        ) : membresRetard.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            Aucun membre en retard pour le moment. Tout le monde est à jour ! 🎉
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {membresRetard.map((membre) => (
              <div
                key={membre.id}
                className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors hover:bg-slate-50/50 dark:hover:bg-slate-800/30"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 dark:text-white text-base">
                      {membre.nomComplet}
                    </span>
                    <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-300">
                      {membre.moisEnRetard} mois de retard
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                    <PhoneCall size={12} /> {membre.telephone || 'Aucun numéro'}
                  </p>
                  <div className="text-xs text-slate-600 dark:text-slate-300 gap-3 pt-0.5 flex flex-wrap">
                    <span>
                      Cotisations : <strong>{membre.montantCotisationDuh.toLocaleString()} FC</strong>
                    </span>
                    <span>•</span>
                    <span>
                      Pénalités :{' '}
                      <strong className="text-amber-600 dark:text-amber-400">
                        {membre.penalite.toLocaleString()} FC
                      </strong>
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-100 dark:border-slate-800">
                  <div className="text-right">
                    <p className="text-xs text-slate-400 uppercase font-semibold">Total À Payer</p>
                    <p className="text-lg font-extrabold text-rose-600 dark:text-rose-400">
                      {membre.totalDuh.toLocaleString()} FC
                    </p>
                  </div>

                  <button
                    disabled={sendingId === membre.id}
                    onClick={() => handleSendAutomaticRelance(membre)}
                    className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl shadow-sm transition-all ${
                      sentSuccessId === membre.id
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                        : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    }`}
                  >
                    {sendingId === membre.id ? (
                      <>
                        <Loader2 size={14} className="animate-spin" />
                        Envoi en cours...
                      </>
                    ) : sentSuccessId === membre.id ? (
                      <>
                        <CheckCircle2 size={14} />
                        Envoyé avec succès
                      </>
                    ) : (
                      <>
                        <Send size={14} />
                        Relance Automatique
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}