import { useEffect, useMemo, useState } from "react";
import {
  SettingsSection,
  SettingsToggleRow,
  SettingsToggleSwitch,
} from "@/features/design-system/components/settings/SettingsPrimitives";
import type { SettingsMcpSectionProps } from "@settings/hooks/useSettingsMcpSection";
import { useI18n } from "@/i18n/useI18n";

type McpDraft = {
  originalName: string | null;
  name: string;
  enabled: boolean;
  command: string;
  argsText: string;
  url: string;
  envText: string;
  headersText: string;
  additionalToml: string;
};

const parseMapText = (value: string): Record<string, string> => {
  const map: Record<string, string> = {};
  const lines = value
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  for (const line of lines) {
    const separator = line.indexOf("=");
    if (separator <= 0) {
      continue;
    }
    const key = line.slice(0, separator).trim();
    const raw = line.slice(separator + 1).trim();
    if (!key) {
      continue;
    }
    map[key] = raw;
  }
  return map;
};

const mapToText = (value: Record<string, string>): string =>
  Object.entries(value)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, val]) => `${key}=${val}`)
    .join("\n");

const createBlankDraft = (name: string): McpDraft => ({
  originalName: null,
  name,
  enabled: true,
  command: "",
  argsText: "",
  url: "",
  envText: "",
  headersText: "",
  additionalToml: "",
});

const toDraft = (server: SettingsMcpSectionProps["servers"][number]): McpDraft => ({
  originalName: server.name,
  name: server.name,
  enabled: server.enabled ?? true,
  command: server.command ?? "",
  argsText: server.args.join(" "),
  url: server.url ?? "",
  envText: mapToText(server.env ?? {}),
  headersText: mapToText(server.headers ?? {}),
  additionalToml: server.additionalToml ?? "",
});

const buildNextDraftName = (existing: string[]): string => {
  const taken = new Set(existing.map((entry) => entry.toLowerCase()));
  let index = existing.length + 1;
  let candidate = `mcp-server-${index}`;
  while (taken.has(candidate.toLowerCase())) {
    index += 1;
    candidate = `mcp-server-${index}`;
  }
  return candidate;
};

