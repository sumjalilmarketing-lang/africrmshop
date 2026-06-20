import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getOwnerSession: vi.fn(),
  rpc: vi.fn(),
  inviteUserByEmail: vi.fn(),
  deleteInvitation: vi.fn(),
  insertAudit: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ getOwnerSession: mocks.getOwnerSession }));
vi.mock("@/lib/supabaseAdmin", () => ({
  supabaseAdmin: {
    rpc: mocks.rpc,
    auth: { admin: { inviteUserByEmail: mocks.inviteUserByEmail } },
    from: vi.fn((table: string) =>
      table === "employee_invitations"
        ? {
            delete: () => ({ eq: mocks.deleteInvitation }),
          }
        : { insert: mocks.insertAudit },
    ),
  },
}));

import { DELETE, POST } from "./route";

const validInput = {
  businessId: "66002ddd-634b-4c09-970b-0a50ac451484",
  storeId: "17c333c8-8769-4a5a-a841-461dd83a1dfb",
  roleCode: "seller",
  email: "vendeur@example.com",
  firstName: "Awa",
  lastName: "Diop",
  jobTitle: "Vendeuse",
};

function request(body: unknown) {
  return new Request("http://localhost:3000/api/owner/employee-invitations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/owner/employee-invitations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getOwnerSession.mockResolvedValue({
      profileId: "4fa91dc1-7551-408c-bc6a-0fbbbab7a5c9",
      mustChangePassword: false,
    });
    mocks.inviteUserByEmail.mockResolvedValue({ error: null });
    mocks.insertAudit.mockResolvedValue({ error: null });
  });

  it("refuse une requête sans Owner", async () => {
    mocks.getOwnerSession.mockResolvedValue(null);
    const response = await POST(request(validInput));
    expect(response.status).toBe(403);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("refuse la révocation sans Owner", async () => {
    mocks.getOwnerSession.mockResolvedValue(null);
    const response = await DELETE(
      request({ invitationId: "50000000-0000-0000-0000-000000000001" }),
    );
    expect(response.status).toBe(403);
  });

  it("applique la limite d'employés de l'abonnement", async () => {
    mocks.rpc.mockResolvedValue({
      data: null,
      error: { message: "EMPLOYEE_LIMIT_REACHED" },
    });
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);

    const response = await POST(request(validInput));

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      error: "La limite d’employés de votre offre est atteinte.",
    });
    expect(mocks.inviteUserByEmail).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it("crée puis envoie une invitation valide", async () => {
    mocks.rpc.mockResolvedValue({
      data: [
        {
          invitation_id: "50000000-0000-0000-0000-000000000001",
          role_name: "Vendeur",
          invitation_expires_at: "2026-06-27T00:00:00.000Z",
        },
      ],
      error: null,
    });

    const response = await POST(request(validInput));

    expect(response.status).toBe(201);
    expect(mocks.rpc).toHaveBeenCalledWith(
      "africrm_create_employee_invitation",
      expect.objectContaining({
        p_business_id: validInput.businessId,
        p_store_id: validInput.storeId,
        p_role_code: "seller",
        p_invited_by: "4fa91dc1-7551-408c-bc6a-0fbbbab7a5c9",
      }),
    );
    expect(mocks.inviteUserByEmail).toHaveBeenCalledOnce();
  });
});
