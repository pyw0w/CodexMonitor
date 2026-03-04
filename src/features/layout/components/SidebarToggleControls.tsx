import PanelLeftClose from "lucide-react/dist/esm/icons/panel-left-close";
import PanelLeftOpen from "lucide-react/dist/esm/icons/panel-left-open";
import PanelRightClose from "lucide-react/dist/esm/icons/panel-right-close";
import PanelRightOpen from "lucide-react/dist/esm/icons/panel-right-open";
import { useI18n } from "@/i18n/useI18n";

export type SidebarToggleProps = {
  isCompact: boolean;
  sidebarCollapsed: boolean;
  rightPanelCollapsed: boolean;
  onCollapseSidebar: () => void;
  onExpandSidebar: () => void;
  onCollapseRightPanel: () => void;
  onExpandRightPanel: () => void;
};

export function SidebarCollapseButton({
  isCompact,
  sidebarCollapsed,
  onCollapseSidebar,
}: SidebarToggleProps) {
  const { t } = useI18n();
  if (isCompact || sidebarCollapsed) {
    return null;
  }
  return (
    <button
      type="button"
      className="ghost main-header-action ds-tooltip-trigger"
      onClick={onCollapseSidebar}
      data-tauri-drag-region="false"
      aria-label={t("sidebar.toggle.hideThreads")}
      title={t("sidebar.toggle.hideThreads")}
      data-tooltip={t("sidebar.toggle.hideThreads")}
      data-tooltip-placement="bottom"
    >
      <PanelLeftClose size={14} aria-hidden />
    </button>
  );
}

export function RightPanelCollapseButton({
  isCompact,
  rightPanelCollapsed,
  onCollapseRightPanel,
}: SidebarToggleProps) {
  const { t } = useI18n();
  if (isCompact || rightPanelCollapsed) {
    return null;
  }
  return (
    <button
      type="button"
      className="ghost main-header-action ds-tooltip-trigger"
      onClick={onCollapseRightPanel}
      data-tauri-drag-region="false"
      aria-label={t("sidebar.toggle.hideGit")}
      title={t("sidebar.toggle.hideGit")}
      data-tooltip={t("sidebar.toggle.hideGit")}
      data-tooltip-placement="bottom"
    >
      <PanelRightClose size={14} aria-hidden />
    </button>
  );
}

export function RightPanelExpandButton({
  isCompact,
  rightPanelCollapsed,
  onExpandRightPanel,
}: SidebarToggleProps) {
  const { t } = useI18n();
  if (isCompact || !rightPanelCollapsed) {
    return null;
  }
  return (
    <button
      type="button"
      className="ghost main-header-action ds-tooltip-trigger"
      onClick={onExpandRightPanel}
      data-tauri-drag-region="false"
      aria-label={t("sidebar.toggle.showGit")}
      title={t("sidebar.toggle.showGit")}
      data-tooltip={t("sidebar.toggle.showGit")}
      data-tooltip-placement="bottom"
    >
      <PanelRightOpen size={14} aria-hidden />
    </button>
  );
}

export function TitlebarExpandControls({
  isCompact,
  sidebarCollapsed,
  onExpandSidebar,
}: SidebarToggleProps) {
  const { t } = useI18n();
  if (isCompact || !sidebarCollapsed) {
    return null;
  }
  return (
    <div className="titlebar-controls">
      {sidebarCollapsed && (
        <div className="titlebar-toggle titlebar-toggle-left">
          <button
            type="button"
            className="ghost main-header-action ds-tooltip-trigger"
            onClick={onExpandSidebar}
            data-tauri-drag-region="false"
            aria-label={t("sidebar.toggle.showThreads")}
            title={t("sidebar.toggle.showThreads")}
            data-tooltip={t("sidebar.toggle.showThreads")}
            data-tooltip-placement="bottom"
          >
            <PanelLeftOpen size={14} aria-hidden />
          </button>
        </div>
      )}
    </div>
  );
}
