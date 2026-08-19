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
import { TeamDataProvider, useTeamData } from "./TeamDataContext";
import type { BackendTeamMember } from "@/lib/adapters/team.adapter";
import type { TeamMember } from "@/types/teamTypes";

const apiMock = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
}));

vi.mock("@/lib/api/client", () => ({ api: apiMock }));

const backendMember1: BackendTeamMember = {
  id: "m1",
  userId: "u1",
  name: "Jane Doe",
  email: "jane@luxa.com",
  role: "manager",
  status: "active",
  permissions: ["view-products", "record-sales"],
  department: "Sales",
  joinedDate: "2026-08-01T00:00:00.000Z",
  createdAt: "2026-08-01T00:00:00.000Z",
  updatedAt: "2026-08-01T00:00:00.000Z",
};

const backendMember2: BackendTeamMember = {
  id: "m2",
  userId: "u2",
  name: "John Smith",
  email: "john@luxa.com",
  role: "inventory",
  status: "invited",
  permissions: ["view-inventory"],
  joinedDate: "2026-08-02T00:00:00.000Z",
  createdAt: "2026-08-02T00:00:00.000Z",
  updatedAt: "2026-08-02T00:00:00.000Z",
};

const newInvite: Omit<TeamMember, "id" | "joinedDate"> = {
  name: "Ada Lovelace",
  email: "ada@luxa.com",
  role: "checkout",
  status: "invited",
  permissions: ["view-products", "checkout-sales"],
  department: "Sales",
  phone: "",
  avatar: "",
};

function pagination(total: number) {
  return { page: 1, limit: 100, total, pages: 1 };
}

function Harness() {
  const {
    teamMembers,
    isLoading,
    inviteMember,
    updateMember,
    updatePermissions,
    removeMember,
  } = useTeamData();

  return (
    <div>
      <span data-testid="loading">{String(isLoading)}</span>
      <span data-testid="names">{teamMembers.map((m) => m.name).join(",")}</span>
      <span data-testid="emails">
        {teamMembers.map((m) => m.email).join(",")}
      </span>
      <span data-testid="permissions">
        {teamMembers.map((m) => m.permissions.join("|")).join(",")}
      </span>
      <button onClick={() => inviteMember(newInvite)}>invite</button>
      <button
        onClick={() => updateMember("m1", { role: "checkout", status: "active" })}
      >
        update
      </button>
      <button
        onClick={() => updatePermissions("m1", ["view-inventory", "view-out-of-stock"])}
      >
        updatePermissions
      </button>
      <button onClick={() => removeMember("m2")}>remove</button>
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
      <TeamDataProvider>{ui}</TeamDataProvider>
    </QueryClientProvider>,
  );
  return { queryClient, ...view };
}

describe("TeamDataContext", () => {
  beforeEach(() => {
    apiMock.get.mockReset();
    apiMock.post.mockReset();
    apiMock.patch.mockReset();
    apiMock.delete.mockReset();
    apiMock.get.mockImplementation(async () => ({
      data: [backendMember1, backendMember2],
      pagination: pagination(2),
    }));
  });

  afterEach(() => cleanup());

  it("loads members from GET /team, adapting email and joinedDate", async () => {
    renderContext(<Harness />);

    expect(apiMock.get).toHaveBeenCalledWith("/team");
    await waitFor(() =>
      expect(screen.getByTestId("names").textContent).toContain("Jane Doe"),
    );
    expect(screen.getByTestId("emails").textContent).toBe(
      "jane@luxa.com,john@luxa.com",
    );
    expect(screen.getByTestId("permissions").textContent).toBe(
      "view-products|record-sales,view-inventory",
    );
  });

  it("inviteMember posts to /team, silently stripping deprecated aliases", async () => {
    apiMock.post.mockResolvedValue({ id: "m3", message: "Invitation sent" });
    renderContext(<Harness />);
    await waitFor(() =>
      expect(screen.getByTestId("names").textContent).toContain("Jane Doe"),
    );

    fireEvent.click(screen.getByText("invite"));

    await waitFor(() =>
      expect(apiMock.post).toHaveBeenCalledWith(
        "/team",
        expect.objectContaining({
          email: "ada@luxa.com",
          name: "Ada Lovelace",
          role: "checkout",
          permissions: ["view-products"],
          department: "Sales",
        }),
      ),
    );
    const body = apiMock.post.mock.calls[0][1] as {
      permissions: string[];
      phone?: string;
      status?: string;
    };
    expect(body.permissions).not.toContain("checkout-sales");
    expect(body.phone).toBeUndefined();
    expect(body.status).toBeUndefined();
  });

  it("updateMember patches /team/:id", async () => {
    apiMock.patch.mockResolvedValue({ id: "m1" });
    renderContext(<Harness />);
    await waitFor(() =>
      expect(screen.getByTestId("names").textContent).toContain("Jane Doe"),
    );

    fireEvent.click(screen.getByText("update"));

    await waitFor(() =>
      expect(apiMock.patch).toHaveBeenCalledWith("/team/m1", {
        role: "checkout",
        status: "active",
      }),
    );
  });

  it("updatePermissions patches /team/:id/permissions with aliases stripped", async () => {
    apiMock.patch.mockResolvedValue({ id: "m1" });
    renderContext(<Harness />);
    await waitFor(() =>
      expect(screen.getByTestId("names").textContent).toContain("Jane Doe"),
    );

    fireEvent.click(screen.getByText("updatePermissions"));

    await waitFor(() =>
      expect(apiMock.patch).toHaveBeenCalledWith("/team/m1/permissions", {
        permissions: ["view-inventory"],
      }),
    );
  });

  it("removeMember calls DELETE /team/:id", async () => {
    apiMock.delete.mockResolvedValue({ message: "removed" });
    renderContext(<Harness />);
    await waitFor(() =>
      expect(screen.getByTestId("names").textContent).toContain("Jane Doe"),
    );

    fireEvent.click(screen.getByText("remove"));

    await waitFor(() =>
      expect(apiMock.delete).toHaveBeenCalledWith("/team/m2"),
    );
  });

  it("never reads luxa_team from localStorage", async () => {
    const getItemSpy = vi.spyOn(Storage.prototype, "getItem");
    renderContext(<Harness />);

    await waitFor(() =>
      expect(screen.getByTestId("names").textContent).toContain("Jane Doe"),
    );
    expect(getItemSpy).not.toHaveBeenCalledWith("luxa_team");
  });
});
