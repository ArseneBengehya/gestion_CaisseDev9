'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { HandCoins, PlusCircle, Clock, Edit, Banknote } from 'lucide-react';
import { Emprunt, Membre } from '@/src/types';
import DataTable, { Column } from '@/src/components/ui/DataTable';
import AddEmpruntModal from '@/src/components/modals/AddEmpruntModal';
import EditEmpruntModal from '@/src/components/modals/EditEmpruntModal';
import PayEmpruntModal from '@/src/components/modals/PayEmpruntModal';
import Toast from '@/src/components/ui/Toast';
import ExportCsvButton from '@/src/components/ui/ExportCsvButton';

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
import type { CsvColumn } from '@/src/lib/export-csv';
import PageSkeleton from '@/src/components/ui/PageSkeleton';
import {
  dateEcheanceSelonDelai,
  enregistrerPaiementEmprunt,
  PalierPret,
  PALIERS_PRETS_PAR_DEFAUT,
  trouverPalierPret,
} from '@/src/lib/loans';

export default function EmpruntsPage() {
  const [emprunts, setEmprunts] = useState<Emprunt[]>([]);
  const [membres, setMembres] = useState<Membre[]>([]);
  const [paliers, setPaliers] = useState<PalierPret[]>(PALIERS_PRETS_PAR_DEFAUT);
  const [isLoading, setIsLoading] = useState(true);
  const [isPaying, setIsPaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(Date.now());

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isPayOpen, setIsPayOpen] = useState(false);
  const [selectedEmprunt, setSelectedEmprunt] = useState<Emprunt | null>(null);

  // État Toast pour les notifications
  const [toast, setToast] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const showToast = useCallback((type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => {
      setToast(null);
    }, 5000);
  }, []);

  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, 'settings', 'caisse_config'), (snapshot) => {
      if (!snapshot.exists()) return;
      const data = snapshot.data();
      if (Array.isArray(data.paliersPrets)) setPaliers(data.paliersPrets as PalierPret[]);
    }, (error) => {
      console.error('Erreur de chargement des règles d’emprunt :', error);
      showToast('error', 'Impossible de charger les règles d’emprunt.');
    });
    return () => unsubscribe();
  }, [showToast]);

  useEffect(() => {
    const intervalId = window.setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => window.clearInterval(intervalId);
  }, []);

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
        const montantTotalARembourser = Number(data.montantTotalARembourser) || 0;
        const montantPaye = Number(data.montantPaye ?? (data.statut === 'Remboursé' ? montantTotalARembourser : 0)) || 0;
        const montantRestant = Math.max(0, montantTotalARembourser - montantPaye);
        const statut: Emprunt['statut'] = montantRestant === 0
          ? 'À jour'
          : montantPaye > 0
            ? 'En cours'
            : data.statut === 'En retard'
              ? 'En retard'
              : 'En attente';
        return {
          id: docSnap.id,
          membreId: data.membreId || '',
          nomMembre: data.nomMembre || 'Membre',
          montantEmprunte: data.montantEmprunte || 0,
          tauxInteret: data.tauxInteret || 0,
          montantTotalARembourser,
          montantPaye,
          montantRestant,
          dateDernierPaiement: data.dateDernierPaiement || '',
          createdAt: data.createdAt || data.dateEmprunt || '',
          dateEmprunt: data.dateEmprunt || data.createdAt || '',
          dateEcheance: data.dateEcheance || '',
          statut,
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
      const palier = trouverPalierPret(data.montantEmprunte, paliers);
      if (!palier || palier.taux !== data.tauxInteret) {
        throw new Error('Le montant ou le taux ne respecte pas les règles configurées.');
      }
      const dateMaximale = dateEcheanceSelonDelai(palier.delai);
      if (dateMaximale && data.dateEcheance > dateMaximale) {
        throw new Error(`L’échéance doit respecter le délai configuré de ${palier.delai}.`);
      }
      const membreTrouve = membres.find((m) => m.id === data.membreId);
      const nomMembre = membreTrouve 
        ? (membreTrouve.nomComplet || `${membreTrouve.prenom} ${membreTrouve.nom}`) 
        : 'Membre Inconnu';
      
      const montantInteret = (data.montantEmprunte * data.tauxInteret) / 100;
      const montantTotalARembourser = data.montantEmprunte + montantInteret;
      const dateEmprunt = new Date().toISOString();

      await addDoc(collection(db, 'emprunts'), {
        membreId: data.membreId,
        nomMembre,
        montantEmprunte: data.montantEmprunte,
        tauxInteret: data.tauxInteret,
        montantTotalARembourser,
        montantPaye: 0,
        montantRestant: montantTotalARembourser,
        createdAt: dateEmprunt,
        dateEmprunt,
        dateEcheance: data.dateEcheance,
        statut: 'En attente',
      });
      await addNotification({
        membreId: 'TOUS',
        titre: 'Nouvel emprunt',
        message: `Un emprunt de ${data.montantEmprunte.toLocaleString()} FC a été enregistré pour ${nomMembre}.`,
        type: 'info',
      });

      showToast('success', "Emprunt enregistré avec succès !");
      setIsAddOpen(false);
    } catch (error) {
      console.error("Erreur lors de l'ajout de l'emprunt :", error);
      showToast('error', error instanceof Error ? error.message : "Erreur lors de l'enregistrement de l'emprunt.");
    }
  };

  // 4. MODIFIER UN EMPRUNT DANS FIRESTORE
  const handleEditEmprunt = async (empruntModifie: Emprunt) => {
    try {
      const dateCreation = selectedEmprunt
        ? Date.parse(selectedEmprunt.createdAt || selectedEmprunt.dateEmprunt)
        : Number.NaN;
      const delaiDepuisCreation = currentTime - dateCreation;
      if (!selectedEmprunt || !Number.isFinite(dateCreation) || delaiDepuisCreation < 0 || delaiDepuisCreation > 120_000) {
        setIsEditOpen(false);
        throw new Error("Le délai de modification de deux minutes est dépassé.");
      }
      const palier = trouverPalierPret(empruntModifie.montantEmprunte, paliers);
      if (!palier || palier.taux !== empruntModifie.tauxInteret) {
        throw new Error('Le montant ou le taux ne respecte pas les règles configurées.');
      }
      const dateMaximale = dateEcheanceSelonDelai(palier.delai, new Date(selectedEmprunt.createdAt || selectedEmprunt.dateEmprunt));
      if (dateMaximale && empruntModifie.dateEcheance > dateMaximale) {
        throw new Error(`L’échéance doit respecter le délai configuré de ${palier.delai}.`);
      }
      const montantRestant = Math.max(0, empruntModifie.montantTotalARembourser - (selectedEmprunt.montantPaye || 0));
      if (empruntModifie.montantTotalARembourser < (selectedEmprunt.montantPaye || 0)) {
        throw new Error('Le nouveau total ne peut pas être inférieur au montant déjà payé.');
      }
      const empruntRef = doc(db, 'emprunts', empruntModifie.id);
      await updateDoc(empruntRef, {
        montantEmprunte: empruntModifie.montantEmprunte,
        tauxInteret: empruntModifie.tauxInteret,
        montantTotalARembourser: empruntModifie.montantTotalARembourser,
        montantRestant,
        statut: montantRestant === 0
          ? 'À jour'
          : (selectedEmprunt.montantPaye || 0) > 0
            ? 'En cours'
            : 'En attente',
        dateEcheance: empruntModifie.dateEcheance,
      });
      showToast('success', "Emprunt mis à jour avec succès !");
      setIsEditOpen(false);
    } catch (error) {
      console.error("Erreur lors de la modification de l'emprunt :", error);
      showToast('error', error instanceof Error ? error.message : "Erreur lors de la mise à jour.");
    }
  };

  const handlePayEmprunt = async (empruntId: string, montantVerse: number, modePaiement: string) => {
    setIsPaying(true);
    try {
      const paiement = await enregistrerPaiementEmprunt(empruntId, montantVerse, modePaiement);
      showToast('success', `Paiement de ${montantVerse.toLocaleString('fr-FR')} FC enregistré pour ${paiement.nomMembre}.`);
      setIsPayOpen(false);
      try {
        await addNotification({
          membreId: 'TOUS',
          titre: 'Remboursement d’emprunt enregistré',
          message: `${paiement.nomMembre} a remboursé ${montantVerse.toLocaleString('fr-FR')} FC (${modePaiement}).`,
          type: 'succes',
        });
      } catch (notificationError) {
        console.error('Erreur lors de la notification du remboursement :', notificationError);
        showToast('error', 'Paiement enregistré, mais la notification n’a pas pu être envoyée.');
      }
    } catch (error) {
      console.error('Erreur lors de l’enregistrement du remboursement :', error);
      showToast('error', error instanceof Error ? error.message : 'Impossible d’enregistrer le remboursement.');
    } finally {
      setIsPaying(false);
    }
  };

  const openEditModal = (emprunt: Emprunt) => {
    if (currentTime - Date.parse(emprunt.createdAt || emprunt.dateEmprunt) > 120_000) {
      showToast('error', 'Le délai de modification de deux minutes est dépassé.');
      return;
    }
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
              <p className="text-xs text-slate-500 dark:text-slate-400">Emprunté le : {new Date(item.dateEmprunt).toLocaleDateString('fr-FR')}</p>
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
          <p className="text-xs text-slate-400">Payé : {(item.montantPaye || 0).toLocaleString()} FC · Solde : {(item.montantRestant ?? item.montantTotalARembourser).toLocaleString()} FC</p>
          {item.dateDernierPaiement && <p className="text-xs text-slate-400">Dernier paiement : {new Date(item.dateDernierPaiement).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}</p>}
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
          'En attente': 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300',
          'À jour': 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300',
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
    // {
    //   header: 'Actions',
    //   accessor: (item) => {
    //     const dateCreation = Date.parse(item.createdAt || item.dateEmprunt);
    //     const estModifiable = Number.isFinite(dateCreation) && currentTime - dateCreation <= 120_000 && currentTime >= dateCreation;
    //     const solde = item.montantRestant ?? item.montantTotalARembourser;
    //     return (
    //     <div className="flex items-center gap-2">
    //       {solde > 0 && (
    //         <>
    //           {estModifiable && (
    //           <button
    //             onClick={() => openEditModal(item)}
    //             className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 rounded-lg transition-colors"
    //             title="Modification disponible pendant deux minutes"
    //           >
    //             <Edit size={14} />
    //           </button>
    //           )}
    //           <button
    //             onClick={() => setIsPayOpen(true)}
    //             className="flex items-center gap-1.5 rounded-lg bg-blue-500 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
    //           >
    //             <Banknote size={14} /> Payer
    //           </button>
    //         </>
    //       )}
    //     </div>
    //     );
    //   },
    // },
  ];

  const totalEncours = emprunts
    .reduce((acc, curr) => acc + (curr.montantRestant ?? curr.montantTotalARembourser), 0);

  const exportColumns: CsvColumn<Emprunt>[] = [
    { header: 'Membre', value: (emprunt) => emprunt.nomMembre },
    { header: 'Montant emprunté (FC)', value: (emprunt) => emprunt.montantEmprunte },
    { header: 'Taux (%)', value: (emprunt) => emprunt.tauxInteret },
    { header: 'Total à rembourser (FC)', value: (emprunt) => emprunt.montantTotalARembourser },
    { header: 'Montant payé (FC)', value: (emprunt) => emprunt.montantPaye ?? 0 },
    { header: 'Solde restant (FC)', value: (emprunt) => emprunt.montantRestant ?? emprunt.montantTotalARembourser },
    { header: 'Date emprunt', value: (emprunt) => emprunt.dateEmprunt },
    { header: 'Date échéance', value: (emprunt) => emprunt.dateEcheance },
    { header: 'Dernier paiement', value: (emprunt) => emprunt.dateDernierPaiement || '—' },
    { header: 'Statut', value: (emprunt) => emprunt.statut },
  ];

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
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => setIsAddOpen(true)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-500 hover:bg-blue-600 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 text-sm font-semibold rounded-xl shadow-sm transition-colors"
          >
            <PlusCircle size={18} /> Emprunter
          </button>
          <button
            onClick={() => setIsPayOpen(true)}
            disabled={emprunts.every((emprunt) => (emprunt.montantRestant ?? emprunt.montantTotalARembourser) <= 0)}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 shadow-sm transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:hover:bg-slate-800"
          >
            <Banknote size={18} /> Payer
          </button>
          <ExportCsvButton
            filename="rapport-emprunts"
            columns={exportColumns}
            rows={emprunts}
            label="Exporter"
            disabled={isLoading}
          />
        </div>
      </div>

      {isLoading ? (
        <PageSkeleton layout="cards-table" cards={2} columns={6} rows={6} />
      ) : (
        <>
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
            {emprunts.filter((e) => (e.montantRestant ?? e.montantTotalARembourser) > 0).length} <span className="text-xs font-normal text-slate-500">Prêt(s)</span>
          </p>
        </div>
      </div>

      {/* Tableau des emprunts */}
        <DataTable
          data={emprunts}
          columns={columns}
          searchKey="nomMembre"
          searchPlaceholder="Rechercher par nom de membre..."
        />

        </>
      )}

      {/* Modal d'ajout */}
      <AddEmpruntModal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        membres={membres}
        paliers={paliers}
        onSubmit={handleAddEmprunt}
      />

      {/* Modal de modification */}
      <EditEmpruntModal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        emprunt={selectedEmprunt}
        paliers={paliers}
        onSubmit={handleEditEmprunt}
      />
      <PayEmpruntModal
        isOpen={isPayOpen}
        onClose={() => setIsPayOpen(false)}
        emprunts={emprunts}
        isSubmitting={isPaying}
        onSubmit={handlePayEmprunt}
      />
    </div>
  );
}