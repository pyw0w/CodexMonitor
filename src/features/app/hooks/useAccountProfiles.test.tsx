// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  addAccountProfileLogin,
  listAccountProfiles,
  removeAccountProfile,
  renameAccountProfile,
  signOutAccountProfile,
  switchAccountProfile,
} from "@services/tauri";
import { useAccountProfiles } from "./useAccountProfiles";

vi.mock("@services/tauri", () => ({
  addAccountProfileImport: vi.fn(),
  addAccountProfileLogin: vi.fn(),
  listAccountProfiles: vi.fn(),
  removeAccountProfile: vi.fn(),
  renameAccountProfile: vi.fn(),
  signOutAccountProfile: vi.fn(),
  switchAccountProfile: vi.fn(),
}));

type HookResult = ReturnType<typeof useAccountProfiles>;

type HarnessProps = Parameters<typeof useAccountProfiles>[0] & {
  onChange: (value: HookResult) => void;
};

function Harness(props: HarnessProps) {
  const value = useAccountProfiles(props);
  props.onChange(value);
  return null;
}

let latest: HookResult | null = null;

beforeEach(() => {
  latest = null;
  vi.clearAllMocks();
  vi.mocked(listAccountProfiles).mockResolvedValue({ profiles: [], activeProfileId: null });
});

afterEach(() => {
  vi.restoreAllMocks();
});

async function mount(overrides: Partial<Parameters<typeof useAccountProfiles>[0]> = {}) {
  const container = document.createElement("div");
  const root = createRoot(container);
  const props: Parameters<typeof useAccountProfiles>[0] = {
    activeWorkspaceId: "ws-1",
    activeProcessingCount: 0,
    alertError: vi.fn(),
    ...overrides,
  };
  await act(async () => {
    root.render(<Harness {...props} onChange={(value) => (latest = value)} />);
  });
  return { root, props };
}

describe("useAccountProfiles", () => {
  it("loads initial profiles", async () => {
    vi.mocked(listAccountProfiles).mockResolvedValue({
      profiles: [
        {
          id: "p1",
          name: "Work",
          source: "login",
          lastUsedAtMs: null,
          createdAtMs: 1,
        },
      ],
      activeProfileId: "p1",
    });

    const { root } = await mount();
    expect(listAccountProfiles).toHaveBeenCalled();
    expect(latest?.profiles[0]?.id).toBe("p1");
    expect(latest?.activeProfileId).toBe("p1");

    await act(async () => {
      root.unmount();
    });
  });

  it("adds a login profile and refreshes", async () => {
    vi.mocked(addAccountProfileLogin).mockResolvedValue({
      profileId: "p2",
      activeProfileId: null,
    });
    vi.mocked(switchAccountProfile).mockResolvedValue({
      switched: true,
      requiresConfirmation: false,
      interruptedRunsCount: 0,
      activeProfileId: "p2",
    });
    vi.mocked(listAccountProfiles)
      .mockResolvedValueOnce({ profiles: [], activeProfileId: null })
      .mockResolvedValueOnce({
        profiles: [
          {
            id: "p2",
            name: "Personal",
            source: "login",
            lastUsedAtMs: 10,
            createdAtMs: 10,
          },
        ],
        activeProfileId: "p2",
      });

    const { root } = await mount();

    await act(async () => {
      await latest?.addProfileWithLogin("Personal");
    });

    expect(addAccountProfileLogin).toHaveBeenCalledWith("Personal", false);
    expect(switchAccountProfile).toHaveBeenCalledWith("p2", false);
    expect(latest?.activeProfileId).toBe("p2");

    await act(async () => {
      root.unmount();
    });
  });

  it("switches profile", async () => {
    vi.mocked(listAccountProfiles)
      .mockResolvedValueOnce({
        profiles: [
          {
            id: "p1",
            name: "Work",
            source: "login",
            lastUsedAtMs: 1,
            createdAtMs: 1,
          },
          {
            id: "p2",
            name: "Personal",
            source: "import",
            lastUsedAtMs: null,
            createdAtMs: 2,
          },
        ],
        activeProfileId: "p1",
      })
      .mockResolvedValueOnce({
        profiles: [
          {
            id: "p1",
            name: "Work",
            source: "login",
            lastUsedAtMs: 1,
            createdAtMs: 1,
          },
          {
            id: "p2",
            name: "Personal",
            source: "import",
            lastUsedAtMs: 3,
            createdAtMs: 2,
          },
        ],
        activeProfileId: "p2",
      });
    vi.mocked(switchAccountProfile).mockResolvedValue({
      switched: true,
      requiresConfirmation: false,
      interruptedRunsCount: 0,
      activeProfileId: "p2",
    });

    const { root } = await mount();

    await act(async () => {
      await latest?.switchProfile("p2");
    });

    expect(switchAccountProfile).toHaveBeenCalledWith("p2", false);
    expect(latest?.activeProfileId).toBe("p2");

    await act(async () => {
      root.unmount();
    });
  });

  it("signs out active profile", async () => {
    vi.mocked(signOutAccountProfile).mockResolvedValue({ signedOut: true });
    vi.mocked(listAccountProfiles)
      .mockResolvedValueOnce({ profiles: [], activeProfileId: "p1" })
      .mockResolvedValueOnce({ profiles: [], activeProfileId: "p1" });

    const { root } = await mount();

    await act(async () => {
      await latest?.signOutActiveProfile();
    });

    expect(signOutAccountProfile).toHaveBeenCalledWith("ws-1", "p1");

    await act(async () => {
      root.unmount();
    });
  });

  it("handles remove and rename", async () => {
    vi.mocked(renameAccountProfile).mockResolvedValue({ updated: true });
    vi.mocked(removeAccountProfile).mockResolvedValue({ removed: true, activeProfileId: null });
    vi.mocked(listAccountProfiles)
      .mockResolvedValueOnce({
        profiles: [
          {
            id: "p1",
            name: "Work",
            source: "login",
            lastUsedAtMs: null,
            createdAtMs: 1,
          },
        ],
        activeProfileId: "p1",
      })
      .mockResolvedValueOnce({
        profiles: [
          {
            id: "p1",
            name: "Work New",
            source: "login",
            lastUsedAtMs: null,
            createdAtMs: 1,
          },
        ],
        activeProfileId: "p1",
      })
      .mockResolvedValueOnce({ profiles: [], activeProfileId: null });

    const { root } = await mount();

    await act(async () => {
      await latest?.renameProfile("p1", "Work New");
    });
    expect(renameAccountProfile).toHaveBeenCalledWith("p1", "Work New");

    await act(async () => {
      await latest?.removeProfile("p1");
    });
    expect(removeAccountProfile).toHaveBeenCalledWith("p1");

    await act(async () => {
      root.unmount();
    });
  });
});
