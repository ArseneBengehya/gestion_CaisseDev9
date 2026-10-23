'use client';

import React, { useState, useEffect } from 'react';
import { Receipt, PlusCircle, TrendingDown } from 'lucide-react';
import { Depense } from '@/src/types';
import DataTable, { Column } from '@/src/components/ui/DataTable';
import AddDepenseModal from '@/src/components/modals/AddDepenseModal';
import EditDepenseModal from '@/src/components/modals/EditDepenseModal';
import ViewDepenseModal from '@/src/components/modals/ViewDepenseModal';

// Import Firestore
import {
  collection,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
} from 'firebase/firestore';
import { db } from '@/src/lib/firebase';

export default function DepensesPage() {
  const [depenses, setDepenses] = useState<Depense[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Configuration globale de la caisse
  const [caisseConfig, setCaisseConfig] = useState({
    dateDebutCaisse: '2025-01-01',
  });

  // États d'ouverture des Modals
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [selectedDepense, setSelectedDepense] = useState<Depense | null>(null);

  // 1. LIRE LES PARAMÈTRES DE LA CAISSE (Firestore)
  useEffect(() => {
    const unsubConfig = onSnapshot(doc(db, 'settings', 'caisse_config'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.dateDebutCaisse) {
          setCaisseConfig({ dateDebutCaisse: data.dateDebutCaisse });
        }
      }
    });
    return () => unsubConfig();
  }, []);

  // 2. LIRE LES DÉPENSES DEPUIS FIRESTORE EN TEMPS RÉEL
  useEffect(() => {
    const unsubDepenses = onSnapshot(collection(db, 'depenses'), (snapshot) => {
      const depensesData: Depense[] = snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          motif: data.motif || '',
          montant: data.montant || 0,
          categorie: data.categorie || 'Autre',
          dateDepense: data.dateDepense || new Date().toISOString().split('T')[0],
          approuvePar: data.approuvePar || '',
        };
      }) as Depense[];

      setDepenses(depensesData);
      setIsLoading(false);
    });

    return () => unsubDepenses();
  }, []);

  // 3. AJOUTER UNE DÉPENSE DANS FIRESTORE
  const handleAddDepense = async (newDepenseData: { motif: string; montant: number; categorie: string; approuvePar: string }) => {
    try {
      const nouvelleDepense = {
        motif: newDepenseData.motif,
        montant: newDepenseData.montant,
        categorie: newDepenseData.categorie,
        dateDepense: new Date().toISOString().split('T')[0],
        approuvePar: newDepenseData.approuvePar,
      };

      await addDoc(collection(db, 'depenses'), nouvelleDepense);
      alert(`Dépense de ${newDepenseData.montant.toLocaleString()} FC enregistrée avec succès !`);
    } catch (error) {
      console.error("Erreur lors de l'ajout de la dépense :", error);
      alert("Erreur lors de l'enregistrement de la dépense.");
    }
  };

  // 4. MODIFIER UNE DÉPENSE DANS FIRESTORE
  const handleEditDepense = async (depenseModifiee: Depense) => {
    try {
      const depenseRef = doc(db, 'depenses', depenseModifiee.id);
      await updateDoc(depenseRef, {
        motif: depenseModifiee.motif,
        montant: depenseModifiee.montant,
        categorie: depenseModifiee.categorie,
        approuvePar: depenseModifiee.approuvePar,
      });
      alert('Dépense mise à jour avec succès !');
    } catch (error) {
      console.error("Erreur lors de la modification de la dépense :", error);
      alert("Erreur lors de la mise à jour.");
    }
  };

  // 5. SUPPRIMER UNE DÉPENSE DANS FIRESTORE
  const handleDeleteDepense = async (depense: Depense) => {
    if (confirm(`Voulez-vous vraiment supprimer la dépense : "${depense.motif}" ?`)) {
      try {
        await deleteDoc(doc(db, 'depenses', depense.id));
        alert('Dépense supprimée avec succès !');
      } catch (error) {
        console.error("Erreur lors de la suppression de la dépense :", error);
        alert("Erreur lors de la suppression.");
      }
    }
  };

  const openEdit = (depense: Depense) => {
    setSelectedDepense(depense);
    setIsEditOpen(true);
  };

  const openView = (depense: Depense) => {
    setSelectedDepense(depense);
    setIsViewOpen(true);
  };

  const columns: Column<Depense>[] = [
    {
      header: 'Motif',
      accessor: (item) => (
        <div>
          <p className="font-semibold text-slate-800 dark:text-white">{item.motif}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">Date : {item.dateDepense}</p>
        </div>
      ),
    },
    {
      header: 'Catégorie',
      accessor: (item) => (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
          {item.categorie}
        </span>
      ),
    },
    {
      header: 'Montant',
      accessor: (item) => (
        <span className="font-semibold text-rose-600 dark:text-rose-400">
          -{item.montant.toLocaleString()} FC
        </span>
      ),
    },
    {
      header: 'Approuvé par',
      accessor: (item) => (
        <span className="text-slate-700 dark:text-slate-300">{item.approuvePar}</span>
      ),
    },
  ];

  const totalDepenses = depenses.reduce((acc, curr) => acc + curr.montant, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Gestion des Dépenses</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Suivi des sorties d'argent (Caisse Dev9 lancée le {caisseConfig.dateDebutCaisse}).
          </p>
        </div>
        <button
          onClick={() => setIsAddOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg shadow-sm transition-colors"
        >
          <PlusCircle size={18} />
          Nouvelle Dépense
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Sorties (Dépenses)</p>
            <p className="text-2xl font-bold text-rose-600 dark:text-rose-400 mt-1">{totalDepenses.toLocaleString()} FC</p>
          </div>
          <div className="p-3 bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400 rounded-lg"><TrendingDown size={22} /></div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Nombre de Dépenses</p>
            <p className="text-2xl font-bold text-slate-800 dark:text-white mt-1">{depenses.length}</p>
          </div>
          <div className="p-3 bg-blue-50 text-blue-600 dark:text-blue-950/50 dark:text-blue-400 rounded-lg"><Receipt size={22} /></div>
        </div>
      </div>

      {isLoading ? (
        <div className="p-8 text-center text-slate-500">Chargement des dépenses depuis Firestore...</div>
      ) : (
        <DataTable
          data={depenses}
          columns={columns}
          searchKey="motif"
          searchPlaceholder="Rechercher par motif..."
          onView={openView}
          onEdit={openEdit}
          onDelete={handleDeleteDepense}
        />
      )}

      <AddDepenseModal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        onSubmit={handleAddDepense}
      />

      <EditDepenseModal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        depense={selectedDepense}
        onSubmit={handleEditDepense}
      />

      <ViewDepenseModal
        isOpen={isViewOpen}
        onClose={() => setIsViewOpen(false)}
        depense={selectedDepense}
      />
    </div>
  );
}