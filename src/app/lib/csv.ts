export function safeCsvCell(value: unknown): string {
  let text = String(value ?? '');
  if (/^[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

export function makeCsv(rows: unknown[][]): string {
  return rows.map(row => row.map(safeCsvCell).join(',')).join('\r\n');
}
