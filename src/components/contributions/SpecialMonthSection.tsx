import React from 'react';
import { CalendarDays, PiggyBank } from 'lucide-react';
import DataTable, { Column } from '@/src/components/ui/DataTable';
import PageSkeleton from '@/src/components/ui/PageSkeleton';
import type { StatutMoisCotisation } from '@/src/types';

export interface ContributionSpeciale {
  id: string;
  nomMembre: string;
  moisSpecial: string;
  montantRequis: number;
  montantVerse: number;
  montantRestant: number;
  statut: StatutMoisCotisation;
  modePaiement: string;
  datePaiement: string;
}

interface SpecialMonthSectionProps {
  contributions: ContributionSpeciale[];
  total: number;
  nombreVersements: number;
  isLoading: boolean;
  onExport?: (rows: readonly ContributionSpeciale[]) => void;
  exportLabel?: string;
}

export default function SpecialMonthSection({
  contributions,
  total,
  nombreVersements,
  isLoading,
  onExport,
  exportLabel,
}: SpecialMonthSectionProps) {
  const columns: Column<ContributionSpeciale>[] = [
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
      header: 'Montant requis',
      accessor: (item) => (
        <div>
          <span className="font-semibold">{item.montantRequis.toLocaleString('fr-FR')} FC</span>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Payé : {item.montantVerse.toLocaleString('fr-FR')} FC
            <span className="mx-1">·</span>
            Solde : {item.montantRestant.toLocaleString('fr-FR')} FC
          </p>
          {item.datePaiement && (
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Dernier paiement : {new Date(item.datePaiement).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}
            </p>
          )}
        </div>
      ),
    },
    { header: 'Mode de paiement', accessor: 'modePaiement' },
    {
      header: 'Statut',
      accessor: (item) => {
        const label = item.statut === 'PAYE'
          ? 'Payé'
          : item.statut === 'EN_COURS'
            ? 'En cours'
            : 'En attente';
        const color = item.statut === 'PAYE'
          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
          : item.statut === 'EN_COURS'
            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
            : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
        return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${color}`}>{label}</span>;
      },
    },
  ];

  return (
    <>
      {isLoading ? (
        <PageSkeleton layout="cards-table" cards={2} columns={5} rows={5} />
      ) : (
        <>
      <div className="grid grid-cols-2 gap-3">
        <div className="group relative min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between gap-2">
            <span className="truncate text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Total mois spéciaux versés</span>
            <div className="shrink-0 rounded-lg bg-slate-100 p-2 text-slate-700 dark:bg-slate-800 dark:text-slate-300"><PiggyBank size={18} /></div>
          </div>
          <p className="mt-2 truncate text-lg font-extrabold tabular-nums sm:text-xl">
            {total.toLocaleString()} <span className="text-xs font-normal text-slate-500">FC</span>
          </p>
        </div>
        <div className="group relative min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between gap-2">
            <span className="truncate text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Versements enregistrés</span>
            <div className="shrink-0 rounded-lg bg-slate-100 p-2 text-slate-700 dark:bg-slate-800 dark:text-slate-300"><CalendarDays size={18} /></div>
          </div>
          <p className="mt-2 truncate text-lg font-extrabold tabular-nums sm:text-xl">
            {nombreVersements} <span className="text-xs font-normal text-slate-500">Paiement(s)</span>
          </p>
        </div>
      </div>
        <DataTable
          data={contributions}
          columns={columns}
          searchKey="nomMembre"
          searchPlaceholder="Rechercher un membre..."
          exportFilename="rapport-mois-special"
          exportLabel={exportLabel}
          onExport={onExport}
        />
        </>
      )}
    </>
  );
}
