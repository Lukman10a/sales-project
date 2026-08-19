import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { toNotification, formatNotificationTime } from "./notification.adapter";
import type { BackendNotification } from "./notification.adapter";

const base: BackendNotification = {
  id: "n1",
  type: "inventory",
  title: "Low Stock Warning",
  message: "Widgets are running low",
  read: false,
  createdAt: new Date("2026-08-19T11:55:00.000Z"),
};

describe("toNotification", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-19T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("maps createdAt to a relative time string", () => {
    const notification = toNotification(base);

    expect(notification.time).toBe("5 minutes ago");
  });

  it("passes through id, title, message and read", () => {
    const notification = toNotification(base);

    expect(notification.id).toBe("n1");
    expect(notification.title).toBe("Low Stock Warning");
    expect(notification.message).toBe("Widgets are running low");
    expect(notification.read).toBe(false);
  });

  it("accepts the system type", () => {
    const notification = toNotification({ ...base, type: "system" });

    expect(notification.type).toBe("system");
  });

  it("tolerates unknown types the UI does not model", () => {
    const notification = toNotification({ ...base, type: "audit" });

    expect(notification.type).toBe("audit");
  });

  it("derives actionable, relatedItemId and actionType from metadata", () => {
    const notification = toNotification({
      ...base,
      metadata: { actionable: true, relatedItemId: "i1", actionType: "reorder" },
    });

    expect(notification.actionable).toBe(true);
    expect(notification.relatedItemId).toBe("i1");
    expect(notification.actionType).toBe("reorder");
  });

  it("keeps actionable undefined when metadata has none", () => {
    const notification = toNotification({ ...base, metadata: {} });

    expect(notification.actionable).toBeUndefined();
    expect(notification.relatedItemId).toBeUndefined();
    expect(notification.actionType).toBeUndefined();
  });
});

describe("formatNotificationTime", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-19T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders a past date as '5 minutes ago'", () => {
    expect(
      formatNotificationTime(new Date("2026-08-19T11:55:00.000Z")),
    ).toBe("5 minutes ago");
  });

  it("renders an older date with days", () => {
    expect(
      formatNotificationTime(new Date("2026-08-17T12:00:00.000Z")),
    ).toBe("2 days ago");
  });
});