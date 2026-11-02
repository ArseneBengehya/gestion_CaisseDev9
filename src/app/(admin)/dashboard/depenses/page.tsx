'use client';

import React, { useState, useEffect } from 'react';
import { Receipt, PlusCircle, TrendingDown } from 'lucide-react';
import { Depense } from '@/src/types';
import DataTable, { Column } from '@/src/components/ui/DataTable';
import AddDepenseModal from '@/src/components/modals/AddDepenseModal';
import EditDepenseModal from '@/src/components/modals/EditDepenseModal';
import ViewDepenseModal from '@/src/components/modals/ViewDepenseModal';
import Toast from '@/src/components/ui/Toast';
import ConfirmDeleteModal from '@/src/components/ui/ConfirmDeleteModal';

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

  // États d'ouverture des Modals
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [selectedDepense, setSelectedDepense] = useState<Depense | null>(null);
  const [depenseToDelete, setDepenseToDelete] = useState<Depense | null>(null);

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
      showToast('success', `Dépense de ${newDepenseData.montant.toLocaleString()} FC enregistrée avec succès !`);
      setIsAddOpen(false);
    } catch (error) {
      console.error("Erreur lors de l'ajout de la dépense :", error);
      showToast('error', "Erreur lors de l'enregistrement de la dépense.");
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
      showToast('success', 'Dépense mise à jour avec succès !');
      setIsEditOpen(false);
    } catch (error) {
      console.error("Erreur lors de la modification de la dépense :", error);
      showToast('error', "Erreur lors de la mise à jour.");
    }
  };

  // 5. SUPPRIMER UNE DÉPENSE DANS FIRESTORE
  const confirmDeleteDepense = async () => {
    if (!depenseToDelete) return;
    try {
      await deleteDoc(doc(db, 'depenses', depenseToDelete.id));
      showToast('success', 'Dépense supprimée avec succès !');
      setDepenseToDelete(null);
    } catch (error) {
      console.error("Erreur lors de la suppression de la dépense :", error);
      showToast('error', "Erreur lors de la suppression.");
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
    <div className="relative space-y-6">
      {/* Toast de notification */}
      {toast && (
        <Toast
          type={toast.type}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}

      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Gestion des Dépenses</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Suivi des sorties d'argent (Caisse Dev9 lancée le {caisseConfig.dateDebutCaisse}).
          </p>
        </div>
        <button
          onClick={() => setIsAddOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 text-sm font-semibold rounded-xl shadow-sm transition-colors"
        >
          <PlusCircle size={18} />
          Nouvelle Dépense
        </button>
      </div>

      {/* Cartes KPI redessinées (compatibles et épurées) */}
      <div className="grid grid-cols-2 gap-3">
        <div className="group relative min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm transition-all hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between gap-2">
            <span className="truncate text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Total Sorties</span>
            <div className="shrink-0 rounded-lg bg-slate-100 p-2 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
              <TrendingDown size={18} />
            </div>
          </div>
          <p className="mt-2 text-lg sm:text-xl font-extrabold tabular-nums text-rose-600 dark:text-rose-400 truncate">
            -{totalDepenses.toLocaleString()} <span className="text-xs font-normal text-slate-500">FC</span>
          </p>
        </div>

        <div className="group relative min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm transition-all hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between gap-2">
            <span className="truncate text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Nombre de Dépenses</span>
            <div className="shrink-0 rounded-lg bg-slate-100 p-2 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
              <Receipt size={18} />
            </div>
          </div>
          <p className="mt-2 text-lg sm:text-xl font-extrabold tabular-nums text-slate-900 dark:text-white truncate">
            {depenses.length} <span className="text-xs font-normal text-slate-500">Opération(s)</span>
          </p>
        </div>
      </div>

      {/* Tableau des dépenses */}
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
          onDelete={(item) => setDepenseToDelete(item)}
        />
      )}

      {/* Modale de confirmation de suppression */}
      <ConfirmDeleteModal
        isOpen={Boolean(depenseToDelete)}
        title="Confirmer la suppression de la dépense"
        itemName={depenseToDelete?.motif || 'cette dépense'}
        onClose={() => setDepenseToDelete(null)}
        onConfirm={confirmDeleteDepense}
      />

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