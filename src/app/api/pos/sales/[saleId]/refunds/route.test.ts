import { describe, expect, it, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => {
  const salesQuery = {
    select: vi.fn(),
    eq: vi.fn(),
    maybeSingle: vi.fn(),
    update: vi.fn(),
    error: null,
  };
  const saleItemsQuery = {
    select: vi.fn(),
    eq: vi.fn(),
    data: [],
    error: null,
  };
  const paymentsQuery = {
    update: vi.fn(),
    eq: vi.fn(),
    error: null,
  };
  const auditLogsQuery = {
    insert: vi.fn(),
  };

  salesQuery.select.mockReturnValue(salesQuery);
  salesQuery.eq.mockReturnValue(salesQuery);
  salesQuery.update.mockReturnValue(salesQuery);
  saleItemsQuery.select.mockReturnValue(saleItemsQuery);
  saleItemsQuery.eq.mockReturnValue(saleItemsQuery);
  paymentsQuery.update.mockReturnValue(paymentsQuery);
  paymentsQuery.eq.mockReturnValue(paymentsQuery);
  auditLogsQuery.insert.mockResolvedValue({ data: null, error: null });

  return {
    getAppSession: vi.fn(),
    from: vi.fn((table: string) => {
      if (table === "sales") return salesQuery;
      if (table === "sale_items") return saleItemsQuery;
      if (table === "payments") return paymentsQuery;
      if (table === "audit_logs") return auditLogsQuery;
      throw new Error(`Unexpected table: ${table}`);
    }),
    salesQuery,
    saleItemsQuery,
    paymentsQuery,
    auditLogsQuery,
  };
});

vi.mock("@/lib/auth", () => ({ getAppSession: mocks.getAppSession }));
vi.mock("@/lib/supabaseAdmin", () => ({
  supabaseAdmin: {
    from: mocks.from,
  },
}));

import { POST } from "./route";

const saleId = "90000000-0000-0000-0000-000000000001";
const baseSale = {
  id: saleId,
  business_id: "66002ddd-634b-4c09-970b-0a50ac451484",
  store_id: "17c333c8-8769-4a5a-a841-461dd83a1dfb",
  receipt_number: "POS-20260627-ABC123",
  status: "completed",
  payment_status: "completed",
  total_amount: 15000,
  metadata: {},
};

function request(body: unknown) {
  return new Request(`http://localhost:3000/api/pos/sales/${saleId}/refunds`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function context(id = saleId) {
  return { params: Promise.resolve({ saleId: id }) };
}

describe("POST /api/pos/sales/[saleId]/refunds", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getAppSession.mockResolvedValue({
      profileId: "4fa91dc1-7551-408c-bc6a-0fbbbab7a5c9",
      mustChangePassword: false,
      isSuperAdmin: false,
      isOwner: true,
      permissions: ["pos.access"],
      permissionScopes: [],
      ownerships: [{ businessId: baseSale.business_id }],
    });
    mocks.salesQuery.maybeSingle.mockResolvedValue({
      data: baseSale,
      error: null,
    });
  });

  it("refuse une requête sans session applicative", async () => {
    mocks.getAppSession.mockResolvedValue(null);

    const response = await POST(
      request({ action: "refund", reason: "Client remboursé", restock: false }),
      context(),
    );

    expect(response.status).toBe(403);
    expect(mocks.salesQuery.update).not.toHaveBeenCalled();
  });

  it("refuse une vente déjà traitée", async () => {
    mocks.salesQuery.maybeSingle.mockResolvedValue({
      data: { ...baseSale, status: "refunded" },
      error: null,
    });

    const response = await POST(
      request({ action: "refund", reason: "Client remboursé", restock: false }),
      context(),
    );

    expect(response.status).toBe(409);
    expect(mocks.salesQuery.update).not.toHaveBeenCalled();
  });

  it("annule une vente encaissée sans remise en stock", async () => {
    const response = await POST(
      request({
        action: "cancel",
        reason: "Erreur de saisie caisse",
        restock: false,
      }),
      context(),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      saleId,
      receiptNumber: "POS-20260627-ABC123",
      status: "cancelled",
      paymentStatus: "refunded",
      restocked: false,
    });
    expect(mocks.salesQuery.update).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "cancelled",
        payment_status: "refunded",
      }),
    );
    expect(mocks.paymentsQuery.update).toHaveBeenCalledWith({
      status: "refunded",
    });
    expect(mocks.auditLogsQuery.insert).toHaveBeenCalled();
  });
});
