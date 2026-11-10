'use client';

import React, { useState, useEffect, useRef } from 'react';
import { PiggyBank, PlusCircle, AlertCircle, CheckCircle, ShieldAlert, Coins } from 'lucide-react';
import { Membre, StatutMembreContribution } from '@/src/types';
import DataTable, { Column } from '@/src/components/ui/DataTable';
import AddContributionDrawer from '@/src/components/modals/AddContributionDrawer';
import ViewHistoriqueModal from '@/src/components/modals/ViewHistoriqueModal';
import Toast from '@/src/components/ui/Toast';

// Import Firestore
import {
  collection,
  onSnapshot,
  addDoc,
  doc,
  runTransaction,
} from 'firebase/firestore';
import { db } from '@/src/lib/firebase';
import { assurerPenalites, Penalite, soldePenalite, synchroniserMontantPenalites } from '@/src/lib/penalties';

type PenaliteData = Penalite;

interface ContributionDoc {
  id: string;
  membreId: string;
  nombreMois: number;
  moisSelectionnes?: string[]; // Ex: ["2025-01", "2025-02"] (absent sur les anciennes contributions)
  moisCouverts?: string[];
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
  const [activeTab, setActiveTab] = useState<'contributions' | 'penalites'>('contributions');
  const [membres, setMembres] = useState<Membre[]>([]);
  const [rawContributions, setRawContributions] = useState<ContributionDoc[]>([]);
  const [contributionsData, setContributionsData] = useState<StatutMembreContribution[]>([]);
  const [moisPayesParMembre, setMoisPayesParMembre] = useState<Record<string, string[]>>({});
  const [penalites, setPenalites] = useState<PenaliteData[]>([]);
  const [montantsPaiement, setMontantsPaiement] = useState<Record<string, string>>({});
  const [paiementEnCours, setPaiementEnCours] = useState<string | null>(null);

  // Paramètres globaux de la caisse (récupérés depuis Firestore)
  const [caisseConfig, setCaisseConfig] = useState({
    dateDebutCaisse: '2025-01-01',
    cotisationMensuelle: 5000,
    cotisationMoisSpecial: 10000,
    penaliteRetardActive: true,
    moisRetardAvantPenalite: 2,
    montantPenalite: 1000,
  });
  const [configLoaded, setConfigLoaded] = useState(false);
  const dernierMontantPenaliteSynchro = useRef<number | null>(null);

