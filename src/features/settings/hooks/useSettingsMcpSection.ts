import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  CreateMcpServerInput,
  DeleteMcpServerInput,
  McpServerConfig,
  McpSettings,
  UpdateMcpServerInput,
} from "@services/tauri";
import {
  createMcpServer,
  deleteMcpServer,
  getMcpSettings,
  listMcpServerStatus,
  updateMcpServer,
} from "@services/tauri";

type UseSettingsMcpSectionArgs = {
  statusWorkspaceId: string | null;
};

export type McpRuntimeStatus = {
  name: string;
  authStatus: string | null;
  toolCount: number;
  resourceCount: number;
  templateCount: number;
};

export type SettingsMcpSectionProps = {
  configPath: string | null;
  servers: McpServerConfig[];
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  statusWorkspaceId: string | null;
  runtimeStatuses: McpRuntimeStatus[];
  runtimeStatusLoading: boolean;
  runtimeStatusError: string | null;
  onRefresh: () => void;
  onCreateServer: (input: CreateMcpServerInput) => Promise<boolean>;
  onUpdateServer: (input: UpdateMcpServerInput) => Promise<boolean>;
  onDeleteServer: (input: DeleteMcpServerInput) => Promise<boolean>;
  onRefreshRuntimeStatus: () => Promise<void>;
};

const toErrorMessage = (value: unknown, fallback: string): string => {
  if (value instanceof Error) {
    return value.message;
  }
  if (typeof value === "string" && value.trim().length > 0) {
    return value;
  }
  return fallback;
};

const parseRuntimeStatuses = (payload: unknown): McpRuntimeStatus[] => {
  if (!payload || typeof payload !== "object") {
    return [];
  }

  const root = payload as Record<string, unknown>;
  const result =
    root.result && typeof root.result === "object"
      ? (root.result as Record<string, unknown>)
      : root;
  const data = Array.isArray(result.data) ? result.data : [];

  const rows: McpRuntimeStatus[] = [];
  for (const entry of data) {
    if (!entry || typeof entry !== "object") {
      continue;
    }
    const record = entry as Record<string, unknown>;
    const name = String(record.name ?? "").trim();
    if (!name) {
      continue;
    }
    const authRaw = record.authStatus ?? record.auth_status ?? null;
    const authStatus =
      typeof authRaw === "string"
        ? authRaw
        : authRaw && typeof authRaw === "object" && "status" in authRaw
          ? String((authRaw as { status?: unknown }).status ?? "").trim() || null
          : null;
    const toolsRecord =
      record.tools && typeof record.tools === "object"
        ? (record.tools as Record<string, unknown>)
        : null;
    const toolCount = toolsRecord ? Object.keys(toolsRecord).length : 0;
    const resourceCount = Array.isArray(record.resources) ? record.resources.length : 0;
    const templateCount = Array.isArray(record.resourceTemplates)
      ? record.resourceTemplates.length
      : Array.isArray(record.resource_templates)
        ? record.resource_templates.length
        : 0;

    rows.push({ name, authStatus, toolCount, resourceCount, templateCount });
  }

  return rows.sort((left, right) => left.name.localeCompare(right.name));
};

export const useSettingsMcpSection = ({
  statusWorkspaceId,
}: UseSettingsMcpSectionArgs): SettingsMcpSectionProps => {
  const [settings, setSettings] = useState<McpSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [runtimeStatuses, setRuntimeStatuses] = useState<McpRuntimeStatus[]>([]);
  const [runtimeStatusLoading, setRuntimeStatusLoading] = useState(false);
  const [runtimeStatusError, setRuntimeStatusError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const next = await getMcpSettings();
      setSettings(next);
    } catch (refreshError) {
      setError(toErrorMessage(refreshError, "Unable to load MCP settings."));
    } finally {
      setIsLoading(false);
    }
  }, []);

  const onRefreshRuntimeStatus = useCallback(async () => {
    if (!statusWorkspaceId) {
      setRuntimeStatuses([]);
      setRuntimeStatusError("Connect a workspace to load MCP runtime status.");
      return;
    }

    setRuntimeStatusLoading(true);
    setRuntimeStatusError(null);
    try {
      const response = await listMcpServerStatus(statusWorkspaceId, null, 200);
      setRuntimeStatuses(parseRuntimeStatuses(response));
    } catch (statusError) {
      setRuntimeStatusError(toErrorMessage(statusError, "Unable to load MCP runtime status."));
      setRuntimeStatuses([]);
    } finally {
      setRuntimeStatusLoading(false);
    }
  }, [statusWorkspaceId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    void onRefreshRuntimeStatus();
  }, [onRefreshRuntimeStatus]);

  const wrapMutation = useCallback(async (task: () => Promise<McpSettings>): Promise<boolean> => {
    setIsSaving(true);
    setError(null);
    try {
      const next = await task();
      setSettings(next);
      return true;
    } catch (mutationError) {
      setError(toErrorMessage(mutationError, "Unable to update MCP settings."));
      return false;
    } finally {
      setIsSaving(false);
    }
  }, []);

  const onCreateServer = useCallback(
    async (input: CreateMcpServerInput): Promise<boolean> =>
      wrapMutation(() => createMcpServer(input)),
    [wrapMutation],
  );

  const onUpdateServer = useCallback(
    async (input: UpdateMcpServerInput): Promise<boolean> =>
      wrapMutation(() => updateMcpServer(input)),
    [wrapMutation],
  );

  const onDeleteServer = useCallback(
    async (input: DeleteMcpServerInput): Promise<boolean> =>
      wrapMutation(() => deleteMcpServer(input)),
    [wrapMutation],
  );

  return useMemo(
    () => ({
      configPath: settings?.configPath ?? null,
      servers: settings?.servers ?? [],
      isLoading,
      isSaving,
      error,
      statusWorkspaceId,
      runtimeStatuses,
      runtimeStatusLoading,
      runtimeStatusError,
      onRefresh: () => {
        void refresh();
      },
      onCreateServer,
      onUpdateServer,
      onDeleteServer,
      onRefreshRuntimeStatus,
    }),
    [
      error,
      isLoading,
      isSaving,
      onCreateServer,
      onDeleteServer,
      onRefreshRuntimeStatus,
      onUpdateServer,
      refresh,
      runtimeStatusError,
      runtimeStatusLoading,
      runtimeStatuses,
      settings?.configPath,
      settings?.servers,
      statusWorkspaceId,
    ],
  );
};
