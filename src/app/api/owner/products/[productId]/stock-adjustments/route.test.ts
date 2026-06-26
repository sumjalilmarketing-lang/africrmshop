import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getOwnerSession: vi.fn(),
  from: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  getOwnerSession: mocks.getOwnerSession,
}));

vi.mock("@/lib/supabaseAdmin", () => ({
  supabaseAdmin: { from: mocks.from },
}));

import { POST } from "./route";

const productId = "30000000-0000-0000-0000-000000000001";

function createRequest(body: unknown) {
  return new Request(
    `http://localhost:3000/api/owner/products/${productId}/stock-adjustments`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );
}

describe("POST /api/owner/products/[productId]/stock-adjustments", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getOwnerSession.mockResolvedValue(null);
  });

  it("refuse une requête sans session Owner", async () => {
    const response = await POST(createRequest({}), {
      params: Promise.resolve({ productId }),
    });

    expect(response.status).toBe(403);
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it("refuse un identifiant produit invalide", async () => {
    mocks.getOwnerSession.mockResolvedValue({
      mustChangePassword: false,
      ownerships: [],
    });

    const response = await POST(createRequest({}), {
      params: Promise.resolve({ productId: "bad-id" }),
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Produit invalide.",
    });
  });
});
