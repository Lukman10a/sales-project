import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  render,
  screen,
  waitFor,
  fireEvent,
  cleanup,
} from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { NotificationProvider, useNotifications } from "./NotificationContext";
import type { BackendNotification } from "@/lib/adapters/notification.adapter";

const apiMock = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
}));

vi.mock("@/lib/api/client", () => ({ api: apiMock }));

const backendNotification1: BackendNotification = {
  id: "n1",
  type: "inventory",
  title: "Low Stock Warning",
  message: "Widgets are low",
  read: false,
  createdAt: "2026-08-19T11:55:00.000Z",
};

const backendNotification2: BackendNotification = {
  id: "n2",
  type: "system",
  title: "System notice",
  message: "Maintenance scheduled",
  read: true,
  createdAt: "2026-08-19T10:00:00.000Z",
};

function pagination(total: number) {
  return { page: 1, limit: 20, total, pages: 1 };
}

function Harness() {
  const {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    removeNotification,
  } = useNotifications();

  return (
    <div>
      <span data-testid="loading">{String(isLoading)}</span>
      <span data-testid="titles">{notifications.map((n) => n.title).join(",")}</span>
      <span data-testid="types">{notifications.map((n) => n.type).join(",")}</span>
      <span data-testid="unread">{String(unreadCount)}</span>
      <button onClick={() => markAsRead("n1")}>mark</button>
      <button onClick={() => markAllAsRead()}>markAll</button>
      <button onClick={() => removeNotification("n2")}>remove</button>
    </div>
  );
}

function renderContext(ui: ReactNode) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  const view = render(
    <QueryClientProvider client={queryClient}>
      <NotificationProvider>{ui}</NotificationProvider>
    </QueryClientProvider>,
  );
  return { queryClient, ...view };
}

describe("NotificationContext", () => {
  beforeEach(() => {
    apiMock.get.mockReset();
    apiMock.post.mockReset();
    apiMock.patch.mockReset();
    apiMock.delete.mockReset();
    apiMock.get.mockImplementation(async () => ({
      data: [backendNotification1, backendNotification2],
      pagination: pagination(2),
      unreadCount: 1,
    }));
  });

  afterEach(() => cleanup());

  it("loads notifications from GET /notifications, adapting createdAt to time", async () => {
    renderContext(<Harness />);

    expect(apiMock.get).toHaveBeenCalledWith("/notifications");
    await waitFor(() =>
      expect(screen.getByTestId("titles").textContent).toContain(
        "Low Stock Warning",
      ),
    );
    expect(screen.getByTestId("types").textContent).toBe(
      "inventory,system",
    );
  });

  it("exposes the live unreadCount from the list response", async () => {
    renderContext(<Harness />);

    await waitFor(() =>
      expect(screen.getByTestId("unread").textContent).toBe("1"),
    );
  });

  it("markAsRead patches /notifications/:id/read and refetches the list", async () => {
    apiMock.patch.mockResolvedValue({ id: "n1", read: true });
    renderContext(<Harness />);
    await waitFor(() =>
      expect(screen.getByTestId("titles").textContent).toContain(
        "Low Stock Warning",
      ),
    );

    fireEvent.click(screen.getByText("mark"));

    await waitFor(() =>
      expect(apiMock.patch).toHaveBeenCalledWith("/notifications/n1/read"),
    );
    await waitFor(() =>
      expect(apiMock.get).toHaveBeenCalledTimes(2),
    );
  });

  it("markAllAsRead posts to /notifications/mark-all-read", async () => {
    apiMock.post.mockResolvedValue({ updated: 1 });
    renderContext(<Harness />);
    await waitFor(() =>
      expect(screen.getByTestId("titles").textContent).toContain(
        "Low Stock Warning",
      ),
    );

    fireEvent.click(screen.getByText("markAll"));

    await waitFor(() =>
      expect(apiMock.post).toHaveBeenCalledWith("/notifications/mark-all-read"),
    );
  });

  it("removeNotification calls DELETE /notifications/:id", async () => {
    apiMock.delete.mockResolvedValue({ message: "deleted" });
    renderContext(<Harness />);
    await waitFor(() =>
      expect(screen.getByTestId("titles").textContent).toContain(
        "Low Stock Warning",
      ),
    );

    fireEvent.click(screen.getByText("remove"));

    await waitFor(() =>
      expect(apiMock.delete).toHaveBeenCalledWith("/notifications/n2"),
    );
  });

  it("never reads luxa_notifications from localStorage", async () => {
    const getItemSpy = vi.spyOn(Storage.prototype, "getItem");
    renderContext(<Harness />);

    await waitFor(() =>
      expect(screen.getByTestId("titles").textContent).toContain(
        "Low Stock Warning",
      ),
    );
    expect(getItemSpy).not.toHaveBeenCalledWith("luxa_notifications");
  });
});