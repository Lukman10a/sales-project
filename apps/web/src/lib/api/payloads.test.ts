import { describe, it, expect } from "vitest";
import {
  toHeldPayload,
  toInventoryPayload,
  toPreferencesUpdate,
  toProfileUpdate,
  toSalePayload,
  toTeamPermissions,
} from "./payloads";
import type { InventoryItem } from "@/types/inventoryTypes";
import type { HeldTransaction, SaleRecord } from "@/types/salesTypes";
import type { UserProfile } from "@/types/profileTypes";
import { buildSaleRecord } from "@/lib/sales/saleRecord";

describe("toTeamPermissions", () => {
  it("keeps backend-valid permission names", () => {
    expect(
      toTeamPermissions([
        "view-products",
        "record-sales",
        "assign-roles",
        "view-reports",
      ]),
    ).toEqual(["view-products", "record-sales", "assign-roles", "view-reports"]);
  });

  it("strips the deprecated checkout-sales alias", () => {
    expect(toTeamPermissions(["view-products", "checkout-sales"])).toEqual([
      "view-products",
    ]);
  });

  it("strips the deprecated view-out-of-stock alias", () => {
    expect(toTeamPermissions(["view-inventory", "view-out-of-stock"])).toEqual([
      "view-inventory",
    ]);
  });

  it("returns an empty array when only aliases are sent", () => {
    expect(toTeamPermissions(["checkout-sales", "view-out-of-stock"])).toEqual(
      [],
    );
  });
});

describe("toSalePayload", () => {
  const sale: SaleRecord = {
    id: "s1",
    items: [
      { name: "Widget", quantity: 2, price: 50 },
      { name: "Gadget", quantity: 1, price: 30 },
    ],
    total: 117,
    soldBy: "u1",
    time: "now",
    status: "completed",
    paymentMethod: "cash",
    discount: 10,
  };

  it("maps items to productId/quantity/price when productId is present", () => {
    const payload = toSalePayload({
      ...sale,
      items: [
        { name: "Widget", productId: "p1", quantity: 2, price: 50 },
        { name: "Gadget", productId: "p2", quantity: 1, price: 30 },
      ],
    });

    expect(payload.items).toEqual([
      { productId: "p1", quantity: 2, price: 50 },
      { productId: "p2", quantity: 1, price: 30 },
    ]);
  });

  it("maps discount to discountPercent", () => {
    expect(toSalePayload(sale).discountPercent).toBe(10);
  });

  it("passes customerId, customerName, saleDate and paymentMethod", () => {
    const payload = toSalePayload({
      ...sale,
      customerId: "6f0c5d5b-9b1a-4a5e-9b3c-3d5f1a2b3c4d",
      customerName: "Ada",
      saleDate: "2026-08-01",
    });

    expect(payload.customerId).toBe("6f0c5d5b-9b1a-4a5e-9b3c-3d5f1a2b3c4d");
    expect(payload.customerName).toBe("Ada");
    expect(payload.saleDate).toBe("2026-08-01");
    expect(payload.paymentMethod).toBe("cash");
  });

  it("passes splitPayments, loyaltyPointsUsed and accountCredit when present", () => {
    const payload = toSalePayload({
      ...sale,
      splitPayments: [
        { method: "cash", amount: 60 },
        { method: "card", amount: 57 },
      ],
      loyaltyPointsUsed: 5,
      accountCredit: 10,
    });

    expect(payload.splitPayments).toEqual([
      { method: "cash", amount: 60 },
      { method: "card", amount: 57 },
    ]);
    expect(payload.loyaltyPointsUsed).toBe(5);
    expect(payload.accountCredit).toBe(10);
  });

  it("omits optional fields when not present", () => {
    const payload = toSalePayload(sale);

    expect(payload.customerId).toBeUndefined();
    expect(payload.customerName).toBeUndefined();
    expect(payload.saleDate).toBeUndefined();
    expect(payload.splitPayments).toBeUndefined();
    expect(payload.loyaltyPointsUsed).toBeUndefined();
    expect(payload.accountCredit).toBeUndefined();
  });

  it("drops a customerId that is not a UUID (backend would 400)", () => {
    const payload = toSalePayload({ ...sale, customerId: "generated-id" });

    expect(payload.customerId).toBeUndefined();
  });

  it("keeps a customerId that is a real UUID", () => {
    const payload = toSalePayload({
      ...sale,
      customerId: "6f0c5d5b-9b1a-4a5e-9b3c-3d5f1a2b3c4d",
    });

    expect(payload.customerId).toBe("6f0c5d5b-9b1a-4a5e-9b3c-3d5f1a2b3c4d");
  });

  it("produces a non-empty items payload from a POS cart-built record (regression: sales never persisted)", () => {
    const record = buildSaleRecord({
      cart: [
        {
          id: "p1",
          name: "Widget",
          image: "img.png",
          sellingPrice: 50,
          availableQty: 5,
          categories: ["tools"],
          quantity: 2,
          actualPrice: 50,
        },
      ],
      soldBy: "Ada",
      paymentMethod: "cash",
      discountPercent: 0,
      splitPayments: [],
      loyaltyPointsUsed: 0,
      accountCreditUsed: 0,
      saleDate: "2026-08-20",
    });

    const payload = toSalePayload(record);

    expect(payload.items.length).toBeGreaterThan(0);
    expect(payload.items).toEqual([{ productId: "p1", quantity: 2, price: 50 }]);
  });
});


