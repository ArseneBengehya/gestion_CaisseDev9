'use client';

import React, { useState } from 'react';
import { Receipt, PlusCircle, TrendingDown, Tag, UserCheck } from 'lucide-react';
import { Depense } from '@/src/types';
import DataTable, { Column } from '@/src/components/ui/DataTable';
import AddDepenseModal from '@/src/components/modals/AddDepenseModal';

// Données de démonstration pour les dépenses
const initialDepenses: Depense[] = [
  {
    id: '1',
    motif: 'Achat de registres et stylos pour la caisse',
    montant: 15000,
    categorie: 'Logistique',
    dateDepense: '2026-03-10',
    approuvePar: 'Arsène Bengehya',
  },
  {
    id: '2',
    motif: 'Aide sociale suite au deuil d\'un membre',
    montant: 50000,
    categorie: 'Aide Sociale',
    dateDepense: '2026-03-05',
    approuvePar: 'Comité Directeur',
  },
];

export default function DepensesPage() {
  const [depenses, setDepenses] = useState<Depense[]>(initialDepenses);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Fonction pour ajouter une dépense
  const handleAddDepense = (newDepenseData: { motif: string; montant: number; categorie: string; approuvePar: string }) => {
    const nouvelleDepense: Depense = {
      id: Date.now().toString(),
      motif: newDepenseData.motif,
      montant: newDepenseData.montant,
      categorie: newDepenseData.categorie,
      dateDepense: new Date().toISOString().split('T')[0],
      approuvePar: newDepenseData.approuvePar,
    };

    setDepenses([nouvelleDepense, ...depenses]);
    alert(`Dépense de ${newDepenseData.montant.toLocaleString()} FC enregistrée avec succès !`);
  };

  // Suppression d'une dépense
  const handleDeleteDepense = (depense: Depense) => {
    if (confirm(`Voulez-vous vraiment supprimer la dépense : "${depense.motif}" ?`)) {
      setDepenses(depenses.filter((d) => d.id !== depense.id));
    }
  };

  // Colonnes du tableau
  const columns: Column<Depense>[] = [
    {
      header: 'Motif',
      accessor: (item) => (
        <div>
          <p className="font-semibold text-slate-800">{item.motif}</p>
          <p className="text-xs text-slate-500">Date : {item.dateDepense}</p>
        </div>
      ),
    },
    {
      header: 'Catégorie',
      accessor: (item) => (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
          {item.categorie}
        </span>
      ),
    },
    {
      header: 'Montant',
      accessor: (item) => (
        <span className="font-semibold text-rose-600">
          -{item.montant.toLocaleString()} FC
        </span>
      ),
    },
    {
      header: 'Approuvé par',
      accessor: 'approuvePar',
    },
  ];

  // Calculs statistiques
  const totalDepenses = depenses.reduce((acc, curr) => acc + curr.montant, 0);
  const nombreDepenses = depenses.length;

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Gestion des Dépenses</h2>
          <p className="text-sm text-slate-500">Suivez l'ensemble des sorties d'argent de la caisse.</p>
        </div>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg shadow-sm transition-colors"
        >
          <PlusCircle size={18} />
          Nouvelle Dépense
        </button>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500">Total Sorties (Dépenses)</p>
            <p className="text-2xl font-bold text-rose-600 mt-1">{totalDepenses.toLocaleString()} FC</p>
          </div>
          <div className="p-3 bg-rose-50 text-rose-600 rounded-lg"><TrendingDown size={22} /></div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500">Nombre de Dépenses</p>
            <p className="text-2xl font-bold text-slate-800 mt-1">{nombreDepenses}</p>
          </div>
          <div className="p-3 bg-blue-50 text-blue-600 rounded-lg"><Receipt size={22} /></div>
        </div>
      </div>

      {/* Tableau des Dépenses */}
      <DataTable
        data={depenses}
        columns={columns}
        searchKey="motif"
        searchPlaceholder="Rechercher par motif..."
        onDelete={handleDeleteDepense}
      />

      {/* Modal d'Ajout */}
      <AddDepenseModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSubmit={handleAddDepense}
      />
    </div>
  );
}