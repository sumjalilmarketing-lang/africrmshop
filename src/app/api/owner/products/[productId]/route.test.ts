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

import { DELETE, PATCH } from "./route";

const productId = "33333333-3333-4333-8333-333333333333";

function createRequest(body: unknown) {
  return new Request(`http://localhost:3000/api/owner/products/${productId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("PATCH /api/owner/products/[productId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getOwnerSession.mockResolvedValue(null);
  });

  it("refuse une requête sans session Owner", async () => {
    const response = await PATCH(createRequest({}), {
      params: Promise.resolve({ productId }),
    });

    expect(response.status).toBe(403);
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it("refuse un identifiant produit invalide", async () => {
    const response = await PATCH(createRequest({}), {
      params: Promise.resolve({ productId: "bad-id" }),
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Produit invalide.",
    });
  });
});

describe("DELETE /api/owner/products/[productId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getOwnerSession.mockResolvedValue(null);
  });

  it("refuse une requête sans session Owner", async () => {
    const response = await DELETE(new Request("http://localhost"), {
      params: Promise.resolve({ productId }),
    });

    expect(response.status).toBe(403);
    expect(mocks.from).not.toHaveBeenCalled();
  });
});
