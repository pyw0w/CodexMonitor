import ScrollText from "lucide-react/dist/esm/icons/scroll-text";
import Settings from "lucide-react/dist/esm/icons/settings";
import User from "lucide-react/dist/esm/icons/user";
import X from "lucide-react/dist/esm/icons/x";
import { useEffect } from "react";
import { useI18n } from "@/i18n/useI18n";
import {
  MenuTrigger,
  PopoverSurface,
} from "../../design-system/components/popover/PopoverPrimitives";
import { useMenuController } from "../hooks/useMenuController";

type SidebarCornerActionsProps = {
  onOpenSettings: () => void;
  onOpenDebug: () => void;
  showDebugButton: boolean;
  showAccountSwitcher: boolean;
  accountLabel: string;
  accountActionLabel: string;
  accountDisabled: boolean;
  accountSwitching: boolean;
  accountCancelDisabled: boolean;
  onSwitchAccount: () => void;
  onCancelSwitchAccount: () => void;
};

export function SidebarCornerActions({
  onOpenSettings,
  onOpenDebug,
  showDebugButton,
  showAccountSwitcher,
  accountLabel,
  accountActionLabel,
  accountDisabled,
  accountSwitching,
  accountCancelDisabled,
  onSwitchAccount,
  onCancelSwitchAccount,
}: SidebarCornerActionsProps) {
  const { t } = useI18n();
  const accountMenu = useMenuController();
  const {
    isOpen: accountMenuOpen,
    containerRef: accountMenuRef,
    close: closeAccountMenu,
    toggle: toggleAccountMenu,
  } = accountMenu;

  useEffect(() => {
    if (!showAccountSwitcher) {
      closeAccountMenu();
    }
  }, [closeAccountMenu, showAccountSwitcher]);

  return (
    <div className="sidebar-corner-actions">
      {showAccountSwitcher && (
        <div className="sidebar-account-menu" ref={accountMenuRef}>
          <MenuTrigger
            isOpen={accountMenuOpen}
            popupRole="dialog"
            className="ghost sidebar-corner-button ds-tooltip-trigger"
            onClick={toggleAccountMenu}
            aria-label={t("sidebar.corner.account")}
            title={t("sidebar.corner.account")}
            data-tooltip={t("sidebar.corner.account")}
            data-tooltip-align="start"
          >
            <User size={14} aria-hidden />
          </MenuTrigger>
          {accountMenuOpen && (
            <PopoverSurface className="sidebar-account-popover" role="dialog">
              <div className="sidebar-account-title">{t("sidebar.corner.account")}</div>
              <div className="sidebar-account-value">{accountLabel}</div>
              <div className="sidebar-account-actions-row">
                <button
                  type="button"
                  className="primary sidebar-account-action"
                  onClick={onSwitchAccount}
                  disabled={accountDisabled}
                  aria-busy={accountSwitching}
                >
                  <span className="sidebar-account-action-content">
                    {accountSwitching && (
                      <span className="sidebar-account-spinner" aria-hidden />
                    )}
                    <span>{accountActionLabel}</span>
                  </span>
                </button>
                {accountSwitching && (
                  <button
                    type="button"
                    className="secondary sidebar-account-cancel"
                    onClick={onCancelSwitchAccount}
                    disabled={accountCancelDisabled}
                    aria-label={t("sidebar.corner.cancelAccountSwitch")}
                    title={t("sidebar.corner.cancel")}
                  >
                    <X size={12} aria-hidden />
                  </button>
                )}
              </div>
            </PopoverSurface>
          )}
        </div>
      )}
      <button
        className="ghost sidebar-corner-button ds-tooltip-trigger"
        type="button"
        onClick={onOpenSettings}
        aria-label={t("sidebar.corner.openSettings")}
        title={t("sidebar.corner.settings")}
        data-tooltip={t("sidebar.corner.settings")}
        data-tooltip-align="start"
      >
        <Settings size={14} aria-hidden />
      </button>
      {showDebugButton && (
        <button
          className="ghost sidebar-corner-button ds-tooltip-trigger"
          type="button"
          onClick={onOpenDebug}
          aria-label={t("sidebar.corner.openDebugLog")}
          title={t("sidebar.corner.debugLog")}
          data-tooltip={t("sidebar.corner.debugLog")}
          data-tooltip-align="start"
        >
          <ScrollText size={14} aria-hidden />
        </button>
      )}
    </div>
  );
}
