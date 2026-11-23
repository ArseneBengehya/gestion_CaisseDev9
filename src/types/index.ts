// src/types/index.ts

export type Role = 'ADMIN' | 'MEMBRE' | 'GESTIONNAIRE';
export type StatutCotisation = 'A jour' | 'Retard';

// 1. Structure d'un Membre
export interface Membre {
  id: string;
  nom: string;
  prenom: string;
  nomComplet: string; // Pour les affichages rapides
  email?: string;
  telephone: string;
  avatarUrl?: string; // Ancien nom éventuellement présent dans les documents existants
  photoUrl?: string; // URL de la photo stockée dans Firebase Storage
  role?: Role;
  motDePasse?: string; // Conservé pour compatibilité avec le schéma actuel
  dateAdhesion?: string; // Format ISO: 'YYYY-MM-DD'
  statut: 'ACTIF' | 'INACTIF';
  statutCotisation: StatutCotisation;
  montantTotalCotise: number;
  detteActuelle: number;
  moisPayes: string[];
  avancesMoisFuturs: number;
  createdAt?: string;
}

// 2. Structure d'une Contribution (Cotisation)
export interface Contribution {
  id: string;
  membreId: string;
  membreNomComplet?: string;
  montantTotal?: number;
  montantVerse?: number;
  nombreMoisPayes?: number;
  nombreMois?: number;
  moisCouverts?: string[]; // Exemple: ['2026-09', '2026-10']
  repartition?: AllocationCotisation[];
  typeContribution?: string;
  moisSpecial?: string;
  datePaiement: string;
  modePaiement: 'CASH' | 'MOBILE_MONEY' | 'VIREMENT' | string;
  referenceTransaction?: string;
  note?: string;
}

export type StatutMoisCotisation = 'NON_PAYE' | 'EN_COURS' | 'PAYE';
export type TypeCotisation = 'NORMALE' | 'SPECIALE';

export interface AllocationCotisation {
  mois: string; // Format YYYY-MM
  montantVerse: number;
  type: TypeCotisation;
}

export interface EtatMoisCotisation {
  mois: string;
  montantRequis: number;
  montantPaye: number;
  statut: StatutMoisCotisation;
  type: TypeCotisation;
}

export interface ApercuRepartitionCotisation {
  allocations: AllocationCotisation[];
  moisSoldes: string[];
  moisEnCours?: string;
  montantAvance: number;
  montantRestant: number;
}

// 3. Vue synthétique des contributions d'un membre pour la page Contributions
export interface StatutMembreContribution {
  membre: Membre;
  totalContributionsCount: number;
  montantTotalCotise: number;
  detteActuelle: number;
  moisPayes: string[];        // ex: ['2026-01', '2026-02']
  moisImpayes: string[];      // ex: ['2026-03']
  moisImpayesKeys?: string[]; // Ex: ['2026-03']
  moisFutursPayes: string[];  // ex: ['2026-11', '2026-12']
  dernierPaiementDate?: string;
  historiquePaiements?: {
    mois: string;
    montant: number;
    montantRequis?: number;
    montantPaye?: number;
    statut?: StatutMoisCotisation;
    modePaiement: string;
    datePaiement: string;
  }[];
  etatsMois?: EtatMoisCotisation[];
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
  titre?: string;
  contenu?: string[];
  cotisationMensuelle: number; // Ex: 5000
  cotisationMoisSpecial?: number;
  moisSpecial?: string; // Numéro du mois (1-12), sans année
  moisSpecialActif?: boolean;
  moisSpecialActifDepuis?: string; // Date et heure locales de la dernière activation
  devise: string; // Ex: 'FC', 'USD'
  jourLimitePaiement: number; // Ex: Le 5 de chaque mois
  penaliteRetardActive: boolean;
  moisRetardAvantPenalite: number;
  montantPenalite: number;
  frequenceRappelJours: number; // Ex: Tous les 30 jours
}

// 6. Structure d'un Emprunt
export interface Emprunt {
  id: string;
  membreId: string;
  nomMembre: string;
  montantEmprunte: number;
  tauxInteret: number; // En pourcentage, ex: 5%
  montantTotalARembourser: number; // Montant + Intérêt calculé
  dateEmprunt: string;
  dateEcheance: string;
  statut: 'En attente' | 'En cours' | 'À jour' | 'Remboursé' | 'En retard';
  montantPaye?: number;
  montantRestant?: number;
  dateDernierPaiement?: string;
  createdAt?: string;
}

// Structure d'une Notification pour le membre
export interface NotificationMembre {
  id: string;
  membreId: string; // ID du membre concerné ou "TOUS"
  titre: string;
  message: string;
  type: 'succes' | 'info' | 'alerte';
  date: string;
  lu: boolean;
}

export interface DepenseNotificationData {
  montant: number;
  motif: string;
  approuvePar: string;
}