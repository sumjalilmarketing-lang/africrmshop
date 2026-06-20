import { describe, expect, it } from "vitest";
import { hasPermission, type ScopedSession } from "./permissions";

const employee: ScopedSession = {
  isSuperAdmin: false,
  isOwner: false,
  permissions: ["pos.access", "accounting.view"],
  ownerships: [],
  permissionScopes: [
    {
      businessId: "business-a",
      storeId: "store-a",
      permissions: ["pos.access"],
    },
    {
      businessId: "business-b",
      storeId: null,
      permissions: ["accounting.view"],
    },
  ],
};

describe("hasPermission", () => {
  it("respecte le périmètre de l’entreprise", () => {
    expect(
      hasPermission(employee, "accounting.view", { businessId: "business-a" }),
    ).toBe(false);
    expect(
      hasPermission(employee, "accounting.view", { businessId: "business-b" }),
    ).toBe(true);
  });

  it("respecte le périmètre de la boutique", () => {
    expect(
      hasPermission(employee, "pos.access", {
        businessId: "business-a",
        storeId: "store-a",
      }),
    ).toBe(true);
    expect(
      hasPermission(employee, "pos.access", {
        businessId: "business-a",
        storeId: "store-b",
      }),
    ).toBe(false);
  });

  it("accorde au propriétaire l’accès à son entreprise uniquement", () => {
    const owner: ScopedSession = {
      ...employee,
      isOwner: true,
      ownerships: [{ businessId: "business-a" }],
      permissions: [],
      permissionScopes: [],
    };

    expect(
      hasPermission(owner, "employees.manage", { businessId: "business-a" }),
    ).toBe(true);
    expect(
      hasPermission(owner, "employees.manage", { businessId: "business-b" }),
    ).toBe(false);
  });
});
