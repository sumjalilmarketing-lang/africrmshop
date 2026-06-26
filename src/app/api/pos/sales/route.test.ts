import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const storeQuery = {
    select: vi.fn(),
    eq: vi.fn(),
    is: vi.fn(),
    single: vi.fn(),
  };

  storeQuery.select.mockReturnValue(storeQuery);
  storeQuery.eq.mockReturnValue(storeQuery);
  storeQuery.is.mockReturnValue(storeQuery);

  return {
    getAppSession: vi.fn(),
    from: vi.fn((table: string) => {
      if (table === "stores") return storeQuery;
      throw new Error(`Unexpected table: ${table}`);
    }),
    rpc: vi.fn(),
    storeQuery,
  };
});

vi.mock("@/lib/auth", () => ({ getAppSession: mocks.getAppSession }));
vi.mock("@/lib/supabaseAdmin", () => ({
  supabaseAdmin: {
    from: mocks.from,
    rpc: mocks.rpc,
  },
}));

import { POST } from "./route";

const validInput = {
  storeId: "17c333c8-8769-4a5a-a841-461dd83a1dfb",
  paymentMethodId: null,
  paymentProvider: "cash",
  items: [
    {
      productId: "00000000-0000-0000-0000-000000000030",
      quantity: 1,
    },
  ],
};

function request(body: unknown) {
  return new Request("http://localhost:3000/api/pos/sales", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/pos/sales", () => {
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
    mocks.storeQuery.single.mockResolvedValue({
      data: {
        id: validInput.storeId,
        business_id: "66002ddd-634b-4c09-970b-0a50ac451484",
        name: "Africrm",
      },
      error: null,
    });
    mocks.rpc.mockResolvedValue({
      data: [
        {
          sale_id: "90000000-0000-0000-0000-000000000001",
          receipt_number: "POS-20260626-ABC123",
          total_amount: 8850,
        },
      ],
      error: null,
    });
  });

  it("refuse une vente sans session", async () => {
    mocks.getAppSession.mockResolvedValue(null);

    const response = await POST(request(validInput));

    expect(response.status).toBe(403);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("crée une vente via la fonction transactionnelle RPC", async () => {
    const response = await POST(request(validInput));

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toMatchObject({
      saleId: "90000000-0000-0000-0000-000000000001",
      receiptNumber: "POS-20260626-ABC123",
      totalAmount: 8850,
      transactionMode: "rpc",
    });
    expect(mocks.rpc).toHaveBeenCalledWith(
      "africrm_create_pos_sale",
      expect.objectContaining({
        p_store_id: validInput.storeId,
        p_payment_provider: "cash",
        p_cashier_user_id: "4fa91dc1-7551-408c-bc6a-0fbbbab7a5c9",
      }),
    );
  });
});
