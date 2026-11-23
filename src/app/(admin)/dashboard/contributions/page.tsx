'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { PlusCircle, HandCoins } from 'lucide-react';
import type { Membre, StatutMembreContribution } from '@/src/types';
import type { Column } from '@/src/components/ui/DataTable';
import AddContributionDrawer from '@/src/components/modals/AddContributionDrawer';
import PayPenaliteModal, { type MembrePenalite } from '@/src/components/modals/PayPenaliteModal';
import ViewHistoriqueModal from '@/src/components/modals/ViewHistoriqueModal';
import Toast from '@/src/components/ui/Toast';
import SpecialMonthSection, { type ContributionSpeciale } from '@/src/components/contributions/SpecialMonthSection';
import PenaltiesSection, { type PenaliteAvecMembre } from '@/src/components/contributions/PenaltiesSection';
import ContributionTabs, { type ContributionTab } from '@/src/components/contributions/ContributionTabs';
import ContributionsMembersSection, { type ContributionMemberRow } from '@/src/components/contributions/ContributionsMembersSection';
import {
  ContributionMonthRecord,
  DATE_DEBUT_CAISSE_PAR_DEFAUT,
  normaliserDateFirestore,
  obtenirMoisCouvertsParContributions,
} from '@/src/lib/contribution-months';
import {
  enregistrerPaiementPenalite,
  PaiementPenalite,
  Penalite,
  soldePenalite,
} from '@/src/lib/penalties';

// Import Firestore
import {
  collection,
  onSnapshot,
  addDoc,
  doc,
  runTransaction,
} from 'firebase/firestore';
import { db } from '@/src/lib/firebase';
import { addNotification } from '@/src/services/dbService';
import { exportCsv, type CsvColumn } from '@/src/lib/export-csv';
import type { AllocationCotisation } from '@/src/types';
import {
  genererEtatsMoisCotisation,
  normaliserMoisSpecial,
  statutMoisCotisation,
} from '@/src/lib/contribution-payments';

interface ContributionDoc extends ContributionMonthRecord {
  id: string;
  membreId: string;
  nombreMois: number;
  moisSelectionnes?: string[]; // Ex: ["2025-01", "2025-02"] (absent sur les anciennes contributions)
  moisCouverts?: string[];
  montantVerse: number;
  modePaiement: string;
  note: string;
  datePaiement: string;
  typeContribution?: string;
  moisSpecial?: string;
  repartition?: AllocationCotisation[];
}

interface ContributionSpecialDoc {
  id: string;
  membreId: string;
  moisSpecial: string;
  montantVerse: number;
  modePaiement: string;
  note: string;
  datePaiement: string;
}

const MOIS_FR = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];

const makeKey = (year: number, monthIndex: number) =>
  `${year}-${String(monthIndex + 1).padStart(2, '0')}`;

// "2025-01" -> "Janvier 2025"
const labelFromKey = (key: string) => {
  const [y, m] = key.split('-').map(Number);
  return `${MOIS_FR[m - 1]} ${y}`;
};

// Liste des clés de mois entre deux clés incluses (ex: "2025-01" -> "2025-04")
const rangeKeys = (startKey: string, endKey: string) => {
  const result: string[] = [];
  let [y, m] = startKey.split('-').map(Number);
  m -= 1;
  let guard = 0;
  while (makeKey(y, m) <= endKey && guard < 1200) {
    result.push(makeKey(y, m));
    m++;
    if (m > 11) {
      m = 0;
      y++;
    }
    guard++;
  }
  return result;
};

// Mois suivant une clé
const nextKey = (key: string) => {
  let [y, m] = key.split('-').map(Number);
  m -= 1;
  m++;
  if (m > 11) {
    m = 0;
    y++;
  }
  return makeKey(y, m);
};

