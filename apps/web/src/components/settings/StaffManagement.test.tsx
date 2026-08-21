import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import StaffManagement from "./StaffManagement";

vi.mock("@/contexts/LanguageContext", () => ({
  useLanguage: () => ({ t: (k: string) => k }),
}));

const inviteMemberMock = vi.fn().mockResolvedValue({ id: "m3" });
const removeMemberMock = vi.fn();

vi.mock("@/contexts/TeamDataContext", () => ({
  useTeamData: () => ({
    teamMembers: [
      { id: "m1", name: "Alice", email: "alice@luxa.com", role: "manager", status: "active", permissions: [], joinedDate: "" },
      { id: "m2", name: "Bob", email: "bob@luxa.com", role: "inventory", status: "invited", permissions: [], joinedDate: "" },
    ],
    inviteMember: inviteMemberMock,
    removeMember: removeMemberMock,
    isLoading: false,
    isError: false,
    teamMembersRaw: [],
  }),
  TeamDataProvider: ({ children }: any) => children,
}));

describe("StaffManagement - live team data wiring", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  afterEach(() => cleanup());

  it("renders live team members from useTeamData (Alice, Bob)", async () => {
    // RED: StaffManagement currently renders only the staff prop (hardcoded), not useTeamData.
    // When rendered without staff prop, it should still show Alice and Bob from the hook.
    render(<StaffManagement staff={[]} />);

    // Expect live data to appear even when staff prop is empty (wired to backend)
    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("Bob")).toBeInTheDocument();
    expect(screen.getByText("alice@luxa.com")).toBeInTheDocument();
  });

  it("clicking Send Invitation calls inviteMember", async () => {
    render(<StaffManagement staff={[]} />);

    const nameInput = screen.getByPlaceholderText("Staff Name");
    const emailInput = screen.getByPlaceholderText("Staff Email");
    fireEvent.change(nameInput, { target: { value: "Charlie" } });
    fireEvent.change(emailInput, { target: { value: "charlie@luxa.com" } });

    fireEvent.click(screen.getByText("Send Invitation"));

    await waitFor(() => expect(inviteMemberMock).toHaveBeenCalled());
    expect(inviteMemberMock).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Charlie", email: "charlie@luxa.com" }),
    );
  });

  it("shows remove button per member that calls removeMember", async () => {
    render(<StaffManagement staff={[]} />);
    // Expect a remove action per row (wired to backend)
    const removeButtons = screen.queryAllByText(/Remove/i);
    // RED will fail because component has no remove button yet
    expect(removeButtons.length).toBeGreaterThan(0);
    fireEvent.click(removeButtons[0]);
    await waitFor(() => expect(removeMemberMock).toHaveBeenCalled());
  });
});
