import type { CodexFeature } from "@/types";
import type { SettingsFeaturesSectionProps } from "@settings/hooks/useSettingsFeaturesSection";
import { fileManagerName, openInFileManagerLabel } from "@utils/platformPaths";
import { useI18n } from "@/i18n/useI18n";

const FEATURE_DESCRIPTION_FALLBACKS: Record<string, string> = {
  undo: "Create a ghost commit at each turn.",
  shell_tool: "Enable the default shell tool.",
  unified_exec: "Use the single unified PTY-backed exec tool.",
  shell_snapshot: "Enable shell snapshotting.",
  js_repl: "Enable JavaScript REPL tools backed by a persistent Node kernel.",
  js_repl_tools_only: "Only expose js_repl tools directly to the model.",
  web_search_request: "Deprecated. Use top-level web_search instead.",
  web_search_cached: "Deprecated. Use top-level web_search instead.",
  search_tool: "Removed legacy search flag kept for backward compatibility.",
  runtime_metrics: "Enable runtime metrics snapshots via a manual reader.",
  sqlite: "Persist rollout metadata to a local SQLite database.",
  memory_tool: "Enable startup memory extraction and memory consolidation.",
  child_agents_md: "Append additional AGENTS.md guidance to user instructions.",
  apply_patch_freeform: "Include the freeform apply_patch tool.",
  use_linux_sandbox_bwrap: "Use the bubblewrap-based Linux sandbox pipeline.",
  request_rule: "Allow approval requests and exec rule proposals.",
  experimental_windows_sandbox:
    "Removed Windows sandbox flag kept for backward compatibility.",
  elevated_windows_sandbox:
    "Removed elevated Windows sandbox flag kept for backward compatibility.",
  remote_models: "Refresh remote models before AppReady.",
  powershell_utf8: "Enforce UTF-8 output in PowerShell.",
  enable_request_compression:
    "Compress streaming request bodies sent to codex-backend.",
  apps: "Enable ChatGPT Apps integration.",
  apps_mcp_gateway: "Route Apps MCP calls through the configured gateway.",
  skill_mcp_dependency_install:
    "Allow prompting and installing missing MCP dependencies.",
  skill_env_var_dependency_prompt:
    "Prompt for missing skill environment variable dependencies.",
  steer: "Enable turn steering capability when supported by Codex.",
  collaboration_modes: "Enable collaboration mode presets.",
  personality: "Enable personality selection.",
  responses_websockets:
    "Use Responses API WebSocket transport for OpenAI by default.",
  responses_websockets_v2: "Enable Responses API WebSocket v2 mode.",
};

const FEATURE_LABELS_ZH: Record<string, string> = {
  undo: "撤销快照",
  shell_tool: "Shell 工具",
  unified_exec: "统一执行",
  shell_snapshot: "Shell 快照",
  js_repl: "JavaScript REPL",
  js_repl_tools_only: "仅暴露 js_repl 工具",
  web_search_request: "Web 搜索请求（旧）",
  web_search_cached: "Web 搜索缓存（旧）",
  search_tool: "搜索工具（旧）",
  runtime_metrics: "运行时指标",
  sqlite: "SQLite",
  memory_tool: "记忆工具",
  child_agents_md: "附加 AGENTS.md",
  apply_patch_freeform: "自由格式 apply_patch",
  use_linux_sandbox_bwrap: "Linux bwrap 沙箱",
  request_rule: "审批请求规则",
  experimental_windows_sandbox: "Windows 沙箱（旧）",
  elevated_windows_sandbox: "提升权限 Windows 沙箱（旧）",
  remote_models: "远程模型刷新",
  powershell_utf8: "PowerShell UTF-8",
  enable_request_compression: "启用请求压缩",
  apps: "ChatGPT Apps 集成",
  apps_mcp_gateway: "Apps MCP 网关",
  skill_mcp_dependency_install: "Skill MCP 依赖安装",
  skill_env_var_dependency_prompt: "Skill 环境变量依赖提示",
  steer: "Steer 引导",
  collaboration_modes: "协作模式",
  personality: "人格风格",
  responses_websockets: "Responses WebSocket",
  responses_websockets_v2: "Responses WebSocket v2",
};

