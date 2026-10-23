'use client';

import React, { useState, useEffect } from 'react';
import { Users, UserPlus, CheckCircle, AlertCircle, Shield, User } from 'lucide-react';

// Importation de notre base de données Firestore
import {
  collection,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
} from 'firebase/firestore';
import { Membre } from '@/src/types';
import DataTable, { Column } from '@/src/components/ui/DataTable';
import AddMembreModal from '@/src/components/modals/AddMembreModal';
import EditMembreModal from '@/src/components/modals/EditMembreModal';
import ViewMembreModal from '@/src/components/modals/ViewMembreModal';
import { db } from '@/src/lib/firebase';

export default function MembresPage() {
  const [membres, setMembres] = useState<Membre[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modals
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [selectedMembre, setSelectedMembre] = useState<Membre | null>(null);

  // 1. LIRE LES MEMBRES DEPUIS FIRESTORE EN TEMPS RÉEL
  useEffect(() => {
    const membresRef = collection(db, 'membres');
    
    const unsubscribe = onSnapshot(membresRef, (snapshot) => {
      const membresData: Membre[] = snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          nom: data.nom || '',
          prenom: data.prenom || '',
          nomComplet: data.nomComplet || `${data.prenom || ''} ${data.nom || ''}`.trim(),
          telephone: data.telephone || '',
          email: data.email || '',
          photoUrl: data.photoUrl || '',
          motDePasse: data.motDePasse || '',
          statut: data.statut || 'ACTIF',
          role: data.role || 'MEMBRE',
          statutCotisation: data.statutCotisation || 'A jour',
          montantTotalCotise: data.montantTotalCotise || 0,
          detteActuelle: data.detteActuelle || 0,
          moisPayes: data.moisPayes || [],
          avancesMoisFuturs: data.avancesMoisFuturs || 0,
          createdAt: data.createdAt || '',
        };
      }) as Membre[];

      setMembres(membresData);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // 2. AJOUTER UN MEMBRE, ENREGISTRER SES IDENTIFIANTS ET ENVOYER LE WHATSAPP
  const handleAddMembre = async (data: {
    nomComplet: string;
    telephone: string;
    email: string;
    role: 'ADMIN' | 'MEMBRE';
    photoUrl: string;
    motDePasse: string;
    envoyerWhatsApp: boolean;
  }) => {
    try {
      const n = data.nomComplet.trim().split(' ');
      const prenom = n[0] || '';
      const nom = n.slice(1).join(' ') || prenom;

      const nouveauMembre = {
        nom,
        prenom,
        nomComplet: data.nomComplet,
        telephone: data.telephone,
        email: data.email || '',
        photoUrl: data.photoUrl || '',
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

      // Sauvegarde dans Firestore
      await addDoc(collection(db, 'membres'), nouveauMembre);

      // Envoi du message WhatsApp si la case est cochée
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
          console.error("Erreur d'envoi du message WhatsApp :", waErr);
        }
      }

      alert(`Membre enregistré avec succès ! Mot de passe généré : ${data.motDePasse}`);
    } catch (error) {
      console.error("Erreur lors de l'ajout du membre :", error);
    }
  };

  // 3. MODIFIER UN MEMBRE DANS FIRESTORE
  const handleEditMembre = async (membreModifie: Membre) => {
    try {
      const membreRef = doc(db, 'membres', membreModifie.id);
      
      const n = membreModifie.nomComplet 
        ? membreModifie.nomComplet.trim().split(' ') 
        : [membreModifie.prenom, membreModifie.nom];
      const prenom = n[0] || '';
      const nom = n.slice(1).join(' ') || prenom;
      const nomComplet = membreModifie.nomComplet || `${prenom} ${nom}`;

      await updateDoc(membreRef, {
        nom,
        prenom,
        nomComplet,
        telephone: membreModifie.telephone,
        email: membreModifie.email || '',
        photoUrl: (membreModifie as any).photoUrl || '',
        statut: membreModifie.statut || 'ACTIF',
        role: (membreModifie as any).role || 'MEMBRE',
      });
      alert('Membre mis à jour avec succès !');
    } catch (error) {
      console.error('Erreur lors de la modification :', error);
    }
  };

  // 4. SUPPRIMER UN MEMBRE DANS FIRESTORE
  const handleDeleteMembre = async (membre: Membre) => {
    if (confirm(`Voulez-vous vraiment supprimer ${membre.nomComplet || membre.nom} ?`)) {
      try {
        await deleteDoc(doc(db, 'membres', membre.id));
        alert('Membre supprimé avec succès !');
      } catch (error) {
        console.error('Erreur lors de la suppression :', error);
      }
    }
  };

  // Configuration des colonnes (Avatar + Nom, Numéro, Email, Rôle, Statut)
  const columns: Column<Membre>[] = [
    {
      header: 'Membre',
      accessor: (item) => {
        const pUrl = (item as any).photoUrl;
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
                ? 'bg-purple-100 text-purple-800 dark:bg-purple-950/50 dark:text-purple-300'
                : 'bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300'
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
          {item.statut === 'ACTIF' ? <CheckCircle size={12} /> : <AlertCircle size={12} />}
          {item.statut || 'ACTIF'}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Gestion des Membres</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Base de données Firestore en temps réel & Attribution des accès.
          </p>
        </div>
        <button
          onClick={() => setIsAddOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg shadow-sm transition-colors"
        >
          <UserPlus size={18} />
          Nouveau Membre
        </button>
      </div>

      {isLoading ? (
        <div className="p-8 text-center text-slate-500">Chargement des membres depuis Firestore...</div>
      ) : (
        <DataTable
          data={membres}
          columns={columns}
          searchKey="nomComplet"
          searchPlaceholder="Rechercher un membre..."
          onView={(item) => { setSelectedMembre(item); setIsViewOpen(true); }}
          onEdit={(item) => { setSelectedMembre(item); setIsEditOpen(true); }}
          onDelete={handleDeleteMembre}
        />
      )}

      <AddMembreModal 
        isOpen={isAddOpen} 
        onClose={() => setIsAddOpen(false)} 
        onSubmit={handleAddMembre as any} 
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