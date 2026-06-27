import { NextResponse } from "next/server";
import { z } from "zod";
import { getOwnerSession } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type RouteContext = {
  params: Promise<{ expenseId: string }>;
};

const expenseIdSchema = z.uuid();
const EXPENSE_DOCUMENTS_BUCKET = "expense-documents";
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

type UploadableFile = File & {
  arrayBuffer: () => Promise<ArrayBuffer>;
};

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

function sanitizeFilename(filename: string) {
  const extension = filename.includes(".")
    ? filename.split(".").pop()?.toLowerCase()
    : null;
  const baseName = filename
    .replace(/\.[^.]+$/, "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

  return `${baseName || "justificatif"}-${crypto.randomUUID()}${
    extension ? `.${extension}` : ""
  }`;
}

async function ensureExpenseDocumentsBucket() {
  const bucket = await supabaseAdmin.storage.getBucket(
    EXPENSE_DOCUMENTS_BUCKET,
  );

  if (!bucket.error) return;

  const created = await supabaseAdmin.storage.createBucket(
    EXPENSE_DOCUMENTS_BUCKET,
    {
      public: false,
      fileSizeLimit: MAX_FILE_SIZE,
      allowedMimeTypes: [...ALLOWED_MIME_TYPES],
    },
  );

  if (created.error && !created.error.message.includes("already exists")) {
    throw new Error(created.error.message);
  }
}

export async function POST(request: Request, context: RouteContext) {
  const owner = await getOwnerSession();
  if (!owner || owner.mustChangePassword) {
    return jsonError("Accès refusé.", 403);
  }

  const { expenseId } = await context.params;
  if (!expenseIdSchema.safeParse(expenseId).success) {
    return jsonError("Dépense invalide.", 400);
  }

  const { data: expense, error: expenseError } = await supabaseAdmin
    .from("expenses")
    .select("id, business_id")
    .eq("id", expenseId)
    .maybeSingle();

  if (expenseError) {
    return jsonError("La dépense n'a pas pu être vérifiée.", 500);
  }
  if (!expense) {
    return jsonError("Dépense introuvable.", 404);
  }

  const ownsBusiness = owner.ownerships.some(
    (ownership) => ownership.businessId === expense.business_id,
  );
  if (!ownsBusiness) {
    return jsonError("Entreprise non autorisée.", 403);
  }

  const formData = await request.formData().catch(() => null);
  const file = formData?.get("file") as UploadableFile | null;
  if (
    !file ||
    typeof file === "string" ||
    typeof file.arrayBuffer !== "function" ||
    typeof file.name !== "string"
  ) {
    return jsonError("Aucun fichier justificatif reçu.", 400);
  }
  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    return jsonError(
      "Format non autorisé. Utilisez PDF, JPG, PNG ou WebP.",
      400,
    );
  }
  if (file.size <= 0 || file.size > MAX_FILE_SIZE) {
    return jsonError("Le fichier doit peser moins de 5 Mo.", 400);
  }

  const safeFilename = sanitizeFilename(file.name);
  const storagePath = `${expense.business_id}/${expense.id}/${safeFilename}`;

  try {
    await ensureExpenseDocumentsBucket();

    const upload = await supabaseAdmin.storage
      .from(EXPENSE_DOCUMENTS_BUCKET)
      .upload(storagePath, file, {
        contentType: file.type,
        upsert: false,
      });

    if (upload.error) throw new Error(upload.error.message);

    const { data: document, error: documentError } = await supabaseAdmin
      .from("expense_documents")
      .insert({
        business_id: expense.business_id,
        expense_id: expense.id,
        file_name: file.name,
        storage_bucket: EXPENSE_DOCUMENTS_BUCKET,
        storage_path: storagePath,
        mime_type: file.type,
        file_size: file.size,
        uploaded_by: owner.profileId,
      })
      .select("id, file_name")
      .single();

    if (documentError) {
      await supabaseAdmin.storage
        .from(EXPENSE_DOCUMENTS_BUCKET)
        .remove([storagePath]);
      throw new Error(documentError.message);
    }

    await supabaseAdmin.from("audit_logs").insert({
      business_id: expense.business_id,
      user_id: owner.profileId,
      action: "expense_document.uploaded",
      table_name: "expense_documents",
      record_id: document.id,
      new_values: {
        expense_id: expense.id,
        file_name: file.name,
        file_size: file.size,
      },
    });

    return NextResponse.json({ document }, { status: 201 });
  } catch (error) {
    console.error("POS24: upload justificatif impossible", error);
    return jsonError("Le justificatif n'a pas pu être enregistré.", 500);
  }
}
