export interface CsvColumn<T> {
  header: string;
  value: (row: T) => string | number | boolean | null | undefined;
}

export const exportCsv = <T,>(
  filename: string,
  columns: readonly CsvColumn<T>[],
  rows: readonly T[]
): void => {
  const escapeCell = (value: string | number | boolean | null | undefined): string => {
    const rawValue = String(value ?? '');
    const safeValue = typeof value === 'string' && /^[\s]*[=+\-@]/.test(rawValue)
      ? `'${rawValue}`
      : rawValue;
    return `"${safeValue.replace(/"/g, '""')}"`;
  };
  const lines = [
    columns.map((column) => escapeCell(column.header)).join(';'),
    ...rows.map((row) => columns.map((column) => escapeCell(column.value(row))).join(';')),
  ];
  const blob = new Blob([`\uFEFF${lines.join('\r\n')}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
};
