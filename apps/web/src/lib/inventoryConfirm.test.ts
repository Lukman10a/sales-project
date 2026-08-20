import { describe, it, expect } from "vitest";
import { canConfirmItem } from "./inventoryConfirm";

const item = { confirmedByApprentice: false, createdBy: "u1" as string | undefined };

describe("canConfirmItem", () => {
  it("lets an owner confirm anything", () => {
    expect(canConfirmItem({ ...item, createdBy: "someone" }, "owner", "u1")).toBe(
      true,
    );
  });

  it("never offers confirm on an already confirmed item", () => {
    expect(
      canConfirmItem({ ...item, confirmedByApprentice: true }, "owner", "u1"),
    ).toBe(false);
  });

  it("lets a manager confirm an item created by someone else", () => {
    expect(canConfirmItem({ ...item, createdBy: "other" }, "manager", "u1")).toBe(
      true,
    );
  });

  it("blocks a manager from confirming their own item", () => {
    expect(canConfirmItem(item, "manager", "u1")).toBe(false);
  });

  it("lets a manager confirm a legacy item with no creator", () => {
    expect(canConfirmItem({ ...item, createdBy: undefined }, "manager", "u1")).toBe(
      true,
    );
  });

  it("lets an apprentice confirm an item they created", () => {
    expect(canConfirmItem(item, "apprentice", "u1")).toBe(true);
  });

  it("blocks an apprentice from confirming someone else item", () => {
    expect(canConfirmItem({ ...item, createdBy: "other" }, "apprentice", "u1")).toBe(
      false,
    );
  });

  it("blocks roles outside owner/manager/apprentice", () => {
    expect(canConfirmItem(item, "investor", "u1")).toBe(false);
  });
});