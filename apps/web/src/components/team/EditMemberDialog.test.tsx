import { describe, it, expect, vi, afterEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  cleanup,
} from "@testing-library/react";
import EditMemberDialog from "./EditMemberDialog";
import type { TeamMember } from "@/types/teamTypes";

vi.mock("@/contexts/LanguageContext", () => ({
  useLanguage: () => ({ t: (key: string) => key }),
}));

const member: TeamMember = {
  id: "m1",
  name: "Jane Doe",
  email: "jane@luxa.com",
  phone: "+234 800 000 0000",
  role: "manager",
  status: "active",
  permissions: ["view-products"],
  joinedDate: "2026-08-01T00:00:00.000Z",
  department: "Sales",
};

function renderDialog() {
  return render(
    <EditMemberDialog
      isOpen
      editingMember={member}
      onMemberChange={vi.fn()}
      onRoleChange={vi.fn()}
      onPermissionToggle={vi.fn()}
      onSave={vi.fn()}
      onClose={vi.fn()}
    />,
  );
}

describe("EditMemberDialog", () => {
  afterEach(() => cleanup());

  it("does not render name/email/phone as editable fields it cannot save", () => {
    renderDialog();

    expect(screen.queryByLabelText("Full Name")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Email")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Phone")).not.toBeInTheDocument();
  });

  it("keeps the backend-supported fields editable", () => {
    renderDialog();

    expect(screen.getByLabelText("Department")).toBeInTheDocument();
    expect(screen.getAllByRole("combobox")).toHaveLength(2);
    expect(screen.getByText("Permissions")).toBeInTheDocument();
  });

  it("offers investor as a role option", async () => {
    renderDialog();

    fireEvent.click(screen.getAllByRole("combobox")[0]);

    expect(await screen.findByText("Investor")).toBeInTheDocument();
  });
});