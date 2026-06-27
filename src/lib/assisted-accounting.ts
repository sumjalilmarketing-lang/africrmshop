export type AssistedAccountingSaleInput = {
  id: string;
  businessId: string;
  storeId: string;
  receiptNumber: string;
  status: string;
  subtotal: number;
  taxTotal: number;
  totalAmount: number;
  createdAt: string;
};

export type AssistedAccountingPaymentInput = {
  saleId: string;
  provider: string;
  amount: number;
  status: string;
};

export type AssistedAccountingExpenseInput = {
  id: string;
  businessId: string;
  storeId: string | null;
  reference: string | null;
  category: string | null;
  amount: number;
  taxAmount: number;
  status: string;
  expenseDate: string;
};

export type AssistedAccountingLine = {
  accountCode: string;
  accountName: string;
  debit: number;
  credit: number;
  description: string;
};

export type AssistedAccountingEntry = {
  id: string;
  businessId: string;
  storeId: string | null;
  sourceType: "sale" | "refund" | "expense";
  sourceId: string;
  reference: string;
  entryDate: string;
  description: string;
  totalDebit: number;
  totalCredit: number;
  isBalanced: boolean;
  status: "draft";
  lines: AssistedAccountingLine[];
};

const ACCOUNT_CODES = {
  cash: { code: "571", name: "Caisse" },
  mobileMoney: { code: "512", name: "Banque / Mobile Money" },
  receivable: { code: "411", name: "Clients" },
  revenue: { code: "701", name: "Ventes de marchandises" },
  outputTax: { code: "443", name: "TVA facturée" },
  expenses: { code: "601", name: "Charges / achats" },
  inputTax: { code: "445", name: "TVA récupérable" },
  supplier: { code: "401", name: "Fournisseurs" },
};

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function getPaymentAccount(provider: string) {
  return provider === "cash" ? ACCOUNT_CODES.cash : ACCOUNT_CODES.mobileMoney;
}

function sumLines(lines: AssistedAccountingLine[], side: "debit" | "credit") {
  return roundMoney(
    lines.reduce(
      (total, line) => total + (side === "debit" ? line.debit : line.credit),
      0,
    ),
  );
}

function createEntry(
  input: Omit<
    AssistedAccountingEntry,
    "totalDebit" | "totalCredit" | "isBalanced" | "status"
  >,
): AssistedAccountingEntry {
  const totalDebit = sumLines(input.lines, "debit");
  const totalCredit = sumLines(input.lines, "credit");

  return {
    ...input,
    totalDebit,
    totalCredit,
    isBalanced: totalDebit === totalCredit,
    status: "draft",
  };
}

