'use client';

import React, { useState, useEffect } from 'react';
import { PiggyBank, PlusCircle, AlertCircle, CheckCircle } from 'lucide-react';
import { Membre, StatutMembreContribution } from '@/src/types';
import DataTable, { Column } from '@/src/components/ui/DataTable';
import AddContributionDrawer from '@/src/components/modals/AddContributionDrawer';
import ViewHistoriqueModal from '@/src/components/modals/ViewHistoriqueModal';

// Import Firestore
import {
  collection,
  onSnapshot,
  addDoc,
  doc,
} from 'firebase/firestore';
import { db } from '@/src/lib/firebase';

interface ContributionDoc {
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
    dateDebutCaisse: '2025-01-01',
    cotisationMensuelle: 5000,
    cotisationMoisSpecial: 10000,
  });

  const [isLoading, setIsLoading] = useState(true);

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedContribution, setSelectedContribution] = useState<StatutMembreContribution | null>(null);

  // 1. ÉCOUTER LES PARAMÈTRES DE LA CAISSE (Firestore)
  useEffect(() => {
    const unsubConfig = onSnapshot(doc(db, 'settings', 'caisse_config'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setCaisseConfig({
          dateDebutCaisse: data.dateDebutCaisse || '2025-01-01',
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
      const totalMoisPayes = memberContribs.reduce((sum, c) => sum + (c.nombreMois || 0), 0);

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

  // 5. ENREGISTRER UNE CONTRIBUTION DANS FIRESTORE
  const handleAddContribution = async (formData: { membreId: string; nombreMois: number; modePaiement: string; note: string }) => {
    try {
      const montantVerse = formData.nombreMois * caisseConfig.cotisationMensuelle;

      await addDoc(collection(db, 'contributions'), {
        membreId: formData.membreId,
        nombreMois: formData.nombreMois,
        montantVerse,
        modePaiement: formData.modePaiement,
        note: formData.note,
        datePaiement: new Date().toISOString(),
      });

      alert(`Contribution de ${montantVerse.toLocaleString()} FC enregistrée avec succès !`);
      setIsDrawerOpen(false);
    } catch (error) {
      console.error("Erreur lors de l'enregistrement de la contribution :", error);
      alert("Erreur lors de l'enregistrement.");
    }
  };

  const openHistoriqueView = (item: StatutMembreContribution) => {
    setSelectedContribution(item);
    setIsViewModalOpen(true);
  };

  const columns: Column<StatutMembreContribution>[] = [
    {
      header: 'Membre',
      accessor: (item) => (
        <div>
          <p className="font-semibold text-slate-800 dark:text-white">
            {item.membre.nomComplet || `${item.membre.prenom} ${item.membre.nom}`}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">{item.membre.telephone}</p>
        </div>
      ),
    },
    {
      header: 'Total Cotisé',
      accessor: (item) => (
        <span className="font-semibold text-emerald-600 dark:text-emerald-400">
          {item.montantTotalCotise.toLocaleString()} FC
        </span>
      ),
    },
    {
      header: 'Dette Actuelle',
      accessor: (item) => (
        <span className={`font-semibold ${item.detteActuelle > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-400'}`}>
          {item.detteActuelle > 0 ? `${item.detteActuelle.toLocaleString()} FC` : 'Aucune'}
        </span>
      ),
    },
    {
      header: 'Mois Payés',
      accessor: (item) => (
        <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300">
          {item.moisPayes.length} mois
        </span>
      ),
    },
  ];

  const totalCotisations = contributionsData.reduce((acc, curr) => acc + curr.montantTotalCotise, 0);
  const totalDettes = contributionsData.reduce((acc, curr) => acc + curr.detteActuelle, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Gestion des Contributions</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Suivi basé sur le lancement de la caisse au <strong>{caisseConfig.dateDebutCaisse}</strong> ({caisseConfig.cotisationMensuelle.toLocaleString()} FC/mois).
          </p>
        </div>
        <button
          onClick={() => setIsDrawerOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg shadow-sm transition-colors"
        >
          <PlusCircle size={18} />
          Nouvelle Contribution
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Cotisé</p>
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">{totalCotisations.toLocaleString()} FC</p>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400 rounded-lg"><PiggyBank size={22} /></div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Dettes Globales</p>
            <p className="text-2xl font-bold text-rose-600 dark:text-rose-400 mt-1">{totalDettes.toLocaleString()} FC</p>
          </div>
          <div className="p-3 bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400 rounded-lg"><AlertCircle size={22} /></div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Membres à jour</p>
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">
              {contributionsData.filter((d) => d.detteActuelle === 0).length} / {contributionsData.length}
            </p>
          </div>
          <div className="p-3 bg-blue-50 text-blue-600 dark:bg-blue-400 rounded-lg"><CheckCircle size={22} /></div>
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