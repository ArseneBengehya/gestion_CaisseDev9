import { AlertCircle, CheckCircle, PiggyBank } from 'lucide-react';
import DataTable, { Column } from '@/src/components/ui/DataTable';
import PageSkeleton from '@/src/components/ui/PageSkeleton';
import type { StatutMembreContribution } from '@/src/types';

export interface ContributionMemberRow extends StatutMembreContribution {
  id: string;
}

interface ContributionsMembersSectionProps {
  data: ContributionMemberRow[];
  columns: Column<ContributionMemberRow>[];
  totalCotisations: number;
  totalDettes: number;
  membresAJour: number;
  nombreMembres: number;
  isLoading: boolean;
  onView: (item: StatutMembreContribution) => void;
  onExport: (rows: readonly ContributionMemberRow[]) => void;
}

export default function ContributionsMembersSection({
  data,
  columns,
  totalCotisations,
  totalDettes,
  membresAJour,
  nombreMembres,
  isLoading,
  onView,
  onExport,
}: ContributionsMembersSectionProps) {
  if (isLoading) {
    return <PageSkeleton layout="cards-table" cards={3} columns={6} rows={6} />;
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <div className="group relative min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm transition-all hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between gap-2">
            <span className="truncate text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Total Cotisé</span>
            <div className="shrink-0 rounded-lg bg-emerald-50 p-1.5 text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900/50">
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
            <div className="shrink-0 rounded-lg bg-rose-50 p-1.5 text-rose-700 ring-1 ring-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:ring-rose-900/50">
              <AlertCircle size={18} />
            </div>
          </div>
          <p className="mt-2 truncate text-lg font-extrabold tabular-nums sm:text-xl">
            {totalDettes.toLocaleString()} <span className="text-xs font-normal text-slate-500">FC</span>
          </p>
        </div>

        <div className="group relative min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm transition-all hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between gap-2">
            <span className="truncate text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Membres à jour</span>
            <div className="shrink-0 rounded-lg bg-emerald-50 p-1.5 text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900/50">
              <CheckCircle size={18} />
            </div>
          </div>
          <p className="mt-2 truncate text-lg font-extrabold tabular-nums text-slate-900 dark:text-white sm:text-xl">
            {membresAJour} <span className="text-xs font-normal text-slate-500">/ {nombreMembres}</span>
          </p>
        </div>
      </div>

      <DataTable
        data={data}
        columns={columns}
        exportFilename="rapport-cotisations"
        exportLabel="Exporter le rapport"
        onExport={onExport}
        onView={onView}
      />
    </>
  );
}