const FEATURE_DESCRIPTION_FALLBACKS_ZH: Record<string, string> = {
  undo: "在每个回合创建一个幽灵提交（ghost commit）。",
  shell_tool: "启用默认 shell 工具。",
  unified_exec: "使用单一统一的 PTY 执行工具。",
  shell_snapshot: "启用 shell 快照能力。",
  js_repl: "启用基于持久化 Node 内核的 JavaScript REPL 工具。",
  js_repl_tools_only: "仅将 js_repl 工具直接暴露给模型。",
  web_search_request: "已弃用。请改用顶层 web_search。",
  web_search_cached: "已弃用。请改用顶层 web_search。",
  search_tool: "已移除的旧搜索开关，仅为向后兼容保留。",
  runtime_metrics: "通过手动读取器启用运行时指标快照。",
  sqlite: "将 rollout 元数据持久化到本地 SQLite 数据库。",
  memory_tool: "启用启动记忆提取与记忆整合。",
  child_agents_md: "向用户指令追加额外的 AGENTS.md 指南。",
  apply_patch_freeform: "包含自由格式的 apply_patch 工具。",
  use_linux_sandbox_bwrap: "使用基于 bubblewrap 的 Linux 沙箱流程。",
  request_rule: "允许审批请求和执行规则提案。",
  experimental_windows_sandbox: "已移除的 Windows 沙箱开关，仅为向后兼容保留。",
  elevated_windows_sandbox: "已移除的提权 Windows 沙箱开关，仅为向后兼容保留。",
  remote_models: "在 AppReady 前刷新远程模型。",
  powershell_utf8: "在 PowerShell 中强制使用 UTF-8 输出。",
  enable_request_compression: "压缩发送到 codex-backend 的流式请求体。",
  apps: "启用 ChatGPT Apps 集成。",
  apps_mcp_gateway: "通过配置的网关路由 Apps MCP 调用。",
  skill_mcp_dependency_install: "允许提示并安装缺失的 MCP 依赖。",
  skill_env_var_dependency_prompt: "为缺失的 skill 环境变量依赖进行提示。",
  steer: "在 Codex 支持时启用回合引导能力。",
  collaboration_modes: "启用协作模式预设。",
  personality: "启用人格风格选择。",
  responses_websockets: "默认使用 OpenAI 的 Responses API WebSocket 传输。",
  responses_websockets_v2: "启用 Responses API WebSocket v2 模式。",
};

function formatFeatureLabel(feature: CodexFeature, zh: boolean): string {
  if (zh) {
    const translatedLabel = FEATURE_LABELS_ZH[feature.name];
    if (translatedLabel) {
      return translatedLabel;
    }
  }
  const displayName = feature.displayName?.trim();
  if (displayName) {
    return displayName;
  }
  return feature.name
    .split("_")
    .filter((part) => part.length > 0)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(" ");
}

function featureSubtitle(
  feature: CodexFeature,
  zh: boolean,
  t: (key: string, params?: Record<string, string>) => string,
): string {
  if (zh) {
    const translatedFallback = FEATURE_DESCRIPTION_FALLBACKS_ZH[feature.name];
    if (translatedFallback) {
      return translatedFallback;
    }
  }
  if (feature.description?.trim()) {
    return feature.description;
  }
  if (feature.announcement?.trim()) {
    return feature.announcement;
  }
  const fallbackDescription = FEATURE_DESCRIPTION_FALLBACKS[feature.name];
  if (fallbackDescription) {
    return fallbackDescription;
  }
  if (feature.stage === "deprecated") {
    return t("settings.features.feature.deprecated");
  }
  if (feature.stage === "removed") {
    return t("settings.features.feature.removed");
  }
  return t("settings.features.feature.key", { name: feature.name });
}

