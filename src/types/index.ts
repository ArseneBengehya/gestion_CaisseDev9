// src/types/index.ts

export type Role = 'ADMIN' | 'MEMBRE' | 'GESTIONNAIRE';

// 1. Structure d'un Membre
export interface Membre {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  telephone: string;
  avatarUrl?: string;
  dateAdhesion: string; // Format ISO: 'YYYY-MM-DD'
  statut: 'ACTIF' | 'INACTIF';
}

// 2. Structure d'une Contribution (Cotisation)
export interface Contribution {
  id: string;
  membreId: string;
  membreNomComplet?: string; // Utile pour l'affichage rapide dans les tableaux
  montantTotal: number;
  nombreMoisPayes: number;
  moisCouverts: string[]; // Exemple: ['2026-09', '2026-10']
  datePaiement: string;
  modePaiement: 'CASH' | 'MOBILE_MONEY' | 'VIREMENT';
  referenceTransaction?: string;
  note?: string;
}

// 3. Vue synthétique des contributions d'un membre pour la page Contributions
export interface StatutMembreContribution {
  membre: Membre;
  totalContributionsCount: number;
  montantTotalCotise: number;
  detteActuelle: number;
  moisPayes: string[];        // ex: ['2026-01', '2026-02']
  moisImpayes: string[];      // ex: ['2026-03']
  moisFutursPayes: string[];  // ex: ['2026-11', '2026-12']
  dernierPaiementDate?: string;
}

// 4. Structure d'une Dépense
export interface Depense {
  id: string;
  motif: string;
  montant: number;
  categorie: string; // Ex: 'Événement', 'Logistique', 'Aide sociale'
  dateDepense: string;
  approuvePar: string;
  pieceJustificativeUrl?: string;
}

// 5. Structure des Règles applicatives de la caisse
export interface RegleCaisse {
  id: string;
  cotisationMensuelle: number; // Ex: 5000
  devise: string; // Ex: 'FC', 'USD'
  jourLimitePaiement: number; // Ex: Le 5 de chaque mois
  penaliteRetardActive: boolean;
  montantPenalite: number;
  frequenceRappelJours: number; // Ex: Tous les 30 jours
}