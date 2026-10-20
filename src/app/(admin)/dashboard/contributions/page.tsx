'use client';

import React, { useState } from 'react';
import { PiggyBank, PlusCircle, AlertCircle, CheckCircle } from 'lucide-react';
import { Membre, StatutMembreContribution } from '@/src/types';
import DataTable, { Column } from '@/src/components/ui/DataTable';
import AddContributionDrawer from '@/src/components/modals/AddContributionDrawer';
import ViewHistoriqueModal from '@/src/components/modals/ViewHistoriqueModal';

const mockMembres: Membre[] = [
  { id: '1', nom: 'Bengehya', prenom: 'Arsène', email: 'arsene@example.com', telephone: '+243990000001', dateAdhesion: '2026-01-15', statut: 'ACTIF' },
  { id: '2', nom: 'Mubalama', prenom: 'Sarah', email: 'sarah@example.com', telephone: '+243990000002', dateAdhesion: '2026-02-10', statut: 'ACTIF' },
  { id: '3', nom: 'Kasereka', prenom: 'David', email: 'david@example.com', telephone: '+243990000003', dateAdhesion: '2026-03-01', statut: 'INACTIF' },
];

const initialContributionsData: StatutMembreContribution[] = [
  {
    membre: mockMembres[0],
    totalContributionsCount: 2,
    montantTotalCotise: 10000,
    detteActuelle: 0,
    moisPayes: ['2026-01', '2026-02'],
    moisImpayes: [],
    moisFutursPayes: [],
    dernierPaiementDate: '2026-02-01',
  },
  {
    membre: mockMembres[1],
    totalContributionsCount: 1,
    montantTotalCotise: 5000,
    detteActuelle: 5000,
    moisPayes: ['2026-02'],
    moisImpayes: ['2026-03'],
    moisFutursPayes: [],
    dernierPaiementDate: '2026-02-15',
  },
];

export default function ContributionsPage() {
  const [data, setData] = useState<StatutMembreContribution[]>(initialContributionsData);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedContribution, setSelectedContribution] = useState<StatutMembreContribution | null>(null);

  // Fonction dynamique pour ajouter de nouveaux mois payés
//   const handleAddContribution = (formData: { membreId: string; nombreMois: number; modePaiement: string; note: string }) => {
//     const MONTANT_MENSUEL = 5000;
//     const montantVerse = formData.nombreMois * MONTANT_MENSUEL;

//     setData((prevData) =>
//       prevData.map((item) => {
//         if (item.membre.id === formData.membreId) {
//           // Génération dynamique de faux mois payés pour l'exemple (ex: '2026-03', '2026-04'...)
//           const nouveauxMois = Array.from({ length: formData.nombreMois }, (_, index) => {
//             const moisNum = item.moisPayes.length + index + 1;
//             const moisFormat = moisNum < 10 ? `0${moisNum}` : `${moisNum}`;
//             return `2026-${moisFormat}`;
//           });

//           const updatedMoisPayes = [...item.moisPayes, ...nouveauxMois];
//           const nouveauTotal = item.montantTotalCotise + montantVerse;

//           return {
//             ...item,
//             totalContributionsCount: item.totalContributionsCount + formData.nombreMois,
//             montantTotalCotise: nouveauTotal,
//             moisPayes: updatedMoisPayes,
//             dernierPaiementDate: new Date().toISOString().split('T')[0],
//           };
//         }
//         return item;
//       })
//     );

//     alert(`Contribution de ${montantVerse.toLocaleString()} FC enregistrée avec succès !`);
//   };