describe("toHeldPayload", () => {
  const held: HeldTransaction = {
    id: "h1",
    customerName: "Ada",
    items: [{ productId: "p1", quantity: 2, price: 50 }],
    heldBy: "u1",
    discountPercent: 5,
    paymentMethod: "cash",
    createdAt: "2026-08-01T10:00:00.000Z",
    expiresAt: "2026-08-02T10:00:00.000Z",
  };

  it("emits only backend-valid keys from a held transaction", () => {
    const payload = toHeldPayload(held);

    expect(payload).toEqual({
      customerName: "Ada",
      items: [{ productId: "p1", quantity: 2, price: 50 }],
      discountPercent: 5,
      paymentMethod: "cash",
    });
  });

  it("never sends id, heldBy, createdAt or expiresAt", () => {
    const payload = toHeldPayload(held);

    expect(payload).not.toHaveProperty("id");
    expect(payload).not.toHaveProperty("heldBy");
    expect(payload).not.toHaveProperty("createdAt");
    expect(payload).not.toHaveProperty("expiresAt");
  });

  it("omits discountPercent when zero", () => {
    const payload = toHeldPayload({ ...held, discountPercent: 0 });

    expect(payload.discountPercent).toBeUndefined();
  });
});

describe("toProfileUpdate", () => {
  it("splits name into firstName and lastName", () => {
    expect(
      toProfileUpdate({ name: "Ada Lovelace", phone: "+234" }),
    ).toEqual({ firstName: "Ada", lastName: "Lovelace", phone: "+234" });
  });

  it("sends a single-word name as firstName only", () => {
    expect(toProfileUpdate({ name: "Ada" })).toEqual({ firstName: "Ada" });
  });

  it("handles multi-word last names", () => {
    expect(toProfileUpdate({ name: "Grace Hopper Okafor" })).toEqual({
      firstName: "Grace",
      lastName: "Hopper Okafor",
    });
  });

  it("drops unknown UI keys (id, name, email, avatar, role, joinedDate)", () => {
    const input: UserProfile = {
      id: "u1",
      name: "Ada Lovelace",
      email: "ada@luxa.com",
      avatar: "img.png",
      role: "owner",
      joinedDate: "2026-01-15",
      bio: "Builder",
    };

    const payload = toProfileUpdate(input);

    expect(payload).toEqual({ firstName: "Ada", lastName: "Lovelace", bio: "Builder" });
    expect(payload).not.toHaveProperty("id");
    expect(payload).not.toHaveProperty("name");
    expect(payload).not.toHaveProperty("email");
    expect(payload).not.toHaveProperty("avatar");
    expect(payload).not.toHaveProperty("role");
    expect(payload).not.toHaveProperty("joinedDate");
  });

  it("emits profile fields when present", () => {
    const payload = toProfileUpdate({
      name: "Ada Lovelace",
      phone: "+234",
      company: "LUXA",
      address: "Lagos",
      city: "Lagos",
      country: "NG",
      bio: "Founder",
    });

    expect(payload).toEqual({
      firstName: "Ada",
      lastName: "Lovelace",
      phone: "+234",
      company: "LUXA",
      address: "Lagos",
      city: "Lagos",
      country: "NG",
      bio: "Founder",
    });
  });

  it("omits empty profile fields", () => {
    const payload = toProfileUpdate({ name: "Ada", phone: "", city: "" });

    expect(payload).toEqual({ firstName: "Ada" });
  });
});

