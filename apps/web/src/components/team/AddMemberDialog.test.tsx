import { describe, it, expect, vi, afterEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  cleanup,
} from "@testing-library/react";
import AddMemberDialog from "./AddMemberDialog";
import type { TeamMember } from "@/types/teamTypes";

vi.mock("@/contexts/LanguageContext", () => ({
  useLanguage: () => ({ t: (key: string) => key }),
}));

const baseMember: Omit<TeamMember, "id" | "joinedDate"> = {
  name: "Jane Doe",
  email: "jane@luxa.com",
  phone: "",
  role: "manager",
  status: "invited",
  permissions: [],
  department: "",
  avatar: "",
};

function renderDialog(
  overrides: Partial<React.ComponentProps<typeof AddMemberDialog>> = {},
) {
  return render(
    <AddMemberDialog
      isOpen
      newMember={baseMember}
      onMemberChange={vi.fn()}
      onRoleChange={vi.fn()}
      onPermissionToggle={vi.fn()}
      onAdd={vi.fn()}
      onClose={vi.fn()}
      {...overrides}
    />,
  );
}

describe("AddMemberDialog", () => {
  afterEach(() => cleanup());

  it("offers investor as an invitable role", async () => {
    renderDialog();

    fireEvent.click(screen.getByRole("combobox"));

    expect(await screen.findByText("Investor")).toBeInTheDocument();
  });

  it("shows the one-time temporary password in the confirmation view", () => {
    renderDialog({
      invitedCredentials: {
        id: "m1",
        email: "jane@luxa.com",
        name: "Jane Doe",
        role: "manager",
        status: "invited",
        message: "Invitation created",
        temporaryPassword: "a1b2c3d4e5f60718",
      },
    });

    expect(screen.getByText("a1b2c3d4e5f60718")).toBeInTheDocument();
    expect(
      screen.getByText(/share this temporary password/i),
    ).toBeInTheDocument();
  });
});