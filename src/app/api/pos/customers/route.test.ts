import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getAppSession: vi.fn(),
  hasPermission: vi.fn(),
  from: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  getAppSession: mocks.getAppSession,
}));

vi.mock("@/lib/permissions", () => ({
  hasPermission: mocks.hasPermission,
}));

vi.mock("@/lib/supabaseAdmin", () => ({
  supabaseAdmin: { from: mocks.from },
}));

import { POST } from "./route";

function createRequest(body: unknown) {
  return new Request("http://localhost:3000/api/pos/customers", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/pos/customers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getAppSession.mockResolvedValue({
      profileId: "20000000-0000-4000-8000-000000000001",
      mustChangePassword: false,
    });
    mocks.hasPermission.mockReturnValue(false);
  });

  it("refuse une requête sans session", async () => {
    mocks.getAppSession.mockResolvedValue(null);

    const response = await POST(createRequest({}));

    expect(response.status).toBe(403);
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it("refuse les informations client invalides", async () => {
    const response = await POST(createRequest({ storeId: "bad-id" }));

    expect(response.status).toBe(400);
    expect(mocks.from).not.toHaveBeenCalled();
  });
});
