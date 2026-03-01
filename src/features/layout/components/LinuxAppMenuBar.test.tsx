/** @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LinuxAppMenuBar } from "./LinuxAppMenuBar";

afterEach(() => {
  cleanup();
});

function buildProps(
  overrides: Partial<Parameters<typeof LinuxAppMenuBar>[0]> = {},
): Parameters<typeof LinuxAppMenuBar>[0] {
  return {
    canAddWorkspaceAgent: true,
    canAddDerivedAgent: true,
    canCycleAgent: true,
    canCycleWorkspace: true,
    sidebarCollapsed: false,
    rightPanelCollapsed: false,
    onNewAgent: vi.fn(),
    onNewWorktreeAgent: vi.fn(),
    onNewCloneAgent: vi.fn(),
    onAddWorkspace: vi.fn(),
    onAddWorkspaceFromUrl: vi.fn(),
    onOpenSettings: vi.fn(),
    onCloseWindow: vi.fn(),
    onQuitApp: vi.fn(),
    onEditUndo: vi.fn(),
    onEditRedo: vi.fn(),
    onEditCut: vi.fn(),
    onEditCopy: vi.fn(),
    onEditPaste: vi.fn(),
    onEditSelectAll: vi.fn(),
    onComposerCycleModel: vi.fn(),
    onComposerCycleAccess: vi.fn(),
    onComposerCycleReasoning: vi.fn(),
    onComposerCycleCollaboration: vi.fn(),
    onToggleProjectsSidebar: vi.fn(),
    onToggleGitSidebar: vi.fn(),
    onToggleDebugPanel: vi.fn(),
    onToggleTerminal: vi.fn(),
    onNextAgent: vi.fn(),
    onPrevAgent: vi.fn(),
    onNextWorkspace: vi.fn(),
    onPrevWorkspace: vi.fn(),
    onWindowMinimize: vi.fn(),
    onWindowToggleMaximize: vi.fn(),
    onHelpAbout: vi.fn(),
    onHelpCheckUpdates: vi.fn(),
    ...overrides,
  };
}

describe("LinuxAppMenuBar", () => {
  it("invokes file actions from the in-app menu", () => {
    const props = buildProps();
    render(<LinuxAppMenuBar {...props} />);

    fireEvent.click(screen.getByRole("button", { name: "Open application menu" }));
    fireEvent.click(screen.getByRole("menuitem", { name: /Add Workspace\.\.\./ }));

    expect(props.onAddWorkspace).toHaveBeenCalledTimes(1);
  });

  it("disables unavailable actions", () => {
    const props = buildProps({ canAddWorkspaceAgent: false });
    render(<LinuxAppMenuBar {...props} />);

    fireEvent.click(screen.getByRole("button", { name: "Open application menu" }));
    const newAgentButton = screen.getByRole("menuitem", { name: /New Agent/ });
    expect((newAgentButton as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(newAgentButton);

    expect(props.onNewAgent).not.toHaveBeenCalled();
  });
});
