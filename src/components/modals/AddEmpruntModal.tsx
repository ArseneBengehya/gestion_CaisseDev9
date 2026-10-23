'use client';

import React, { useState, useEffect } from 'react';
import { Coins, Calendar, Percent, User, Info } from 'lucide-react';
import { Membre } from '@/src/types';
import Modal from '../ui/Modal';

// Import Firestore pour lire la configuration des paliers
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/src/lib/firebase';

interface PalierPret {
  id: number;
  min: number;
  max: number | string;
  delai: string;
  taux: number;
}

interface AddEmpruntModalProps {
  isOpen: boolean;
  onClose: () => void;
  membres: Membre[];
  onSubmit: (data: {
    membreId: string;
    montantEmprunte: number;
    tauxInteret: number;
    dateEcheance: string;
  }) => void;
}

export default function AddEmpruntModal({
  isOpen,
  onClose,
  membres,
  onSubmit,
}: AddEmpruntModalProps) {
  const [membreId, setMembreId] = useState('');
  const [montant, setMontant] = useState('');
  const [tauxInteret, setTauxInteret] = useState('20'); // Valeur par défaut
  const [dateEcheance, setDateEcheance] = useState('');

  // Configuration des paliers récupérée depuis Firestore
  const [paliers, setPaliers] = useState<PalierPret[]>([
    { id: 1, min: 20000, max: 50000, delai: '1 mois', taux: 20 },
    { id: 2, min: 60000, max: 70000, delai: '2 mois', taux: 15 },
    { id: 3, min: 80000, max: 100000, delai: '3 mois', taux: 10 },
    { id: 4, min: 100000, max: 'Et plus', delai: '4 mois', taux: 5 },
  ]);

  // Écouter les paramètres de la caisse depuis Firestore
  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'caisse_config'), (docSnap) => {
      if (docSnap.exists() && docSnap.data().paliersPrets) {
        setPaliers(docSnap.data().paliersPrets);
      }
    });
    return () => unsub();
  }, []);

  // Détecter le montant saisi et appliquer automatiquement le bon taux
  useEffect(() => {
    const val = parseFloat(montant);
    if (!val || val <= 0) return;

    // Trouver le palier correspondant
    const palierTrouve = paliers.find((p) => {
      const maxVal = typeof p.max === 'number' ? p.max : Infinity;
      return val >= p.min && val <= maxVal;
    });

    if (palierTrouve) {
      setTauxInteret(palierTrouve.taux.toString());
    }
  }, [montant, paliers]);

  const montantNum = parseFloat(montant) || 0;
  const tauxNum = parseFloat(tauxInteret) || 0;
  const montantInteret = (montantNum * tauxNum) / 100;
  const totalARembourser = montantNum + montantInteret;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!membreId || !montant || !dateEcheance) {
      alert('Veuillez remplir tous les champs obligatoires.');
      return;
    }

    onSubmit({
      membreId,
      montantEmprunte: montantNum,
      tauxInteret: tauxNum,
      dateEcheance,
    });

    setMembreId('');
    setMontant('');
    setDateEcheance('');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Octroyer un Emprunt (Caisse Dev9)" maxWidth="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Sélection du membre */}
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
            Membre Emprunteur
          </label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
              <User size={16} />
            </span>
            <select
              required
              value={membreId}
              onChange={(e) => setMembreId(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 font-medium"
            >
              <option value="">Sélectionner un membre...</option>
              {membres.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nomComplet || `${m.prenom} ${m.nom}`} ({m.telephone})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Montant de l'emprunt */}
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
            Montant de l'emprunt (FC)
          </label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
              <Coins size={16} />
            </span>
            <input
              type="number"
              required
              min="1000"
              value={montant}
              onChange={(e) => setMontant(e.target.value)}
              placeholder="Ex: 50000"
              className="w-full pl-9 pr-3 py-2 text-sm text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 font-medium"
            />
          </div>
        </div>

        {/* Taux d'intérêt (Automatique & Modifiable) */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">
              Taux d'intérêt (%)
            </label>
            <span className="text-[11px] text-blue-600 dark:text-blue-400 flex items-center gap-1 font-medium">
              <Info size={12} /> Calculé selon les règles
            </span>
          </div>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
              <Percent size={16} />
            </span>
            <input
              type="number"
              required
              min="0"
              step="0.5"
              value={tauxInteret}
              onChange={(e) => setTauxInteret(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 font-medium"
            />
          </div>
        </div>

        {/* Carte de calcul dynamique de l'intérêt et du total */}
        {montantNum > 0 && (
          <div className="p-4 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 rounded-xl space-y-1">
            <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase">
              Récapitulatif de l'Emprunt
            </p>
            <div className="flex justify-between text-sm text-slate-700 dark:text-slate-300">
              <span>Intérêt ({tauxInteret}%) :</span>
              <span className="font-bold">+{montantInteret.toLocaleString()} FC</span>
            </div>
            <div className="flex justify-between text-base font-extrabold text-blue-700 dark:text-blue-300 pt-1 border-t border-blue-200 dark:border-blue-900">
              <span>Total à rembourser :</span>
              <span>{totalARembourser.toLocaleString()} FC</span>
            </div>
          </div>
        )}

        {/* Date d'échéance */}
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
            Date limite de remboursement (Échéance)
          </label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
              <Calendar size={16} />
            </span>
            <input
              type="date"
              required
              value={dateEcheance}
              onChange={(e) => setDateEcheance(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 font-medium"
            />
          </div>
        </div>

        {/* Boutons d'action */}
        <div className="pt-4 flex justify-end gap-3 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            Annuler
          </button>
          <button
            type="submit"
            className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors"
          >
            Valider l'emprunt
          </button>
        </div>
      </form>
    </Modal>
  );
}