import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getOwnerSession: vi.fn(),
  rpc: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  getOwnerSession: mocks.getOwnerSession,
}));

vi.mock("@/lib/supabaseAdmin", () => ({
  supabaseAdmin: { rpc: mocks.rpc },
}));

import { POST } from "./route";

const validInput = {
  name: "Teranga Commerce",
  legalName: "Teranga Commerce SUARL",
  activityTypeCode: "boutique",
  planCode: "essential",
  phone: "+221770000000",
  storeName: "Boutique principale",
  storeCode: "HQ",
  city: "Dakar",
};

function createRequest(body: unknown) {
  return new Request("http://localhost:3000/api/owner/businesses", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/owner/businesses", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getOwnerSession.mockResolvedValue({
      profileId: "20000000-0000-0000-0000-000000000001",
      mustChangePassword: false,
    });
  });

  it("refuse une requête sans session Owner", async () => {
    mocks.getOwnerSession.mockResolvedValue(null);

    const response = await POST(createRequest(validInput));

    expect(response.status).toBe(403);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("refuse les informations invalides", async () => {
    const response = await POST(createRequest({ name: "A" }));

    expect(response.status).toBe(400);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("crée l'entreprise avec la fonction transactionnelle", async () => {
    mocks.rpc.mockResolvedValue({
      data: [
        {
          business_id: "30000000-0000-0000-0000-000000000001",
          store_id: "40000000-0000-0000-0000-000000000001",
          business_slug: "teranga-commerce",
          trial_ends_at: "2026-07-04T00:00:00.000Z",
        },
      ],
      error: null,
    });

    const response = await POST(createRequest(validInput));
    const result = await response.json();

    expect(response.status).toBe(201);
    expect(result).toEqual({
      business: {
        id: "30000000-0000-0000-0000-000000000001",
        slug: "teranga-commerce",
      },
      redirectTo: "/owner/dashboard",
    });
    expect(mocks.rpc).toHaveBeenCalledWith(
      "africrm_create_owner_business",
      expect.objectContaining({
        p_owner_user_id: "20000000-0000-0000-0000-000000000001",
        p_slug_base: "teranga-commerce",
        p_activity_type_code: "boutique",
        p_plan_code: "essential",
      }),
    );
  });

  it("traduit une référence Supabase invalide en erreur utilisateur", async () => {
    mocks.rpc.mockResolvedValue({
      data: null,
      error: { message: "ACTIVITY_TYPE_NOT_FOUND" },
    });

    const response = await POST(createRequest(validInput));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Le type d’activité ou l’offre sélectionnée est invalide.",
    });
  });

  it("masque les détails d'une erreur Supabase inattendue", async () => {
    mocks.rpc.mockResolvedValue({
      data: null,
      error: { message: "internal database details" },
    });
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);

    const response = await POST(createRequest(validInput));

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "La création de l’entreprise a échoué.",
    });
    expect(consoleError).toHaveBeenCalled();
    consoleError.mockRestore();
  });
});
