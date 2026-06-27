import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const expensesQuery = {
    select: vi.fn(),
    eq: vi.fn(),
    maybeSingle: vi.fn(),
    update: vi.fn(),
    single: vi.fn(),
  };
  const auditLogsQuery = {
    insert: vi.fn(),
  };

  expensesQuery.select.mockReturnValue(expensesQuery);
  expensesQuery.eq.mockReturnValue(expensesQuery);
  expensesQuery.update.mockReturnValue(expensesQuery);
  auditLogsQuery.insert.mockResolvedValue({ data: null, error: null });

  return {
    getOwnerSession: vi.fn(),
    from: vi.fn((table: string) => {
      if (table === "expenses") return expensesQuery;
      if (table === "audit_logs") return auditLogsQuery;
      throw new Error(`Unexpected table: ${table}`);
    }),
    expensesQuery,
  };
});

vi.mock("@/lib/auth", () => ({ getOwnerSession: mocks.getOwnerSession }));
vi.mock("@/lib/supabaseAdmin", () => ({
  supabaseAdmin: {
    from: mocks.from,
  },
}));

import { PATCH } from "./route";

const businessId = "66002ddd-634b-4c09-970b-0a50ac451484";
const expenseId = "90000000-0000-4000-8000-000000000001";

function request(body: unknown) {
  return new Request(`http://localhost:3000/api/owner/expenses/${expenseId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function context(id = expenseId) {
  return { params: Promise.resolve({ expenseId: id }) };
}

describe("PATCH /api/owner/expenses/[expenseId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getOwnerSession.mockResolvedValue({
      profileId: "4fa91dc1-7551-408c-bc6a-0fbbbab7a5c9",
      mustChangePassword: false,
      ownerships: [{ businessId }],
    });
    mocks.expensesQuery.maybeSingle.mockResolvedValue({
      data: { id: expenseId, business_id: businessId, status: "pending" },
      error: null,
    });
    mocks.expensesQuery.single.mockResolvedValue({
      data: { id: expenseId, status: "approved" },
      error: null,
    });
  });

  it("refuse une dépense invalide", async () => {
    const response = await PATCH(
      request({ action: "approve" }),
      context("bad"),
    );

    expect(response.status).toBe(400);
    expect(mocks.expensesQuery.update).not.toHaveBeenCalled();
  });

  it("approuve une dépense de l'entreprise Owner", async () => {
    const response = await PATCH(request({ action: "approve" }), context());

    expect(response.status).toBe(200);
    expect(mocks.expensesQuery.update).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "approved",
        approved_by: "4fa91dc1-7551-408c-bc6a-0fbbbab7a5c9",
      }),
    );
  });
});
