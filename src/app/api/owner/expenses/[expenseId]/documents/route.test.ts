import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const expensesQuery = {
    select: vi.fn(),
    eq: vi.fn(),
    maybeSingle: vi.fn(),
  };
  const documentsQuery = {
    insert: vi.fn(),
    select: vi.fn(),
    single: vi.fn(),
  };
  const auditLogsQuery = {
    insert: vi.fn(),
  };
  const storageBucket = {
    upload: vi.fn(),
    remove: vi.fn(),
  };
  const storage = {
    getBucket: vi.fn(),
    createBucket: vi.fn(),
    from: vi.fn(() => storageBucket),
  };

  expensesQuery.select.mockReturnValue(expensesQuery);
  expensesQuery.eq.mockReturnValue(expensesQuery);
  documentsQuery.insert.mockReturnValue(documentsQuery);
  documentsQuery.select.mockReturnValue(documentsQuery);
  auditLogsQuery.insert.mockResolvedValue({ data: null, error: null });
  storageBucket.remove.mockResolvedValue({ data: null, error: null });

  return {
    getOwnerSession: vi.fn(),
    from: vi.fn((table: string) => {
      if (table === "expenses") return expensesQuery;
      if (table === "expense_documents") return documentsQuery;
      if (table === "audit_logs") return auditLogsQuery;
      throw new Error(`Unexpected table: ${table}`);
    }),
    storage,
    storageBucket,
    expensesQuery,
    documentsQuery,
  };
});

vi.mock("@/lib/auth", () => ({ getOwnerSession: mocks.getOwnerSession }));
vi.mock("@/lib/supabaseAdmin", () => ({
  supabaseAdmin: {
    from: mocks.from,
    storage: mocks.storage,
  },
}));

import { POST } from "./route";

const businessId = "66002ddd-634b-4c09-970b-0a50ac451484";
const expenseId = "90000000-0000-4000-8000-000000000001";

function context(id = expenseId) {
  return { params: Promise.resolve({ expenseId: id }) };
}

function uploadRequest(file?: File) {
  const formData = new FormData();
  if (file) formData.append("file", file);

  return {
    formData: vi.fn().mockResolvedValue(formData),
  } as unknown as Request;
}

describe("POST /api/owner/expenses/[expenseId]/documents", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getOwnerSession.mockResolvedValue({
      profileId: "4fa91dc1-7551-408c-bc6a-0fbbbab7a5c9",
      mustChangePassword: false,
      ownerships: [{ businessId }],
    });
    mocks.expensesQuery.maybeSingle.mockResolvedValue({
      data: { id: expenseId, business_id: businessId },
      error: null,
    });
    mocks.storage.getBucket.mockResolvedValue({
      data: { id: "bucket" },
      error: null,
    });
    mocks.storageBucket.upload.mockResolvedValue({
      data: { path: "path" },
      error: null,
    });
    mocks.documentsQuery.single.mockResolvedValue({
      data: { id: "document-id", file_name: "facture.pdf" },
      error: null,
    });
  });

  it("refuse une session absente", async () => {
    mocks.getOwnerSession.mockResolvedValue(null);

    const response = await POST(
      uploadRequest(
        new File(["test"], "facture.pdf", { type: "application/pdf" }),
      ),
      context(),
    );

    expect(response.status).toBe(403);
    expect(mocks.storageBucket.upload).not.toHaveBeenCalled();
  });

  it("enregistre un justificatif PDF valide", async () => {
    const response = await POST(
      uploadRequest(
        new File(["test"], "facture.pdf", { type: "application/pdf" }),
      ),
      context(),
    );

    expect(response.status).toBe(201);
    expect(mocks.storageBucket.upload).toHaveBeenCalledWith(
      expect.stringContaining(`${businessId}/${expenseId}/facture-`),
      expect.any(File),
      expect.objectContaining({ contentType: "application/pdf" }),
    );
    expect(mocks.documentsQuery.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        business_id: businessId,
        expense_id: expenseId,
        file_name: "facture.pdf",
        storage_bucket: "expense-documents",
      }),
    );
  });
});
