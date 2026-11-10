'use client';

import React, { useState, useEffect } from 'react';
import { UserPlus, CheckCircle, AlertCircle, Shield } from 'lucide-react';

// Importation de notre base de données Firestore
import {
  collection,
  onSnapshot,
  setDoc,
  updateDoc,
  deleteDoc,
  doc,
} from 'firebase/firestore';
import { Membre } from '@/src/types';
import DataTable, { Column } from '@/src/components/ui/DataTable';
import Toast from '@/src/components/ui/Toast';
import ConfirmDeleteModal from '@/src/components/ui/ConfirmDeleteModal';
import AddMembreModal from '@/src/components/modals/AddMembreModal';
import EditMembreModal from '@/src/components/modals/EditMembreModal';
import ViewMembreModal from '@/src/components/modals/ViewMembreModal';
import { db } from '@/src/lib/firebase';
import { uploadMemberPhoto } from '@/src/lib/member-photo';

export default function MembresPage() {
  const [membres, setMembres] = useState<Membre[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // État Toast
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

  // Modals
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [selectedMembre, setSelectedMembre] = useState<Membre | null>(null);
  const [memberToDelete, setMemberToDelete] = useState<Membre | null>(null);

  // 1. LIRE LES MEMBRES DEPUIS FIRESTORE EN TEMPS RÉEL
  useEffect(() => {
    const membresRef = collection(db, 'membres');

    const unsubscribe = onSnapshot(
      membresRef,
      (snapshot) => {
        const membresData: Membre[] = snapshot.docs.map((docSnap) => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            nom: data.nom || '',
            prenom: data.prenom || '',
            nomComplet:
              data.nomComplet ||
              `${data.prenom || ''} ${data.nom || ''}`.trim(),
            telephone: data.telephone || '',
            email: data.email || '',
            photoUrl: data.photoUrl || data.avatarUrl || '',
            avatarUrl: data.avatarUrl || data.photoUrl || '',
            motDePasse: data.motDePasse || '',
            statut: data.statut || 'ACTIF',
            role: data.role || 'MEMBRE',
            statutCotisation: data.statutCotisation || 'A jour',
            montantTotalCotise: data.montantTotalCotise || 0,
            detteActuelle: data.detteActuelle || 0,
            moisPayes: data.moisPayes || [],
            avancesMoisFuturs: data.avancesMoisFuturs || 0,
            createdAt: data.createdAt || '',
          } as Membre;
        });

        setMembres(membresData);
        setIsLoading(false);
      },
      (error) => {
        console.error('Erreur de lecture Firestore :', error);
        setIsLoading(false);
        showToast('error', 'Impossible de charger la liste des membres.');
      }
    );

    return () => unsubscribe();
  }, []);

  // 2. AJOUTER UN MEMBRE AVEC VÉRIFICATION DES DOUBLONS (Téléphone / Email)
  const handleAddMembre = async (data: {
    nomComplet: string;
    telephone: string;
    email: string;
    role: 'ADMIN' | 'MEMBRE';
    photoFile: File | null;
    motDePasse: string;
    envoyerWhatsApp: boolean;
  }) => {
    const telephoneClean = data.telephone.trim();
    const emailClean = data.email.trim().toLowerCase();

    // Vérification si le numéro de téléphone existe déjà
    const telephoneExiste = membres.some(
      (m) => m.telephone.trim() === telephoneClean
    );
    if (telephoneExiste) {
      throw new Error(`Impossible d'ajouter le membre car ce numéro (${data.telephone}) est déjà enregistré. Entrez un nouveau numéro.`);
    }

    // Vérification si l'e-mail existe déjà (uniquement si l'e-mail est renseigné)
    if (emailClean) {
      const emailExiste = membres.some(
        (m) => m.email && m.email.trim().toLowerCase() === emailClean
      );
      if (emailExiste) {
        throw new Error(`Impossible d'ajouter le membre car cet e-mail (${data.email}) est déjà enregistré. Entrez un nouvel e-mail.`);
      }
    }

    try {
      const n = data.nomComplet.trim().split(' ');
      const prenom = n[0] || '';
      const nom = n.slice(1).join(' ') || prenom;
      const membreRef = doc(collection(db, 'membres'));

      const photoUrl = data.photoFile
        ? await uploadMemberPhoto(data.photoFile, membreRef.id)
        : '';

      const nouveauMembre = {
        nom,
        prenom,
        nomComplet: data.nomComplet,
        telephone: telephoneClean,
        email: data.email || '',
        photoUrl,
        avatarUrl: photoUrl,
        motDePasse: data.motDePasse,
        statut: 'ACTIF',
        role: data.role || 'MEMBRE',
        statutCotisation: 'A jour',
        montantTotalCotise: 0,
        detteActuelle: 0,
        moisPayes: [],
        avancesMoisFuturs: 0,
        createdAt: new Date().toISOString(),
      };

      await setDoc(membreRef, nouveauMembre);

      if (data.envoyerWhatsApp) {
        try {
          await fetch('/api/relance-whatsapp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              telephone: data.telephone,
              nomComplet: data.nomComplet,
              motDePasse: data.motDePasse,
              role: data.role,
            }),
          });
        } catch (waErr) {
          console.error("Erreur d'envoi WhatsApp :", waErr);
        }
      }

      showToast('success', `Membre ${data.nomComplet} ajouté avec succès !`);
    } catch (error) {
      console.error("Erreur lors de l'ajout du membre :", error);
      const message = error instanceof Error ? error.message : "L'enregistrement a échoué.";
      showToast('error', message);
      throw error; // Propage l'erreur pour que le modal l'affiche dans son encadré rouge
    }
  };

  // 3. MODIFIER UN MEMBRE
  const handleEditMembre = async (
    membreModifie: Membre & { photoFile?: File | null }
  ) => {
    try {
      const membreRef = doc(db, 'membres', membreModifie.id);

      const n = membreModifie.nomComplet
        ? membreModifie.nomComplet.trim().split(' ')
        : [membreModifie.prenom, membreModifie.nom];
      const prenom = n[0] || '';
      const nom = n.slice(1).join(' ') || prenom;
      const nomComplet = membreModifie.nomComplet || `${prenom} ${nom}`;

      const photoUrl = membreModifie.photoFile
        ? await uploadMemberPhoto(membreModifie.photoFile, membreModifie.id)
        : membreModifie.photoUrl || membreModifie.avatarUrl || '';

      await updateDoc(membreRef, {
        nom,
        prenom,
        nomComplet,
        telephone: membreModifie.telephone,
        email: membreModifie.email || '',
        photoUrl,
        avatarUrl: photoUrl,
        statut: membreModifie.statut || 'ACTIF',
        role: membreModifie.role || 'MEMBRE',
      });

      showToast('success', 'Les informations du membre ont été mises à jour !');
    } catch (error) {
      console.error('Erreur lors de la modification :', error);
      showToast('error', 'Impossible de modifier le membre.');
      throw error instanceof Error ? error : new Error('La modification a échoué.');
    }
  };

  // 4. SUPPRIMER UN MEMBRE
  const confirmDeleteMembre = async () => {
    if (!memberToDelete) return;
    try {
      await deleteDoc(doc(db, 'membres', memberToDelete.id));
      showToast('success', 'Membre supprimé avec succès.');
    } catch (error) {
      console.error('Erreur lors de la suppression :', error);
      showToast('error', 'Impossible de supprimer ce membre.');
      throw error;
    }
  };

  // Configuration des colonnes du tableau
  const columns: Column<Membre>[] = [
    {
      header: 'Membre',
      accessor: (item) => {
        const pUrl = item.photoUrl || item.avatarUrl;
        return (
          <div className="flex items-center gap-3">
            {pUrl ? (
              <img
                src={pUrl}
                alt={item.nomComplet}
                className="h-9 w-9 rounded-full object-cover border border-slate-200 dark:border-slate-700"
              />
            ) : (
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400 font-bold text-xs">
                {(item.nomComplet || item.nom || 'M').charAt(0).toUpperCase()}
              </div>
            )}
            <span className="font-bold text-slate-900 dark:text-white">
              {item.nomComplet || `${item.prenom} ${item.nom}`}
            </span>
          </div>
        );
      },
    },
    {
      header: 'Numéro',
      accessor: (item) => (
        <span className="text-slate-600 dark:text-slate-300">
          {item.telephone || '-'}
        </span>
      ),
    },
    {
      header: 'Email',
      accessor: (item) => (
        <span className="text-slate-600 dark:text-slate-300">
          {item.email || '-'}
        </span>
      ),
    },
    {
      header: 'Rôle',
      accessor: (item) => {
        const roleVal = (item as any).role || 'MEMBRE';
        return (
          <span
            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
              roleVal === 'ADMIN'
                ? 'bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-100'
                : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
            }`}
          >
            <Shield size={12} />
            {roleVal}
          </span>
        );
      },
    },
    {
      header: 'Statut',
      accessor: (item) => (
        <span
          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
            item.statut === 'ACTIF'
              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300'
              : 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300'
          }`}
        >
          {item.statut === 'ACTIF' ? (
            <CheckCircle size={12} />
          ) : (
            <AlertCircle size={12} />
          )}
          {item.statut || 'ACTIF'}
        </span>
      ),
    },
  ];

  return (
    <div className="relative space-y-6">
      {/* Toast réutilisable */}
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
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
            Gestion des Membres
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Enregistrez un nouveau membre de la caisse
          </p>
        </div>
        <button
          onClick={() => setIsAddOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white dark:bg-slate-200 dark:text-slate-900 dark:hover:bg-white text-sm font-semibold rounded-lg shadow-sm transition-colors"
        >
          <UserPlus size={18} />
          Nouveau Membre
        </button>
      </div>

      {/* Tableau */}
      {isLoading ? (
        <div className="p-8 text-center text-slate-500">
          Chargement des membres en cours...
        </div>
      ) : (
        <DataTable
          data={membres}
          columns={columns}
          searchKey="nomComplet"
          searchPlaceholder="Rechercher un membre..."
          onView={(item) => {
            setSelectedMembre(item);
            setIsViewOpen(true);
          }}
          onEdit={(item) => {
            setSelectedMembre(item);
            setIsEditOpen(true);
          }}
          onDelete={(item) => setMemberToDelete(item)}
        />
      )}

      {/* Modale de confirmation de suppression réutilisable */}
      <ConfirmDeleteModal
        isOpen={Boolean(memberToDelete)}
        title="Confirmer la suppression du membre"
        itemName={memberToDelete?.nomComplet || memberToDelete?.nom || 'ce membre'}
        onClose={() => setMemberToDelete(null)}
        onConfirm={confirmDeleteMembre}
      />

      {/* Modales Métier */}
      <AddMembreModal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        onSubmit={handleAddMembre}
      />
      <EditMembreModal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        membre={selectedMembre}
        onSubmit={handleEditMembre}
      />
      <ViewMembreModal
        isOpen={isViewOpen}
        onClose={() => setIsViewOpen(false)}
        membre={selectedMembre}
      />
    </div>
  );
}