'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { PiggyBank, PlusCircle, AlertCircle, CheckCircle, CalendarDays, Wallet, ShieldAlert, HandCoins } from 'lucide-react';
import { Membre, StatutMembreContribution } from '@/src/types';
import DataTable, { Column } from '@/src/components/ui/DataTable';
import AddContributionDrawer from '@/src/components/modals/AddContributionDrawer';
import PayPenaliteModal, { MembrePenalite } from '@/src/components/modals/PayPenaliteModal';
import ViewHistoriqueModal from '@/src/components/modals/ViewHistoriqueModal';
import Toast from '@/src/components/ui/Toast';
import {
  ContributionMonthRecord,
  DATE_DEBUT_CAISSE_PAR_DEFAUT,
  moisImpayesPour,
  normaliserDateFirestore,
  nombreMoisAttendus,
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
} from 'firebase/firestore';
import { db } from '@/src/lib/firebase';
import { addNotification } from '@/src/services/dbService';

interface ContributionDoc extends ContributionMonthRecord {
  id: string;
  membreId: string;
  nombreMois: number;
  montantVerse: number;
  modePaiement: string;
  note: string;
  datePaiement: string;
  typeContribution?: string;
  moisSpecial?: string;
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

interface ContributionSpeciale {
  id: string;
  nomMembre: string;
  moisSpecial: string;
  montantVerse: number;
  modePaiement: string;
  datePaiement: string;
}

interface PenaliteAvecMembre extends Penalite {
  nomMembre: string;
}

export default function ContributionsPage() {
  const [activeTab, setActiveTab] = useState<'cotisations' | 'mois-special' | 'penalites'>('cotisations');
  const [membres, setMembres] = useState<Membre[]>([]);
  const [rawContributions, setRawContributions] = useState<ContributionDoc[]>([]);
  const [rawContributionsSpeciales, setRawContributionsSpeciales] = useState<ContributionSpecialDoc[]>([]);
  const [penalites, setPenalites] = useState<Penalite[]>([]);
  const [paiementsPenalites, setPaiementsPenalites] = useState<PaiementPenalite[]>([]);
  const [contributionsData, setContributionsData] = useState<StatutMembreContribution[]>([]);
  
  // Paramètres globaux de la caisse (récupérés depuis Firestore)
  const [caisseConfig, setCaisseConfig] = useState({
    dateDebutCaisse: DATE_DEBUT_CAISSE_PAR_DEFAUT,
    cotisationMensuelle: 5000,
    cotisationMoisSpecial: 10000,
    moisSpecial: '',
  });

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
        setCaisseConfig({
          dateDebutCaisse: data.dateDebutCaisse || DATE_DEBUT_CAISSE_PAR_DEFAUT,
          cotisationMensuelle: data.cotisationMensuelle || 5000,
          cotisationMoisSpecial: data.cotisationMoisSpecial || 10000,
          moisSpecial: typeof data.moisSpecial === 'string' ? data.moisSpecial : '',
        });
      }
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
    const moisAttendus = nombreMoisAttendus(caisseConfig.dateDebutCaisse, dateCourante);
    const moisActuel = `${dateCourante.getFullYear()}-${String(dateCourante.getMonth() + 1).padStart(2, '0')}`;
    const montantMensuel = caisseConfig.cotisationMensuelle;