export function SettingsMcpSection({
  configPath,
  servers,
  isLoading,
  isSaving,
  error,
  statusWorkspaceId,
  runtimeStatuses,
  runtimeStatusLoading,
  runtimeStatusError,
  onRefresh,
  onCreateServer,
  onUpdateServer,
  onDeleteServer,
  onRefreshRuntimeStatus,
}: SettingsMcpSectionProps) {
  const { t } = useI18n();
  const [selectedName, setSelectedName] = useState<string | null>(null);
  const [draft, setDraft] = useState<McpDraft | null>(null);
  const [savingError, setSavingError] = useState<string | null>(null);

  useEffect(() => {
    const names = servers.map((entry) => entry.name);
    const hasCurrent = selectedName ? names.includes(selectedName) : false;
    const nextSelected = hasCurrent ? selectedName : names[0] ?? null;
    setSelectedName(nextSelected);
    if (nextSelected) {
      const current = servers.find((entry) => entry.name === nextSelected) ?? null;
      setDraft(current ? toDraft(current) : null);
      return;
    }
    setDraft(null);
  }, [selectedName, servers]);

  const selectedExists = useMemo(() => {
    if (!draft?.originalName) {
      return false;
    }
    return servers.some((entry) => entry.name === draft.originalName);
  }, [draft?.originalName, servers]);

  const handleAdd = () => {
    const nextName = buildNextDraftName(servers.map((entry) => entry.name));
    setDraft(createBlankDraft(nextName));
    setSelectedName(null);
    setSavingError(null);
  };

  const handleSelect = (name: string) => {
    setSelectedName(name);
    const target = servers.find((entry) => entry.name === name) ?? null;
    setDraft(target ? toDraft(target) : null);
    setSavingError(null);
  };

  const handleSave = async () => {
    if (!draft) {
      return;
    }
    const name = draft.name.trim();
    if (!name) {
      setSavingError(t("settings.mcp.error.nameRequired"));
      return;
    }
    if (!draft.command.trim() && !draft.url.trim()) {
      setSavingError(t("settings.mcp.error.connectionRequired"));
      return;
    }

    const args = draft.argsText
      .split(/\s+/)
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0);
    const env = parseMapText(draft.envText);
    const headers = parseMapText(draft.headersText);

    setSavingError(null);

    if (draft.originalName) {
      const success = await onUpdateServer({
        originalName: draft.originalName,
        name,
        enabled: draft.enabled,
        command: draft.command.trim() || null,
        args,
        env,
        url: draft.url.trim() || null,
        headers,
        additionalToml: draft.additionalToml,
      });
      if (success) {
        setSelectedName(name);
        await onRefreshRuntimeStatus();
      }
      return;
    }

    const success = await onCreateServer({
      name,
      enabled: draft.enabled,
      command: draft.command.trim() || null,
      args,
      env,
      url: draft.url.trim() || null,
      headers,
      additionalToml: draft.additionalToml,
    });
    if (success) {
      setSelectedName(name);
      await onRefreshRuntimeStatus();
    }
  };

  const handleDelete = async () => {
    if (!draft?.originalName) {
      return;
    }
    const success = await onDeleteServer({ name: draft.originalName });
    if (success) {
      setSelectedName(null);
      setDraft(null);
      await onRefreshRuntimeStatus();
    }
  };

  return (
    <SettingsSection
      title={t("settings.mcp.sectionTitle")}
      subtitle={t("settings.mcp.sectionSubtitle")}
    >
      <div className="settings-help">
        {t("settings.mcp.configPath")}
        <code>{configPath ?? "~/.codex/config.toml"}</code>
      </div>

      {error ? <div className="settings-help settings-help-error">{error}</div> : null}
      {savingError ? <div className="settings-help settings-help-error">{savingError}</div> : null}

      <div className="settings-mcp-layout">
        <div className="settings-mcp-list">
          <div className="settings-field-actions">
            <button type="button" className="ghost settings-button-compact" onClick={onRefresh}>
              {t("settings.mcp.actions.refresh")}
            </button>
            <button type="button" className="ghost settings-button-compact" onClick={handleAdd}>
              {t("settings.mcp.actions.add")}
            </button>
          </div>

          {isLoading ? <div className="settings-help">{t("settings.mcp.loading")}</div> : null}

          {!isLoading && servers.length === 0 ? (
            <div className="settings-help">{t("settings.mcp.empty")}</div>
          ) : null}

          <div className="settings-group-list">
            {servers.map((entry) => (
              <button
                key={entry.name}
                type="button"
                className={`settings-nav${selectedName === entry.name ? " is-active" : ""}`}
                onClick={() => handleSelect(entry.name)}
              >
                {entry.name}
              </button>
            ))}
          </div>
        </div>

        <div className="settings-mcp-editor">
          {draft ? (
            <>
              <SettingsToggleRow
                title={t("settings.mcp.enabled.title")}
                subtitle={t("settings.mcp.enabled.subtitle")}
              >
                <SettingsToggleSwitch
                  pressed={draft.enabled}
                  onClick={() => setDraft((current) => (current ? { ...current, enabled: !current.enabled } : current))}
                />
              </SettingsToggleRow>

              <div className="settings-field">
                <label className="settings-field-label" htmlFor="settings-mcp-name">
                  {t("settings.mcp.fields.name")}
                </label>
                <input
                  id="settings-mcp-name"
                  className="settings-input"
                  value={draft.name}
                  onChange={(event) =>
                    setDraft((current) => (current ? { ...current, name: event.target.value } : current))
                  }
                />
              </div>

              <div className="settings-field">
                <label className="settings-field-label" htmlFor="settings-mcp-command">
                  {t("settings.mcp.fields.command")}
                </label>
                <input
                  id="settings-mcp-command"
                  className="settings-input"
                  value={draft.command}
                  placeholder="npx"
                  onChange={(event) =>
                    setDraft((current) => (current ? { ...current, command: event.target.value } : current))
                  }
                />
              </div>

              <div className="settings-field">
                <label className="settings-field-label" htmlFor="settings-mcp-args">
                  {t("settings.mcp.fields.args")}
                </label>
                <input
                  id="settings-mcp-args"
                  className="settings-input"
                  value={draft.argsText}
                  placeholder='-y @modelcontextprotocol/server-github'
                  onChange={(event) =>
                    setDraft((current) => (current ? { ...current, argsText: event.target.value } : current))
                  }
                />
              </div>

              <div className="settings-field">
                <label className="settings-field-label" htmlFor="settings-mcp-url">
                  {t("settings.mcp.fields.url")}
                </label>
                <input
                  id="settings-mcp-url"
                  className="settings-input"
                  value={draft.url}
                  placeholder="https://example-mcp.internal"
                  onChange={(event) =>
                    setDraft((current) => (current ? { ...current, url: event.target.value } : current))
                  }
                />
              </div>

              <div className="settings-field">
                <label className="settings-field-label" htmlFor="settings-mcp-env">
                  {t("settings.mcp.fields.env")}
                </label>
                <textarea
                  id="settings-mcp-env"
                  className="settings-agents-textarea settings-agents-textarea--compact"
                  value={draft.envText}
                  placeholder={t("settings.mcp.fields.envPlaceholder")}
                  onChange={(event) =>
                    setDraft((current) => (current ? { ...current, envText: event.target.value } : current))
                  }
                />
              </div>

              <div className="settings-field">
                <label className="settings-field-label" htmlFor="settings-mcp-headers">
                  {t("settings.mcp.fields.headers")}
                </label>
                <textarea
                  id="settings-mcp-headers"
                  className="settings-agents-textarea settings-agents-textarea--compact"
                  value={draft.headersText}
                  placeholder={t("settings.mcp.fields.headersPlaceholder")}
                  onChange={(event) =>
                    setDraft((current) =>
                      current ? { ...current, headersText: event.target.value } : current,
                    )
                  }
                />
              </div>

              <div className="settings-field">
                <label className="settings-field-label" htmlFor="settings-mcp-additional">
                  {t("settings.mcp.fields.additional")}
                </label>
                <textarea
                  id="settings-mcp-additional"
                  className="settings-agents-textarea"
                  value={draft.additionalToml}
                  placeholder={t("settings.mcp.fields.additionalPlaceholder")}
                  onChange={(event) =>
                    setDraft((current) =>
                      current ? { ...current, additionalToml: event.target.value } : current,
                    )
                  }
                />
              </div>

              <div className="settings-field-actions">
                <button
                  type="button"
                  className="primary"
                  onClick={() => {
                    void handleSave();
                  }}
                  disabled={isSaving}
                >
                  {isSaving ? t("settings.mcp.actions.saving") : t("settings.mcp.actions.save")}
                </button>
                {selectedExists ? (
                  <button
                    type="button"
                    className="ghost settings-button-compact"
                    onClick={() => {
                      void handleDelete();
                    }}
                    disabled={isSaving}
                  >
                    {t("settings.mcp.actions.delete")}
                  </button>
                ) : null}
              </div>
            </>
          ) : (
            <div className="settings-help">{t("settings.mcp.editorEmpty")}</div>
          )}
        </div>
      </div>

      <div className="settings-divider" />

      <div className="settings-field-actions">
        <div className="settings-field-label">{t("settings.mcp.runtime.title")}</div>
        <button
          type="button"
          className="ghost settings-button-compact"
          onClick={() => {
            void onRefreshRuntimeStatus();
          }}
          disabled={runtimeStatusLoading}
        >
          {runtimeStatusLoading
            ? t("settings.mcp.runtime.refreshing")
            : t("settings.mcp.runtime.refresh")}
        </button>
      </div>

      {!statusWorkspaceId ? (
        <div className="settings-help">{t("settings.mcp.runtime.noWorkspace")}</div>
      ) : null}
      {runtimeStatusError ? (
        <div className="settings-help settings-help-error">{runtimeStatusError}</div>
      ) : null}

      <div className="settings-group-list">
        {runtimeStatuses.map((entry) => (
          <div key={entry.name} className="settings-group-row">
            <div className="settings-group-fields">
              <div className="settings-project-name">{entry.name}</div>
              <div className="settings-help">
                {t("settings.mcp.runtime.auth")}: {entry.authStatus ?? t("settings.mcp.runtime.unknown")}
              </div>
              <div className="settings-help">
                {t("settings.mcp.runtime.tools")}: {entry.toolCount} · {t("settings.mcp.runtime.resources")}: {entry.resourceCount} · {t("settings.mcp.runtime.templates")}: {entry.templateCount}
              </div>
            </div>
          </div>
        ))}
      </div>
    </SettingsSection>
  );
}