describe("toPreferencesUpdate", () => {
  it("strips sms from the notification preferences patch", () => {
    const payload = toPreferencesUpdate({
      notificationPreferences: {
        email: true,
        push: false,
        sms: true,
        lowStock: true,
        newSales: true,
        reports: false,
        teamActivity: true,
        aiInsights: false,
      },
    });

    expect(payload.notificationPreferences).toEqual({
      email: true,
      push: false,
      lowStock: true,
      newSales: true,
      reports: false,
      teamActivity: true,
      aiInsights: false,
    });
    expect(payload.notificationPreferences).not.toHaveProperty("sms");
  });

  it("passes appearanceSettings through unchanged", () => {
    const appearanceSettings = {
      theme: "dark" as const,
      language: "en",
      currency: "NGN",
      dateFormat: "DD/MM/YYYY",
      timeFormat: "24h" as const,
      compactMode: false,
    };

    const payload = toPreferencesUpdate({ appearanceSettings });

    expect(payload.appearanceSettings).toEqual(appearanceSettings);
  });

  it("returns an empty patch when no preferences are supplied", () => {
    expect(toPreferencesUpdate({})).toEqual({});
  });
});

describe("toInventoryPayload", () => {
  it("passes image, lastRestocked, and confirmedByApprentice through", () => {
    const payload = toInventoryPayload({
      name: "Widget",
      sellingPrice: 150,
      image: "img.png",
      lastRestocked: "2026-08-01T00:00:00.000Z",
      confirmedByApprentice: true,
    });

    expect(payload).toEqual({
      name: "Widget",
      sellingPrice: 150,
      image: "img.png",
      lastRestocked: "2026-08-01T00:00:00.000Z",
      confirmedByApprentice: true,
    });
  });

  it("omits an empty-string image", () => {
    const payload = toInventoryPayload({ name: "Widget", image: "" });

    expect(payload.image).toBeUndefined();
  });

  it("never sends id, sold, or status", () => {
    const payload = toInventoryPayload({
      id: "i1",
      name: "Widget",
      sold: 4,
      status: "low-stock",
      sellingPrice: 100,
    });

    expect(payload).toEqual({ name: "Widget", sellingPrice: 100 });
  });

  it("omits an empty category array", () => {
    const payload = toInventoryPayload({
      name: "Widget",
      category: [],
      sellingPrice: 100,
    });

    expect(payload.category).toBeUndefined();
  });

  it("omits undefined optional fields", () => {
    const payload = toInventoryPayload({
      name: "Widget",
      sellingPrice: 100,
      bundleQuantity: undefined,
      bundlePrice: undefined,
      reorderPoint: undefined,
    });

    expect(payload.bundleQuantity).toBeUndefined();
    expect(payload.bundlePrice).toBeUndefined();
    expect(payload.reorderPoint).toBeUndefined();
  });

  it("keeps zero values that are meaningful", () => {
    const payload = toInventoryPayload({
      name: "Widget",
      quantity: 0,
      reorderPoint: 0,
      confirmedByApprentice: false,
    });

    expect(payload.quantity).toBe(0);
    expect(payload.reorderPoint).toBe(0);
    expect(payload.confirmedByApprentice).toBe(false);
  });
});