export default function ContributionsPage() {
  const [activeTab, setActiveTab] = useState<ContributionTab>('cotisations');
  const [membres, setMembres] = useState<Membre[]>([]);
  const [rawContributions, setRawContributions] = useState<ContributionDoc[]>([]);
  const [rawContributionsSpeciales, setRawContributionsSpeciales] = useState<ContributionSpecialDoc[]>([]);
  const [penalites, setPenalites] = useState<Penalite[]>([]);
  const [paiementsPenalites, setPaiementsPenalites] = useState<PaiementPenalite[]>([]);
  const [contributionsData, setContributionsData] = useState<StatutMembreContribution[]>([]);
  const [moisPayesParMembre, setMoisPayesParMembre] = useState<Record<string, string[]>>({});
  const [penalites, setPenalites] = useState<PenaliteData[]>([]);
  const [montantsPaiement, setMontantsPaiement] = useState<Record<string, string>>({});
  const [paiementEnCours, setPaiementEnCours] = useState<string | null>(null);

  // Paramètres globaux de la caisse (récupérés depuis Firestore)
  const [caisseConfig, setCaisseConfig] = useState({
    dateDebutCaisse: DATE_DEBUT_CAISSE_PAR_DEFAUT,
    cotisationMensuelle: 5000,
    cotisationMoisSpecial: 10000,
    moisSpecial: '',
    moisSpecialActif: false,
    moisSpecialActifDepuis: '',
  });
  const [configLoaded, setConfigLoaded] = useState(false);
  const dernierMontantPenaliteSynchro = useRef<number | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isSpecialLoading, setIsSpecialLoading] = useState(true);
  const [isPenaltiesLoading, setIsPenaltiesLoading] = useState(true);

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isPayPenaliteOpen, setIsPayPenaliteOpen] = useState(false);
  const [isSavingPenalitePayment, setIsSavingPenalitePayment] = useState(false);
  const [selectedContribution, setSelectedContribution] = useState<StatutMembreContribution | null>(null);

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

  // 1. ÉCOUTER LES PARAMÈTRES DE LA CAISSE (Firestore)
  useEffect(() => {
    const unsubConfig = onSnapshot(doc(db, 'settings', 'caisse_config'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        const cotisationMensuelle = Number(data.cotisationMensuelle ?? 5000);
        const cotisationMoisSpecial = Number(data.cotisationMoisSpecial ?? 10000);
        setCaisseConfig({
          dateDebutCaisse: data.dateDebutCaisse || DATE_DEBUT_CAISSE_PAR_DEFAUT,
          cotisationMensuelle: data.cotisationMensuelle || 5000,
          cotisationMoisSpecial: data.cotisationMoisSpecial || 10000,
          moisSpecial: normaliserMoisSpecial(typeof data.moisSpecial === 'string' ? data.moisSpecial : ''),
          moisSpecialActif: data.moisSpecialActif === true,
          moisSpecialActifDepuis: data.moisSpecialActif === true && typeof data.moisSpecialActifDepuis === 'string'
            ? data.moisSpecialActifDepuis
            : '',
        });
      }
      setConfigLoaded(true);
    }, (error) => {
      console.error('Erreur de chargement des paramètres de cotisation :', error);
      showToast('error', 'Impossible de charger les paramètres de la caisse.');
    });

    return () => unsubConfig();
  }, []);

  // 2. ÉCOUTER LES MEMBRES FIRESTORE
  useEffect(() => {
    const unsubMembres = onSnapshot(collection(db, 'membres'), (snapshot) => {
      const membresData: Membre[] = snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          nom: data.nom || '',
          prenom: data.prenom || '',
          nomComplet: data.nomComplet || `${data.prenom || ''} ${data.nom || ''}`.trim(),
          telephone: data.telephone || '',
          email: data.email || '',
          photoUrl: data.photoUrl || data.avatarUrl || '',
          avatarUrl: data.avatarUrl || '',
          statut: data.statut || 'ACTIF',
          dateAdhesion: data.createdAt || new Date().toISOString().split('T')[0],
        };
      }) as Membre[];

      setMembres(membresData);
    });

    return () => unsubMembres();
  }, []);

  // 3. ÉCOUTER LES TRANSACTIONS DE CONTRIBUTIONS FIRESTORE
  useEffect(() => {
    const unsubContributions = onSnapshot(collection(db, 'contributions'), (snapshot) => {
      const contribs: ContributionDoc[] = snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          ...data,
          moisCouverts: Array.isArray(data.moisSelectionnes)
            ? data.moisSelectionnes
            : data.moisCouverts,
          datePaiement: normaliserDateFirestore(data.datePaiement),
        };
      }) as ContributionDoc[];

      setRawContributions(contribs);
      setIsLoading(false);
    }, (error) => {
      console.error('Erreur de chargement des contributions :', error);
      showToast('error', 'Impossible de charger les contributions.');
    });

    return () => unsubContributions();
  }, []);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'contributions_speciales'), (snapshot) => {
      setRawContributionsSpeciales(snapshot.docs.map((document) => {
        const data = document.data();
        return {
          id: document.id,
          membreId: data.membreId || '',
          moisSpecial: data.moisSpecial || '',
          montantVerse: Number(data.montantVerse) || 0,
          modePaiement: data.modePaiement || 'Non précisé',
          note: data.note || '',
          datePaiement: normaliserDateFirestore(data.datePaiement),
        };
      }));
      setIsSpecialLoading(false);
    }, (error) => {
      console.error('Erreur de chargement des contributions spéciales :', error);
      setIsSpecialLoading(false);
      showToast('error', 'Impossible de charger les contributions du mois spécial.');
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'penalites'), (snapshot) => {
      setPenalites(snapshot.docs.map((document) => {
        const data = document.data();
        return {
          id: document.id,
          membreId: data.membreId || '',
          moisDeclenchement: Number(data.moisDeclenchement) || 0,
          moisDeclenchementKey: data.moisDeclenchementKey || '',
          montantDu: Number(data.montantDu) || 0,
          montantPaye: Number(data.montantPaye) || 0,
          statut: data.statut || 'A_PAYER',
          dateCreation: data.dateCreation || '',
          dateDernierPaiement: data.dateDernierPaiement,
        };
      }));
      setIsPenaltiesLoading(false);
    }, (error) => {
      console.error('Erreur de chargement des pénalités :', error);
      setIsPenaltiesLoading(false);
      showToast('error', 'Impossible de charger les pénalités.');
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'paiements_penalites'), (snapshot) => {
      setPaiementsPenalites(snapshot.docs.map((document) => {
        const data = document.data();
        return {
          id: document.id,
          membreId: data.membreId || '',
          montantVerse: Number(data.montantVerse) || 0,
          modePaiement: data.modePaiement || 'Non précisé',
          datePaiement: data.datePaiement || '',
          penalites: Array.isArray(data.penalites)
            ? data.penalites.map((allocation: { penaliteId?: string; montantVerse?: number }) => ({
                penaliteId: allocation.penaliteId || '',
                montantVerse: Number(allocation.montantVerse) || 0,
              }))
            : [],
        };
      }));
    }, (error) => {
      console.error('Erreur de chargement des paiements de pénalités :', error);
      showToast('error', 'Impossible de charger l’historique des paiements de pénalités.');
    });

    return () => unsubscribe();
  }, []);

  const contributionsAvecMoisSpecial = useMemo<ContributionDoc[]>(() => [
    ...rawContributions,
    ...rawContributionsSpeciales.map((contribution) => ({
      ...contribution,
      nombreMois: 1,
      moisCouverts: contribution.moisSpecial ? [contribution.moisSpecial] : [],
      modePaiement: contribution.modePaiement,
      typeContribution: 'MOIS_SPECIAL',
    })),
  ], [rawContributions, rawContributionsSpeciales]);

  // 4. FUSIONNER & CALCULER LES TOTAUX & DETTES DYNAMIQUEMENT SELON LA DATE DE DÉBUT
  useEffect(() => {
    if (membres.length === 0) return;

    const dateCourante = new Date();
    const moisActuel = `${dateCourante.getFullYear()}-${String(dateCourante.getMonth() + 1).padStart(2, '0')}`;
    const montantMensuel = caisseConfig.cotisationMensuelle;

    const paidMap: Record<string, string[]> = {};

    const computed: StatutMembreContribution[] = membres.map((membre) => {
      const memberContribs = contributionsAvecMoisSpecial.filter(
        (contribution) => contribution.membreId === membre.id
      );

      const montantTotalCotise = memberContribs.reduce((sum, c) => sum + (c.montantVerse || 0), 0);
      
      const monthStates = genererEtatsMoisCotisation(
        memberContribs,
        caisseConfig.dateDebutCaisse,
        moisActuel,
        montantMensuel,
        caisseConfig.moisSpecial,
        caisseConfig.cotisationMoisSpecial,
        120,
        caisseConfig.moisSpecialActifDepuis
      );
      const moisParContribution = obtenirMoisCouvertsParContributions(memberContribs, caisseConfig.dateDebutCaisse);
      const moisCouverts = new Set(monthStates.filter((month) => month.statut === 'PAYE').map((month) => month.mois));
      const moisPayes = Array.from(moisCouverts)
        .sort()
        .map((mois) => {
          const [year, month] = mois.split('-').map(Number);
          return new Date(year, month - 1, 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
        });
      const moisFutursPayes = Array.from(moisCouverts)
        .filter((mois) => mois > moisActuel)
        .sort()
        .map((mois) => {
          const [year, month] = mois.split('-').map(Number);
          return new Date(year, month - 1, 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
        });
      const moisImpayesStates = monthStates.filter((month) => month.mois <= moisActuel && month.statut !== 'PAYE');
      const moisImpayes = moisImpayesStates.map(({ mois }) => {
        const [year, month] = mois.split('-').map(Number);
        return new Date(year, month - 1, 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
      });
      const detteActuelle = moisImpayesStates.reduce(
        (total, month) => total + Math.max(0, month.montantRequis - month.montantPaye),
        0
      );
      const monthStatesByKey = new Map(monthStates.map((month) => [month.mois, month]));
      const historiquePaiements = moisParContribution
        .flatMap((moisCouvertsContribution, index) => {
          const contribution = memberContribs[index];
          if (Array.isArray(contribution.repartition)) {
            return contribution.repartition.map((allocation) => ({
              mois: allocation.mois,
              montant: Number(allocation.montantVerse) || 0,
              montantRequis: monthStatesByKey.get(allocation.mois)?.montantRequis,
              montantPaye: monthStatesByKey.get(allocation.mois)?.montantPaye,
              statut: monthStatesByKey.get(allocation.mois)?.statut,
              modePaiement: contribution.modePaiement || 'Non précisé',
              datePaiement: normaliserDateFirestore(contribution.datePaiement),
            }));
          }
          if (moisCouvertsContribution.length === 0) return [];
          const montantParMois = Math.round((Number(contribution.montantVerse) || 0) / moisCouvertsContribution.length);
          return moisCouvertsContribution.map((mois) => ({
            mois,
            montant: montantParMois,
            montantRequis: monthStatesByKey.get(mois)?.montantRequis,
            montantPaye: monthStatesByKey.get(mois)?.montantPaye,
            statut: monthStatesByKey.get(mois)?.statut,
            modePaiement: contribution.modePaiement || 'Non précisé',
            datePaiement: normaliserDateFirestore(contribution.datePaiement),
          }));
        })
        .sort((a, b) => Date.parse(b.datePaiement) - Date.parse(a.datePaiement));

      return {
        membre,
        totalContributionsCount: memberContribs.length,
        montantTotalCotise,
        detteActuelle,
        moisPayes,
        moisImpayes,
        moisFutursPayes,
        historiquePaiements,
        etatsMois: monthStates.filter((month) => month.mois <= moisActuel || month.statut === 'PAYE'),
        dernierPaiementDate: historiquePaiements[0]?.datePaiement
          ? new Date(historiquePaiements[0].datePaiement).toLocaleDateString('fr-FR')
          : '-',
      };
    });

    setMoisPayesParMembre(paidMap);
    setContributionsData(computed);
  }, [membres, contributionsAvecMoisSpecial, caisseConfig]);

  // 5. ENREGISTRER UNE CONTRIBUTION DANS FIRESTORE (Utilisation de Toast)
  const handleAddContribution = async (formData: {
    membreId: string;
    nombreMois: number;
    moisSelectionnes: string[];
    montantVerse: number;
    repartition: AllocationCotisation[];
    modePaiement: string;
    note: string;
    typeContribution?: 'standard' | 'mois-special';
    moisSpecial?: string;
  }) => {
    try {
      const estMoisSpecial = formData.typeContribution === 'mois-special';
      const montantVerse = formData.montantVerse;
      const membre = membres.find((item) => item.id === formData.membreId);
      if (!Number.isSafeInteger(montantVerse) || montantVerse <= 0 ||
          formData.repartition.reduce((total, allocation) => total + allocation.montantVerse, 0) !== montantVerse) {
        throw new Error('Le montant ou sa répartition est invalide.');
      }

      if (estMoisSpecial) {
        if (!caisseConfig.moisSpecial || !formData.moisSpecial ||
            normaliserMoisSpecial(formData.moisSpecial.slice(-2)) !== caisseConfig.moisSpecial) {
          throw new Error('Le mois spécial ne correspond pas au mois configuré dans les paramètres.');
        }
        const monthStates = genererEtatsMoisCotisation(
          contributionsAvecMoisSpecial.filter((contribution) => contribution.membreId === formData.membreId),
          caisseConfig.dateDebutCaisse,
          formData.moisSpecial,
          caisseConfig.cotisationMensuelle,
          caisseConfig.moisSpecial,
          caisseConfig.cotisationMoisSpecial,
          0,
          caisseConfig.moisSpecialActifDepuis
        );
        const targetMonth = monthStates.find((month) => month.mois === formData.moisSpecial);
        const remaining = targetMonth
          ? Math.max(0, targetMonth.montantRequis - targetMonth.montantPaye)
          : 0;
        if (!targetMonth || targetMonth.statut === 'PAYE' || formData.repartition.length !== 1 ||
            formData.repartition[0].mois !== targetMonth.mois ||
            formData.repartition[0].type !== 'SPECIALE' ||
            formData.repartition[0].montantVerse > remaining) {
          throw new Error('Ce versement du mois spécial ne correspond pas au solde restant.');
        }
        const isSettled = formData.repartition[0].montantVerse === remaining;
        await addDoc(collection(db, 'contributions'), {
          membreId: formData.membreId,
          nombreMois: 0,
          moisCouverts: isSettled ? [targetMonth.mois] : [],
          moisSelectionnes: isSettled ? [targetMonth.mois] : [],
          typeContribution: 'MOIS_SPECIAL',
          moisSpecial: targetMonth.mois,
          repartition: formData.repartition,
          montantVerse,
          modePaiement: formData.modePaiement,
          note: formData.note,
          datePaiement: new Date().toISOString(),
        });
      } else {
        const monthStates = genererEtatsMoisCotisation(
          contributionsAvecMoisSpecial.filter((contribution) => contribution.membreId === formData.membreId),
          caisseConfig.dateDebutCaisse,
          formData.repartition.at(-1)?.mois || new Date().toISOString().slice(0, 7),
          caisseConfig.cotisationMensuelle,
          caisseConfig.moisSpecial,
          caisseConfig.cotisationMoisSpecial,
          0,
          caisseConfig.moisSpecialActifDepuis
        );
        const statesByMonth = new Map(monthStates.map((month) => [month.mois, month]));
        for (const allocation of formData.repartition) {
          const month = statesByMonth.get(allocation.mois);
          if (!month || allocation.type !== 'NORMALE' || month.type !== 'NORMALE' ||
              month.statut === 'PAYE' || allocation.montantVerse <= 0 ||
              allocation.montantVerse > month.montantRequis - month.montantPaye) {
            throw new Error('La répartition standard contient un mois invalide ou spécial.');
          }
        }
        await addDoc(collection(db, 'contributions'), {
          membreId: formData.membreId,
          nombreMois: formData.nombreMois,
          moisCouverts: formData.moisSelectionnes,
          moisSelectionnes: formData.moisSelectionnes,
          repartition: formData.repartition,
          montantVerse,
          modePaiement: formData.modePaiement,
          note: formData.note,
          datePaiement: new Date().toISOString(),
        });
      }
      await addNotification({
        membreId: 'TOUS',
        titre: estMoisSpecial ? 'Nouvelle contribution du mois spécial' : 'Nouvelle contribution',
        message: estMoisSpecial
          ? `${membre?.nomComplet || 'Un membre'} a payé le mois spécial ${formData.moisSpecial} (${montantVerse.toLocaleString()} FC).`
          : `${membre?.nomComplet || 'Un membre'} vient de faire une contribution de ${montantVerse.toLocaleString()} FC.`,
        type: 'succes',
      });

      showToast(
        'success',
        `${estMoisSpecial ? 'Contribution du mois spécial' : 'Contribution'} de ${montantVerse.toLocaleString()} FC enregistrée avec succès !`
      );
      setIsDrawerOpen(false);
    } catch (error) {
      console.error("Erreur lors de l'enregistrement de la contribution :", error);
      showToast('error', error instanceof Error ? error.message : "Erreur lors de l'enregistrement de la contribution.");
    }
  };

  const handlePayPenalite = async (membreId: string, montantVerse: number, modePaiement: string) => {
    setIsSavingPenalitePayment(true);
    try {
      await enregistrerPaiementPenalite(membreId, montantVerse, modePaiement);
      const membre = membres.find((item) => item.id === membreId);
      setIsPayPenaliteOpen(false);
      showToast('success', `Paiement de pénalité de ${montantVerse.toLocaleString('fr-FR')} FC enregistré.`);

      try {
        await addNotification({
          membreId: 'TOUS',
          titre: 'Paiement de pénalité enregistré',
          message: `${membre?.nomComplet || 'Un membre'} a payé ${montantVerse.toLocaleString('fr-FR')} FC de pénalité (${modePaiement}).`,
          type: 'succes',
        });
      } catch (notificationError) {
        console.error('Erreur lors de la notification du paiement de pénalité :', notificationError);
        showToast('error', 'Paiement enregistré, mais la notification n’a pas pu être envoyée.');
      }
    } catch (error) {
      console.error('Erreur lors de l’enregistrement du paiement de pénalité :', error);
      showToast('error', error instanceof Error ? error.message : 'Impossible d’enregistrer le paiement de pénalité.');
    } finally {
      setIsSavingPenalitePayment(false);
    }
  };

  const handlePaiementPenalite = async (penalite: PenaliteData) => {
    const montant = Number(montantsPaiement[penalite.id]);
    if (!Number.isFinite(montant) || montant <= 0) {
      showToast('error', 'Saisissez un montant de paiement supérieur à zéro.');
      return;
    }

    setPaiementEnCours(penalite.id);
    try {
      const penaliteRef = doc(db, 'penalites', penalite.id);
      const paiementRef = doc(collection(db, 'paiements_penalites'));
      await runTransaction(db, async (transaction) => {
        const snapshot = await transaction.get(penaliteRef);
        if (!snapshot.exists()) throw new Error('Cette pénalité n’existe plus.');

        const data = snapshot.data();
        const montantDu = Number(data.montantDu) || 0;
        const montantDejaPaye = Number(data.montantPaye) || 0;
        const solde = Math.max(0, montantDu - montantDejaPaye);
        if (montant > solde) {
          throw new Error(`Le montant dépasse le solde de ${solde.toLocaleString()} FC.`);
        }

        const nouveauMontantPaye = montantDejaPaye + montant;
        transaction.update(penaliteRef, {
          montantPaye: nouveauMontantPaye,
          statut: nouveauMontantPaye >= montantDu ? 'PAYEE' : 'PARTIELLE',
          dateDernierPaiement: new Date().toISOString(),
        });
        transaction.set(paiementRef, {
          penaliteId: penalite.id,
          membreId: data.membreId || penalite.membreId,
          montant,
          datePaiement: new Date().toISOString(),
          moisDeclenchement: Number(data.moisDeclenchement) || penalite.moisDeclenchement,
          moisDeclenchementKey: data.moisDeclenchementKey || penalite.moisDeclenchementKey,
        });
      });

      setMontantsPaiement((values) => ({ ...values, [penalite.id]: '' }));
      showToast('success', 'Paiement de pénalité enregistré.');
    } catch (error) {
      console.error('Erreur lors de l’enregistrement du paiement de pénalité :', error);
      showToast('error', error instanceof Error ? error.message : 'Impossible d’enregistrer ce paiement.');
    } finally {
      setPaiementEnCours(null);
    }
  };

  const openHistoriqueView = (item: StatutMembreContribution) => {
    setSelectedContribution(item);
    setIsViewModalOpen(true);
  };

  const columns: Column<ContributionMemberRow>[] = [
    {
      header: 'Membre',
      accessor: (item) => {
        const photoUrl = item.membre.photoUrl || item.membre.avatarUrl;
        const label = item.membre.nomComplet || `${item.membre.prenom} ${item.membre.nom}`;
        return (
          <div className="flex items-center gap-3">
            {photoUrl ? (
              <img src={photoUrl} alt={`Photo de ${label}`} className="h-9 w-9 shrink-0 rounded-full border border-slate-200 object-cover dark:border-slate-700" />
            ) : (
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                {(label || 'M').charAt(0).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <p className="font-semibold text-slate-800 dark:text-white">{label}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{item.membre.telephone}</p>
            </div>
          </div>
        );
      },
    },
    {
      header: 'Total Cotisé',
      accessor: (item) => (
        <span className="font-semibold">
          {item.montantTotalCotise.toLocaleString()} FC
        </span>
      ),
    },
    {
      header: 'Dette Actuelle',
      accessor: (item) => (
        <span className={`font-bold ${item.detteActuelle > 0 }`}>
          {item.detteActuelle > 0 ? `${item.detteActuelle.toLocaleString()} FC` : 'Aucune'}
        </span>
      ),
    },
    {
      header: 'Mois Payés',
      accessor: (item) => (
        <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
          {item.moisPayes.length} mois
        </span>
      ),
    },
    {
      header: 'Dernier paiement',
      accessor: (item) => item.dernierPaiementDate || '—',
    },
  ];

  const totalCotisations = contributionsData.reduce((acc, curr) => acc + curr.montantTotalCotise, 0);
  const totalDettes = contributionsData.reduce((acc, curr) => acc + curr.detteActuelle, 0);
  const paiementsMoisSpecial = [
    ...rawContributions
      .filter((contribution) => contribution.typeContribution === 'MOIS_SPECIAL')
      .map((contribution) => {
        const montantAllocation = contribution.repartition
          ?.filter((allocation) => allocation.type === 'SPECIALE')
          .reduce((total, allocation) => total + Number(allocation.montantVerse || 0), 0);
        return {
          membreId: contribution.membreId,
          moisSpecial: contribution.moisSpecial ||
            contribution.repartition?.find((allocation) => allocation.type === 'SPECIALE')?.mois ||
            '',
          montantVerse: montantAllocation || Number(contribution.montantVerse) || 0,
          modePaiement: contribution.modePaiement || 'Non précisé',
          datePaiement: contribution.datePaiement || '',
        };
      }),
    ...rawContributionsSpeciales.map((contribution) => ({
      membreId: contribution.membreId,
      moisSpecial: contribution.moisSpecial,
      montantVerse: Number(contribution.montantVerse) || 0,
      modePaiement: contribution.modePaiement || 'Non précisé',
      datePaiement: contribution.datePaiement || '',
    })),
  ];
  const specialRows = new Map<string, {
    id: string;
    nomMembre: string;
    moisSpecial: string;
    montantRequis: number;
    montantVerse: number;
    modesPaiement: Set<string>;
    datePaiement: string;
  }>();
  const getSpecialRow = (membreId: string, moisSpecial: string, montantRequis: number) => {
    const id = `${membreId}-${moisSpecial}`;
    const existing = specialRows.get(id);
    if (existing) return existing;

    const membre = membres.find((item) => item.id === membreId);
    const row = {
      id,
      nomMembre: membre?.nomComplet || `${membre?.prenom || ''} ${membre?.nom || ''}`.trim() || 'Membre',
      moisSpecial,
      montantRequis,
      montantVerse: 0,
      modesPaiement: new Set<string>(),
      datePaiement: '',
    };
    specialRows.set(id, row);
    return row;
  };
  contributionsData.forEach((contribution) => {
    contribution.etatsMois?.forEach((month) => {
      if (month.type === 'SPECIALE') {
        getSpecialRow(contribution.membre.id, month.mois, month.montantRequis);
      }
    });
  });
  if (caisseConfig.moisSpecial) {
    const specialMonthThisYear = `${new Date().getFullYear()}-${caisseConfig.moisSpecial}`;
    if (specialMonthThisYear >= caisseConfig.dateDebutCaisse.slice(0, 7)) {
      contributionsData.forEach((contribution) => {
        getSpecialRow(contribution.membre.id, specialMonthThisYear, caisseConfig.cotisationMoisSpecial);
      });
    }
  }
  paiementsMoisSpecial.forEach((paiement) => {
    const moisSpecial = /^\d{4}-(0[1-9]|1[0-2])$/.test(paiement.moisSpecial)
      ? paiement.moisSpecial
      : 'Mois non précisé';
    const row = getSpecialRow(paiement.membreId, moisSpecial, caisseConfig.cotisationMoisSpecial);
    row.montantVerse += paiement.montantVerse;
    if (paiement.modePaiement && paiement.modePaiement !== 'Non précisé') {
      row.modesPaiement.add(paiement.modePaiement);
    }
    if (paiement.datePaiement &&
        (!row.datePaiement || Date.parse(paiement.datePaiement) > Date.parse(row.datePaiement))) {
      row.datePaiement = paiement.datePaiement;
    }
  });
  const contributionsSpeciales: ContributionSpeciale[] = Array.from(specialRows.values()).map((row) => ({
    id: row.id,
    nomMembre: row.nomMembre,
    moisSpecial: row.moisSpecial,
    montantRequis: row.montantRequis,
    montantVerse: row.montantVerse,
    montantRestant: Math.max(0, row.montantRequis - row.montantVerse),
    statut: statutMoisCotisation(row.montantVerse, row.montantRequis),
    modePaiement: row.modesPaiement.size > 1
      ? 'Plusieurs'
      : Array.from(row.modesPaiement)[0] || '—',
    datePaiement: row.datePaiement,
  }));
  const totalMoisSpecial = paiementsMoisSpecial.reduce((total, paiement) => total + paiement.montantVerse, 0);

  const penalitesAvecMembre: PenaliteAvecMembre[] = penalites.map((penalite) => {
    const membre = membres.find((item) => item.id === penalite.membreId);
    return {
      ...penalite,
      nomMembre: membre?.nomComplet || `${membre?.prenom || ''} ${membre?.nom || ''}`.trim() || 'Membre',
    };
  });
  const membresAvecPenalite: MembrePenalite[] = membres
    .map((membre) => ({
      id: membre.id,
      nomComplet: membre.nomComplet || `${membre.prenom || ''} ${membre.nom || ''}`.trim() || 'Membre',
      telephone: membre.telephone || '',
      soldePenalites: penalites
        .filter((penalite) => penalite.membreId === membre.id)
        .reduce((total, penalite) => total + soldePenalite(penalite), 0),
    }))
    .filter((membre) => membre.soldePenalites > 0);
  const totalPenalitesDues = penalites.reduce((total, penalite) => total + penalite.montantDu, 0);
  const totalPenalitesPayees = penalites.reduce((total, penalite) => total + penalite.montantPaye, 0);
  const totalPenalitesRestantes = penalites.reduce((total, penalite) => total + soldePenalite(penalite), 0);

  const toCotisationExportRow = (item: StatutMembreContribution) => ({
    nom: item.membre.nomComplet || `${item.membre.prenom} ${item.membre.nom}`.trim(),
    telephone: item.membre.telephone,
    totalCotise: item.montantTotalCotise,
    dette: item.detteActuelle,
    penalitesRestantes: penalites
      .filter((penalite) => penalite.membreId === item.membre.id)
      .reduce((total, penalite) => total + soldePenalite(penalite), 0),
    moisPayes: item.moisPayes.join(', '),
    moisImpayes: item.moisImpayes.join(', '),
    moisFuturs: item.moisFutursPayes.join(', '),
    dernierPaiement: item.dernierPaiementDate || '—',
  });
  const cotisationsExportColumns: CsvColumn<ReturnType<typeof toCotisationExportRow>>[] = [
    { header: 'Membre', value: (row) => row.nom },
    { header: 'Téléphone', value: (row) => row.telephone },
    { header: 'Total cotisé (FC)', value: (row) => row.totalCotise },
    { header: 'Dette de cotisation (FC)', value: (row) => row.dette },
    { header: 'Pénalités restantes (FC)', value: (row) => row.penalitesRestantes },
    { header: 'Mois payés', value: (row) => row.moisPayes },
    { header: 'Mois impayés', value: (row) => row.moisImpayes },
    { header: 'Mois payés d’avance', value: (row) => row.moisFuturs },
    { header: 'Dernier paiement', value: (row) => row.dernierPaiement },
  ];
  const moisSpecialExportColumns: CsvColumn<ContributionSpeciale>[] = [
    { header: 'Membre', value: (row) => row.nomMembre },
    { header: 'Mois spécial', value: (row) => row.moisSpecial },
    { header: 'Montant requis (FC)', value: (row) => row.montantRequis },
    { header: 'Montant payé (FC)', value: (row) => row.montantVerse },
    { header: 'Solde restant (FC)', value: (row) => row.montantRestant },
    { header: 'Statut', value: (row) => row.statut },
    { header: 'Mode de paiement', value: (row) => row.modePaiement },
    { header: 'Date de paiement', value: (row) => row.datePaiement },
  ];
  const toPenaliteExportRow = (penalite: PenaliteAvecMembre) => ({
    membre: penalite.nomMembre,
    periode: penalite.moisDeclenchementKey,
    du: penalite.montantDu,
    paye: penalite.montantPaye,
    solde: soldePenalite(penalite),
    dernierPaiement: penalite.dateDernierPaiement || '—',
  });
  const buildPenalitesExportRows = (rows: readonly PenaliteAvecMembre[]) => [
    ...rows.map(toPenaliteExportRow),
    {
      membre: 'TOTAL',
      periode: `${rows.length} pénalité(s)`,
      du: rows.reduce((total, penalite) => total + penalite.montantDu, 0),
      paye: rows.reduce((total, penalite) => total + penalite.montantPaye, 0),
      solde: rows.reduce((total, penalite) => total + soldePenalite(penalite), 0),
      dernierPaiement: '',
    },
  ];
  const penalitesExportColumns: CsvColumn<ReturnType<typeof toPenaliteExportRow>>[] = [
    { header: 'Membre', value: (row) => row.membre },
    { header: 'Période déclenchée', value: (row) => row.periode },
    { header: 'Montant dû (FC)', value: (row) => row.du },
    { header: 'Montant payé (FC)', value: (row) => row.paye },
    { header: 'Solde restant (FC)', value: (row) => row.solde },
    { header: 'Dernier paiement', value: (row) => row.dernierPaiement },
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
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Gestion des Contributions</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {activeTab === 'cotisations'
              ? <>Suivi basé sur le lancement de la caisse au <strong>{caisseConfig.dateDebutCaisse}</strong> ({caisseConfig.cotisationMensuelle.toLocaleString()} FC/mois).</>
              : activeTab === 'mois-special'
                ? <>Mois configuré : <strong>{caisseConfig.moisSpecial
                    ? new Date(2000, Number(caisseConfig.moisSpecial) - 1, 1).toLocaleDateString('fr-FR', { month: 'long' })
                    : 'non défini'}</strong> · {caisseConfig.cotisationMoisSpecial.toLocaleString()} FC
                    {caisseConfig.moisSpecialActif ? '' : ' · règle désactivée'}.</>
                : <>Suivi des pénalités enregistrées, des paiements partiels et des soldes restants.</>}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">

          {activeTab === 'penalites' ? (
            <button
              type="button"
              onClick={() => setIsPayPenaliteOpen(true)}
              disabled={membresAvecPenalite.length === 0}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
            >
              <HandCoins size={18} /> Payer une pénalité
            </button>
          ) : (
            <button
              onClick={() => setIsDrawerOpen(true)}
              disabled={activeTab === 'mois-special' && !caisseConfig.moisSpecialActif}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
            >
              <PlusCircle size={18} />
              {activeTab === 'cotisations' ? 'Nouvelle Contribution' : 'Nouveau Mois spécial'}
            </button>
          )}
        </div>
      </div>

      <ContributionTabs activeTab={activeTab} onChange={setActiveTab} />

      {activeTab === 'cotisations' ? (
        <ContributionsMembersSection
          data={contributionsData.map((contribution) => ({ ...contribution, id: contribution.membre.id }))}
          columns={columns}
          totalCotisations={totalCotisations}
          totalDettes={totalDettes}
          membresAJour={contributionsData.filter((contribution) => contribution.detteActuelle === 0).length}
          nombreMembres={contributionsData.length}
          isLoading={isLoading || isSpecialLoading}
          onView={openHistoriqueView}
          onExport={(rows) => exportCsv('rapport-cotisations', cotisationsExportColumns, rows.map(toCotisationExportRow))}
        />
      ) : activeTab === 'mois-special' ? (
        <SpecialMonthSection
          contributions={contributionsSpeciales}
          total={totalMoisSpecial}
          nombreVersements={paiementsMoisSpecial.length}
          isLoading={isLoading || isSpecialLoading}
          exportLabel="Exporter le rapport"
          onExport={(rows) => exportCsv('rapport-mois-special', moisSpecialExportColumns, rows)}
        />
      ) : (
        <PenaltiesSection
          penalites={penalitesAvecMembre}
          totalDu={totalPenalitesDues}
          totalPaye={totalPenalitesPayees}
          soldeTotal={totalPenalitesRestantes}
          nombrePaiements={paiementsPenalites.length}
          isLoading={isPenaltiesLoading || isLoading}
          exportLabel="Exporter les pénalités"
          onExport={(rows) => exportCsv('rapport-penalites', penalitesExportColumns, buildPenalitesExportRows(rows))}
        />
      )}
      </>
      )}

      {activeTab === 'penalites' && (
      <>
      <div className="group relative max-w-sm overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Pénalités restantes à payer</span>
          <div className="rounded-lg bg-slate-100 p-2 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
            <Coins size={18} />
          </div>
        </div>
        <p className="mt-2 text-xl font-extrabold tabular-nums">
          {totalPenalites.toLocaleString()} <span className="text-xs font-normal text-slate-500">FC</span>
        </p>
      </div>
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="border-b border-slate-200 px-4 py-4 dark:border-slate-800 sm:px-6">
          <h3 className="text-base font-bold text-slate-900 dark:text-white">Suivi et paiement des pénalités</h3>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Chaque pénalité est enregistrée après le seuil de mois impayés configuré. Les paiements partiels sont acceptés.
          </p>
        </div>
        {penalites.length === 0 ? (
          <p className="p-6 text-center text-sm text-slate-500">Aucune pénalité enregistrée pour le moment.</p>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {penalites
              .slice()
              .sort((a, b) => a.membreId.localeCompare(b.membreId) || a.moisDeclenchementKey.localeCompare(b.moisDeclenchementKey))
              .map((penalite) => {
                const membre = membres.find((item) => item.id === penalite.membreId);
                const solde = soldePenalite(penalite);
                const payee = solde === 0;
                return (
                  <div key={penalite.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900 dark:text-white">
                        {membre?.nomComplet || (membre ? `${membre.prenom} ${membre.nom}` : 'Membre')}
                      </p>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        Seuil atteint après {penalite.moisDeclenchement} mois impayés ({penalite.moisDeclenchementKey}) · Pénalité : {penalite.montantDu.toLocaleString()} FC · Payé : {penalite.montantPaye.toLocaleString()} FC
                      </p>
                    </div>
                    <div className="flex flex-col gap-2 sm:min-w-64 sm:flex-row sm:items-center">
                      {payee ? (
                        <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                          <CheckCircle size={16} /> Payée
                        </span>
                      ) : (
                        <>
                          <span className="text-sm font-bold text-rose-600 dark:text-rose-400">
                            Solde : {solde.toLocaleString()} FC
                          </span>
                          <input
                            type="number"
                            min="1"
                            max={solde}
                            step="1"
                            aria-label={`Montant payé pour la pénalité de ${membre?.nomComplet || 'ce membre'}`}
                            placeholder="Montant reçu"
                            value={montantsPaiement[penalite.id] || ''}
                            onChange={(event) => setMontantsPaiement((values) => ({
                              ...values,
                              [penalite.id]: event.target.value,
                            }))}
                            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-white sm:w-32"
                          />
                          <button
                            type="button"
                            disabled={paiementEnCours === penalite.id}
                            onClick={() => void handlePaiementPenalite(penalite)}
                            className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
                          >
                            {paiementEnCours === penalite.id ? 'Enregistrement...' : 'Enregistrer'}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </section>
      </>
      )}

      <AddContributionDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        membres={membres}
        contributions={contributionsAvecMoisSpecial}
        dateDebutCaisse={caisseConfig.dateDebutCaisse}
        montantMensuelDefaut={caisseConfig.cotisationMensuelle}
        montantMoisSpecial={caisseConfig.cotisationMoisSpecial}
        moisSpecialConfigure={caisseConfig.moisSpecialActif ? caisseConfig.moisSpecial : ''}
        moisSpecialActifDepuis={caisseConfig.moisSpecialActifDepuis}
        typeContribution={activeTab === 'mois-special' ? 'mois-special' : 'standard'}
        onSubmit={handleAddContribution}
      />

      <PayPenaliteModal
        isOpen={isPayPenaliteOpen}
        onClose={() => setIsPayPenaliteOpen(false)}
        membres={membresAvecPenalite}
        isSubmitting={isSavingPenalitePayment}
        onSubmit={handlePayPenalite}
      />

      <ViewHistoriqueModal
        isOpen={isViewModalOpen}
        onClose={() => setIsViewModalOpen(false)}
        data={selectedContribution}
        montantMensuel={caisseConfig.cotisationMensuelle}
      />
    </div>
  );
}