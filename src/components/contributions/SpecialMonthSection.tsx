import React from 'react';
import { CalendarDays, PiggyBank } from 'lucide-react';
import DataTable, { Column } from '@/src/components/ui/DataTable';
import PageSkeleton from '@/src/components/ui/PageSkeleton';

export interface ContributionSpeciale {
  id: string;
  nomMembre: string;
  moisSpecial: string;
  montantVerse: number;
  modePaiement: string;
  datePaiement: string;
}

interface SpecialMonthSectionProps {
  contributions: ContributionSpeciale[];
  total: number;
  isLoading: boolean;
}

export default function SpecialMonthSection({
  contributions,
  total,
  isLoading,
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
            {contributions.length} <span className="text-xs font-normal text-slate-500">Paiement(s)</span>
          </p>
        </div>
      </div>
        <DataTable
          data={contributions}
          columns={columns}
          searchKey="nomMembre"
          searchPlaceholder="Rechercher un membre..."
        />
        </>
      )}
    </>
  );
}
