export type OwnerCustomerSummaryInput = {
  phone: string | null;
  email: string | null;
  totalSpent: number;
  saleCount: number;
  lastSaleAt: string | null;
};

export type OwnerCustomersSummary = {
  customerCount: number;
  totalSpent: number;
  vipCount: number;
  activeCount: number;
  inactiveCount: number;
  incompleteContactCount: number;
  averageRevenuePerCustomer: number;
  averageBasket: number;
  contactQualityRate: number;
};

const VIP_THRESHOLD = 50_000;
const ACTIVE_DAYS = 30;
const INACTIVE_DAYS = 60;
const DAY_IN_MS = 24 * 60 * 60 * 1000;

function daysSince(date: string | null, referenceTime: number) {
  if (!date) return Number.POSITIVE_INFINITY;

  return (referenceTime - new Date(date).getTime()) / DAY_IN_MS;
}

export function buildOwnerCustomersSummary(
  customers: OwnerCustomerSummaryInput[],
  referenceTime: number,
): OwnerCustomersSummary {
  const totalSpent = customers.reduce(
    (total, customer) => total + customer.totalSpent,
    0,
  );
  const totalSales = customers.reduce(
    (total, customer) => total + customer.saleCount,
    0,
  );
  const incompleteContactCount = customers.filter(
    (customer) => !customer.phone && !customer.email,
  ).length;

  return {
    customerCount: customers.length,
    totalSpent,
    vipCount: customers.filter(
      (customer) => customer.totalSpent >= VIP_THRESHOLD,
    ).length,
    activeCount: customers.filter(
      (customer) =>
        daysSince(customer.lastSaleAt, referenceTime) <= ACTIVE_DAYS,
    ).length,
    inactiveCount: customers.filter(
      (customer) =>
        daysSince(customer.lastSaleAt, referenceTime) > INACTIVE_DAYS,
    ).length,
    incompleteContactCount,
    averageRevenuePerCustomer:
      customers.length === 0 ? 0 : totalSpent / customers.length,
    averageBasket: totalSales === 0 ? 0 : totalSpent / totalSales,
    contactQualityRate:
      customers.length === 0
        ? 100
        : Math.round(
            ((customers.length - incompleteContactCount) / customers.length) *
              100,
          ),
  };
}
