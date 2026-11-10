'use client';

import React, { useState, useEffect } from 'react';
import { PiggyBank, PlusCircle, AlertCircle, CheckCircle } from 'lucide-react';
import { Membre, StatutMembreContribution } from '@/src/types';
import DataTable, { Column } from '@/src/components/ui/DataTable';
import AddContributionDrawer from '@/src/components/modals/AddContributionDrawer';
import ViewHistoriqueModal from '@/src/components/modals/ViewHistoriqueModal';
import Toast from '@/src/components/ui/Toast';
import {
  ContributionMonthRecord,
  DATE_DEBUT_CAISSE_PAR_DEFAUT,
  obtenirMoisCouvertsParContributions,
} from '@/src/lib/contribution-months';

// Import Firestore
import {
  collection,
  onSnapshot,
  addDoc,
  doc,
} from 'firebase/firestore';
import { db } from '@/src/lib/firebase';
import { addNotification } from '@/src/services/dbService';

interface ContributionDoc extends ContributionMonthRecord {
  id: string;
  membreId: string;
  nombreMois: number;
  montantVerse: number;
  modePaiement: string;
  note: string;
  datePaiement: string;
}

export default function ContributionsPage() {
  const [membres, setMembres] = useState<Membre[]>([]);
  const [rawContributions, setRawContributions] = useState<ContributionDoc[]>([]);
  const [contributionsData, setContributionsData] = useState<StatutMembreContribution[]>([]);
  
  // Paramètres globaux de la caisse (récupérés depuis Firestore)
  const [caisseConfig, setCaisseConfig] = useState({
    dateDebutCaisse: DATE_DEBUT_CAISSE_PAR_DEFAUT,
    cotisationMensuelle: 5000,
    cotisationMoisSpecial: 10000,
  });

  const [isLoading, setIsLoading] = useState(true);

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedContribution, setSelectedContribution] = useState<StatutMembreContribution | null>(null);

  // État Toast pour les notifications
  const [toast, setToast] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => {
      setToast(null);
    }, 5000);
  };

  // 1. ÉCOUTER LES PARAMÈTRES DE LA CAISSE (Firestore)
  useEffect(() => {
    const unsubConfig = onSnapshot(doc(db, 'settings', 'caisse_config'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setCaisseConfig({
          dateDebutCaisse: data.dateDebutCaisse || DATE_DEBUT_CAISSE_PAR_DEFAUT,
          cotisationMensuelle: data.cotisationMensuelle || 5000,
          cotisationMoisSpecial: data.cotisationMoisSpecial || 10000,
        });
      }
    });

    return () => unsubConfig();
  }, []);

  // 2. ÉCOUTER LES MEMBRES FIRESTORE
  useEffect(() => {
    const unsubMembres = onSnapshot(collection(db, 'membres'), (snapshot) => {
      const membresData: Membre[] = snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          nom: data.nom || '',
          prenom: data.prenom || '',
          nomComplet: data.nomComplet || `${data.prenom || ''} ${data.nom || ''}`.trim(),
          telephone: data.telephone || '',
          email: data.email || '',
          photoUrl: data.photoUrl || data.avatarUrl || '',
          avatarUrl: data.avatarUrl || '',
          statut: data.statut || 'ACTIF',
          dateAdhesion: data.createdAt || new Date().toISOString().split('T')[0],
        };
      }) as Membre[];

      setMembres(membresData);
    });

    return () => unsubMembres();
  }, []);

  // 3. ÉCOUTER LES TRANSACTIONS DE CONTRIBUTIONS FIRESTORE
  useEffect(() => {
    const unsubContributions = onSnapshot(collection(db, 'contributions'), (snapshot) => {
      const contribs: ContributionDoc[] = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      })) as ContributionDoc[];

      setRawContributions(contribs);
      setIsLoading(false);
    });

    return () => unsubContributions();
  }, []);

  // 4. FUSIONNER & CALCULER LES TOTAUX & DETTES DYNAMIQUEMENT SELON LA DATE DE DÉBUT
  useEffect(() => {
    if (membres.length === 0) return;

    // Calculer le nombre de mois théoriques attendus entre la date de début de la caisse et aujourd'hui
    const dateDebut = new Date(caisseConfig.dateDebutCaisse);
    const maintenant = new Date();
    const moisAttendus = Math.max(
      1,
      (maintenant.getFullYear() - dateDebut.getFullYear()) * 12 +
        (maintenant.getMonth() - dateDebut.getMonth()) +
        1
    );

    const montantMensuel = caisseConfig.cotisationMensuelle;

    const computed: StatutMembreContribution[] = membres.map((membre) => {
      const memberContribs = rawContributions.filter((c) => c.membreId === membre.id);

      // Cumul du montant versé
      const montantTotalCotise = memberContribs.reduce((sum, c) => sum + (c.montantVerse || 0), 0);
      
      // Cumul du nombre de mois payés
      const totalMoisPayes = new Set(
        obtenirMoisCouvertsParContributions(memberContribs, caisseConfig.dateDebutCaisse).flat()
      ).size;

      // Calcul de la dette actuelle (Mois attendus - Mois payés * montant mensuel, minimum 0)
      const moisEnRetard = Math.max(0, moisAttendus - totalMoisPayes);
      const detteActuelle = moisEnRetard * montantMensuel;

      const moisPayes = Array.from({ length: totalMoisPayes }, (_, i) => `Mois ${i + 1}`);

      return {
        membre,
        totalContributionsCount: memberContribs.length,
        montantTotalCotise,
        detteActuelle,
        moisPayes,
        moisImpayes: Array.from({ length: moisEnRetard }, (_, i) => `Retard ${i + 1}`),
        moisFutursPayes: [],
        dernierPaiementDate: memberContribs.length > 0 
          ? new Date(memberContribs[memberContribs.length - 1].datePaiement).toLocaleDateString('fr-FR')
          : '-',
      };
    });

    setContributionsData(computed);
  }, [membres, rawContributions, caisseConfig]);

  // 5. ENREGISTRER UNE CONTRIBUTION DANS FIRESTORE (Utilisation de Toast)
  const handleAddContribution = async (formData: { membreId: string; nombreMois: number; moisSelectionnes: string[]; modePaiement: string; note: string }) => {
    try {
      const montantVerse = formData.nombreMois * caisseConfig.cotisationMensuelle;
      const membre = membres.find((item) => item.id === formData.membreId);

      await addDoc(collection(db, 'contributions'), {
        membreId: formData.membreId,
        nombreMois: formData.nombreMois,
        moisCouverts: formData.moisSelectionnes,
        montantVerse,
        modePaiement: formData.modePaiement,
        note: formData.note,
        datePaiement: new Date().toISOString(),
      });
      await addNotification({
        membreId: 'TOUS',
        titre: 'Nouvelle contribution',
        message: `${membre?.nomComplet || 'Un membre'} vient de faire une contribution de ${montantVerse.toLocaleString()} FC.`,
        type: 'succes',
      });

      showToast('success', `Contribution de ${montantVerse.toLocaleString()} FC enregistrée avec succès !`);
      setIsDrawerOpen(false);
    } catch (error) {
      console.error("Erreur lors de l'enregistrement de la contribution :", error);
      showToast('error', "Erreur lors de l'enregistrement de la contribution.");
    }
  };

  const openHistoriqueView = (item: StatutMembreContribution) => {
    setSelectedContribution(item);
    setIsViewModalOpen(true);
  };

  const columns: Column<StatutMembreContribution>[] = [
    {
      header: 'Membre',
      accessor: (item) => {
        const photoUrl = item.membre.photoUrl || item.membre.avatarUrl;
        const label = item.membre.nomComplet || `${item.membre.prenom} ${item.membre.nom}`;
        return (
          <div className="flex items-center gap-3">
            {photoUrl ? (
              <img src={photoUrl} alt={`Photo de ${label}`} className="h-9 w-9 shrink-0 rounded-full border border-slate-200 object-cover dark:border-slate-700" />
            ) : (
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                {(label || 'M').charAt(0).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <p className="font-semibold text-slate-800 dark:text-white">{label}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{item.membre.telephone}</p>
            </div>
          </div>
        );
      },
    },
    {
      header: 'Total Cotisé',
      accessor: (item) => (
        <span className="font-semibold">
          {item.montantTotalCotise.toLocaleString()} FC
        </span>
      ),
    },
    {
      header: 'Dette Actuelle',
      accessor: (item) => (
        <span className={`font-semibold ${item.detteActuelle > 0 }`}>
          {item.detteActuelle > 0 ? `${item.detteActuelle.toLocaleString()} FC` : 'Aucune'}
        </span>
      ),
    },
    {
      header: 'Mois Payés',
      accessor: (item) => (
        <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
          {item.moisPayes.length} mois
        </span>
      ),
    },
  ];

  const totalCotisations = contributionsData.reduce((acc, curr) => acc + curr.montantTotalCotise, 0);
  const totalDettes = contributionsData.reduce((acc, curr) => acc + curr.detteActuelle, 0);

  return (
    <div className="relative space-y-6">
      {/* Toast de notification */}
      {toast && (
        <Toast
          type={toast.type}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Gestion des Contributions</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Suivi basé sur le lancement de la caisse au <strong>{caisseConfig.dateDebutCaisse}</strong> ({caisseConfig.cotisationMensuelle.toLocaleString()} FC/mois).
          </p>
        </div>
        <button
          onClick={() => setIsDrawerOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 text-sm font-semibold rounded-xl shadow-sm transition-colors"
        >
          <PlusCircle size={18} />
          Nouvelle Contribution
        </button>
      </div>

{/* Cartes KPI : 2 par ligne sur petit écran, et 3 sur la même ligne sur grand écran */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <div className="group relative min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm transition-all hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between gap-2">
            <span className="truncate text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Total Cotisé</span>
            <div className="shrink-0 rounded-lg bg-slate-100 p-2 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
              <PiggyBank size={18} />
            </div>
          </div>
          <p className="mt-2 text-lg sm:text-xl font-extrabold tabular-numstruncate">
            {totalCotisations.toLocaleString()} <span className="text-xs font-normal text-slate-500">FC</span>
          </p>
        </div>

        <div className="group relative min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm transition-all hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between gap-2">
            <span className="truncate text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Dettes Globales</span>
            <div className="shrink-0 rounded-lg bg-slate-100 p-2 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
              <AlertCircle size={18} />
            </div>
          </div>
          <p className="mt-2 text-lg sm:text-xl font-extrabold tabular-nums  truncate">
            {totalDettes.toLocaleString()} <span className="text-xs font-normal text-slate-500">FC</span>
          </p>
        </div>

        {/* La 3ème carte s'étale sur 2 colonnes en bas sur mobile, et reprend sa place normale sur grand écran */}
        <div className="col-span-2 lg:col-span-1 group relative min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm transition-all hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between gap-2">
            <span className="truncate text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Membres à jour</span>
            <div className="shrink-0 rounded-lg bg-slate-100 p-2 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
              <CheckCircle size={18} />
            </div>
          </div>
          <p className="mt-2 text-lg sm:text-xl font-extrabold tabular-nums text-slate-900 dark:text-white truncate">
            {contributionsData.filter((d) => d.detteActuelle === 0).length} <span className="text-xs font-normal text-slate-500">/ {contributionsData.length}</span>
          </p>
        </div>
      </div>
      {isLoading ? (
        <div className="p-8 text-center text-slate-500">Chargement des contributions depuis Firestore...</div>
      ) : (
        <DataTable
          data={contributionsData.map((d) => ({ ...d, id: d.membre.id }))}
          columns={columns}
          onView={openHistoriqueView}
        />
      )}

      <AddContributionDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        membres={membres}
        contributions={rawContributions}
        dateDebutCaisse={caisseConfig.dateDebutCaisse}
        montantMensuelDefaut={caisseConfig.cotisationMensuelle}
        onSubmit={handleAddContribution}
      />

      <ViewHistoriqueModal
        isOpen={isViewModalOpen}
        onClose={() => setIsViewModalOpen(false)}
        data={selectedContribution}
      />
    </div>
  );
}