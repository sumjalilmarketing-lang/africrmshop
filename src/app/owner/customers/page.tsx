import { redirect } from "next/navigation";
import {
  OwnerCustomersClient,
  type OwnerCustomerBusiness,
  type OwnerCustomerItem,
  type OwnerCustomerNote,
  type OwnerCustomerSale,
} from "@/components/owner/owner-customers-client";
import { getOwnerSession } from "@/lib/auth";
import { getOwnerBusinesses } from "@/lib/owner-dashboard";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type CustomerRow = {
  id: string;
  business_id: string;
  customer_code: string | null;
  first_name: string | null;
  last_name: string | null;
  company_name: string | null;
  email: string | null;
  phone: string | null;
  loyalty_points: number | string | null;
  created_at: string;
};

type SaleRow = {
  id: string;
  business_id: string;
  store_id: string;
  customer_id: string | null;
  receipt_number: string | null;
  total_amount: number | string;
  created_at: string;
};

type StoreRow = {
  id: string;
  name: string;
};

type NoteRow = {
  id: string;
  business_id: string;
  customer_id: string;
  note: string;
  created_at: string;
};

function toNumber(value: unknown) {
  return typeof value === "number" ? value : Number(value ?? 0);
}

export default async function OwnerCustomersPage() {
  const owner = await getOwnerSession();
  if (!owner) redirect("/connexion");
  if (owner.mustChangePassword) redirect("/changer-mot-de-passe");

  const ownerBusinesses = await getOwnerBusinesses(owner);
  const businessIds = ownerBusinesses.map((business) => business.id);
  const businesses: OwnerCustomerBusiness[] = ownerBusinesses.map(
    (business) => ({
      id: business.id,
      name: business.name,
    }),
  );

  const [customersResult, salesResult, storesResult, notesResult] =
    businessIds.length
      ? await Promise.all([
          supabaseAdmin
            .from("customers")
            .select(
              "id, business_id, customer_code, first_name, last_name, company_name, email, phone, loyalty_points, created_at",
            )
            .in("business_id", businessIds)
            .is("deleted_at", null)
            .order("created_at", { ascending: false }),
          supabaseAdmin
            .from("sales")
            .select(
              "id, business_id, store_id, customer_id, receipt_number, total_amount, created_at",
            )
            .in("business_id", businessIds)
            .not("customer_id", "is", null)
            .eq("status", "completed")
            .order("created_at", { ascending: false })
            .limit(500),
          supabaseAdmin
            .from("stores")
            .select("id, name")
            .in("business_id", businessIds)
            .is("deleted_at", null),
          supabaseAdmin
            .from("customer_notes")
            .select("id, business_id, customer_id, note, created_at")
            .in("business_id", businessIds)
            .order("created_at", { ascending: false })
            .limit(500),
        ])
      : [
          { data: [], error: null },
          { data: [], error: null },
          { data: [], error: null },
          { data: [], error: null },
        ];

  if (
    customersResult.error ||
    salesResult.error ||
    storesResult.error ||
    notesResult.error
  ) {
    throw new Error(
      customersResult.error?.message ??
        salesResult.error?.message ??
        storesResult.error?.message ??
        notesResult.error?.message,
    );
  }

  const salesByCustomerId = new Map<
    string,
    { totalSpent: number; saleCount: number; lastSaleAt: string | null }
  >();
  for (const sale of (salesResult.data ?? []) as SaleRow[]) {
    if (!sale.customer_id) continue;
    const current = salesByCustomerId.get(sale.customer_id) ?? {
      totalSpent: 0,
      saleCount: 0,
      lastSaleAt: null,
    };
    salesByCustomerId.set(sale.customer_id, {
      totalSpent: current.totalSpent + toNumber(sale.total_amount),
      saleCount: current.saleCount + 1,
      lastSaleAt:
        !current.lastSaleAt || sale.created_at > current.lastSaleAt
          ? sale.created_at
          : current.lastSaleAt,
    });
  }

  const customers: OwnerCustomerItem[] = (
    (customersResult.data ?? []) as CustomerRow[]
  ).map((customer) => {
    const stats = salesByCustomerId.get(customer.id) ?? {
      totalSpent: 0,
      saleCount: 0,
      lastSaleAt: null,
    };

    return {
      id: customer.id,
      businessId: customer.business_id,
      code: customer.customer_code,
      name:
        customer.company_name ||
        [customer.first_name, customer.last_name].filter(Boolean).join(" ") ||
        customer.phone ||
        customer.email ||
        "Client",
      phone: customer.phone,
      email: customer.email,
      loyaltyPoints: toNumber(customer.loyalty_points),
      createdAt: customer.created_at,
      ...stats,
    };
  });

  const storesById = new Map(
    ((storesResult.data ?? []) as StoreRow[]).map((store) => [
      store.id,
      store.name,
    ]),
  );
  const sales: OwnerCustomerSale[] = ((salesResult.data ?? []) as SaleRow[])
    .filter((sale) => sale.customer_id)
    .map((sale) => ({
      id: sale.id,
      businessId: sale.business_id,
      customerId: sale.customer_id as string,
      storeName: storesById.get(sale.store_id) ?? "Boutique",
      receiptNumber: sale.receipt_number ?? "POS",
      totalAmount: toNumber(sale.total_amount),
      createdAt: sale.created_at,
    }));
  const notes: OwnerCustomerNote[] = (
    (notesResult.data ?? []) as NoteRow[]
  ).map((note) => ({
    id: note.id,
    businessId: note.business_id,
    customerId: note.customer_id,
    note: note.note,
    createdAt: note.created_at,
  }));

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-7">
        <p className="text-xs font-black tracking-[0.3em] text-[#0b7a4b] uppercase">
          POS 13
        </p>
        <h1 className="mt-3 text-3xl font-black">CRM clients</h1>
        <p className="text-muted mt-2 max-w-2xl text-sm">
          Suivez vos clients, leurs achats, leur fidélité et les notes utiles
          pour mieux vendre.
        </p>
      </div>

      <OwnerCustomersClient
        businesses={businesses}
        customers={customers}
        sales={sales}
        notes={notes}
      />
    </div>
  );
}