    const computed: StatutMembreContribution[] = membres.map((membre) => {
      const memberContribs = contributionsAvecMoisSpecial.filter(
        (contribution) => contribution.membreId === membre.id
      );

      // Cumul du montant versé
      const montantTotalCotise = memberContribs.reduce((sum, c) => sum + (c.montantVerse || 0), 0);
      
      const moisParContribution = obtenirMoisCouvertsParContributions(memberContribs, caisseConfig.dateDebutCaisse);
      const moisCouverts = new Set(moisParContribution.flat());
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
      const moisImpayes = moisImpayesPour(
        caisseConfig.dateDebutCaisse,
        moisAttendus,
        memberContribs
      ).map((mois) => {
        const [year, month] = mois.split('-').map(Number);
        return new Date(year, month - 1, 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
      });
      const detteActuelle = moisImpayes.length * montantMensuel;
      const historiquePaiements = moisParContribution
        .flatMap((moisCouvertsContribution, index) => {
          if (moisCouvertsContribution.length === 0) return [];
          const contribution = memberContribs[index];
          const montantParMois = Math.round((Number(contribution.montantVerse) || 0) / moisCouvertsContribution.length);
          return moisCouvertsContribution.map((mois) => ({
            mois,
            montant: montantParMois,
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
        dernierPaiementDate: historiquePaiements[0]?.datePaiement
          ? new Date(historiquePaiements[0].datePaiement).toLocaleDateString('fr-FR')
          : '-',
      };
    });

    setContributionsData(computed);
  }, [membres, contributionsAvecMoisSpecial, caisseConfig]);

  // 5. ENREGISTRER UNE CONTRIBUTION DANS FIRESTORE (Utilisation de Toast)
  const handleAddContribution = async (formData: {
    membreId: string;
    nombreMois: number;
    moisSelectionnes: string[];
    modePaiement: string;
    note: string;
    typeContribution?: 'standard' | 'mois-special';
    moisSpecial?: string;
  }) => {
    try {
      const estMoisSpecial = formData.typeContribution === 'mois-special';
      const montantVerse = estMoisSpecial
        ? caisseConfig.cotisationMoisSpecial
        : formData.nombreMois * caisseConfig.cotisationMensuelle;
      const membre = membres.find((item) => item.id === formData.membreId);

      if (estMoisSpecial) {
        if (!caisseConfig.moisSpecial || formData.moisSpecial !== caisseConfig.moisSpecial) {
          throw new Error('Le mois spécial ne correspond pas au mois configuré dans les paramètres.');
        }
        const moisDejaPaye = new Set(
          obtenirMoisCouvertsParContributions(
            contributionsAvecMoisSpecial.filter((contribution) => contribution.membreId === formData.membreId),
            caisseConfig.dateDebutCaisse
          ).flat()
        );
        if (moisDejaPaye.has(caisseConfig.moisSpecial)) {
          throw new Error('Ce membre a déjà payé le mois configuré comme mois spécial.');
        }
        await addDoc(collection(db, 'contributions'), {
          membreId: formData.membreId,
          nombreMois: 1,
          moisCouverts: [caisseConfig.moisSpecial],
          moisSelectionnes: [caisseConfig.moisSpecial],
          typeContribution: 'MOIS_SPECIAL',
          moisSpecial: caisseConfig.moisSpecial,
          montantVerse,
          modePaiement: formData.modePaiement,
          note: formData.note,
          datePaiement: new Date().toISOString(),
        });
      } else {
        await addDoc(collection(db, 'contributions'), {
          membreId: formData.membreId,
          nombreMois: formData.nombreMois,
          moisCouverts: formData.moisSelectionnes,
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

  const openHistoriqueView = (item: StatutMembreContribution) => {
    setSelectedContribution(item);
    setIsViewModalOpen(true);
  };

  const columns: Column<StatutMembreContribution>[] = [
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
        <span className={`font-semibold ${item.detteActuelle > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-500'}`}>
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
  ];

  const totalCotisations = contributionsData.reduce((acc, curr) => acc + curr.montantTotalCotise, 0);
  const totalDettes = contributionsData.reduce((acc, curr) => acc + curr.detteActuelle, 0);
  const contributionsSpeciales: ContributionSpeciale[] = [
    ...rawContributionsSpeciales,
    ...rawContributions.filter((contribution) => contribution.typeContribution === 'MOIS_SPECIAL'),
  ]
    .map((contribution) => {
      const membre = membres.find((item) => item.id === contribution.membreId);
      return {
        id: contribution.id,
        nomMembre: membre?.nomComplet || `${membre?.prenom || ''} ${membre?.nom || ''}`.trim() || 'Membre',
        moisSpecial: contribution.moisSpecial || 'Mois non précisé',
        montantVerse: Number(contribution.montantVerse) || 0,
        modePaiement: contribution.modePaiement || 'Non précisé',
        datePaiement: contribution.datePaiement || '',
      };
    });
  const totalMoisSpecial = contributionsSpeciales.reduce((total, contribution) => total + contribution.montantVerse, 0);
  const colonnesMoisSpecial: Column<ContributionSpeciale>[] = [
    { header: 'Membre', accessor: 'nomMembre' },
    {
      header: 'Mois spécial',
      accessor: (item) => {
        const [year, month] = item.moisSpecial.split('-').map(Number);
        const label = year && month
          ? new Date(year, month - 1, 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
          : item.moisSpecial;
        return <span className="font-medium capitalize">{label}</span>;
      },
    },
    {
      header: 'Montant',
      accessor: (item) => <span className="font-semibold text-emerald-700 dark:text-emerald-400">{item.montantVerse.toLocaleString()} FC</span>,
    },
    { header: 'Mode de paiement', accessor: 'modePaiement' },
    {
      header: 'Date de paiement',
      accessor: (item) => item.datePaiement
        ? new Date(item.datePaiement).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })
        : '—',
    },
  ];

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

  const colonnesPenalites: Column<PenaliteAvecMembre>[] = [
    { header: 'Membre', accessor: 'nomMembre' },
    {
      header: 'Période déclenchée',
      accessor: (item) => {
        const [year, month] = item.moisDeclenchementKey.split('-').map(Number);
        return year && month
          ? new Date(year, month - 1, 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
          : item.moisDeclenchementKey || '—';
      },
    },
    {
      header: 'Montant dû',
      accessor: (item) => <span className="font-semibold">{item.montantDu.toLocaleString('fr-FR')} FC</span>,
    },
    {
      header: 'Montant payé',
      accessor: (item) => <span className="font-semibold text-emerald-700 dark:text-emerald-400">{item.montantPaye.toLocaleString('fr-FR')} FC</span>,
    },
    {
      header: 'Solde',
      accessor: (item) => {
        const solde = soldePenalite(item);
        return <span className={`font-semibold ${solde > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-500'}`}>{solde.toLocaleString('fr-FR')} FC</span>;
      },
    },
    {
      header: 'Statut',
      accessor: (item) => {
        const solde = soldePenalite(item);
        const statut = solde === 0 ? 'Payée' : item.montantPaye > 0 ? 'En cours' : 'En attente';
        const className = solde === 0
          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
          : item.montantPaye > 0
            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
            : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300';
        return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${className}`}>{statut}</span>;
      },
    },
    {
      header: 'Dernier paiement',
      accessor: (item) => item.dateDernierPaiement
        ? new Date(normaliserDateFirestore(item.dateDernierPaiement)).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })
        : '—',
    },
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
                ? <>Mois configuré : <strong>{caisseConfig.moisSpecial || 'non défini'}</strong> · {caisseConfig.cotisationMoisSpecial.toLocaleString()} FC.</>
                : <>Suivi des pénalités enregistrées, des paiements partiels et des soldes restants.</>}
          </p>
        </div>
        {activeTab === 'penalites' ? (
          <button
            type="button"
            onClick={() => setIsPayPenaliteOpen(true)}
            disabled={membresAvecPenalite.length === 0}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
          >
            <HandCoins size={18} /> Payer une pénalité
          </button>
        ) : (
          <button
            onClick={() => setIsDrawerOpen(true)}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
          >
            <PlusCircle size={18} />
            {activeTab === 'cotisations' ? 'Nouvelle Contribution' : 'Nouveau Mois spécial'}
          </button>
        )}
      </div>

      <div className="flex w-fit rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
        <button
          type="button"
          onClick={() => setActiveTab('cotisations')}
          className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition-all ${
            activeTab === 'cotisations'
              ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-white'
              : 'text-slate-600 hover:text-slate-900 dark:text-slate-400'
          }`}
        >
          <Wallet size={15} /> Contributions
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('mois-special')}
          className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition-all ${
            activeTab === 'mois-special'
              ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-white'
              : 'text-slate-600 hover:text-slate-900 dark:text-slate-400'
          }`}
        >
          <CalendarDays size={15} /> Mois spécial
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('penalites')}
          className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition-all ${
            activeTab === 'penalites'
              ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-white'
              : 'text-slate-600 hover:text-slate-900 dark:text-slate-400'
          }`}
        >
          <ShieldAlert size={15} /> Pénalités
        </button>
      </div>

      {activeTab === 'cotisations' ? (
        <>
{/* Cartes KPI : 2 par ligne sur petit écran, et 3 sur la même ligne sur grand écran */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <div className="group relative min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm transition-all hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between gap-2">
            <span className="truncate text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Total Cotisé</span>
            <div className="shrink-0 rounded-lg bg-slate-100 p-2 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
              <PiggyBank size={18} />
            </div>
          </div>
          <p className="mt-2 truncate text-lg font-extrabold tabular-nums sm:text-xl">
            {totalCotisations.toLocaleString()} <span className="text-xs font-normal text-slate-500">FC</span>
          </p>
        </div>

        <div className="group relative min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm transition-all hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between gap-2">
            <span className="truncate text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Dettes Globales</span>
            <div className="shrink-0 rounded-lg bg-slate-100 p-2 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
              <AlertCircle size={18} />
            </div>
          </div>
          <p className="mt-2 text-lg sm:text-xl font-extrabold tabular-nums  truncate">
            {totalDettes.toLocaleString()} <span className="text-xs font-normal text-slate-500">FC</span>
          </p>
        </div>

        {/* La 3ème carte s'étale sur 2 colonnes en bas sur mobile, et reprend sa place normale sur grand écran */}
        <div className="col-span-2 lg:col-span-1 group relative min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm transition-all hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between gap-2">
            <span className="truncate text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Membres à jour</span>
            <div className="shrink-0 rounded-lg bg-slate-100 p-2 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
              <CheckCircle size={18} />
            </div>
          </div>
          <p className="mt-2 text-lg sm:text-xl font-extrabold tabular-nums text-slate-900 dark:text-white truncate">
            {contributionsData.filter((d) => d.detteActuelle === 0).length} <span className="text-xs font-normal text-slate-500">/ {contributionsData.length}</span>
          </p>
        </div>
      </div>
      {isLoading || isSpecialLoading ? (
        <div className="p-8 text-center text-slate-500">Chargement des contributions en cours</div>
      ) : (
        <DataTable
          data={contributionsData.map((d) => ({ ...d, id: d.membre.id }))}
          columns={columns}
          onView={openHistoriqueView}
        />
      )}
        </>
      ) : activeTab === 'mois-special' ? (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div className="group relative min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Total mois spéciaux versés</span>
                <div className="shrink-0 rounded-lg bg-slate-100 p-2 text-slate-700 dark:bg-slate-800 dark:text-slate-300"><PiggyBank size={18} /></div>
              </div>
              <p className="mt-2 truncate text-lg font-extrabold tabular-nums sm:text-xl">
                {totalMoisSpecial.toLocaleString()} <span className="text-xs font-normal text-slate-500">FC</span>
              </p>
            </div>
            <div className="group relative min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Versements enregistrés</span>
                <div className="shrink-0 rounded-lg bg-slate-100 p-2 text-slate-700 dark:bg-slate-800 dark:text-slate-300"><CalendarDays size={18} /></div>
              </div>
              <p className="mt-2 truncate text-lg font-extrabold tabular-nums sm:text-xl">
                {contributionsSpeciales.length} <span className="text-xs font-normal text-slate-500">Paiement(s)</span>
              </p>
            </div>
          </div>
          {isLoading ? (
            <div className="p-8 text-center text-slate-500">Chargement des mois spéciaux...</div>
          ) : (
            <DataTable
              data={contributionsSpeciales}
              columns={colonnesMoisSpecial}
              searchKey="nomMembre"
              searchPlaceholder="Rechercher un membre..."
            />
          )}
        </>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="group relative min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Pénalités enregistrées</span>
                <div className="shrink-0 rounded-lg bg-slate-100 p-2 text-slate-700 dark:bg-slate-800 dark:text-slate-300"><ShieldAlert size={18} /></div>
              </div>
              <p className="mt-2 truncate text-lg font-extrabold tabular-nums sm:text-xl">{totalPenalitesDues.toLocaleString('fr-FR')} <span className="text-xs font-normal text-slate-500">FC</span></p>
            </div>
            <div className="group relative min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Pénalités payées</span>
                <div className="shrink-0 rounded-lg bg-emerald-50 p-2 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"><CheckCircle size={18} /></div>
              </div>
              <p className="mt-2 truncate text-lg font-extrabold tabular-nums text-emerald-700 dark:text-emerald-400 sm:text-xl">{totalPenalitesPayees.toLocaleString('fr-FR')} <span className="text-xs font-normal text-slate-500">FC</span></p>
            </div>
            <div className="group relative min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Solde à recouvrer</span>
                <div className="shrink-0 rounded-lg bg-rose-50 p-2 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300"><AlertCircle size={18} /></div>
              </div>
              <p className="mt-2 truncate text-lg font-extrabold tabular-nums text-rose-700 dark:text-rose-400 sm:text-xl">{totalPenalitesRestantes.toLocaleString('fr-FR')} <span className="text-xs font-normal text-slate-500">FC</span></p>
            </div>
            <div className="group relative min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Paiements enregistrés</span>
                <div className="shrink-0 rounded-lg bg-slate-100 p-2 text-slate-700 dark:bg-slate-800 dark:text-slate-300"><CalendarDays size={18} /></div>
              </div>
              <p className="mt-2 truncate text-lg font-extrabold tabular-nums sm:text-xl">{paiementsPenalites.length} <span className="text-xs font-normal text-slate-500">Paiement(s)</span></p>
            </div>
          </div>
          {isPenaltiesLoading || isLoading ? (
            <div className="p-8 text-center text-slate-500">Chargement des pénalités...</div>
          ) : penalitesAvecMembre.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-500 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              Aucune pénalité n’est enregistrée pour le moment.
            </div>
          ) : (
            <DataTable
              data={penalitesAvecMembre}
              columns={colonnesPenalites}
              searchKey="nomMembre"
              searchPlaceholder="Rechercher un membre..."
            />
          )}
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
        moisSpecialConfigure={caisseConfig.moisSpecial}
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
      />
    </div>
  );
}