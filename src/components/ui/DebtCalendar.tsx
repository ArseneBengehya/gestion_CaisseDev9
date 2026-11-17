'use client';

import React, { useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';

export interface MonthlyDebtMember {
  id: string;
  nom: string;
  montant: number;
}

interface DebtCalendarProps {
  dettesParMois: Record<string, MonthlyDebtMember[]>;
  moisActuel: string;
  moisDebutCaisse: string;
}

const formatMonthKey = (year: number, month: number): string =>
  `${year}-${String(month + 1).padStart(2, '0')}`;

export default function DebtCalendar({
  dettesParMois,
  moisActuel,
  moisDebutCaisse,
}: DebtCalendarProps) {
  const currentYear = Number(moisActuel.slice(0, 4));
  const [year, setYear] = useState(currentYear);
  const [selectedMonth, setSelectedMonth] = useState(moisActuel);
  const selectedDebtors = dettesParMois[selectedMonth] || [];
  const isBeforeStart = selectedMonth < moisDebutCaisse;
  const isFuture = selectedMonth > moisActuel;

  const months = Array.from({ length: 12 }, (_, index) => {
    const key = formatMonthKey(year, index);
    return {
      key,
      label: new Date(year, index, 1).toLocaleDateString('fr-FR', { month: 'long' }),
      debtors: dettesParMois[key] || [],
    };
  });

  const selectYear = (nextYear: number) => {
    setYear(nextYear);
    const monthIndex = Number(selectedMonth.slice(5, 7)) - 1;
    setSelectedMonth(formatMonthKey(nextYear, monthIndex));
  };

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 dark:border-slate-800">
        <div className="flex items-center gap-2.5">
          <CalendarDays size={19} className="text-slate-600 dark:text-slate-300" />
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">Calendrier mensuel des dettes</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Sélectionnez un mois pour voir les membres concernés.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => selectYear(year - 1)}
            aria-label="Année précédente"
            className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <ChevronLeft size={17} />
          </button>
          <span className="min-w-16 text-center text-sm font-bold text-slate-900 dark:text-white">{year}</span>
          <button
            type="button"
            onClick={() => selectYear(year + 1)}
            aria-label="Année suivante"
            className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <ChevronRight size={17} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3 lg:grid-cols-4 sm:p-6">
        {months.map((month) => {
          const isSelected = selectedMonth === month.key;
          const isMonthBeforeStart = month.key < moisDebutCaisse;
          const isMonthFuture = month.key > moisActuel;
          return (
            <button
              key={month.key}
              type="button"
              onClick={() => setSelectedMonth(month.key)}
              className={`min-h-24 rounded-xl border p-3 text-left transition-colors ${
                isSelected
                  ? 'border-slate-900 bg-gray-600 text-white dark:border-white dark:bg-white dark:text-slate-900'
                  : 'border-slate-300 bg-white text-slate-900 hover:border-slate-200 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:hover:border-slate-500'
              }`}
            >
              <span className="text-sm font-bold capitalize">{month.label}</span>
              <span className={`mt-2 block text-xs ${isSelected ? 'opacity-75' : 'text-slate-500 dark:text-slate-400'}`}>
                {isMonthBeforeStart
                  ? 'Avant le début'
                  : isMonthFuture
                    ? 'À venir'
                    : `${month.debtors.length} membre(s) en dette`}
              </span>
              {!isMonthBeforeStart && !isMonthFuture && month.debtors.length > 0 && (
                <span className={`mt-1 block truncate text-xs font-medium ${isSelected ? 'opacity-90' : 'font-semibold'}`}>
                  {month.debtors.slice(0, 2).map((debtor) => debtor.nom).join(', ')}
                  {month.debtors.length > 2 ? '…' : ''}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="border-t border-slate-100 px-4 py-4 sm:px-6 dark:border-slate-800">
        <h3 className="text-sm font-bold capitalize text-slate-900 dark:text-white">
          {new Date(Number(selectedMonth.slice(0, 4)), Number(selectedMonth.slice(5, 7)) - 1, 1)
            .toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
        </h3>
        {isBeforeStart ? (
          <p className="mt-2 text-sm text-slate-500">La caisse n’avait pas encore commencé ce mois-là.</p>
        ) : isFuture ? (
          <p className="mt-2 text-sm text-slate-500">Ce mois n’est pas encore arrivé.</p>
        ) : selectedDebtors.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">Aucun membre en dette pour ce mois.</p>
        ) : (
          <ul className="mt-3 divide-y divide-slate-100 dark:divide-slate-800">
            {selectedDebtors.map((debtor) => (
              <li key={debtor.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                <span className="font-medium text-slate-700 dark:text-slate-200">{debtor.nom}</span>
                <span className="whitespace-nowrap font-semibold">
                  {debtor.montant.toLocaleString('fr-FR')} FC
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
