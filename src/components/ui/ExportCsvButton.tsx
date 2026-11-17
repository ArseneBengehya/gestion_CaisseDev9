'use client';

import React from 'react';
import { Download } from 'lucide-react';
import { exportCsv, type CsvColumn } from '@/src/lib/export-csv';

interface ExportCsvButtonProps<T> {
  filename: string;
  columns: readonly CsvColumn<T>[];
  rows: readonly T[];
  label?: string;
  disabled?: boolean;
}

export default function ExportCsvButton<T>({
  filename,
  columns,
  rows,
  label = 'Exporter CSV',
  disabled = false,
}: ExportCsvButtonProps<T>) {
  return (
    <button
      type="button"
      onClick={() => exportCsv(filename, columns, rows)}
      disabled={disabled}
      className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 shadow-sm transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:hover:bg-slate-800"
    >
      <Download size={17} />
      {label}
    </button>
  );
}
