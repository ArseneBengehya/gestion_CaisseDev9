'use client';

import React, { useState, useEffect } from 'react';
import { HandCoins, PlusCircle, CheckCircle, Clock, Edit } from 'lucide-react';
import { Emprunt, Membre } from '@/src/types';
import DataTable, { Column } from '@/src/components/ui/DataTable';
import AddEmpruntModal from '@/src/components/modals/AddEmpruntModal';
import EditEmpruntModal from '@/src/components/modals/EditEmpruntModal';

// Import Firestore
import {
  collection,
  onSnapshot,
  addDoc,
  updateDoc,
  doc,
} from 'firebase/firestore';
import { db } from '@/src/lib/firebase';

export default function EmpruntsPage() {
  const [emprunts, setEmprunts] = useState<Emprunt[]>([]);
  const [membres, setMembres] = useState<Membre[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedEmprunt, setSelectedEmprunt] = useState<Emprunt | null>(null);

  // 1. ÉCOUTER LES MEMBRES DEPUIS FIRESTORE
  useEffect(() => {
    const unsubMembres = onSnapshot(collection(db, 'membres'), (snapshot) => {
      const membresList: Membre[] = snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          nom: data.nom || '',
          prenom: data.prenom || '',
          nomComplet: data.nomComplet || `${data.prenom || ''} ${data.nom || ''}`.trim(),
          telephone: data.telephone || '',
          statut: data.statut || 'ACTIF',
        } as Membre;
      });
      setMembres(membresList);
    });

    return () => unsubMembres();
  }, []);

  // 2. ÉCOUTER LES EMPRUNTS DEPUIS FIRESTORE EN TEMPS RÉEL
  useEffect(() => {
    const unsubEmprunts = onSnapshot(collection(db, 'emprunts'), (snapshot) => {
      const empruntsList: Emprunt[] = snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          membreId: data.membreId || '',
          nomMembre: data.nomMembre || 'Membre',
          montantEmprunte: data.montantEmprunte || 0,
          tauxInteret: data.tauxInteret || 0,
          montantTotalARembourser: data.montantTotalARembourser || 0,
          dateEmprunt: data.dateEmprunt || new Date().toISOString().split('T')[0],
          dateEcheance: data.dateEcheance || '',
          statut: data.statut || 'En cours',
        } as Emprunt;
      });

      setEmprunts(empruntsList);
      setIsLoading(false);
    });

    return () => unsubEmprunts();
  }, []);

  // 3. AJOUTER UN EMPRUNT DANS FIRESTORE
  const handleAddEmprunt = async (data: {
    membreId: string;
    montantEmprunte: number;
    tauxInteret: number;
    dateEcheance: string;
  }) => {
    try {
      const membreTrouve = membres.find((m) => m.id === data.membreId);
      const nomMembre = membreTrouve 
        ? (membreTrouve.nomComplet || `${membreTrouve.prenom} ${membreTrouve.nom}`) 
        : 'Membre Inconnu';
      
      const montantInteret = (data.montantEmprunte * data.tauxInteret) / 100;
      const montantTotalARembourser = data.montantEmprunte + montantInteret;

      await addDoc(collection(db, 'emprunts'), {
        membreId: data.membreId,
        nomMembre,
        montantEmprunte: data.montantEmprunte,
        tauxInteret: data.tauxInteret,
        montantTotalARembourser,
        dateEmprunt: new Date().toISOString().split('T')[0],
        dateEcheance: data.dateEcheance,
        statut: 'En cours',
      });

      alert("Emprunt enregistré avec succès dans Firestore !");
    } catch (error) {
      console.error("Erreur lors de l'ajout de l'emprunt :", error);
      alert("Erreur lors de l'enregistrement de l'emprunt.");
    }
  };

  // 4. MODIFIER UN EMPRUNT DANS FIRESTORE
  const handleEditEmprunt = async (empruntModifie: Emprunt) => {
    try {
      const empruntRef = doc(db, 'emprunts', empruntModifie.id);
      await updateDoc(empruntRef, {
        montantEmprunte: empruntModifie.montantEmprunte,
        tauxInteret: empruntModifie.tauxInteret,
        montantTotalARembourser: empruntModifie.montantTotalARembourser,
        dateEcheance: empruntModifie.dateEcheance,
      });
      alert("Emprunt mis à jour avec succès !");
    } catch (error) {
      console.error("Erreur lors de la modification de l'emprunt :", error);
      alert("Erreur lors de la mise à jour.");
    }
  };

  // 5. CLÔTURER / MARQUER COMME REMBOURSÉ
  const handleMarquerRembourse = async (id: string) => {
    if (confirm("Voulez-vous vraiment marquer cet emprunt comme remboursé (clôturé) ?")) {
      try {
        const empruntRef = doc(db, 'emprunts', id);
        await updateDoc(empruntRef, { statut: 'Remboursé' });
        alert("Emprunt clôturé avec succès !");
      } catch (error) {
        console.error("Erreur lors de la clôture de l'emprunt :", error);
        alert("Erreur lors de la mise à jour du statut.");
      }
    }
  };

  const openEditModal = (emprunt: Emprunt) => {
    setSelectedEmprunt(emprunt);
    setIsEditOpen(true);
  };

  const columns: Column<Emprunt>[] = [
    {
      header: 'Membre',
      accessor: (item) => (
        <div>
          <p className="font-bold text-slate-900 dark:text-white">{item.nomMembre}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">Emprunté le : {item.dateEmprunt}</p>
        </div>
      ),
    },
    {
      header: 'Montant Prêté',
      accessor: (item) => (
        <span className="font-semibold text-blue-600 dark:text-blue-400">
          {item.montantEmprunte.toLocaleString()} FC
        </span>
      ),
    },
    {
      header: 'Total à Rembourser',
      accessor: (item) => (
        <div>
          <span className="font-extrabold text-slate-900 dark:text-white">
            {item.montantTotalARembourser.toLocaleString()} FC
          </span>
          <p className="text-xs text-slate-400">Intérêt : {item.tauxInteret}%</p>
        </div>
      ),
    },
    {
      header: 'Échéance',
      accessor: 'dateEcheance',
    },
    {
      header: 'Statut',
      accessor: (item) => {
        const styles: Record<string, string> = {
          'En cours': 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300',
          Remboursé: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300',
          'En retard': 'bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-300',
        };
        return (
          <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${styles[item.statut] || 'bg-slate-100 text-slate-800'}`}>
            {item.statut}
          </span>
        );
      },
    },
    {
      header: 'Actions',
      accessor: (item) => (
        <div className="flex items-center gap-2">
          {item.statut === 'En cours' && (
            <>
              <button
                onClick={() => openEditModal(item)}
                className="p-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 rounded-lg transition-colors"
                title="Modifier l'emprunt"
              >
                <Edit size={14} />
              </button>
              <button
                onClick={() => handleMarquerRembourse(item.id)}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
              >
                <CheckCircle size={14} /> Clôturer
              </button>
            </>
          )}
        </div>
      ),
    },
  ];

  const totalEncours = emprunts
    .filter((e) => e.statut === 'En cours')
    .reduce((acc, curr) => acc + curr.montantTotalARembourser, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Gestion des Emprunts & Crédits</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Suivez les prêts accordés aux membres de la Caisse Dev9 et les remboursements en temps réel.
          </p>
        </div>
        <button
          onClick={() => setIsAddOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg shadow-sm transition-colors"
        >
          <PlusCircle size={18} />
          Octroyer un Emprunt
        </button>
      </div>

      {/* Cartes KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Créances en cours</p>
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">
              {totalEncours.toLocaleString()} FC
            </p>
          </div>
          <div className="p-3 bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 rounded-lg">
            <HandCoins size={22} />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Total Emprunts Actifs</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
              {emprunts.filter((e) => e.statut === 'En cours').length} Prêt(s)
            </p>
          </div>
          <div className="p-3 bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400 rounded-lg">
            <Clock size={22} />
          </div>
        </div>
      </div>

      {/* Tableau des emprunts */}
      {isLoading ? (
        <div className="p-8 text-center text-slate-500">Chargement des emprunts depuis Firestore...</div>
      ) : (
        <DataTable
          data={emprunts}
          columns={columns}
          searchKey="nomMembre"
          searchPlaceholder="Rechercher par nom de membre..."
        />
      )}

      {/* Modal d'ajout */}
      <AddEmpruntModal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        membres={membres}
        onSubmit={handleAddEmprunt}
      />

      {/* Modal de modification */}
      <EditEmpruntModal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        emprunt={selectedEmprunt}
        onSubmit={handleEditEmprunt}
      />
    </div>
  );
}