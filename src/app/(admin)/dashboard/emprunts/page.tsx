'use client';

import React, { useState, useEffect } from 'react';
import { HandCoins, PlusCircle, CheckCircle, Clock, Edit } from 'lucide-react';
import { Emprunt, Membre } from '@/src/types';
import DataTable, { Column } from '@/src/components/ui/DataTable';
import AddEmpruntModal from '@/src/components/modals/AddEmpruntModal';
import EditEmpruntModal from '@/src/components/modals/EditEmpruntModal';
import Toast from '@/src/components/ui/Toast';

// Import Firestore
import {
  collection,
  onSnapshot,
  addDoc,
  updateDoc,
  doc,
} from 'firebase/firestore';
import { db } from '@/src/lib/firebase';
import { addNotification } from '@/src/services/dbService';

export default function EmpruntsPage() {
  const [emprunts, setEmprunts] = useState<Emprunt[]>([]);
  const [membres, setMembres] = useState<Membre[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedEmprunt, setSelectedEmprunt] = useState<Emprunt | null>(null);

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
          photoUrl: data.photoUrl || data.avatarUrl || '',
          avatarUrl: data.avatarUrl || '',
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
      await addNotification({
        membreId: 'TOUS',
        titre: 'Nouvel emprunt',
        message: `Un emprunt de ${data.montantEmprunte.toLocaleString()} FC a été enregistré pour ${nomMembre}.`,
        type: 'info',
      });

      showToast('success', "Emprunt enregistré avec succès dans Firestore !");
      setIsAddOpen(false);
    } catch (error) {
      console.error("Erreur lors de l'ajout de l'emprunt :", error);
      showToast('error', "Erreur lors de l'enregistrement de l'emprunt.");
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
      showToast('success', "Emprunt mis à jour avec succès !");
      setIsEditOpen(false);
    } catch (error) {
      console.error("Erreur lors de la modification de l'emprunt :", error);
      showToast('error', "Erreur lors de la mise à jour.");
    }
  };

  // 5. CLÔTURER / MARQUER COMME REMBOURSÉ
  const handleMarquerRembourse = async (id: string) => {
    try {
      const empruntRef = doc(db, 'emprunts', id);
      await updateDoc(empruntRef, { statut: 'Remboursé' });
      showToast('success', "Emprunt clôturé avec succès !");
    } catch (error) {
      console.error("Erreur lors de la clôture de l'emprunt :", error);
      showToast('error', "Erreur lors de la mise à jour du statut.");
    }
  };

  const openEditModal = (emprunt: Emprunt) => {
    setSelectedEmprunt(emprunt);
    setIsEditOpen(true);
  };

  const columns: Column<Emprunt>[] = [
    {
      header: 'Membre',
      accessor: (item) => {
        const membreLie = membres.find((membre) => membre.id === item.membreId);
        const photoUrl = membreLie?.photoUrl || membreLie?.avatarUrl;
        return (
          <div className="flex items-center gap-3">
            {photoUrl ? (
              <img src={photoUrl} alt={`Photo de ${item.nomMembre}`} className="h-9 w-9 shrink-0 rounded-full border border-slate-200 object-cover dark:border-slate-700" />
            ) : (
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                {(item.nomMembre || 'M').charAt(0).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <p className="font-bold text-slate-900 dark:text-white">{item.nomMembre}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Emprunté le : {item.dateEmprunt}</p>
            </div>
          </div>
        );
      },
    },
    {
      header: 'Montant Prêté',
      accessor: (item) => (
        <span className="font-semibold text-slate-900 dark:text-white">
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
          'En cours': 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200',
          Remboursé: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300',
          'En retard': 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300',
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
                className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 rounded-lg transition-colors"
                title="Modifier l'emprunt"
              >
                <Edit size={14} />
              </button>
              <button
                onClick={() => handleMarquerRembourse(item.id)}
                className="flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
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
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Gestion des Emprunts & Crédits</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Suivez les prêts accordés aux membres de la Caisse Dev9 et les remboursements en temps réel.
          </p>
        </div>
        <button
          onClick={() => setIsAddOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 text-sm font-semibold rounded-xl shadow-sm transition-colors"
        >
          <PlusCircle size={18} />
          Octroyer un Emprunt
        </button>
      </div>

      {/* Cartes KPI redessinées (plus compactes et épurées) */}
      <div className="grid grid-cols-2 gap-3">
        <div className="group relative min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm transition-all hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between gap-2">
            <span className="truncate text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Créances en cours</span>
            <div className="shrink-0 rounded-lg bg-slate-100 p-2 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
              <HandCoins size={18} />
            </div>
          </div>
          <p className="mt-2 text-lg sm:text-xl font-extrabold tabular-nums text-slate-900 dark:text-white truncate">
            {totalEncours.toLocaleString()} <span className="text-xs font-normal text-slate-500">FC</span>
          </p>
        </div>

        <div className="group relative min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm transition-all hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between gap-2">
            <span className="truncate text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Emprunts Actifs</span>
            <div className="shrink-0 rounded-lg bg-slate-100 p-2 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
              <Clock size={18} />
            </div>
          </div>
          <p className="mt-2 text-lg sm:text-xl font-extrabold tabular-nums text-slate-900 dark:text-white truncate">
            {emprunts.filter((e) => e.statut === 'En cours').length} <span className="text-xs font-normal text-slate-500">Prêt(s)</span>
          </p>
        </div>
      </div>

      {/* Tableau des emprunts */}
      {isLoading ? (
        <div className="p-8 text-center text-slate-500">Chargement des emprunts...</div>
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