import type { AppSettings } from "@/types";
import { useI18n } from "@/i18n/useI18n";

type ComposerPreset = AppSettings["composerEditorPreset"];

type SettingsComposerSectionProps = {
  appSettings: AppSettings;
  optionKeyLabel: string;
  followUpShortcutLabel: string;
  composerPresetLabels: Record<ComposerPreset, string>;
  onComposerPresetChange: (preset: ComposerPreset) => void;
  onUpdateAppSettings: (next: AppSettings) => Promise<void>;
};

export function SettingsComposerSection({
  appSettings,
  optionKeyLabel,
  followUpShortcutLabel,
  composerPresetLabels,
  onComposerPresetChange,
  onUpdateAppSettings,
}: SettingsComposerSectionProps) {
  const { t } = useI18n();
  const steerUnavailable = !appSettings.steerEnabled;
  return (
    <section className="settings-section">
      <div className="settings-section-title">{t("settings.composer.sectionTitle")}</div>
      <div className="settings-section-subtitle">{t("settings.composer.sectionSubtitle")}</div>
      <div className="settings-field">
        <div className="settings-field-label">{t("settings.composer.followUp.label")}</div>
        <div className="settings-segmented" aria-label={t("settings.composer.followUp.label")}>
          <label
            className={`settings-segmented-option${
              appSettings.followUpMessageBehavior === "queue" ? " is-active" : ""
            }`}
          >
            <input
              className="settings-segmented-input"
              type="radio"
              name="follow-up-behavior"
              value="queue"
              checked={appSettings.followUpMessageBehavior === "queue"}
              onChange={() =>
                void onUpdateAppSettings({
                  ...appSettings,
                  followUpMessageBehavior: "queue",
                })
              }
            />
            <span className="settings-segmented-option-label">
              {t("settings.composer.followUp.option.queue")}
            </span>
          </label>
          <label
            className={`settings-segmented-option${
              appSettings.followUpMessageBehavior === "steer" ? " is-active" : ""
            }${steerUnavailable ? " is-disabled" : ""}`}
            title={steerUnavailable ? t("settings.composer.followUp.steerUnavailableTitle") : ""}
          >
            <input
              className="settings-segmented-input"
              type="radio"
              name="follow-up-behavior"
              value="steer"
              checked={appSettings.followUpMessageBehavior === "steer"}
              disabled={steerUnavailable}
              onChange={() => {
                if (steerUnavailable) {
                  return;
                }
                void onUpdateAppSettings({
                  ...appSettings,
                  followUpMessageBehavior: "steer",
                });
              }}
            />
            <span className="settings-segmented-option-label">
              {t("settings.composer.followUp.option.steer")}
            </span>
          </label>
        </div>
        <div className="settings-help">
          {t("settings.composer.followUp.help.before")}
          {followUpShortcutLabel}
          {t("settings.composer.followUp.help.after")}
        </div>
        <div className="settings-toggle-row">
          <div>
            <div className="settings-toggle-title">{t("settings.composer.followUp.hint.title")}</div>
            <div className="settings-toggle-subtitle">
              {t("settings.composer.followUp.hint.subtitle")}
            </div>
          </div>
          <button
            type="button"
            className={`settings-toggle ${appSettings.composerFollowUpHintEnabled ? "on" : ""}`}
            onClick={() =>
              void onUpdateAppSettings({
                ...appSettings,
                composerFollowUpHintEnabled: !appSettings.composerFollowUpHintEnabled,
              })
            }
            aria-pressed={appSettings.composerFollowUpHintEnabled}
          >
            <span className="settings-toggle-knob" />
          </button>
        </div>
        {steerUnavailable && (
          <div className="settings-help">
            {t("settings.composer.followUp.steerUnavailableHelp")}
          </div>
        )}
      </div>
      <div className="settings-divider" />
      <div className="settings-subsection-title">{t("settings.composer.presets.title")}</div>
      <div className="settings-subsection-subtitle">{t("settings.composer.presets.subtitle")}</div>
      <div className="settings-field">
        <label className="settings-field-label" htmlFor="composer-preset">
          {t("settings.composer.presets.label")}
        </label>
        <select
          id="composer-preset"
          className="settings-select"
          value={appSettings.composerEditorPreset}
          onChange={(event) =>
            onComposerPresetChange(event.target.value as ComposerPreset)
          }
        >
          {Object.entries(composerPresetLabels).map(([preset, label]) => (
            <option key={preset} value={preset}>
              {label}
            </option>
          ))}
        </select>
        <div className="settings-help">
          {t("settings.composer.presets.help")}
        </div>
      </div>
      <div className="settings-divider" />
      <div className="settings-subsection-title">{t("settings.composer.codeFences.title")}</div>
      <div className="settings-toggle-row">
        <div>
          <div className="settings-toggle-title">{t("settings.composer.codeFences.space.title")}</div>
          <div className="settings-toggle-subtitle">
            {t("settings.composer.codeFences.space.subtitle")}
          </div>
        </div>
        <button
          type="button"
          className={`settings-toggle ${appSettings.composerFenceExpandOnSpace ? "on" : ""}`}
          onClick={() =>
            void onUpdateAppSettings({
              ...appSettings,
              composerFenceExpandOnSpace: !appSettings.composerFenceExpandOnSpace,
            })
          }
          aria-pressed={appSettings.composerFenceExpandOnSpace}
        >
          <span className="settings-toggle-knob" />
        </button>
      </div>
      <div className="settings-toggle-row">
        <div>
          <div className="settings-toggle-title">{t("settings.composer.codeFences.enter.title")}</div>
          <div className="settings-toggle-subtitle">
            {t("settings.composer.codeFences.enter.subtitle")}
          </div>
        </div>
        <button
          type="button"
          className={`settings-toggle ${appSettings.composerFenceExpandOnEnter ? "on" : ""}`}
          onClick={() =>
            void onUpdateAppSettings({
              ...appSettings,
              composerFenceExpandOnEnter: !appSettings.composerFenceExpandOnEnter,
            })
          }
          aria-pressed={appSettings.composerFenceExpandOnEnter}
        >
          <span className="settings-toggle-knob" />
        </button>
      </div>
      <div className="settings-toggle-row">
        <div>
          <div className="settings-toggle-title">{t("settings.composer.codeFences.langTags.title")}</div>
          <div className="settings-toggle-subtitle">
            {t("settings.composer.codeFences.langTags.subtitle")}
          </div>
        </div>
        <button
          type="button"
          className={`settings-toggle ${appSettings.composerFenceLanguageTags ? "on" : ""}`}
          onClick={() =>
            void onUpdateAppSettings({
              ...appSettings,
              composerFenceLanguageTags: !appSettings.composerFenceLanguageTags,
            })
          }
          aria-pressed={appSettings.composerFenceLanguageTags}
        >
          <span className="settings-toggle-knob" />
        </button>
      </div>
      <div className="settings-toggle-row">
        <div>
          <div className="settings-toggle-title">
            {t("settings.composer.codeFences.wrapSelection.title")}
          </div>
          <div className="settings-toggle-subtitle">
            {t("settings.composer.codeFences.wrapSelection.subtitle")}
          </div>
        </div>
        <button
          type="button"
          className={`settings-toggle ${appSettings.composerFenceWrapSelection ? "on" : ""}`}
          onClick={() =>
            void onUpdateAppSettings({
              ...appSettings,
              composerFenceWrapSelection: !appSettings.composerFenceWrapSelection,
            })
          }
          aria-pressed={appSettings.composerFenceWrapSelection}
        >
          <span className="settings-toggle-knob" />
        </button>
      </div>
      <div className="settings-toggle-row">
        <div>
          <div className="settings-toggle-title">
            {t("settings.composer.codeFences.copyNoFence.title")}
          </div>
          <div className="settings-toggle-subtitle">
            {t("settings.composer.codeFences.copyNoFence.subtitle.before")}
            {optionKeyLabel}
            {t("settings.composer.codeFences.copyNoFence.subtitle.after")}
          </div>
        </div>
        <button
          type="button"
          className={`settings-toggle ${appSettings.composerCodeBlockCopyUseModifier ? "on" : ""}`}
          onClick={() =>
            void onUpdateAppSettings({
              ...appSettings,
              composerCodeBlockCopyUseModifier:
                !appSettings.composerCodeBlockCopyUseModifier,
            })
          }
          aria-pressed={appSettings.composerCodeBlockCopyUseModifier}
        >
          <span className="settings-toggle-knob" />
        </button>
      </div>
      <div className="settings-divider" />
      <div className="settings-subsection-title">{t("settings.composer.pasting.title")}</div>
      <div className="settings-toggle-row">
        <div>
          <div className="settings-toggle-title">
            {t("settings.composer.pasting.multiline.title")}
          </div>
          <div className="settings-toggle-subtitle">
            {t("settings.composer.pasting.multiline.subtitle")}
          </div>
        </div>
        <button
          type="button"
          className={`settings-toggle ${appSettings.composerFenceAutoWrapPasteMultiline ? "on" : ""}`}
          onClick={() =>
            void onUpdateAppSettings({
              ...appSettings,
              composerFenceAutoWrapPasteMultiline:
                !appSettings.composerFenceAutoWrapPasteMultiline,
            })
          }
          aria-pressed={appSettings.composerFenceAutoWrapPasteMultiline}
        >
          <span className="settings-toggle-knob" />
        </button>
      </div>
      <div className="settings-toggle-row">
        <div>
          <div className="settings-toggle-title">
            {t("settings.composer.pasting.codeLike.title")}
          </div>
          <div className="settings-toggle-subtitle">
            {t("settings.composer.pasting.codeLike.subtitle")}
          </div>
        </div>
        <button
          type="button"
          className={`settings-toggle ${appSettings.composerFenceAutoWrapPasteCodeLike ? "on" : ""}`}
          onClick={() =>
            void onUpdateAppSettings({
              ...appSettings,
              composerFenceAutoWrapPasteCodeLike:
                !appSettings.composerFenceAutoWrapPasteCodeLike,
            })
          }
          aria-pressed={appSettings.composerFenceAutoWrapPasteCodeLike}
        >
          <span className="settings-toggle-knob" />
        </button>
      </div>
      <div className="settings-divider" />
      <div className="settings-subsection-title">{t("settings.composer.lists.title")}</div>
      <div className="settings-toggle-row">
        <div>
          <div className="settings-toggle-title">
            {t("settings.composer.lists.continue.title")}
          </div>
          <div className="settings-toggle-subtitle">
            {t("settings.composer.lists.continue.subtitle")}
          </div>
        </div>
        <button
          type="button"
          className={`settings-toggle ${appSettings.composerListContinuation ? "on" : ""}`}
          onClick={() =>
            void onUpdateAppSettings({
              ...appSettings,
              composerListContinuation: !appSettings.composerListContinuation,
            })
          }
          aria-pressed={appSettings.composerListContinuation}
        >
          <span className="settings-toggle-knob" />
        </button>
      </div>
    </section>
  );
}
