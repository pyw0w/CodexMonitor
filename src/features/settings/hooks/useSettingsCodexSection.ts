import { useEffect, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import type {
  AccountProfileMeta,
  AppSettings,
  CodexDoctorResult,
  CodexUpdateResult,
  WorkspaceInfo,
} from "@/types";
import {
  addAccountProfileImport,
  addAccountProfileLogin,
  listAccountProfiles,
  removeAccountProfile,
  renameAccountProfile,
  signOutAccountProfile,
  switchAccountProfile,
} from "@services/tauri";
import { useGlobalAgentsMd } from "./useGlobalAgentsMd";
import { useGlobalCodexConfigToml } from "./useGlobalCodexConfigToml";
import { useSettingsDefaultModels } from "./useSettingsDefaultModels";
import { buildEditorContentMeta } from "@settings/components/settingsViewHelpers";
import { normalizeCodexArgsInput } from "@/utils/codexArgsInput";

type UseSettingsCodexSectionArgs = {
  appSettings: AppSettings;
  projects: WorkspaceInfo[];
  onUpdateAppSettings: (next: AppSettings) => Promise<void>;
  onRunDoctor: (
    codexBin: string | null,
    codexArgs: string | null,
  ) => Promise<CodexDoctorResult>;
  onRunCodexUpdate?: (
    codexBin: string | null,
    codexArgs: string | null,
  ) => Promise<CodexUpdateResult>;
};

export type SettingsCodexSectionProps = {
  appSettings: AppSettings;
  onUpdateAppSettings: (next: AppSettings) => Promise<void>;
  defaultModels: ReturnType<typeof useSettingsDefaultModels>["models"];
  defaultModelsLoading: boolean;
  defaultModelsError: string | null;
  defaultModelsConnectedWorkspaceCount: number;
  onRefreshDefaultModels: () => void;
  codexPathDraft: string;
  codexArgsDraft: string;
  codexDirty: boolean;
  isSavingSettings: boolean;
  doctorState: {
    status: "idle" | "running" | "done";
    result: CodexDoctorResult | null;
  };
  codexUpdateState: {
    status: "idle" | "running" | "done";
    result: CodexUpdateResult | null;
  };
  globalAgentsMeta: string;
  globalAgentsError: string | null;
  globalAgentsContent: string;
  globalAgentsLoading: boolean;
  globalAgentsRefreshDisabled: boolean;
  globalAgentsSaveDisabled: boolean;
  globalAgentsSaveLabel: string;
  globalConfigMeta: string;
  globalConfigError: string | null;
  globalConfigContent: string;
  globalConfigLoading: boolean;
  globalConfigRefreshDisabled: boolean;
  globalConfigSaveDisabled: boolean;
  globalConfigSaveLabel: string;
  onSetCodexPathDraft: Dispatch<SetStateAction<string>>;
  onSetCodexArgsDraft: Dispatch<SetStateAction<string>>;
  onSetGlobalAgentsContent: (value: string) => void;
  onSetGlobalConfigContent: (value: string) => void;
  onBrowseCodex: () => Promise<void>;
  onSaveCodexSettings: () => Promise<void>;
  onRunDoctor: () => Promise<void>;
  onRunCodexUpdate: () => Promise<void>;
  onRefreshGlobalAgents: () => void;
  onSaveGlobalAgents: () => void;
  onRefreshGlobalConfig: () => void;
  onSaveGlobalConfig: () => void;
  accountProfiles: AccountProfileMeta[];
  activeAccountProfileId: string | null;
  accountProfilesBusy: boolean;
  onRefreshAccountProfiles: () => Promise<void>;
  onAddAccountProfileLogin: (name: string) => Promise<void>;
  onAddAccountProfileImport: (name: string, importPath: string) => Promise<void>;
  onSwitchAccountProfile: (profileId: string) => Promise<void>;
  onSignOutCurrentAccountProfile: () => Promise<void>;
  onRenameAccountProfile: (profileId: string, name: string) => Promise<void>;
  onRemoveAccountProfile: (profileId: string) => Promise<void>;
};

export const useSettingsCodexSection = ({
  appSettings,
  projects,
  onUpdateAppSettings,
  onRunDoctor,
  onRunCodexUpdate,
}: UseSettingsCodexSectionArgs): SettingsCodexSectionProps => {
  const [codexPathDraft, setCodexPathDraft] = useState(appSettings.codexBin ?? "");
  const [codexArgsDraft, setCodexArgsDraft] = useState(appSettings.codexArgs ?? "");
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [doctorState, setDoctorState] = useState<{
    status: "idle" | "running" | "done";
    result: CodexDoctorResult | null;
  }>({ status: "idle", result: null });
  const [codexUpdateState, setCodexUpdateState] = useState<{
    status: "idle" | "running" | "done";
    result: CodexUpdateResult | null;
  }>({ status: "idle", result: null });
  const [accountProfiles, setAccountProfiles] = useState<AccountProfileMeta[]>([]);
  const [activeAccountProfileId, setActiveAccountProfileId] = useState<string | null>(null);
  const [accountProfilesBusy, setAccountProfilesBusy] = useState(false);

  const {
    models: defaultModels,
    isLoading: defaultModelsLoading,
    error: defaultModelsError,
    connectedWorkspaceCount: defaultModelsConnectedWorkspaceCount,
    refresh: refreshDefaultModels,
  } = useSettingsDefaultModels(projects);

  const {
    content: globalAgentsContent,
    exists: globalAgentsExists,
    truncated: globalAgentsTruncated,
    isLoading: globalAgentsLoading,
    isSaving: globalAgentsSaving,
    error: globalAgentsError,
    isDirty: globalAgentsDirty,
    setContent: setGlobalAgentsContent,
    refresh: refreshGlobalAgents,
    save: saveGlobalAgents,
  } = useGlobalAgentsMd();

  const {
    content: globalConfigContent,
    exists: globalConfigExists,
    truncated: globalConfigTruncated,
    isLoading: globalConfigLoading,
    isSaving: globalConfigSaving,
    error: globalConfigError,
    isDirty: globalConfigDirty,
    setContent: setGlobalConfigContent,
    refresh: refreshGlobalConfig,
    save: saveGlobalConfig,
  } = useGlobalCodexConfigToml();

  const globalAgentsEditorMeta = buildEditorContentMeta({
    isLoading: globalAgentsLoading,
    isSaving: globalAgentsSaving,
    exists: globalAgentsExists,
    truncated: globalAgentsTruncated,
    isDirty: globalAgentsDirty,
  });

  const globalConfigEditorMeta = buildEditorContentMeta({
    isLoading: globalConfigLoading,
    isSaving: globalConfigSaving,
    exists: globalConfigExists,
    truncated: globalConfigTruncated,
    isDirty: globalConfigDirty,
  });

  useEffect(() => {
    setCodexPathDraft(appSettings.codexBin ?? "");
  }, [appSettings.codexBin]);

  useEffect(() => {
    setCodexArgsDraft(appSettings.codexArgs ?? "");
  }, [appSettings.codexArgs]);

  const nextCodexBin = codexPathDraft.trim() ? codexPathDraft.trim() : null;
  const nextCodexArgs = normalizeCodexArgsInput(codexArgsDraft);
  const codexDirty =
    nextCodexBin !== (appSettings.codexBin ?? null) ||
    nextCodexArgs !== (appSettings.codexArgs ?? null);

  const handleBrowseCodex = async () => {
    const selection = await open({ multiple: false, directory: false });
    if (!selection || Array.isArray(selection)) {
      return;
    }
    setCodexPathDraft(selection);
  };

  const handleSaveCodexSettings = async () => {
    setIsSavingSettings(true);
    try {
      await onUpdateAppSettings({
        ...appSettings,
        codexBin: nextCodexBin,
        codexArgs: nextCodexArgs,
      });
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleRunDoctor = async () => {
    setDoctorState({ status: "running", result: null });
    try {
      const result = await onRunDoctor(nextCodexBin, nextCodexArgs);
      setDoctorState({ status: "done", result });
    } catch (error) {
      setDoctorState({
        status: "done",
        result: {
          ok: false,
          codexBin: nextCodexBin,
          version: null,
          appServerOk: false,
          details: error instanceof Error ? error.message : String(error),
          path: null,
          nodeOk: false,
          nodeVersion: null,
          nodeDetails: null,
        },
      });
    }
  };

  const handleRunCodexUpdate = async () => {
    setCodexUpdateState({ status: "running", result: null });
    try {
      if (!onRunCodexUpdate) {
        setCodexUpdateState({
          status: "done",
          result: {
            ok: false,
            method: "unknown",
            package: null,
            beforeVersion: null,
            afterVersion: null,
            upgraded: false,
            output: null,
            details: "Codex updates are not available in this build.",
          },
        });
        return;
      }

      const result = await onRunCodexUpdate(nextCodexBin, nextCodexArgs);
      setCodexUpdateState({ status: "done", result });
    } catch (error) {
      setCodexUpdateState({
        status: "done",
        result: {
          ok: false,
          method: "unknown",
          package: null,
          beforeVersion: null,
          afterVersion: null,
          upgraded: false,
          output: null,
          details: error instanceof Error ? error.message : String(error),
        },
      });
    }
  };

  const refreshAccountProfiles = async () => {
    const response = await listAccountProfiles();
    setAccountProfiles(response.profiles ?? []);
    setActiveAccountProfileId(response.activeProfileId ?? null);
  };

  const withAccountProfilesBusy = async (fn: () => Promise<void>) => {
    setAccountProfilesBusy(true);
    try {
      await fn();
      await refreshAccountProfiles();
    } finally {
      setAccountProfilesBusy(false);
    }
  };

  useEffect(() => {
    void refreshAccountProfiles().catch(() => {
      // Optional on unsupported backends.
    });
  }, []);

  const handleAddAccountProfileLogin = async (name: string) => {
    const normalized = name.trim();
    if (!normalized) {
      return;
    }
    await withAccountProfilesBusy(async () => {
      await addAccountProfileLogin(normalized, true);
    });
  };

  const handleAddAccountProfileImport = async (name: string, importPath: string) => {
    const normalized = name.trim();
    const normalizedPath = importPath.trim();
    if (!normalized || !normalizedPath) {
      return;
    }
    await withAccountProfilesBusy(async () => {
      await addAccountProfileImport(normalized, normalizedPath, false);
    });
  };

  const handleSwitchAccountProfile = async (profileId: string) => {
    if (!profileId) {
      return;
    }
    await withAccountProfilesBusy(async () => {
      await switchAccountProfile(profileId, false);
    });
  };

  const handleSignOutCurrentAccountProfile = async () => {
    const workspaceId = projects.find((workspace) => workspace.connected)?.id ?? projects[0]?.id;
    if (!workspaceId) {
      return;
    }
    await withAccountProfilesBusy(async () => {
      await signOutAccountProfile(workspaceId, activeAccountProfileId);
    });
  };

  const handleRenameAccountProfile = async (profileId: string, name: string) => {
    const normalized = name.trim();
    if (!profileId || !normalized) {
      return;
    }
    await withAccountProfilesBusy(async () => {
      await renameAccountProfile(profileId, normalized);
    });
  };

  const handleRemoveAccountProfile = async (profileId: string) => {
    if (!profileId) {
      return;
    }
    await withAccountProfilesBusy(async () => {
      await removeAccountProfile(profileId);
    });
  };

  return {
    appSettings,
    onUpdateAppSettings,
    defaultModels,
    defaultModelsLoading,
    defaultModelsError,
    defaultModelsConnectedWorkspaceCount,
    onRefreshDefaultModels: () => {
      void refreshDefaultModels();
    },
    codexPathDraft,
    codexArgsDraft,
    codexDirty,
    isSavingSettings,
    doctorState,
    codexUpdateState,
    globalAgentsMeta: globalAgentsEditorMeta.meta,
    globalAgentsError,
    globalAgentsContent,
    globalAgentsLoading,
    globalAgentsRefreshDisabled: globalAgentsEditorMeta.refreshDisabled,
    globalAgentsSaveDisabled: globalAgentsEditorMeta.saveDisabled,
    globalAgentsSaveLabel: globalAgentsEditorMeta.saveLabel,
    globalConfigMeta: globalConfigEditorMeta.meta,
    globalConfigError,
    globalConfigContent,
    globalConfigLoading,
    globalConfigRefreshDisabled: globalConfigEditorMeta.refreshDisabled,
    globalConfigSaveDisabled: globalConfigEditorMeta.saveDisabled,
    globalConfigSaveLabel: globalConfigEditorMeta.saveLabel,
    onSetCodexPathDraft: setCodexPathDraft,
    onSetCodexArgsDraft: setCodexArgsDraft,
    onSetGlobalAgentsContent: setGlobalAgentsContent,
    onSetGlobalConfigContent: setGlobalConfigContent,
    onBrowseCodex: handleBrowseCodex,
    onSaveCodexSettings: handleSaveCodexSettings,
    onRunDoctor: handleRunDoctor,
    onRunCodexUpdate: handleRunCodexUpdate,
    onRefreshGlobalAgents: () => {
      void refreshGlobalAgents();
    },
    onSaveGlobalAgents: () => {
      void saveGlobalAgents();
    },
    onRefreshGlobalConfig: () => {
      void refreshGlobalConfig();
    },
    onSaveGlobalConfig: () => {
      void saveGlobalConfig();
    },
    accountProfiles,
    activeAccountProfileId,
    accountProfilesBusy,
    onRefreshAccountProfiles: refreshAccountProfiles,
    onAddAccountProfileLogin: handleAddAccountProfileLogin,
    onAddAccountProfileImport: handleAddAccountProfileImport,
    onSwitchAccountProfile: handleSwitchAccountProfile,
    onSignOutCurrentAccountProfile: handleSignOutCurrentAccountProfile,
    onRenameAccountProfile: handleRenameAccountProfile,
    onRemoveAccountProfile: handleRemoveAccountProfile,
  };
};
