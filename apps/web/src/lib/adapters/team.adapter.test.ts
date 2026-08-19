import { describe, it, expect } from "vitest";
import { toTeamMember } from "./team.adapter";
import type { BackendTeamMember } from "./team.adapter";

describe("toTeamMember", () => {
  const backendMember: BackendTeamMember = {
    id: "m1",
    userId: "u1",
    name: "Jane Doe",
    email: "jane@luxa.com",
    role: "manager",
    status: "active",
    permissions: ["view-products", "record-sales"],
    department: "Sales",
    joinedDate: new Date("2026-08-01T00:00:00.000Z"),
    createdAt: new Date("2026-08-01T00:00:00.000Z"),
    updatedAt: new Date("2026-08-01T00:00:00.000Z"),
  };

  it("passes through email, role, status, permissions and department", () => {
    const member = toTeamMember(backendMember);

    expect(member.id).toBe("m1");
    expect(member.email).toBe("jane@luxa.com");
    expect(member.role).toBe("manager");
    expect(member.status).toBe("active");
    expect(member.permissions).toEqual(["view-products", "record-sales"]);
    expect(member.department).toBe("Sales");
  });

  it("converts joinedDate Date to an ISO string", () => {
    const member = toTeamMember(backendMember);

    expect(member.joinedDate).toBe("2026-08-01T00:00:00.000Z");
  });

  it("maps lastActive and invitedBy to undefined (not present in backend)", () => {
    const member = toTeamMember(backendMember);

    expect(member.lastActive).toBeUndefined();
    expect(member.invitedBy).toBeUndefined();
  });

  it("keeps phone and avatar undefined when absent", () => {
    const member = toTeamMember(backendMember);

    expect(member.phone).toBeUndefined();
    expect(member.avatar).toBeUndefined();
  });
});
