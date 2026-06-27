import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const storesQuery = {
    select: vi.fn(),
    eq: vi.fn(),
    is: vi.fn(),
    maybeSingle: vi.fn(),
  };
  const expensesQuery = {
    insert: vi.fn(),
    select: vi.fn(),
    single: vi.fn(),
  };
  const auditLogsQuery = {
    insert: vi.fn(),
  };

  storesQuery.select.mockReturnValue(storesQuery);
  storesQuery.eq.mockReturnValue(storesQuery);
  storesQuery.is.mockReturnValue(storesQuery);
  expensesQuery.insert.mockReturnValue(expensesQuery);
  expensesQuery.select.mockReturnValue(expensesQuery);
  auditLogsQuery.insert.mockResolvedValue({ data: null, error: null });

  return {
    getOwnerSession: vi.fn(),
    from: vi.fn((table: string) => {
      if (table === "stores") return storesQuery;
      if (table === "expenses") return expensesQuery;
      if (table === "audit_logs") return auditLogsQuery;
      throw new Error(`Unexpected table: ${table}`);
    }),
    storesQuery,
    expensesQuery,
  };
});

vi.mock("@/lib/auth", () => ({ getOwnerSession: mocks.getOwnerSession }));
vi.mock("@/lib/supabaseAdmin", () => ({
  supabaseAdmin: {
    from: mocks.from,
  },
}));

import { POST } from "./route";

const businessId = "66002ddd-634b-4c09-970b-0a50ac451484";
const storeId = "17c333c8-8769-4a5a-a841-461dd83a1dfb";

function request(body: unknown) {
  return new Request("http://localhost:3000/api/owner/expenses", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/owner/expenses", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getOwnerSession.mockResolvedValue({
      profileId: "4fa91dc1-7551-408c-bc6a-0fbbbab7a5c9",
      mustChangePassword: false,
      ownerships: [{ businessId }],
    });
    mocks.storesQuery.maybeSingle.mockResolvedValue({
      data: { id: storeId },
      error: null,
    });
    mocks.expensesQuery.single.mockResolvedValue({
      data: { id: "expense-id", expense_number: "EXP-20260627-ABC123" },
      error: null,
    });
  });

  it("refuse une session absente", async () => {
    mocks.getOwnerSession.mockResolvedValue(null);

    const response = await POST(
      request({
        businessId,
        category: "Loyer",
        amountExcludingTax: 100000,
        taxAmount: 18000,
        expenseDate: "2026-06-27",
      }),
    );

    expect(response.status).toBe(403);
    expect(mocks.expensesQuery.insert).not.toHaveBeenCalled();
  });

  it("crée une dépense Owner valide", async () => {
    const response = await POST(
      request({
        businessId,
        storeId,
        category: "Loyer",
        description: "Local principal",
        reference: "FACT-001",
        amountExcludingTax: 100000,
        taxAmount: 18000,
        expenseDate: "2026-06-27",
        status: "pending",
      }),
    );

    expect(response.status).toBe(201);
    expect(mocks.expensesQuery.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        business_id: businessId,
        store_id: storeId,
        category: "Loyer",
        total_amount: 118000,
        status: "pending",
      }),
    );
  });
});
