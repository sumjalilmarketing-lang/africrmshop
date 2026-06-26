import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  getUser: vi.fn(),
  rpc: vi.fn(),
}));

vi.mock("@/lib/supabaseAdmin", () => ({
  supabaseAdmin: {
    auth: { getUser: mocks.getUser },
    from: mocks.from,
    rpc: mocks.rpc,
  },
}));

import { POST } from "./route";

function request(body: unknown) {
  return new Request(
    "http://localhost:3000/api/auth/accept-employee-invitation",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );
}

describe("POST /api/auth/accept-employee-invitation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.from.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      ilike: vi.fn().mockReturnThis(),
      gt: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: { token_hash: "stored-token-hash" },
        error: null,
      }),
    });
    mocks.getUser.mockResolvedValue({
      data: {
        user: {
          id: "60000000-0000-0000-0000-000000000001",
          email: "vendeur@example.com",
        },
      },
      error: null,
    });
  });

  it("refuse un corps invalide", async () => {
    const response = await POST(request({}));
    expect(response.status).toBe(400);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("traduit une invitation expirée", async () => {
    mocks.rpc.mockResolvedValue({
      data: null,
      error: { message: "INVITATION_EXPIRED" },
    });
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);

    const response = await POST(
      request({ accessToken: "token", invitationToken: "invitation" }),
    );

    expect(response.status).toBe(410);
    await expect(response.json()).resolves.toEqual({
      error: "Cette invitation a expiré.",
    });
    consoleError.mockRestore();
  });

  it("accepte atomiquement une invitation valide", async () => {
    mocks.rpc.mockResolvedValue({ data: [{}], error: null });

    const response = await POST(
      request({ accessToken: "token", invitationToken: "invitation" }),
    );

    expect(response.status).toBe(200);
    expect(mocks.rpc).toHaveBeenCalledWith(
      "africrm_accept_employee_invitation",
      expect.objectContaining({
        p_auth_user_id: "60000000-0000-0000-0000-000000000001",
        p_email: "vendeur@example.com",
      }),
    );
  });

  it("retrouve l’invitation pending par e-mail si le lien Supabase a perdu le jeton", async () => {
    mocks.rpc.mockResolvedValue({ data: [{}], error: null });

    const response = await POST(request({ accessToken: "token" }));

    expect(response.status).toBe(200);
    expect(mocks.from).toHaveBeenCalledWith("employee_invitations");
    expect(mocks.rpc).toHaveBeenCalledWith(
      "africrm_accept_employee_invitation",
      expect.objectContaining({
        p_auth_user_id: "60000000-0000-0000-0000-000000000001",
        p_email: "vendeur@example.com",
        p_token_hash: "stored-token-hash",
      }),
    );
  });
});