export function buildAssistedAccountingEntries(input: {
  sales: AssistedAccountingSaleInput[];
  payments: AssistedAccountingPaymentInput[];
  expenses: AssistedAccountingExpenseInput[];
}) {
  const paymentsBySaleId = new Map<string, AssistedAccountingPaymentInput[]>();
  for (const payment of input.payments) {
    paymentsBySaleId.set(payment.saleId, [
      ...(paymentsBySaleId.get(payment.saleId) ?? []),
      payment,
    ]);
  }

  const entries: AssistedAccountingEntry[] = [];

  for (const sale of input.sales) {
    const salePayments = paymentsBySaleId.get(sale.id) ?? [];
    const paidAmount = roundMoney(
      salePayments.reduce((total, payment) => total + payment.amount, 0),
    );
    const paymentGap = roundMoney(sale.totalAmount - paidAmount);
    const paymentLines = salePayments.map((payment) => {
      const account = getPaymentAccount(payment.provider);

      return {
        accountCode: account.code,
        accountName: account.name,
        debit: sale.status === "completed" ? roundMoney(payment.amount) : 0,
        credit: sale.status === "completed" ? 0 : roundMoney(payment.amount),
        description: `Paiement ${payment.provider} - ${sale.receiptNumber}`,
      } satisfies AssistedAccountingLine;
    });

    if (sale.status === "completed") {
      entries.push(
        createEntry({
          id: `sale:${sale.id}`,
          businessId: sale.businessId,
          storeId: sale.storeId,
          sourceType: "sale",
          sourceId: sale.id,
          reference: sale.receiptNumber,
          entryDate: sale.createdAt,
          description: `Vente ${sale.receiptNumber}`,
          lines: [
            ...paymentLines,
            ...(paymentGap > 0
              ? [
                  {
                    accountCode: ACCOUNT_CODES.receivable.code,
                    accountName: ACCOUNT_CODES.receivable.name,
                    debit: paymentGap,
                    credit: 0,
                    description: `Reste client ${sale.receiptNumber}`,
                  } satisfies AssistedAccountingLine,
                ]
              : []),
            {
              accountCode: ACCOUNT_CODES.revenue.code,
              accountName: ACCOUNT_CODES.revenue.name,
              debit: 0,
              credit: roundMoney(sale.subtotal),
              description: `Chiffre d'affaires ${sale.receiptNumber}`,
            },
            {
              accountCode: ACCOUNT_CODES.outputTax.code,
              accountName: ACCOUNT_CODES.outputTax.name,
              debit: 0,
              credit: roundMoney(sale.taxTotal),
              description: `TVA collectée ${sale.receiptNumber}`,
            },
          ],
        }),
      );
    }

    if (sale.status === "refunded" || sale.status === "cancelled") {
      entries.push(
        createEntry({
          id: `refund:${sale.id}`,
          businessId: sale.businessId,
          storeId: sale.storeId,
          sourceType: "refund",
          sourceId: sale.id,
          reference: sale.receiptNumber,
          entryDate: sale.createdAt,
          description:
            sale.status === "refunded"
              ? `Remboursement ${sale.receiptNumber}`
              : `Annulation ${sale.receiptNumber}`,
          lines: [
            {
              accountCode: ACCOUNT_CODES.revenue.code,
              accountName: ACCOUNT_CODES.revenue.name,
              debit: roundMoney(sale.subtotal),
              credit: 0,
              description: `Extourne chiffre d'affaires ${sale.receiptNumber}`,
            },
            {
              accountCode: ACCOUNT_CODES.outputTax.code,
              accountName: ACCOUNT_CODES.outputTax.name,
              debit: roundMoney(sale.taxTotal),
              credit: 0,
              description: `Extourne TVA ${sale.receiptNumber}`,
            },
            ...paymentLines,
            ...(paymentGap > 0
              ? [
                  {
                    accountCode: ACCOUNT_CODES.receivable.code,
                    accountName: ACCOUNT_CODES.receivable.name,
                    debit: 0,
                    credit: paymentGap,
                    description: `Extourne client ${sale.receiptNumber}`,
                  } satisfies AssistedAccountingLine,
                ]
              : []),
          ],
        }),
      );
    }
  }

  for (const expense of input.expenses) {
    const netAmount = Math.max(
      0,
      roundMoney(expense.amount - expense.taxAmount),
    );

    entries.push(
      createEntry({
        id: `expense:${expense.id}`,
        businessId: expense.businessId,
        storeId: expense.storeId,
        sourceType: "expense",
        sourceId: expense.id,
        reference: expense.reference ?? expense.id,
        entryDate: expense.expenseDate,
        description: `Dépense ${expense.category ?? "générale"}`,
        lines: [
          {
            accountCode: ACCOUNT_CODES.expenses.code,
            accountName: ACCOUNT_CODES.expenses.name,
            debit: netAmount,
            credit: 0,
            description: expense.category ?? "Dépense",
          },
          {
            accountCode: ACCOUNT_CODES.inputTax.code,
            accountName: ACCOUNT_CODES.inputTax.name,
            debit: roundMoney(expense.taxAmount),
            credit: 0,
            description: "TVA récupérable",
          },
          {
            accountCode: ACCOUNT_CODES.supplier.code,
            accountName: ACCOUNT_CODES.supplier.name,
            debit: 0,
            credit: roundMoney(expense.amount),
            description: expense.reference ?? "Dépense à payer",
          },
        ],
      }),
    );
  }

  return entries.sort((first, second) =>
    second.entryDate.localeCompare(first.entryDate),
  );
}
