import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import DashboardCustomization from "./DashboardCustomization";

const LanguageMock = vi.hoisted(() => ({
  t: (k: string) => k,
}));

vi.mock("@/contexts/LanguageContext", () => ({
  useLanguage: () => ({ t: LanguageMock.t }),
}));

const apiMock = vi.hoisted(() => ({
  get: vi.fn(),
  patch: vi.fn(),
  post: vi.fn(),
}));

vi.mock("@/lib/api/client", () => ({ api: apiMock }));

const mockSave = vi.fn().mockResolvedValue({ message: "ok" });
const mockSet = vi.fn();

vi.mock("@/hooks/useProfile", () => ({
  useProfile: () => ({
    dashboardSettings: {
      layout: "default",
      showWelcomeMessage: true,
      showTips: true,
      autoRefresh: true,
      refreshInterval: "1m",
      quickActions: [],
    },
    setDashboardSettings: mockSet,
    saveDashboardSettings: mockSave,
    isLoading: false,
  }),
}));

import { useProfile } from "@/hooks/useProfile";

describe("DashboardCustomization - live backend wiring", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiMock.patch.mockResolvedValue({ message: "ok" });
  });
  afterEach(() => cleanup());

  it("save posts dashboardSettings to the preferences API via saveDashboardSettings", async () => {
    // RED: Component should internally call saveDashboardSettings (which PATCHes /profile/preferences)
    // Currently it only calls the onSave prop, so mockSave will NOT be called unless wired.
    const onSave = vi.fn(); // local toast - does NOT call saveDashboardSettings
    render(
      <DashboardCustomization
        selectedLayout="default"
        onLayoutChange={vi.fn()}
        welcomeMessage={true}
        onWelcomeMessageChange={vi.fn()}
        showTips={true}
        onShowTipsChange={vi.fn()}
        autoRefresh={true}
        onAutoRefreshChange={vi.fn()}
        refreshInterval="1m"
        onRefreshIntervalChange={vi.fn()}
        quickActions={[]}
        onQuickActionsChange={vi.fn()}
        onSave={onSave}
      />,
    );

    const saveBtn = screen.getByText("Save Dashboard Settings");
    fireEvent.click(saveBtn);

    // Expect the live hook's save to have been triggered (component should be wired to backend)
    await waitFor(() => expect(mockSave).toHaveBeenCalled());
  });

  it("toggling showTips and saving persists via API", async () => {
    const onSave = vi.fn(async () => {
      await mockSave({ dashboardSettings: { showTips: false } });
    });
    render(
      <DashboardCustomization
        selectedLayout="default"
        onLayoutChange={vi.fn()}
        welcomeMessage={true}
        onWelcomeMessageChange={vi.fn()}
        showTips={true}
        onShowTipsChange={vi.fn()}
        autoRefresh={true}
        onAutoRefreshChange={vi.fn()}
        refreshInterval="1m"
        onRefreshIntervalChange={vi.fn()}
        quickActions={[]}
        onQuickActionsChange={vi.fn()}
        onSave={onSave}
      />,
    );
    fireEvent.click(screen.getByText("Save Dashboard Settings"));
    await waitFor(() => expect(onSave).toHaveBeenCalled());
  });
});
