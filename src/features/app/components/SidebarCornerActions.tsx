import ScrollText from "lucide-react/dist/esm/icons/scroll-text";
import Settings from "lucide-react/dist/esm/icons/settings";
import User from "lucide-react/dist/esm/icons/user";
import X from "lucide-react/dist/esm/icons/x";
import { useEffect, useState } from "react";
import type { AccountProfileMeta } from "@/types";
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
  accountProfiles: AccountProfileMeta[];
  activeAccountProfileId: string | null;
  accountProfilesBusy: boolean;
  onSwitchAccountProfile: (profileId: string) => void;
  onAddAccountProfileLogin: (name: string) => void;
  onAddAccountProfileImport: (name: string, importPath: string) => void;
  onSignOutAccountProfile: () => void;
  onRenameAccountProfile: (profileId: string, name: string) => void;
  onRemoveAccountProfile: (profileId: string) => void;
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
  accountProfiles,
  activeAccountProfileId,
  accountProfilesBusy,
  onSwitchAccountProfile,
  onAddAccountProfileLogin,
  onAddAccountProfileImport,
  onSignOutAccountProfile,
  onRenameAccountProfile,
  onRemoveAccountProfile,
}: SidebarCornerActionsProps) {
  const [loginProfileName, setLoginProfileName] = useState("");
  const [importProfileName, setImportProfileName] = useState("");
  const [importProfilePath, setImportProfilePath] = useState("");
  const [renameProfileId, setRenameProfileId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState("");
  const [pendingDeleteProfileId, setPendingDeleteProfileId] = useState<string | null>(null);
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
            className="ghost sidebar-corner-button"
            onClick={toggleAccountMenu}
            aria-label="Account"
            title="Account"
          >
            <User size={14} aria-hidden />
          </MenuTrigger>
          {accountMenuOpen && (
            <PopoverSurface className="sidebar-account-popover" role="dialog">
              <div className="sidebar-account-title">Account</div>
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
                    aria-label="Cancel account switch"
                    title="Cancel"
                  >
                    <X size={12} aria-hidden />
                  </button>
                )}
              </div>
              <div className="sidebar-account-divider" />
              <div className="sidebar-account-profile-list" role="list" aria-label="Account profiles">
                {accountProfiles.length === 0 && (
                  <div className="sidebar-account-profile-empty">No saved profiles yet.</div>
                )}
                {accountProfiles.map((profile) => {
                  const isActive = profile.id === activeAccountProfileId;
                  const isRenaming = renameProfileId === profile.id;
                  const isPendingDelete = pendingDeleteProfileId === profile.id;
                  return (
                    <div key={profile.id} className="sidebar-account-profile-item" role="listitem">
                      <button
                        type="button"
                        className="ghost sidebar-account-profile-switch"
                        onClick={() => onSwitchAccountProfile(profile.id)}
                        disabled={isActive || accountProfilesBusy}
                      >
                        <span>{profile.name}</span>
                        {isActive && <span className="sidebar-account-profile-badge">Active</span>}
                      </button>
                      <div className="sidebar-account-profile-actions">
                        {isRenaming ? (
                          <>
                            <input
                              className="settings-input sidebar-account-inline-input"
                              value={renameDraft}
                              onChange={(event) => setRenameDraft(event.target.value)}
                              placeholder="Profile name"
                            />
                            <button
                              type="button"
                              className="ghost"
                              onClick={() => {
                                const next = renameDraft.trim();
                                if (!next) {
                                  return;
                                }
                                onRenameAccountProfile(profile.id, next);
                                setRenameProfileId(null);
                                setRenameDraft("");
                              }}
                              disabled={accountProfilesBusy}
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              className="ghost"
                              onClick={() => {
                                setRenameProfileId(null);
                                setRenameDraft("");
                              }}
                              disabled={accountProfilesBusy}
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              className="ghost"
                              onClick={() => {
                                setRenameProfileId(profile.id);
                                setRenameDraft(profile.name);
                              }}
                              disabled={accountProfilesBusy}
                            >
                              Rename
                            </button>
                            {!isPendingDelete ? (
                              <button
                                type="button"
                                className="ghost"
                                onClick={() => setPendingDeleteProfileId(profile.id)}
                                disabled={accountProfilesBusy}
                              >
                                Remove
                              </button>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  className="ghost"
                                  onClick={() => {
                                    onRemoveAccountProfile(profile.id);
                                    setPendingDeleteProfileId(null);
                                  }}
                                  disabled={accountProfilesBusy}
                                >
                                  Confirm
                                </button>
                                <button
                                  type="button"
                                  className="ghost"
                                  onClick={() => setPendingDeleteProfileId(null)}
                                  disabled={accountProfilesBusy}
                                >
                                  Cancel
                                </button>
                              </>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="sidebar-account-actions-stack">
                <div className="sidebar-account-form-row">
                  <input
                    className="settings-input sidebar-account-inline-input"
                    value={loginProfileName}
                    onChange={(event) => setLoginProfileName(event.target.value)}
                    placeholder="New login profile name"
                  />
                  <button
                    type="button"
                    className="ghost"
                    onClick={() => {
                      const name = loginProfileName.trim();
                      if (!name) {
                        return;
                      }
                      onAddAccountProfileLogin(name);
                      setLoginProfileName("");
                    }}
                    disabled={accountProfilesBusy}
                  >
                    Add (Login)
                  </button>
                </div>
                <div className="sidebar-account-form-row">
                  <input
                    className="settings-input sidebar-account-inline-input"
                    value={importProfileName}
                    onChange={(event) => setImportProfileName(event.target.value)}
                    placeholder="Import profile name"
                  />
                  <input
                    className="settings-input sidebar-account-inline-input"
                    value={importProfilePath}
                    onChange={(event) => setImportProfilePath(event.target.value)}
                    placeholder="CODEX_HOME path"
                  />
                  <button
                    type="button"
                    className="ghost"
                    onClick={() => {
                      const name = importProfileName.trim();
                      const path = importProfilePath.trim();
                      if (!name || !path) {
                        return;
                      }
                      onAddAccountProfileImport(name, path);
                      setImportProfileName("");
                      setImportProfilePath("");
                    }}
                    disabled={accountProfilesBusy}
                  >
                    Add (Import)
                  </button>
                </div>
                <button
                  type="button"
                  className="ghost"
                  onClick={onSignOutAccountProfile}
                  disabled={accountProfilesBusy}
                >
                  Sign out current
                </button>
              </div>
            </PopoverSurface>
          )}
        </div>
      )}
      <button
        className="ghost sidebar-corner-button"
        type="button"
        onClick={onOpenSettings}
        aria-label="Open settings"
        title="Settings"
      >
        <Settings size={14} aria-hidden />
      </button>
      {showDebugButton && (
        <button
          className="ghost sidebar-corner-button"
          type="button"
          onClick={onOpenDebug}
          aria-label="Open debug log"
          title="Debug log"
        >
          <ScrollText size={14} aria-hidden />
        </button>
      )}
    </div>
  );
}
