'use client';

import React, { useState, useEffect } from 'react';
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  ArrowRight,
} from 'lucide-react';
import Link from 'next/link';

// Import Firestore
import { collection, doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/src/lib/firebase';
import { assurerPenalites, moisImpayesPour, nombreMoisAttendus } from '@/src/lib/penalties';

interface ActiviteRecente {
  id: string;
  type: 'entree' | 'depense';
  membre: string;
  montant: number;
  date: string;
  description: string;
}

interface MembreDashboard {
  id: string;
  nom?: string;
  prenom?: string;
  nomComplet?: string;
  statut?: string;
}

interface ContributionDashboard {
  id: string;
  membreId: string;
  nombreMois: number;
  moisSelectionnes?: string[];
  moisCouverts?: string[];
  montantVerse: number;
  datePaiement?: string;
}

interface DepenseDashboard {
  id: string;
  montant: number;
  dateDepense?: string;
  approuvePar?: string;
  motif?: string;
}

interface PaiementPenaliteDashboard {
  id: string;
  membreId: string;
  montant: number;
  datePaiement?: string;
}

export default function AdminDashboardPage() {
  const [totalContributions, setTotalContributions] = useState(0);
  const [totalDepenses, setTotalDepenses] = useState(0);
  const [membresActifs, setMembresActifs] = useState(0);
  const [membresEnRetard, setMembresEnRetard] = useState(0);
  const [activitesRecentes, setActivitesRecentes] = useState<ActiviteRecente[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let membresData: MembreDashboard[] = [];
    let contributionsData: ContributionDashboard[] = [];
    let depensesData: DepenseDashboard[] = [];
    let paiementsPenalitesData: PaiementPenaliteDashboard[] = [];
    let caisseConfig = {
      dateDebutCaisse: '2025-01-01',
      penaliteRetardActive: true,
      moisRetardAvantPenalite: 2,
      montantPenalite: 1000,
    };
    let dernierCalculPenalites = '';
    const loaded = { membres: false, contributions: false, depenses: false, paiements: false, config: false };

    const recalculer = () => {
      const membresActifsData = membresData.filter((membre) => membre.statut !== 'INACTIF');
      setMembresActifs(membresActifsData.length);

      const moisAttendus = nombreMoisAttendus(caisseConfig.dateDebutCaisse);
      setMembresEnRetard(membresActifsData.filter((membre) => {
        const contributionsMembre = contributionsData
          .filter((contribution) => contribution.membreId === membre.id)
          .map((contribution) => ({
            nombreMois: contribution.nombreMois,
            moisSelectionnes: contribution.moisSelectionnes ?? contribution.moisCouverts,
          }));
        return moisImpayesPour(caisseConfig.dateDebutCaisse, moisAttendus, contributionsMembre).length > 0;
      }).length);

      if (
        loaded.config &&
        loaded.membres &&
        loaded.contributions &&
        caisseConfig.penaliteRetardActive &&
        caisseConfig.montantPenalite > 0
      ) {
        const fingerprint = JSON.stringify([
          caisseConfig,
          membresActifsData.map((membre) => membre.id),
          contributionsData.map(({ id, nombreMois, moisSelectionnes, moisCouverts }) => [
            id, nombreMois, moisSelectionnes, moisCouverts,
          ]),
        ]);
        if (fingerprint !== dernierCalculPenalites) {
          dernierCalculPenalites = fingerprint;
          void Promise.all(membresActifsData.map((membre) => {
            const contributionsMembre = contributionsData
              .filter((contribution) => contribution.membreId === membre.id)
              .map((contribution) => ({
                nombreMois: contribution.nombreMois,
                moisSelectionnes: contribution.moisSelectionnes ?? contribution.moisCouverts,
              }));
            const moisImpayes = moisImpayesPour(
              caisseConfig.dateDebutCaisse,
              moisAttendus,
              contributionsMembre
            );
            return assurerPenalites(
              membre.id,
              moisImpayes,
              caisseConfig.moisRetardAvantPenalite,
              caisseConfig.montantPenalite
            );
          })).catch((error) => {
            console.error('Erreur d’enregistrement des pénalités depuis le tableau de bord :', error);
          });
        }
      }

      const nomMembre = (membreId: string) => {
        const membre = membresData.find((item) => item.id === membreId);
        return membre?.nomComplet || `${membre?.prenom || ''} ${membre?.nom || ''}`.trim() || 'Membre';
      };
      const dateMouvement = (date?: string) =>
        date ? String(date).split('T')[0] : new Date().toISOString().split('T')[0];

      const cotisations: ActiviteRecente[] = contributionsData.map((contribution) => ({
        id: `contribution_${contribution.id}`,
        type: 'entree',
        membre: nomMembre(contribution.membreId),
        montant: contribution.montantVerse,
        date: dateMouvement(contribution.datePaiement),
        description: `Cotisation (${contribution.nombreMois || 1} mois)`,
      }));

      const penalitesPayees: ActiviteRecente[] = paiementsPenalitesData.map((paiement) => ({
        id: `penalite_${paiement.id}`,
        type: 'entree',
        membre: nomMembre(paiement.membreId),
        montant: paiement.montant,
        date: dateMouvement(paiement.datePaiement),
        description: 'Paiement de pénalité',
      }));

      const depenses: ActiviteRecente[] = depensesData.map((depense) => ({
        id: `depense_${depense.id}`,
        type: 'depense',
        membre: depense.approuvePar || 'Admin',
        montant: depense.montant,
        date: dateMouvement(depense.dateDepense),
        description: depense.motif || 'Dépense caisse',
      }));

      const totalCotisationsVersees = contributionsData.reduce((total, item) => total + item.montantVerse, 0);
      const totalPenalitesPayees = paiementsPenalitesData.reduce((total, item) => total + item.montant, 0);
      setTotalContributions(totalCotisationsVersees + totalPenalitesPayees);
      setTotalDepenses(depensesData.reduce((total, item) => total + item.montant, 0));
      setActivitesRecentes(
        [...cotisations, ...penalitesPayees, ...depenses]
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
          .slice(0, 5)
      );

      setIsLoading(!Object.values(loaded).every(Boolean));
    };

    const unsubMembres = onSnapshot(collection(db, 'membres'), (snapshot) => {
      membresData = snapshot.docs.map((item) => {
        const data = item.data();
        return {
          id: item.id,
          nom: data.nom || '',
          prenom: data.prenom || '',
          nomComplet: data.nomComplet || '',
          statut: data.statut || 'ACTIF',
        };
      });
      loaded.membres = true;
      recalculer();
    }, (error) => {
      console.error('Erreur de chargement des membres du tableau de bord :', error);
      loaded.membres = true;
      recalculer();
    });

    const unsubContribs = onSnapshot(collection(db, 'contributions'), (snapshot) => {
      contributionsData = snapshot.docs.map((item) => {
        const data = item.data();
        return {
          id: item.id,
          membreId: data.membreId || '',
          nombreMois: Number(data.nombreMois) || 0,
          moisSelectionnes: Array.isArray(data.moisSelectionnes) ? data.moisSelectionnes : undefined,
          moisCouverts: Array.isArray(data.moisCouverts) ? data.moisCouverts : undefined,
          montantVerse: Number(data.montantVerse) || 0,
          datePaiement: data.datePaiement || '',
        };
      });
      loaded.contributions = true;
      recalculer();
    }, (error) => {
      console.error('Erreur de chargement des contributions du tableau de bord :', error);
      loaded.contributions = true;
      recalculer();
    });

    const unsubDepenses = onSnapshot(collection(db, 'depenses'), (snapshot) => {
      depensesData = snapshot.docs.map((item) => {
        const data = item.data();
        return {
          id: item.id,
          montant: Number(data.montant) || 0,
          dateDepense: data.dateDepense || '',
          approuvePar: data.approuvePar || '',
          motif: data.motif || '',
        };
      });
      loaded.depenses = true;
      recalculer();
    }, (error) => {
      console.error('Erreur de chargement des dépenses du tableau de bord :', error);
      loaded.depenses = true;
      recalculer();
    });

    const unsubPaiementsPenalites = onSnapshot(collection(db, 'paiements_penalites'), (snapshot) => {
      paiementsPenalitesData = snapshot.docs.map((item) => {
        const data = item.data();
        return {
          id: item.id,
          membreId: data.membreId || '',
          montant: Number(data.montant) || 0,
          datePaiement: data.datePaiement || '',
        };
      });
      loaded.paiements = true;
      recalculer();
    }, (error) => {
      console.error('Erreur de chargement des paiements de pénalités :', error);
      loaded.paiements = true;
      recalculer();
    });

    const unsubConfig = onSnapshot(doc(db, 'settings', 'caisse_config'), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        const montantPenalite = Number(data.montantPenalite ?? 1000);
        caisseConfig = {
          dateDebutCaisse: data.dateDebutCaisse || '2025-01-01',
          penaliteRetardActive: data.penaliteRetardActive ?? true,
          moisRetardAvantPenalite: Math.max(1, Number(data.moisRetardAvantPenalite) || 2),
          montantPenalite: Number.isFinite(montantPenalite) ? montantPenalite : 1000,
        };
      }
      loaded.config = true;
      recalculer();
    }, (error) => {
      console.error('Erreur de chargement des paramètres du tableau de bord :', error);
      loaded.config = true;
      recalculer();
    });

    return () => {
      unsubMembres();
      unsubContribs();
      unsubDepenses();
      unsubPaiementsPenalites();
      unsubConfig();
    };
  }, []);

  const soldeActuel = totalContributions - totalDepenses;
  const tauxDepenses = totalContributions > 0 ? Math.round((totalDepenses / totalContributions) * 100) : 0;

  return (
    <div className="space-y-8 pb-2">
      {/* En-tête du Dashboard */}
      <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-600 ring-1 ring-inset ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-slate-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-slate-900 dark:bg-white" />
            </span>
            Tableau de bord 
          </span>
          <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
            Suivez les mouvements et la situation globale de la Caisse
          </p>
        </div>
      </div>

      {/* Cartes KPI */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {/* Solde Total */}
        <div className="group relative min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white p-3.5 text-slate-900 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:shadow-none">
          <div className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full bg-slate-100/50 blur-2xl dark:bg-slate-800/50" />
          <div className="relative flex items-center justify-between gap-2">
            <span className="truncate text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Solde en caisse</span>
            <div className="shrink-0 rounded-lg bg-slate-100 p-1.5 text-slate-700 ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700">
              <Wallet size={15} />
            </div>
          </div>
          <p className="relative mt-2 whitespace-nowrap text-lg font-extrabold tabular-nums tracking-tight xl:text-xl">
            {soldeActuel.toLocaleString()} <span className="text-xs font-medium text-slate-500 dark:text-slate-400">FC</span>
          </p>
          <span className="relative mt-1.5 inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
            <ArrowUpRight size={12} /> Calcul en direct
          </span>
        </div>

        {/* Total Cotisations */}
        <div className="group relative min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
          <div className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full bg-slate-100/50 blur-2xl dark:bg-slate-800/50" />
          <div className="flex items-center justify-between gap-2">
            <span className="truncate text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Total des entrées</span>
            <div className="shrink-0 rounded-lg bg-slate-100 p-1.5 text-slate-700 ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700">
              <TrendingUp size={15} />
            </div>
          </div>
          <p className="relative mt-2 whitespace-nowrap text-lg font-extrabold tabular-nums tracking-tight xl:text-xl text-emerald-600 dark:text-emerald-400">
            +{totalContributions.toLocaleString()} <span className="text-xs font-normal text-slate-500 dark:text-slate-400">FC</span>
          </p>
          <p className="mt-1.5 text-[11px] text-slate-500 dark:text-slate-400">Cotisations + pénalités payées</p>
        </div>

        {/* Total Dépenses */}
        <div className="group relative min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
          <div className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full bg-slate-100/50 blur-2xl dark:bg-slate-800/50" />
          <div className="flex items-center justify-between gap-2">
            <span className="truncate text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Total dépenses</span>
            <div className="shrink-0 rounded-lg bg-slate-100 p-1.5 text-slate-700 ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700">
              <TrendingDown size={15} />
            </div>
          </div>
          <p className="relative mt-2 whitespace-nowrap text-lg font-extrabold tabular-nums tracking-tight xl:text-xl text-rose-600 dark:text-rose-400">
            -{totalDepenses.toLocaleString()} <span className="text-xs font-normal text-slate-500 dark:text-slate-400">FC</span>
          </p>
          <div className="mt-1.5 flex items-center gap-2">
            <div className="h-1 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
              <div className="h-full rounded-full bg-rose-600 dark:bg-rose-500" style={{ width: `${tauxDepenses}%` }} />
            </div>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">{tauxDepenses}%</span>
          </div>
        </div>

        {/* Retards de Paiement */}
        <div className="group relative min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
          <div className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full bg-slate-100/50 blur-2xl dark:bg-slate-800/50" />
          <div className="flex items-center justify-between gap-2">
            <span className="truncate text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Membres en retard</span>
            <div className="shrink-0 rounded-lg bg-slate-100 p-1.5 text-slate-700 ring-1 ring-inset ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700">
              <AlertTriangle size={15} />
            </div>
          </div>
          <p className="relative mt-2 whitespace-nowrap text-lg font-extrabold tabular-nums tracking-tight xl:text-xl text-rose-600 dark:text-rose-400">
            {membresEnRetard} <span className="text-xs font-normal text-slate-500 dark:text-slate-400">/ {membresActifs}</span>
          </p>
          <Link
            href="/dashboard/retards"
            className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-semibold text-slate-900 transition-colors hover:underline dark:text-white"
          >
            Voir les retards <ArrowRight size={12} aria-hidden="true" className="transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </div>

      {/* Section Activités Récentes */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-1 border-b border-slate-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <span className="h-5 w-1 rounded-full bg-slate-900 dark:bg-white" />
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Derniers mouvements de caisse</h3>
          </div>
          <span className="inline-flex w-fit items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            {activitesRecentes.length} récentes opérations
          </span>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-slate-500">Chargement des données du tableau de bord...</div>
        ) : activitesRecentes.length === 0 ? (
          <div className="p-8 text-center text-slate-500">Aucun mouvement enregistré pour le moment.</div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {activitesRecentes.map((act) => {
              const estEntree = act.type === 'entree';
              return (
                <div
                  key={act.id}
                  className="flex flex-col gap-2 px-4 py-3.5 transition-colors hover:bg-slate-50 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-6 dark:hover:bg-slate-800/40"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div
                      className={`shrink-0 rounded-xl p-2.5 ring-1 ring-inset ${
                        estEntree
                          ? 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:ring-emerald-900/50'
                          : 'bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:ring-rose-900/50'
                      }`}
                    >
                      {estEntree ? <ArrowUpRight size={18} /> : <ArrowDownRight size={18} />}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">{act.description}</p>
                        <span
                          className={`hidden shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide sm:inline-block ${
                            estEntree
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                              : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                          }`}
                        >
                          {estEntree ? 'Entrée' : 'Sortie'}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                        Par <strong className="font-semibold text-slate-700 dark:text-slate-300">{act.membre}</strong> ·{' '}
                        {isNaN(new Date(act.date).getTime()) 
                          ? act.date 
                          : new Date(`${act.date}T00:00:00`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`pl-12 text-sm font-bold tabular-nums sm:pl-0 sm:text-right ${
                      estEntree ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                    }`}
                  >
                    {estEntree ? '+' : '-'}
                    {act.montant.toLocaleString()} FC
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}