// Fonction dynamique pour ajouter ou mettre à jour les contributions
  const handleAddContribution = (formData: { membreId: string; nombreMois: number; modePaiement: string; note: string }) => {
    const MONTANT_MENSUEL = 5000;
    const montantVerse = formData.nombreMois * MONTANT_MENSUEL;

    setData((prevData) => {
      // 1. Vérifier si le membre a déjà une ligne de contribution dans le tableau
      const existeDeja = prevData.some((item) => item.membre.id === formData.membreId);

      if (!existeDeja) {
        // Si le membre n'y est pas encore, on le trouve dans mockMembres et on crée sa ligne
        const membreTrouve = mockMembres.find((m) => m.id === formData.membreId);
        if (!membreTrouve) return prevData;

        const nouveauxMois = Array.from({ length: formData.nombreMois }, (_, index) => {
          const moisNum = index + 1;
          const moisFormat = moisNum < 10 ? `0${moisNum}` : `${moisNum}`;
          return `2026-${moisFormat}`;
        });

        const nouvelleEntree: StatutMembreContribution = {
          membre: membreTrouve,
          totalContributionsCount: formData.nombreMois,
          montantTotalCotise: montantVerse,
          detteActuelle: 0,
          moisPayes: nouveauxMois,
          moisImpayes: [],
          moisFutursPayes: [],
          dernierPaiementDate: new Date().toISOString().split('T')[0],
        };

        return [nouvelleEntree, ...prevData];
      }

      // 2. S'il existe déjà, on met à jour ses données
      return prevData.map((item) => {
        if (item.membre.id === formData.membreId) {
          const nouveauxMois = Array.from({ length: formData.nombreMois }, (_, index) => {
            const moisNum = item.moisPayes.length + index + 1;
            const moisFormat = moisNum < 10 ? `0${moisNum}` : `${moisNum}`;
            return `2026-${moisFormat}`;
          });

          return {
            ...item,
            totalContributionsCount: item.totalContributionsCount + formData.nombreMois,
            montantTotalCotise: item.montantTotalCotise + montantVerse,
            moisPayes: [...item.moisPayes, ...nouveauxMois],
            dernierPaiementDate: new Date().toISOString().split('T')[0],
          };
        }
        return item;
      });
    });

    alert(`Contribution de ${montantVerse.toLocaleString()} FC enregistrée avec succès !`);
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
          <p className="font-semibold text-slate-800">{item.membre.prenom} {item.membre.nom}</p>
          <p className="text-xs text-slate-500">{item.membre.telephone}</p>
        </div>
      ),
    },
    {
      header: 'Total Cotisé',
      accessor: (item) => (
        <span className="font-semibold text-emerald-600">
          {item.montantTotalCotise.toLocaleString()} FC
        </span>
      ),
    },
    {
      header: 'Dette Actuelle',
      accessor: (item) => (
        <span className={`font-semibold ${item.detteActuelle > 0 ? 'text-rose-600' : 'text-slate-400'}`}>
          {item.detteActuelle > 0 ? `${item.detteActuelle.toLocaleString()} FC` : 'Aucune'}
        </span>
      ),
    },
    {
      header: 'Mois Payés',
      accessor: (item) => (
        <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-50 text-blue-700">
          {item.moisPayes.length} mois
        </span>
      ),
    },
    {
      header: 'Avances (Mois Futurs)',
      accessor: (item) => (
        <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-purple-50 text-purple-700">
          {item.moisFutursPayes.length} mois
        </span>
      ),
    },
  ];

  const totalCotisations = data.reduce((acc, curr) => acc + curr.montantTotalCotise, 0);
  const totalDettes = data.reduce((acc, curr) => acc + curr.detteActuelle, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Gestion des Contributions</h2>
          <p className="text-sm text-slate-500">Suivez les cotisations, les avances et les dettes des membres.</p>
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
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500">Total Cotisé</p>
            <p className="text-2xl font-bold text-emerald-600 mt-1">{totalCotisations.toLocaleString()} FC</p>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg"><PiggyBank size={22} /></div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500">Dettes Globales</p>
            <p className="text-2xl font-bold text-rose-600 mt-1">{totalDettes.toLocaleString()} FC</p>
          </div>
          <div className="p-3 bg-rose-50 text-rose-600 rounded-lg"><AlertCircle size={22} /></div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500">Membres à jour</p>
            <p className="text-2xl font-bold text-blue-600 mt-1">
              {data.filter((d) => d.detteActuelle === 0).length} / {data.length}
            </p>
          </div>
          <div className="p-3 bg-blue-50 text-blue-600 rounded-lg"><CheckCircle size={22} /></div>
        </div>
      </div>

      <DataTable
        data={data.map((d) => ({ ...d, id: d.membre.id }))}
        columns={columns}
        onView={openHistoriqueView}
      />

      <AddContributionDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        membres={mockMembres}
        montantMensuelDefaut={5000}
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