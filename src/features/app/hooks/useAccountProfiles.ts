import { useCallback, useEffect, useMemo, useState } from "react";
import type { AccountProfileMeta } from "@/types";
import {
  addAccountProfileImport,
  addAccountProfileLogin,
  listAccountProfiles,
  removeAccountProfile,
  renameAccountProfile,
  signOutAccountProfile,
  switchAccountProfile,
} from "@services/tauri";

type UseAccountProfilesArgs = {
  activeWorkspaceId: string | null;
  activeProcessingCount: number;
  onAfterSwitch?: () => Promise<void> | void;
  onAfterAddLogin?: () => Promise<void> | void;
  alertError: (error: unknown) => void;
};

type UseAccountProfilesResult = {
  profiles: AccountProfileMeta[];
  activeProfileId: string | null;
  busy: boolean;
  addProfileWithLogin: (name: string) => Promise<void>;
  addProfileFromImport: (name: string, importPath: string) => Promise<void>;
  switchProfile: (profileId: string) => Promise<void>;
  signOutActiveProfile: () => Promise<void>;
  removeProfile: (profileId: string) => Promise<void>;
  renameProfile: (profileId: string, name: string) => Promise<void>;
  refresh: () => Promise<void>;
};

export function useAccountProfiles({
  activeWorkspaceId,
  activeProcessingCount,
  onAfterSwitch,
  onAfterAddLogin,
  alertError,
}: UseAccountProfilesArgs): UseAccountProfilesResult {
  const [profiles, setProfiles] = useState<AccountProfileMeta[]>([]);
  const [activeProfileId, setActiveProfileId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    const response = await listAccountProfiles();
    setProfiles(response.profiles ?? []);
    setActiveProfileId(response.activeProfileId ?? null);
  }, []);

  useEffect(() => {
    void refresh().catch(() => {
      // Keep account profiles optional when backend doesn't support it.
    });
  }, [refresh]);

  const addProfileWithLogin = useCallback(
    async (name: string) => {
      const normalized = name.trim();
      if (!normalized) {
        return;
      }
      if (activeProcessingCount > 0) {
        const confirmed = window.confirm(
          `There are ${activeProcessingCount} active run(s). Switching profile will restart the Codex session and interrupt in-flight responses. Continue?`,
        );
        if (!confirmed) {
          return;
        }
      }
      setBusy(true);
      try {
        const created = await addAccountProfileLogin(normalized, false);
        await switchAccountProfile(created.profileId, activeProcessingCount > 0);
        await refresh();
        await onAfterAddLogin?.();
      } catch (error) {
        alertError(error);
      } finally {
        setBusy(false);
      }
    },
    [activeProcessingCount, alertError, onAfterAddLogin, refresh],
  );

  const addProfileFromImport = useCallback(
    async (name: string, importPath: string) => {
      const normalized = name.trim();
      const path = importPath.trim();
      if (!normalized || !path) {
        return;
      }
      setBusy(true);
      try {
        await addAccountProfileImport(normalized, path, false);
        await refresh();
      } catch (error) {
        alertError(error);
      } finally {
        setBusy(false);
      }
    },
    [alertError, refresh],
  );

  const switchProfile = useCallback(
    async (profileId: string) => {
      if (!profileId || profileId === activeProfileId) {
        return;
      }
      if (activeProcessingCount > 0) {
        const confirmed = window.confirm(
          `There are ${activeProcessingCount} active run(s). Switching profile will restart the Codex session and interrupt in-flight responses. Continue?`,
        );
        if (!confirmed) {
          return;
        }
      }
      setBusy(true);
      try {
        const result = await switchAccountProfile(profileId, activeProcessingCount > 0);
        setActiveProfileId(result.activeProfileId ?? null);
        await refresh();
        await onAfterSwitch?.();
      } catch (error) {
        alertError(error);
      } finally {
        setBusy(false);
      }
    },
    [activeProfileId, activeProcessingCount, alertError, onAfterSwitch, refresh],
  );

  const signOutActiveProfile = useCallback(async () => {
    if (!activeWorkspaceId) {
      return;
    }
    setBusy(true);
    try {
      await signOutAccountProfile(activeWorkspaceId, activeProfileId);
      await refresh();
      await onAfterSwitch?.();
    } catch (error) {
      alertError(error);
    } finally {
      setBusy(false);
    }
  }, [activeProfileId, activeWorkspaceId, alertError, onAfterSwitch, refresh]);

  const removeProfile = useCallback(
    async (profileId: string) => {
      setBusy(true);
      try {
        await removeAccountProfile(profileId);
        await refresh();
      } catch (error) {
        alertError(error);
      } finally {
        setBusy(false);
      }
    },
    [alertError, refresh],
  );

  const renameProfile = useCallback(
    async (profileId: string, name: string) => {
      const normalized = name.trim();
      if (!normalized) {
        return;
      }
      setBusy(true);
      try {
        await renameAccountProfile(profileId, normalized);
        await refresh();
      } catch (error) {
        alertError(error);
      } finally {
        setBusy(false);
      }
    },
    [alertError, refresh],
  );

  return useMemo(
    () => ({
      profiles,
      activeProfileId,
      busy,
      addProfileWithLogin,
      addProfileFromImport,
      switchProfile,
      signOutActiveProfile,
      removeProfile,
      renameProfile,
      refresh,
    }),
    [
      profiles,
      activeProfileId,
      busy,
      addProfileWithLogin,
      addProfileFromImport,
      switchProfile,
      signOutActiveProfile,
      removeProfile,
      renameProfile,
      refresh,
    ],
  );
}