  const [isLoading, setIsLoading] = useState(true);

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
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
          dateDebutCaisse: data.dateDebutCaisse || '2025-01-01',
          cotisationMensuelle: Number.isFinite(cotisationMensuelle) ? cotisationMensuelle : 5000,
          cotisationMoisSpecial: Number.isFinite(cotisationMoisSpecial) ? cotisationMoisSpecial : 10000,
          penaliteRetardActive: data.penaliteRetardActive ?? true,
          moisRetardAvantPenalite: Math.max(1, Number(data.moisRetardAvantPenalite) || 2),
          montantPenalite: Number.isFinite(Number(data.montantPenalite))
            ? Number(data.montantPenalite)
            : 1000,
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
      const contribs: ContributionDoc[] = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      })) as ContributionDoc[];

      setRawContributions(contribs);
      setIsLoading(false);
    }, (error) => {
      console.error('Erreur de chargement des contributions :', error);
      showToast('error', 'Impossible de charger les contributions.');
    });

    return () => unsubContributions();
  }, []);

  useEffect(() => {
    const unsubPenalites = onSnapshot(collection(db, 'penalites'), (snapshot) => {
      setPenalites(snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          membreId: data.membreId || '',
          moisDeclenchement: Number(data.moisDeclenchement) || 0,
          moisDeclenchementKey: data.moisDeclenchementKey || '',
          montantDu: Number(data.montantDu) || 0,
          montantPaye: Number(data.montantPaye) || 0,
          statut: data.statut || 'A_PAYER',
          dateCreation: data.dateCreation || '',
          dateDernierPaiement: data.dateDernierPaiement,
        } as PenaliteData;
      }));
    }, (error) => {
      console.error('Erreur de chargement des pénalités :', error);
      showToast('error', 'Impossible de charger les pénalités enregistrées.');
    });

    return () => unsubPenalites();
  }, []);

  // 4. FUSIONNER & CALCULER LES TOTAUX, LES MOIS PAYÉS ET LES DETTES
  useEffect(() => {
    if (membres.length === 0) return;

    const startKey = caisseConfig.dateDebutCaisse.substring(0, 7);
    const now = new Date();
    const currentKey = makeKey(now.getFullYear(), now.getMonth());

    // Tous les mois attendus entre le lancement de la caisse et aujourd'hui
    const moisAttendus = rangeKeys(startKey, currentKey);
    const montantMensuel = caisseConfig.cotisationMensuelle;

    const paidMap: Record<string, string[]> = {};

    const computed: StatutMembreContribution[] = membres.map((membre) => {
      const memberContribs = rawContributions
        .filter((c) => c.membreId === membre.id)
        .sort((a, b) => (a.datePaiement || '').localeCompare(b.datePaiement || ''));

      const montantTotalCotise = memberContribs.reduce((sum, c) => sum + (c.montantVerse || 0), 0);

      // Mois réellement payés : d'abord ceux enregistrés explicitement
      const paidSet = new Set<string>();
      memberContribs.forEach((c) => {
        const moisSelectionnes = c.moisSelectionnes ?? c.moisCouverts;
        if (Array.isArray(moisSelectionnes)) {
          moisSelectionnes.forEach((mois) => paidSet.add(mois.substring(0, 7)));
        }
      });

      // Anciennes contributions (sans liste de mois) : rattachées aux premiers mois libres
      memberContribs.forEach((c) => {
        if (!Array.isArray(c.moisSelectionnes) && !Array.isArray(c.moisCouverts)) {
          let key = startKey;
          for (let i = 0; i < (c.nombreMois || 0); i++) {
            let guard = 0;
            while (paidSet.has(key) && guard < 1200) {
              key = nextKey(key);
              guard++;
            }
            paidSet.add(key);
          }
        }
      });

      const paidKeys = Array.from(paidSet).sort();
      paidMap[membre.id] = paidKeys;

      const moisPayes = paidKeys.map(labelFromKey);
      const moisFutursPayes = paidKeys.filter((k) => k > currentKey).map(labelFromKey);
      const moisImpayesKeys = moisAttendus.filter((k) => !paidSet.has(k));
      const detteActuelle = moisImpayesKeys.length * montantMensuel;

      return {
        membre,
        totalContributionsCount: memberContribs.length,
        montantTotalCotise,
        detteActuelle,
        moisPayes,
        moisImpayes: moisImpayesKeys.map(labelFromKey),
        moisImpayesKeys,
        moisFutursPayes,
        dernierPaiementDate: memberContribs.length > 0
          ? new Date(memberContribs[memberContribs.length - 1].datePaiement).toLocaleDateString('fr-FR')
          : '-',
      };
    });

    setMoisPayesParMembre(paidMap);
    setContributionsData(computed);
  }, [membres, rawContributions, caisseConfig]);

  useEffect(() => {
    if (!configLoaded || isLoading || !caisseConfig.penaliteRetardActive || caisseConfig.montantPenalite <= 0) return;

    const enregistrerPenalites = async () => {
      try {
        await Promise.all(contributionsData.map((item) =>
          assurerPenalites(
            item.membre.id,
            item.moisImpayesKeys || [],
            caisseConfig.moisRetardAvantPenalite,
            caisseConfig.montantPenalite
          )
        ));
      } catch (error) {
        console.error('Erreur lors de l’enregistrement des pénalités :', error);
        showToast('error', 'Impossible d’enregistrer les nouvelles pénalités.');
      }
    };

    void enregistrerPenalites();
  }, [contributionsData, caisseConfig, configLoaded, isLoading]);

  useEffect(() => {
    if (!configLoaded || !caisseConfig.penaliteRetardActive) return;
    if (dernierMontantPenaliteSynchro.current === caisseConfig.montantPenalite) return;

    dernierMontantPenaliteSynchro.current = caisseConfig.montantPenalite;
    void synchroniserMontantPenalites(caisseConfig.montantPenalite).catch((error) => {
      dernierMontantPenaliteSynchro.current = null;
      console.error('Erreur de mise à jour des pénalités existantes :', error);
      showToast('error', 'Le nouveau montant est chargé, mais les pénalités encore dues n’ont pas pu être mises à jour.');
    });
  }, [caisseConfig.montantPenalite, caisseConfig.penaliteRetardActive, configLoaded]);

  // 5. ENREGISTRER UNE CONTRIBUTION DANS FIRESTORE (avec la liste exacte des mois)
  const handleAddContribution = async (formData: {
    membreId: string;
    nombreMois: number;
    moisSelectionnes: string[];
    modePaiement: string;
    note: string;
  }) => {
    try {
      const montantVerse = formData.nombreMois * caisseConfig.cotisationMensuelle;

      await addDoc(collection(db, 'contributions'), {
        membreId: formData.membreId,
        nombreMois: formData.nombreMois,
        moisSelectionnes: formData.moisSelectionnes,
        montantVerse,
        modePaiement: formData.modePaiement,
        note: formData.note,
        datePaiement: new Date().toISOString(),
      });

      showToast('success', `Contribution de ${montantVerse.toLocaleString()} FC enregistrée avec succès !`);
      setIsDrawerOpen(false);
    } catch (error) {
      console.error("Erreur lors de l'enregistrement de la contribution :", error);
      showToast('error', "Erreur lors de l'enregistrement de la contribution.");
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
        <span className={`font-semibold ${item.detteActuelle > 0 ? 'text-rose-600' : ''}`}>
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
  const totalPenalites = penalites.reduce((total, penalite) => total + soldePenalite(penalite), 0);

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
            Suivi basé sur le lancement de la caisse au <strong>{caisseConfig.dateDebutCaisse}</strong> ({caisseConfig.cotisationMensuelle.toLocaleString()} FC/mois).
          </p>
        </div>
        {activeTab === 'contributions' && (
          <button
            onClick={() => setIsDrawerOpen(true)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 text-sm font-semibold rounded-xl shadow-sm transition-colors"
          >
            <PlusCircle size={18} />
            Nouvelle Contribution
          </button>
        )}
      </div>

      <div className="flex w-fit rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
        <button
          type="button"
          onClick={() => setActiveTab('contributions')}
          className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition-all ${
            activeTab === 'contributions'
              ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-white'
              : 'text-slate-600 hover:text-slate-900 dark:text-slate-400'
          }`}
        >
          <PiggyBank size={15} /> Contributions
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

      {activeTab === 'contributions' && (
      <>
      {/* Cartes KPI des contributions */}
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-3">
        <div className="group relative min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm transition-all hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between gap-2">
            <span className="truncate text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Total Cotisé</span>
            <div className="shrink-0 rounded-lg bg-slate-100 p-2 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
              <PiggyBank size={18} />
            </div>
          </div>
          <p className="mt-2 text-lg sm:text-xl font-extrabold tabular-nums truncate">
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
          <p className="mt-2 text-lg sm:text-xl font-extrabold tabular-nums truncate">
            {totalDettes.toLocaleString()} <span className="text-xs font-normal text-slate-500">FC</span>
          </p>
        </div>

        <div className="group relative min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm transition-all hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
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

      {isLoading ? (
        <div className="p-8 text-center text-slate-500">Chargement des contributions en cours...</div>
      ) : (
        <DataTable
          data={contributionsData.map((d) => ({ ...d, id: d.membre.id }))}
          columns={columns}
          onView={openHistoriqueView}
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
        dateDebutCaisse={caisseConfig.dateDebutCaisse}
        montantMensuelDefaut={caisseConfig.cotisationMensuelle}
        moisDejaPayesParMembre={moisPayesParMembre}
        onSubmit={handleAddContribution}
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