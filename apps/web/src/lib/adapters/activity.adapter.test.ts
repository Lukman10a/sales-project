import { describe, it, expect } from "vitest";
import { toActivityLog, BackendActivityLog } from "./activity.adapter";

describe("toActivityLog", () => {
  it("maps backend entry to ActivityLog with ISO timestamp", () => {
    const backend: BackendActivityLog = {
      id: "sale-s1",
      userId: "u1",
      userName: "Alice",
      action: "Recorded Sale",
      entity: "sale",
      entityId: "s1",
      timestamp: "2026-01-21T11:00:00.000Z",
      details: "Sold 2 items for ₦45,000",
    };

    const log = toActivityLog(backend);

    expect(log.id).toBe("sale-s1");
    expect(log.userName).toBe("Alice");
    expect(log.action).toBe("Recorded Sale");
    expect(log.entity).toBe("sale");
    expect(log.timestamp).toBe("2026-01-21T11:00:00.000Z");
    expect(log.details).toBe("Sold 2 items for ₦45,000");
    expect(log.ipAddress).toBeUndefined();
  });

  it("handles inventory and team entries", () => {
    const backend: BackendActivityLog = {
      id: "team-m1",
      userId: "u2",
      userName: "Bob",
      action: "Invited User",
      entity: "team",
      entityId: "m1",
      timestamp: "2026-01-19T09:00:00.000Z",
      details: "Invited Emeka as sales-assistant",
    };
    expect(toActivityLog(backend).entity).toBe("team");
  });
});
