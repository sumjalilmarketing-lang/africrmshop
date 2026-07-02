export type OwnerInventorySummaryInput = {
  costPrice: number;
  sellingPrice: number;
  availableStock: number;
  lowStockThreshold: number;
};

export type OwnerInventorySummary = {
  rowCount: number;
  totalAvailableStock: number;
  healthyCount: number;
  lowStockCount: number;
  outOfStockCount: number;
  costValuation: number;
  saleValuation: number;
  potentialMargin: number;
  stockHealthRate: number;
};

function getStockStatus(row: OwnerInventorySummaryInput) {
  if (row.availableStock <= 0) return "out";
  if (
    row.lowStockThreshold > 0 &&
    row.availableStock <= row.lowStockThreshold
  ) {
    return "low";
  }

  return "ok";
}

export function buildOwnerInventorySummary(
  rows: OwnerInventorySummaryInput[],
): OwnerInventorySummary {
  const healthyCount = rows.filter(
    (row) => getStockStatus(row) === "ok",
  ).length;
  const lowStockCount = rows.filter(
    (row) => getStockStatus(row) === "low",
  ).length;
  const outOfStockCount = rows.filter(
    (row) => getStockStatus(row) === "out",
  ).length;
  const costValuation = rows.reduce(
    (total, row) => total + row.availableStock * row.costPrice,
    0,
  );
  const saleValuation = rows.reduce(
    (total, row) => total + row.availableStock * row.sellingPrice,
    0,
  );

  return {
    rowCount: rows.length,
    totalAvailableStock: rows.reduce(
      (total, row) => total + row.availableStock,
      0,
    ),
    healthyCount,
    lowStockCount,
    outOfStockCount,
    costValuation,
    saleValuation,
    potentialMargin: saleValuation - costValuation,
    stockHealthRate:
      rows.length === 0 ? 100 : Math.round((healthyCount / rows.length) * 100),
  };
}
