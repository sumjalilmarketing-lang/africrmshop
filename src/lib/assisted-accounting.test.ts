import { describe, expect, it } from "vitest";
import { buildAssistedAccountingEntries } from "./assisted-accounting";

describe("buildAssistedAccountingEntries", () => {
  it("génère une écriture de vente équilibrée avec cash et mobile money", () => {
    const [entry] = buildAssistedAccountingEntries({
      sales: [
        {
          id: "sale-1",
          businessId: "business-1",
          storeId: "store-1",
          receiptNumber: "POS-001",
          status: "completed",
          subtotal: 10000,
          taxTotal: 1800,
          totalAmount: 11800,
          createdAt: "2026-06-27T10:00:00.000Z",
        },
      ],
      payments: [
        {
          saleId: "sale-1",
          provider: "cash",
          amount: 8000,
          status: "completed",
        },
        {
          saleId: "sale-1",
          provider: "wave",
          amount: 3800,
          status: "completed",
        },
      ],
      expenses: [],
    });

    expect(entry).toMatchObject({
      sourceType: "sale",
      reference: "POS-001",
      totalDebit: 11800,
      totalCredit: 11800,
      isBalanced: true,
    });
    expect(entry.lines.map((line) => line.accountCode)).toEqual([
      "571",
      "512",
      "701",
      "443",
    ]);
  });

  it("génère une extourne équilibrée pour un remboursement", () => {
    const [entry] = buildAssistedAccountingEntries({
      sales: [
        {
          id: "sale-2",
          businessId: "business-1",
          storeId: "store-1",
          receiptNumber: "POS-002",
          status: "refunded",
          subtotal: 5000,
          taxTotal: 900,
          totalAmount: 5900,
          createdAt: "2026-06-27T11:00:00.000Z",
        },
      ],
      payments: [
        {
          saleId: "sale-2",
          provider: "cash",
          amount: 5900,
          status: "refunded",
        },
      ],
      expenses: [],
    });

    expect(entry).toMatchObject({
      sourceType: "refund",
      totalDebit: 5900,
      totalCredit: 5900,
      isBalanced: true,
    });
    expect(
      entry.lines.map((line) => [line.accountCode, line.debit, line.credit]),
    ).toEqual([
      ["701", 5000, 0],
      ["443", 900, 0],
      ["571", 0, 5900],
    ]);
  });

  it("génère une écriture de dépense équilibrée avec TVA récupérable", () => {
    const [entry] = buildAssistedAccountingEntries({
      sales: [],
      payments: [],
      expenses: [
        {
          id: "expense-1",
          businessId: "business-1",
          storeId: "store-1",
          reference: "FACT-001",
          category: "Loyer",
          amount: 118000,
          taxAmount: 18000,
          status: "approved",
          expenseDate: "2026-06-27",
        },
      ],
    });

    expect(entry).toMatchObject({
      sourceType: "expense",
      reference: "FACT-001",
      totalDebit: 118000,
      totalCredit: 118000,
      isBalanced: true,
    });
    expect(
      entry.lines.map((line) => [line.accountCode, line.debit, line.credit]),
    ).toEqual([
      ["601", 100000, 0],
      ["445", 18000, 0],
      ["401", 0, 118000],
    ]);
  });
});
