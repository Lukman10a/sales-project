import { describe, expect, it } from "vitest";
import {
  fromBackendPermissions,
  fromBackendTeamRole,
  toBackendPermissions,
  toBackendRole,
} from "./access-compat";

describe("access compatibility", () => {
  it("shows a cashier's backend permissions under the screen names", () => {
    expect(fromBackendPermissions(["sales.record"]).sort()).toEqual(
      ["record-sales", "view-inventory", "view-products", "view-sales-history"].sort(),
    );
  });

  it("drops backend permissions the screens have no switch for", () => {
    expect(fromBackendPermissions(["sales.refund", "billing.manage"])).toEqual([
      "view-products",
      "view-inventory",
    ]);
  });

  it("sends screen permissions with their backend names, without duplicates", () => {
    expect(
      toBackendPermissions([
        "view-products",
        "record-sales",
        "checkout-sales",
        "edit-inventory",
        "assign-roles",
        "view-out-of-stock",
      ]),
    ).toEqual(["sales.record", "products.restock", "staff.manage"]);
  });

  it("round-trips every switch the backend knows", () => {
    const backend = [
      "sales.record",
      "products.edit_price",
      "products.delete",
      "products.restock",
      "staff.manage",
      "reports.view_profit",
    ];
    expect(toBackendPermissions(fromBackendPermissions(backend)).sort()).toEqual(
      [...backend].sort(),
    );
  });

  it("maps team roles both ways", () => {
    expect(toBackendRole("manager")).toBe("manager");
    expect(toBackendRole("sales-assistant")).toBe("cashier");
    expect(toBackendRole("inventory")).toBe("cashier");
    expect(fromBackendTeamRole("cashier")).toBe("checkout");
    expect(fromBackendTeamRole("manager")).toBe("manager");
  });
});
