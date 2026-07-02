export type OwnerSupplierSummarySupplierInput = {
  phone: string | null;
  email: string | null;
};

export type OwnerSupplierSummaryReceptionInput = {
  supplierName: string | null;
  quantity: number;
  unitCost: number;
};

export type OwnerSuppliersSummary = {
  supplierCount: number;
  supplierWithContactCount: number;
  supplierWithoutContactCount: number;
  contactQualityRate: number;
  receptionCount: number;
  receptionWithSupplierCount: number;
  totalReceivedQuantity: number;
  totalReceptionValue: number;
  averageReceptionValue: number;
};

export function buildOwnerSuppliersSummary(input: {
  suppliers: OwnerSupplierSummarySupplierInput[];
  receptions: OwnerSupplierSummaryReceptionInput[];
}): OwnerSuppliersSummary {
  const supplierWithContactCount = input.suppliers.filter(
    (supplier) => supplier.phone || supplier.email,
  ).length;
  const totalReceptionValue = input.receptions.reduce(
    (total, reception) => total + reception.quantity * reception.unitCost,
    0,
  );

  return {
    supplierCount: input.suppliers.length,
    supplierWithContactCount,
    supplierWithoutContactCount:
      input.suppliers.length - supplierWithContactCount,
    contactQualityRate:
      input.suppliers.length === 0
        ? 100
        : Math.round((supplierWithContactCount / input.suppliers.length) * 100),
    receptionCount: input.receptions.length,
    receptionWithSupplierCount: input.receptions.filter(
      (reception) => reception.supplierName,
    ).length,
    totalReceivedQuantity: input.receptions.reduce(
      (total, reception) => total + reception.quantity,
      0,
    ),
    totalReceptionValue,
    averageReceptionValue:
      input.receptions.length === 0
        ? 0
        : totalReceptionValue / input.receptions.length,
  };
}
