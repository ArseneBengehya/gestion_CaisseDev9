'use client';

import React, { useState } from 'react';
import { UserPlus, Users, UserCheck, UserX } from 'lucide-react';
import DataTable, { Column } from '@/src/components/ui/DataTable';
import Modal from '@/src/components/ui/Modal';
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
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // États du formulaire d'ajout
  const [formData, setFormData] = useState({
    nom: '',
    prenom: '',
    email: '',
    telephone: '',
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleAddMembre = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nom || !formData.prenom || !formData.telephone) {
      alert('Veuillez remplir les champs obligatoires.');
      return;
    }

    const nouveauMembre: Membre = {
      id: Date.now().toString(),
      nom: formData.nom,
      prenom: formData.prenom,
      email: formData.email || 'non-renseigne@masi.com',
      telephone: formData.telephone,
      dateAdhesion: new Date().toISOString().split('T')[0],
      statut: 'ACTIF',
    };

    setMembres([nouveauMembre, ...membres]);
    setFormData({ nom: '', prenom: '', email: '', telephone: '' });
    setIsAddModalOpen(false);
  };

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
    {
      header: 'Téléphone',
      accessor: 'telephone',
    },
    {
      header: 'Date d\'Adhésion',
      accessor: 'dateAdhesion',
    },
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

  const totalMembres = membres.length;
  const membresActifs = membres.filter((m) => m.statut === 'ACTIF').length;
  const membresInactifs = membres.filter((m) => m.statut === 'INACTIF').length;

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Gestion des Membres</h2>
          <p className="text-sm text-slate-500">Gérez la liste des membres inscrits à la caisse.</p>
        </div>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg shadow-sm transition-colors"
        >
          <UserPlus size={18} />
          Nouveau Membre
        </button>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500">Total Membres</p>
            <p className="text-2xl font-bold text-slate-800 mt-1">{totalMembres}</p>
          </div>
          <div className="p-3 bg-blue-50 text-blue-600 rounded-lg"><Users size={22} /></div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500">Membres Actifs</p>
            <p className="text-2xl font-bold text-emerald-600 mt-1">{membresActifs}</p>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg"><UserCheck size={22} /></div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500">Membres Inactifs</p>
            <p className="text-2xl font-bold text-rose-600 mt-1">{membresInactifs}</p>
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
        onView={(item) => alert(`Vue détaillée de : ${item.nom}`)}
        onEdit={(item) => alert(`Édition de : ${item.nom}`)}
        onDelete={(item) => {
          if (confirm(`Voulez-vous vraiment supprimer ${item.nom} ?`)) {
            setMembres(membres.filter((m) => m.id !== item.id));
          }
        }}
      />

      {/* Modal d'Ajout de Membre */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Ajouter un nouveau membre"
        maxWidth="md"
      >
        <form onSubmit={handleAddMembre} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Nom</label>
            <input
              type="text"
              name="nom"
              required
              value={formData.nom}
              onChange={handleInputChange}
              placeholder="Ex: Cubaka"
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Prénom</label>
            <input
              type="text"
              name="prenom"
              required
              value={formData.prenom}
              onChange={handleInputChange}
              placeholder="Ex: Arsène"
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Email</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              placeholder="Ex: arsene@masi.com"
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Téléphone</label>
            <input
              type="text"
              name="telephone"
              required
              value={formData.telephone}
              onChange={handleInputChange}
              placeholder="Ex: +243..."
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors"
            >
              Enregistrer
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}