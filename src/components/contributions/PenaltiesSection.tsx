import React from 'react';
import { AlertCircle, CalendarDays, CheckCircle, ShieldAlert } from 'lucide-react';
import DataTable, { Column } from '@/src/components/ui/DataTable';
import { normaliserDateFirestore } from '@/src/lib/contribution-months';
import { Penalite, soldePenalite } from '@/src/lib/penalties';
import PageSkeleton from '@/src/components/ui/PageSkeleton';

export interface PenaliteAvecMembre extends Penalite {
  nomMembre: string;
}

interface PenaltiesSectionProps {
  penalites: PenaliteAvecMembre[];
  totalDu: number;
  totalPaye: number;
  soldeTotal: number;
  nombrePaiements: number;
  isLoading: boolean;
  onExport?: (rows: readonly PenaliteAvecMembre[]) => void;
  exportLabel?: string;
}

export default function PenaltiesSection({
  penalites,
  totalDu,
  totalPaye,
  soldeTotal,
  nombrePaiements,
  isLoading,
  onExport,
  exportLabel,
}: PenaltiesSectionProps) {
  const columns: Column<PenaliteAvecMembre>[] = [
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
      accessor: (item) => <span className="font-semibold ">{item.montantPaye.toLocaleString('fr-FR')} FC</span>,
    },
    {
      header: 'Solde',
      accessor: (item) => {
        const solde = soldePenalite(item);
        return <span className={`font-semibold ${solde > 0}`}>{solde.toLocaleString('fr-FR')} FC</span>;
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
    <>
      {isLoading ? (
        <PageSkeleton layout="cards-table" cards={4} columns={7} rows={5} />
      ) : (
        <>
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <div className="group relative min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between gap-2">
            <span className="truncate text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Pénalités enregistrées</span>
            <div className="shrink-0 rounded-lg bg-slate-100 p-2 text-slate-700 dark:bg-slate-800 dark:text-slate-300"><ShieldAlert size={18} /></div>
          </div>
          <p className="mt-2 truncate text-lg font-extrabold tabular-nums sm:text-xl">{totalDu.toLocaleString('fr-FR')} <span className="text-xs font-normal text-slate-500">FC</span></p>
        </div>
        <div className="group relative min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between gap-2">
            <span className="truncate text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Pénalités payées</span>
            <div className="shrink-0 rounded-lg bg-emerald-50 p-2 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"><CheckCircle size={18} /></div>
          </div>
          <p className="mt-2 truncate text-lg font-extrabold tabular-nums  sm:text-xl">{totalPaye.toLocaleString('fr-FR')} <span className="text-xs font-normal text-slate-500">FC</span></p>
        </div>
        <div className="group relative min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between gap-2">
            <span className="truncate text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Solde à recouvrer</span>
            <div className="shrink-0 rounded-lg bg-rose-50 p-2 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300"><AlertCircle size={18} /></div>
          </div>
          <p className="mt-2 truncate text-lg font-extrabold tabular-nums sm:text-xl">{soldeTotal.toLocaleString('fr-FR')} <span className="text-xs font-normal text-slate-500">FC</span></p>
        </div>
        <div className="group relative min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between gap-2">
            <span className="truncate text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Paiements enregistrés</span>
            <div className="shrink-0 rounded-lg bg-slate-100 p-2 text-slate-700 dark:bg-slate-800 dark:text-slate-300"><CalendarDays size={18} /></div>
          </div>
          <p className="mt-2 truncate text-lg font-extrabold tabular-nums sm:text-xl">{nombrePaiements} <span className="text-xs font-normal text-slate-500">Paiement(s)</span></p>
        </div>
      </div>
      {penalites.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-500 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          Aucune pénalité n’est enregistrée pour le moment.
        </div>
      ) : (
        <DataTable
          data={penalites}
          columns={columns}
          searchKey="nomMembre"
          searchPlaceholder="Rechercher un membre..."
          exportFilename="rapport-penalites"
          exportLabel={exportLabel}
          onExport={onExport}
        />
      )}
        </>
      )}
    </>
  );
}
