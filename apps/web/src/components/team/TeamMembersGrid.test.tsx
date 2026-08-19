import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import TeamMembersGrid from "./TeamMembersGrid";
import type { TeamMember } from "@/types/teamTypes";

vi.mock("@/contexts/LanguageContext", () => ({
  useLanguage: () => ({ t: (key: string) => key }),
}));

const members: TeamMember[] = [
  {
    id: "m1",
    name: "Jane Doe",
    email: "jane@luxa.com",
    role: "manager",
    status: "active",
    permissions: ["view-products", "record-sales"],
    joinedDate: "2026-08-01T00:00:00.000Z",
  },
  {
    id: "m2",
    name: "John Smith",
    email: "john@luxa.com",
    role: "inventory",
    status: "invited",
    permissions: ["view-inventory"],
    joinedDate: "2026-08-02T00:00:00.000Z",
  },
];

describe("TeamMembersGrid", () => {
  it("renders each member's name and email", () => {
    render(
      <TeamMembersGrid members={members} onEdit={vi.fn()} onDelete={vi.fn()} />,
    );

    expect(screen.getByText("Jane Doe")).toBeInTheDocument();
    expect(screen.getByText("jane@luxa.com")).toBeInTheDocument();
    expect(screen.getByText("John Smith")).toBeInTheDocument();
    expect(screen.getByText("john@luxa.com")).toBeInTheDocument();
  });
});
