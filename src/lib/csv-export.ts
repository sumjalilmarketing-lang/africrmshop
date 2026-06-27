type CsvValue = string | number | boolean | null | undefined;

function escapeCsvValue(value: CsvValue) {
  if (value === null || value === undefined) return "";

  const normalizedValue = String(value)
    .replace(/\r?\n|\r/g, " ")
    .trim();
  if (
    normalizedValue.includes('"') ||
    normalizedValue.includes(";") ||
    normalizedValue.includes(",")
  ) {
    return `"${normalizedValue.replaceAll('"', '""')}"`;
  }

  return normalizedValue;
}

export function buildCsvContent(rows: CsvValue[][]) {
  return rows.map((row) => row.map(escapeCsvValue).join(";")).join("\n");
}

export function downloadCsvFile(filename: string, rows: CsvValue[][]) {
  if (typeof window === "undefined") return;

  const content = `\uFEFF${buildCsvContent(rows)}`;
  const blob = new Blob([content], {
    type: "text/csv;charset=utf-8",
  });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}