export function SettingsFeaturesSection({
  appSettings,
  hasFeatureWorkspace,
  openConfigError,
  featureError,
  featuresLoading,
  featureUpdatingKey,
  stableFeatures,
  experimentalFeatures,
  hasDynamicFeatureRows,
  onOpenConfig,
  onToggleCodexFeature,
  onUpdateAppSettings,
}: SettingsFeaturesSectionProps) {
  const { locale, t } = useI18n();
  const zh = locale === "zh-CN";
  return (
    <section className="settings-section">
      <div className="settings-section-title">{t("settings.features.sectionTitle")}</div>
      <div className="settings-section-subtitle">{t("settings.features.sectionSubtitle")}</div>
      <div className="settings-toggle-row">
        <div>
          <div className="settings-toggle-title">{t("settings.features.configFile.title")}</div>
          <div className="settings-toggle-subtitle">
            {t("settings.features.configFile.subtitle", {
              fileManager: fileManagerName(),
            })}
          </div>
        </div>
        <button type="button" className="ghost" onClick={onOpenConfig}>
          {openInFileManagerLabel()}
        </button>
      </div>
      {openConfigError && <div className="settings-help">{openConfigError}</div>}
      <div className="settings-subsection-title">{t("settings.features.stable.title")}</div>
      <div className="settings-subsection-subtitle">{t("settings.features.stable.subtitle")}</div>
      <div className="settings-toggle-row">
        <div>
          <div className="settings-toggle-title">{t("settings.features.personality.title")}</div>
          <div className="settings-toggle-subtitle">
            {t("settings.features.personality.subtitle.before")}
            <code>personality</code>
            {t("settings.features.personality.subtitle.after")}
          </div>
        </div>
        <select
          id="features-personality-select"
          className="settings-select"
          value={appSettings.personality}
          onChange={(event) =>
            void onUpdateAppSettings({
              ...appSettings,
              personality: event.target.value as (typeof appSettings)["personality"],
            })
          }
          aria-label={t("settings.features.personality.title")}
        >
          <option value="friendly">{t("settings.features.personality.option.friendly")}</option>
          <option value="pragmatic">{t("settings.features.personality.option.pragmatic")}</option>
        </select>
      </div>
      <div className="settings-toggle-row">
        <div>
          <div className="settings-toggle-title">{t("settings.features.pauseQueue.title")}</div>
          <div className="settings-toggle-subtitle">{t("settings.features.pauseQueue.subtitle")}</div>
        </div>
        <button
          type="button"
          className={`settings-toggle ${appSettings.pauseQueuedMessagesWhenResponseRequired ? "on" : ""}`}
          onClick={() =>
            void onUpdateAppSettings({
              ...appSettings,
              pauseQueuedMessagesWhenResponseRequired:
                !appSettings.pauseQueuedMessagesWhenResponseRequired,
            })
          }
          aria-pressed={appSettings.pauseQueuedMessagesWhenResponseRequired}
        >
          <span className="settings-toggle-knob" />
        </button>
      </div>
      {stableFeatures.map((feature) => (
        <div className="settings-toggle-row" key={feature.name}>
          <div>
            <div className="settings-toggle-title">{formatFeatureLabel(feature, zh)}</div>
            <div className="settings-toggle-subtitle">{featureSubtitle(feature, zh, t)}</div>
          </div>
          <button
            type="button"
            className={`settings-toggle ${feature.enabled ? "on" : ""}`}
            onClick={() => onToggleCodexFeature(feature)}
            aria-pressed={feature.enabled}
            disabled={featureUpdatingKey === feature.name}
          >
            <span className="settings-toggle-knob" />
          </button>
        </div>
      ))}
      {hasFeatureWorkspace &&
        !featuresLoading &&
        !featureError &&
        stableFeatures.length === 0 && (
        <div className="settings-help">{t("settings.features.noStable")}</div>
      )}
      <div className="settings-subsection-title">{t("settings.features.experimental.title")}</div>
      <div className="settings-subsection-subtitle">
        {t("settings.features.experimental.subtitle")}
      </div>
      {experimentalFeatures.map((feature) => (
        <div className="settings-toggle-row" key={feature.name}>
          <div>
            <div className="settings-toggle-title">{formatFeatureLabel(feature, zh)}</div>
            <div className="settings-toggle-subtitle">{featureSubtitle(feature, zh, t)}</div>
          </div>
          <button
            type="button"
            className={`settings-toggle ${feature.enabled ? "on" : ""}`}
            onClick={() => onToggleCodexFeature(feature)}
            aria-pressed={feature.enabled}
            disabled={featureUpdatingKey === feature.name}
          >
            <span className="settings-toggle-knob" />
          </button>
        </div>
      ))}
      {hasFeatureWorkspace &&
        !featuresLoading &&
        !featureError &&
        hasDynamicFeatureRows &&
        experimentalFeatures.length === 0 && (
          <div className="settings-help">
            {t("settings.features.noExperimental")}
          </div>
        )}
      {featuresLoading && (
        <div className="settings-help">{t("settings.features.loading")}</div>
      )}
      {!hasFeatureWorkspace && !featuresLoading && (
        <div className="settings-help">{t("settings.features.connectWorkspace")}</div>
      )}
      {featureError && <div className="settings-help">{featureError}</div>}
    </section>
  );
}
