'use client';

import React, { useState } from 'react';
import { Search, Eye, Edit, Trash2, Download } from 'lucide-react';
import { exportCsv, type CsvColumn } from '@/src/lib/export-csv';

export interface Column<T> {
  header: string;
  accessor: keyof T | ((item: T) => React.ReactNode);
  exportValue?: (item: T) => string | number | boolean | null | undefined;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  searchKey?: keyof T;
  searchPlaceholder?: string;
  exportFilename?: string;
  exportLabel?: string;
  exportColumns?: readonly CsvColumn<T>[];
  onExport?: (rows: readonly T[]) => void;
  onView?: (item: T) => void;
  onEdit?: (item: T) => void;
  onDelete?: (item: T) => void;
}

export default function DataTable<T extends { id: string }>({
  data,
  columns,
  searchKey,
  searchPlaceholder = 'Rechercher...',
  exportFilename = 'tableau',
  exportLabel = 'Exporter',
  exportColumns,
  onExport,
  onView,
  onEdit,
  onDelete,
}: DataTableProps<T>) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredData = data.filter((item) => {
    if (!searchTerm) return true;
    const searchableValues = searchKey
      ? [item[searchKey], ...Object.values(item)]
      : Object.values(item);
    return searchableValues.some((value) =>
      searchableText(value).toLocaleLowerCase().includes(searchTerm.toLocaleLowerCase())
    );
  });

  const columnsForExport: readonly CsvColumn<T>[] = exportColumns ?? columns.map((column) => ({
    header: column.header,
    value: (item: T) => {
      if (column.exportValue) return column.exportValue(item);
      if (typeof column.accessor !== 'function') {
        const value = item[column.accessor];
        return typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean'
          ? value
          : JSON.stringify(value ?? '');
      }
      return reactNodeToText(column.accessor(item));
    },
  }));

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-3 border-b border-slate-200 p-3 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between sm:p-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder={searchPlaceholder}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-10 pr-4 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-300 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:bg-slate-900 dark:focus:ring-slate-700"
            />
          </div>
          <button
            type="button"
            onClick={() => onExport
              ? onExport(filteredData)
              : exportCsv(exportFilename, columnsForExport, filteredData)}
            disabled={filteredData.length === 0}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-800 shadow-sm transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:hover:bg-slate-800"
          >
            <Download size={16} />
            {exportLabel}
          </button>
        </div>

      {/* Tableau */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[620px] border-collapse text-left">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:bg-slate-950/70 dark:text-slate-400">
              {columns.map((col, index) => (
                <th key={index} className="px-4 py-3.5 sm:px-6">
                  {col.header}
                </th>
              ))}
              {(onView || onEdit || onDelete) && (
                <th className="px-4 py-3.5 text-right sm:px-6">Actions</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm text-slate-700 dark:divide-slate-800 dark:text-slate-300">
            {filteredData.length > 0 ? (
              filteredData.map((item) => (
                <tr key={item.id} className="transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-800/50">
                  {columns.map((col, colIndex) => {
                    const cellValue =
                      typeof col.accessor === 'function'
                        ? col.accessor(item)
                        : (item[col.accessor] as React.ReactNode);

                    return (
                      <td key={colIndex} className="px-4 py-3.5 sm:px-6 sm:py-4">
                        {cellValue}
                      </td>
                    );
                  })}

                  {/* Colonne des actions */}
                  {(onView || onEdit || onDelete) && (
                    <td className="space-x-1 whitespace-nowrap px-4 py-3.5 text-right sm:space-x-2 sm:px-6 sm:py-4">
                      {onView && (
                        <button
                          onClick={() => onView(item)}
                          className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-white"
                          title="Voir"
                        >
                          <Eye size={16} />
                        </button>
                      )}
                      {onEdit && (
                        <button
                          onClick={() => onEdit(item)}
                          className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-white"
                          title="Modifier"
                        >
                          <Edit size={16} />
                        </button>
                      )}
                      {onDelete && (
                        <button
                          onClick={() => onDelete(item)}
                          className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-white"
                          title="Supprimer"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={columns.length + 1}
                  className="px-6 py-8 text-center text-sm text-slate-400"
                >
                  Aucune donnée trouvée.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const reactNodeToText = (node: React.ReactNode): string => {
  if (node === null || node === undefined || typeof node === 'boolean') return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(reactNodeToText).filter(Boolean).join(' ');
  if (React.isValidElement<{ children?: React.ReactNode }>(node)) {
    return reactNodeToText(node.props.children);
  }
  return '';
};

const searchableText = (value: unknown): string => {
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) return value.map(searchableText).join(' ');
  if (value && typeof value === 'object') return Object.values(value).map(searchableText).join(' ');
  return '';
};