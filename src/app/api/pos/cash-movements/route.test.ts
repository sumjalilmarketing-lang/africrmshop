import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const cashSessionQuery = {
    select: vi.fn(),
    eq: vi.fn(),
    maybeSingle: vi.fn(),
  };
  const cashMovementQuery = {
    insert: vi.fn(),
    select: vi.fn(),
    single: vi.fn(),
  };
  const auditLogQuery = {
    insert: vi.fn(),
  };

  cashSessionQuery.select.mockReturnValue(cashSessionQuery);
  cashSessionQuery.eq.mockReturnValue(cashSessionQuery);
  cashMovementQuery.insert.mockReturnValue(cashMovementQuery);
  cashMovementQuery.select.mockReturnValue(cashMovementQuery);
  auditLogQuery.insert.mockResolvedValue({ data: null, error: null });

  return {
    getAppSession: vi.fn(),
    from: vi.fn((table: string) => {
      if (table === "cash_sessions") return cashSessionQuery;
      if (table === "cash_movements") return cashMovementQuery;
      if (table === "audit_logs") return auditLogQuery;
      throw new Error(`Unexpected table: ${table}`);
    }),
    cashSessionQuery,
    cashMovementQuery,
    auditLogQuery,
  };
});

vi.mock("@/lib/auth", () => ({ getAppSession: mocks.getAppSession }));
vi.mock("@/lib/supabaseAdmin", () => ({
  supabaseAdmin: {
    from: mocks.from,
  },
}));

import { POST } from "./route";

const validInput = {
  cashSessionId: "70000000-0000-0000-0000-000000000001",
  movementType: "cash_in",
  amount: 5000,
  reason: "Ajout monnaie",
};

function request(body: unknown) {
  return new Request("http://localhost:3000/api/pos/cash-movements", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/pos/cash-movements", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getAppSession.mockResolvedValue({
      profileId: "4fa91dc1-7551-408c-bc6a-0fbbbab7a5c9",
      mustChangePassword: false,
      isSuperAdmin: false,
      isOwner: true,
      permissions: ["pos.access"],
      permissionScopes: [],
      ownerships: [{ businessId: "66002ddd-634b-4c09-970b-0a50ac451484" }],
    });
    mocks.cashSessionQuery.maybeSingle.mockResolvedValue({
      data: {
        id: validInput.cashSessionId,
        business_id: "66002ddd-634b-4c09-970b-0a50ac451484",
        store_id: "17c333c8-8769-4a5a-a841-461dd83a1dfb",
        status: "open",
      },
      error: null,
    });
    mocks.cashMovementQuery.single.mockResolvedValue({
      data: {
        id: "80000000-0000-0000-0000-000000000001",
        business_id: "66002ddd-634b-4c09-970b-0a50ac451484",
        cash_session_id: validInput.cashSessionId,
        movement_type: validInput.movementType,
        amount: validInput.amount,
        reason: validInput.reason,
        performed_by: "4fa91dc1-7551-408c-bc6a-0fbbbab7a5c9",
        created_at: "2026-06-27T10:00:00.000Z",
      },
      error: null,
    });
  });

  it("refuse une requête sans session applicative", async () => {
    mocks.getAppSession.mockResolvedValue(null);

    const response = await POST(request(validInput));

    expect(response.status).toBe(403);
    expect(mocks.cashMovementQuery.insert).not.toHaveBeenCalled();
  });

  it("refuse si aucune session de caisse ouverte n'existe", async () => {
    mocks.cashSessionQuery.maybeSingle.mockResolvedValue({
      data: null,
      error: null,
    });

    const response = await POST(request(validInput));

    expect(response.status).toBe(404);
    expect(mocks.cashMovementQuery.insert).not.toHaveBeenCalled();
  });

  it("crée un mouvement de caisse autorisé", async () => {
    const response = await POST(request(validInput));

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toMatchObject({
      cashMovement: {
        id: "80000000-0000-0000-0000-000000000001",
        cashSessionId: validInput.cashSessionId,
        movementType: "cash_in",
        amount: 5000,
        reason: "Ajout monnaie",
      },
    });
    expect(mocks.cashMovementQuery.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        cash_session_id: validInput.cashSessionId,
        movement_type: "cash_in",
        amount: 5000,
        reason: "Ajout monnaie",
      }),
    );
    expect(mocks.auditLogQuery.insert).toHaveBeenCalled();
  });
});
