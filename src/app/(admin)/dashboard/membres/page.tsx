'use client';

import React, { useState } from 'react';

import { UserPlus, Users, UserCheck, UserX } from 'lucide-react';
import ViewMembreModal from '@/src/components/modals/ViewMembreModal';
import EditMembreModal from '@/src/components/modals/EditMembreModal';
import AddMembreModal from '@/src/components/modals/AddMembreModal';
import DataTable, { Column } from '@/src/components/ui/DataTable';
import { Membre } from '@/src/types';

const initialMembres: Membre[] = [
  {
    id: '1',
    nom: 'Bengehya',
    prenom: 'Arsène',
    email: 'arsene@example.com',
    telephone: '+243990000001',
    dateAdhesion: '2026-01-15',
    statut: 'ACTIF',
  },
  {
    id: '2',
    nom: 'Mubalama',
    prenom: 'Sarah',
    email: 'sarah@example.com',
    telephone: '+243990000002',
    dateAdhesion: '2026-02-10',
    statut: 'ACTIF',
  },
  {
    id: '3',
    nom: 'Kasereka',
    prenom: 'David',
    email: 'david@example.com',
    telephone: '+243990000003',
    dateAdhesion: '2026-03-01',
    statut: 'INACTIF',
  },
];

export default function MembresPage() {
  const [membres, setMembres] = useState<Membre[]>(initialMembres);
  
  // États d'ouverture des Modals
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [selectedMembre, setSelectedMembre] = useState<Membre | null>(null);

  // État du formulaire partagé
  const [formData, setFormData] = useState({
    nom: '',
    prenom: '',
    email: '',
    telephone: '',
    statut: 'ACTIF' as 'ACTIF' | 'INACTIF',
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // 1. Ajouter un membre
  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nom || !formData.prenom || !formData.telephone) return;

    const nouveau: Membre = {
      id: Date.now().toString(),
      nom: formData.nom,
      prenom: formData.prenom,
      email: formData.email || 'non-renseigne@masi.com',
      telephone: formData.telephone,
      dateAdhesion: new Date().toISOString().split('T')[0],
      statut: 'ACTIF',
    };

    setMembres([nouveau, ...membres]);
    setIsAddOpen(false);
  };

  // 2. Modifier un membre
  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMembre) return;

    setMembres(
      membres.map((m) =>
        m.id === selectedMembre.id ? { ...m, ...formData } : m
      )
    );
    setIsEditOpen(false);
  };

  // Handlers pour ouvrir les modals
  const openEdit = (membre: Membre) => {
    setSelectedMembre(membre);
    setFormData({
      nom: membre.nom,
      prenom: membre.prenom,
      email: membre.email,
      telephone: membre.telephone,
      statut: membre.statut,
    });
    setIsEditOpen(true);
  };

  const openView = (membre: Membre) => {
    setSelectedMembre(membre);
    setIsViewOpen(true);
  };

  const handleDelete = (membre: Membre) => {
    if (confirm(`Supprimer ${membre.prenom} ${membre.nom} ?`)) {
      setMembres(membres.filter((m) => m.id !== membre.id));
    }
  };

  // Colonnes de la DataTable
  const columns: Column<Membre>[] = [
    {
      header: 'Membre',
      accessor: (item) => (
        <div>
          <p className="font-semibold text-slate-800">{item.nom} {item.prenom}</p>
          <p className="text-xs text-slate-500">{item.email}</p>
        </div>
      ),
    },
    { header: 'Téléphone', accessor: 'telephone' },
    { header: "Date d'Adhésion", accessor: 'dateAdhesion' },
    {
      header: 'Statut',
      accessor: (item) => (
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            item.statut === 'ACTIF'
              ? 'bg-emerald-100 text-emerald-800'
              : 'bg-rose-100 text-rose-800'
          }`}
        >
          {item.statut}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Gestion des Membres</h2>
          <p className="text-sm text-slate-500">Gérez la liste des membres inscrits à la caisse.</p>
        </div>
        <button
          onClick={() => {
            setFormData({ nom: '', prenom: '', email: '', telephone: '', statut: 'ACTIF' });
            setIsAddOpen(true);
          }}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg shadow-sm transition-colors"
        >
          <UserPlus size={18} />
          Nouveau Membre
        </button>
      </div>

      {/* Cartes de statistiques */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500">Total Membres</p>
            <p className="text-2xl font-bold text-slate-800 mt-1">{membres.length}</p>
          </div>
          <div className="p-3 bg-blue-50 text-blue-600 rounded-lg"><Users size={22} /></div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500">Membres Actifs</p>
            <p className="text-2xl font-bold text-emerald-600 mt-1">
              {membres.filter((m) => m.statut === 'ACTIF').length}
            </p>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg"><UserCheck size={22} /></div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500">Membres Inactifs</p>
            <p className="text-2xl font-bold text-rose-600 mt-1">
              {membres.filter((m) => m.statut === 'INACTIF').length}
            </p>
          </div>
          <div className="p-3 bg-rose-50 text-rose-600 rounded-lg"><UserX size={22} /></div>
        </div>
      </div>

      {/* Tableau */}
      <DataTable
        data={membres}
        columns={columns}
        searchKey="nom"
        searchPlaceholder="Rechercher par nom..."
        onView={openView}
        onEdit={openEdit}
        onDelete={handleDelete}
      />

      {/* Les Modals Réutilisables */}
      <AddMembreModal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        formData={formData}
        onChange={handleInputChange}
        onSubmit={handleAddSubmit}
      />

      <EditMembreModal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        formData={formData}
        onChange={handleInputChange}
        onSubmit={handleEditSubmit}
      />

      <ViewMembreModal
        isOpen={isViewOpen}
        onClose={() => setIsViewOpen(false)}
        membre={selectedMembre}
      />
    </div>
  );
}