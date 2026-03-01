import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import appIconUrl from "@/assets/app-icon.png";
import { useI18n } from "@/i18n/useI18n";
import {
  MenuTrigger,
  PopoverMenuItem,
  PopoverSurface,
} from "@/features/design-system/components/popover/PopoverPrimitives";

type MenuActionItem = {
  type: "action";
  id: string;
  label: string;
  shortcut?: string;
  disabled?: boolean;
  onSelect: () => void;
};

type MenuSeparatorItem = {
  type: "separator";
  id: string;
};

type MenuItem = MenuActionItem | MenuSeparatorItem;

type MenuDefinition = {
  key: string;
  label: string;
  items: MenuItem[];
};

type LinuxAppMenuBarProps = {
  canAddWorkspaceAgent: boolean;
  canAddDerivedAgent: boolean;
  canCycleAgent: boolean;
  canCycleWorkspace: boolean;
  sidebarCollapsed: boolean;
  rightPanelCollapsed: boolean;
  onNewAgent: () => void;
  onNewWorktreeAgent: () => void;
  onNewCloneAgent: () => void;
  onAddWorkspace: () => void;
  onAddWorkspaceFromUrl: () => void;
  onOpenSettings: () => void;
  onCloseWindow: () => void;
  onQuitApp: () => void;
  onEditUndo: () => void;
  onEditRedo: () => void;
  onEditCut: () => void;
  onEditCopy: () => void;
  onEditPaste: () => void;
  onEditSelectAll: () => void;
  onComposerCycleModel: () => void;
  onComposerCycleAccess: () => void;
  onComposerCycleReasoning: () => void;
  onComposerCycleCollaboration: () => void;
  onToggleProjectsSidebar: () => void;
  onToggleGitSidebar: () => void;
  onToggleDebugPanel: () => void;
  onToggleTerminal: () => void;
  onNextAgent: () => void;
  onPrevAgent: () => void;
  onNextWorkspace: () => void;
  onPrevWorkspace: () => void;
  onWindowMinimize: () => void;
  onWindowToggleMaximize: () => void;
  onHelpAbout: () => void;
  onHelpCheckUpdates: () => void;
};

export function LinuxAppMenuBar({
  canAddWorkspaceAgent,
  canAddDerivedAgent,
  canCycleAgent,
  canCycleWorkspace,
  sidebarCollapsed,
  rightPanelCollapsed,
  onNewAgent,
  onNewWorktreeAgent,
  onNewCloneAgent,
  onAddWorkspace,
  onAddWorkspaceFromUrl,
  onOpenSettings,
  onCloseWindow,
  onQuitApp,
  onEditUndo,
  onEditRedo,
  onEditCut,
  onEditCopy,
  onEditPaste,
  onEditSelectAll,
  onComposerCycleModel,
  onComposerCycleAccess,
  onComposerCycleReasoning,
  onComposerCycleCollaboration,
  onToggleProjectsSidebar,
  onToggleGitSidebar,
  onToggleDebugPanel,
  onToggleTerminal,
  onNextAgent,
  onPrevAgent,
  onNextWorkspace,
  onPrevWorkspace,
  onWindowMinimize,
  onWindowToggleMaximize,
  onHelpAbout,
  onHelpCheckUpdates,
}: LinuxAppMenuBarProps) {
  const { t } = useI18n();
  const [isOpen, setIsOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 12, left: 12 });
  const [menuWidth, setMenuWidth] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const measureNodeRef = useRef<HTMLSpanElement | null>(null);

  const close = useCallback(() => {
    setIsOpen(false);
  }, []);

  const measureTextWidth = useCallback((text: string, font: string) => {
    if (!text || typeof document === "undefined") {
      return 0;
    }
    let node = measureNodeRef.current;
    if (!node) {
      node = document.createElement("span");
      node.style.position = "fixed";
      node.style.left = "-10000px";
      node.style.top = "-10000px";
      node.style.visibility = "hidden";
      node.style.pointerEvents = "none";
      node.style.whiteSpace = "pre";
      document.body.appendChild(node);
      measureNodeRef.current = node;
    }
    node.style.font = font;
    node.textContent = text;
    return Math.ceil(node.getBoundingClientRect().width);
  }, []);

  useEffect(() => {
    return () => {
      measureNodeRef.current?.remove();
      measureNodeRef.current = null;
    };
  }, []);

  const recalculateMenuPosition = useCallback(() => {
    const container = containerRef.current;
    if (!container || typeof window === "undefined") {
      return;
    }
    const rect = container.getBoundingClientRect();
    const viewportPadding = 12;
    const popover = popoverRef.current;
    const fallbackWidth = 320;
    let intrinsicWidth = fallbackWidth;
    if (popover) {
      const computed = window.getComputedStyle(popover);
      const popoverPadding =
        Number.parseFloat(computed.paddingLeft || "0") +
        Number.parseFloat(computed.paddingRight || "0");
      const popoverBorder =
        Number.parseFloat(computed.borderLeftWidth || "0") +
        Number.parseFloat(computed.borderRightWidth || "0");
      const itemSample = popover.querySelector<HTMLElement>(".linux-app-menu-item");
      const itemSampleStyles = itemSample ? window.getComputedStyle(itemSample) : null;
      const labelSample = popover.querySelector<HTMLElement>(".linux-app-menu-item-label");
      const labelStyles = labelSample ? window.getComputedStyle(labelSample) : itemSampleStyles;
      const shortcutSample = popover.querySelector<HTMLElement>(".linux-app-menu-item-shortcut");
      const shortcutStyles = shortcutSample
        ? window.getComputedStyle(shortcutSample)
        : itemSampleStyles;
      const sectionSample = popover.querySelector<HTMLElement>(".linux-app-menu-section-title");
      const sectionStyles = sectionSample ? window.getComputedStyle(sectionSample) : itemSampleStyles;
      const defaultFont = "500 12px sans-serif";
      const labelFont = labelStyles?.font || defaultFont;
      const shortcutFont = shortcutStyles?.font || defaultFont;
      const sectionFont = sectionStyles?.font || defaultFont;
      const itemPaddingX =
        (itemSampleStyles
          ? Number.parseFloat(itemSampleStyles.paddingLeft || "0") +
          Number.parseFloat(itemSampleStyles.paddingRight || "0")
          : 16) || 16;
      const rowGap = 12;
      let maxRowContent = 0;
      popover.querySelectorAll<HTMLElement>(".linux-app-menu-item-row").forEach((row) => {
        const labelText =
          row.querySelector<HTMLElement>(".linux-app-menu-item-label")?.textContent?.trim() ?? "";
        const shortcutText =
          row.querySelector<HTMLElement>(".linux-app-menu-item-shortcut")?.textContent?.trim() ?? "";
        const labelWidth = measureTextWidth(labelText, labelFont);
        const shortcutWidth = measureTextWidth(shortcutText, shortcutFont);
        const rowWidth = labelWidth + (shortcutWidth > 0 ? rowGap + shortcutWidth : 0);
        if (rowWidth > maxRowContent) {
          maxRowContent = rowWidth;
        }
      });
      let maxSectionTitle = 0;
      popover.querySelectorAll<HTMLElement>(".linux-app-menu-section-title").forEach((title) => {
        const titleText = title.textContent?.trim() ?? "";
        const titleWidth = measureTextWidth(titleText, sectionFont);
        if (titleWidth > maxSectionTitle) {
          maxSectionTitle = titleWidth;
        }
      });
      intrinsicWidth = Math.ceil(
        Math.max(maxRowContent + itemPaddingX, maxSectionTitle + 16) + popoverPadding + popoverBorder,
      );
    }
    const viewportMaxWidth = Math.max(0, window.innerWidth - viewportPadding * 2);
    const clampedWidth = Math.max(
      220,
      Math.min(intrinsicWidth, viewportMaxWidth, 520),
    );
    setMenuWidth((current) => (current === clampedWidth ? current : clampedWidth));
    const measuredHeight = popover?.offsetHeight ?? 0;
    const maxTop =
      measuredHeight > 0
        ? Math.max(viewportPadding, window.innerHeight - measuredHeight - viewportPadding)
        : window.innerHeight - viewportPadding;
    const maxLeft = Math.max(viewportPadding, window.innerWidth - clampedWidth - viewportPadding);
    const left = Math.min(Math.max(rect.left, viewportPadding), maxLeft);
    const top = Math.min(Math.max(rect.bottom + 6, viewportPadding), maxTop);
    setMenuPosition({ top, left });
  }, [measureTextWidth]);

  const toggle = useCallback(() => {
    setIsOpen((current) => {
      const next = !current;
      if (!next && menuWidth !== null) {
        setMenuWidth(null);
      }
      return next;
    });
  }, [menuWidth]);

  useLayoutEffect(() => {
    if (!isOpen) {
      return;
    }
    // Measure and place the portal before first paint to avoid width flash.
    recalculateMenuPosition();
  }, [isOpen, recalculateMenuPosition]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    const onViewportChange = () => recalculateMenuPosition();
    window.addEventListener("resize", onViewportChange);
    window.addEventListener("scroll", onViewportChange, true);
    return () => {
      window.removeEventListener("resize", onViewportChange);
      window.removeEventListener("scroll", onViewportChange, true);
    };
  }, [isOpen, recalculateMenuPosition]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (
        target &&
        (containerRef.current?.contains(target) || popoverRef.current?.contains(target))
      ) {
        return;
      }
      close();
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") {
        return;
      }
      close();
    };

    window.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [close, isOpen]);

  const menus = useMemo<MenuDefinition[]>(
    () => [
      {
        key: "file",
        label: t("linuxMenu.menu.file"),
        items: [
          {
            type: "action",
            id: "file-new-agent",
            label: t("linuxMenu.file.newAgent"),
            disabled: !canAddWorkspaceAgent,
            shortcut: "Ctrl+N",
            onSelect: onNewAgent,
          },
          {
            type: "action",
            id: "file-new-worktree-agent",
            label: t("linuxMenu.file.newWorktreeAgent"),
            disabled: !canAddDerivedAgent,
            shortcut: "Ctrl+Shift+N",
            onSelect: onNewWorktreeAgent,
          },
          {
            type: "action",
            id: "file-new-clone-agent",
            label: t("linuxMenu.file.newCloneAgent"),
            disabled: !canAddDerivedAgent,
            onSelect: onNewCloneAgent,
          },
          { type: "separator", id: "file-sep-1" },
          {
            type: "action",
            id: "file-add-workspace",
            label: t("linuxMenu.file.addWorkspace"),
            shortcut: "Ctrl+O",
            onSelect: onAddWorkspace,
          },
          {
            type: "action",
            id: "file-add-workspace-url",
            label: t("linuxMenu.file.addWorkspaceFromUrl"),
            shortcut: "Ctrl+Shift+O",
            onSelect: onAddWorkspaceFromUrl,
          },
          { type: "separator", id: "file-sep-2" },
          {
            type: "action",
            id: "file-settings",
            label: t("linuxMenu.file.settings"),
            shortcut: "Ctrl+,",
            onSelect: onOpenSettings,
          },
          { type: "separator", id: "file-sep-3" },
          {
            type: "action",
            id: "file-close-window",
            label: t("linuxMenu.file.closeWindow"),
            shortcut: "Ctrl+W",
            onSelect: onCloseWindow,
          },
          {
            type: "action",
            id: "file-quit",
            label: t("linuxMenu.file.quit"),
            shortcut: "Ctrl+Q",
            onSelect: onQuitApp,
          },
        ],
      },
      {
        key: "edit",
        label: t("linuxMenu.menu.edit"),
        items: [
          {
            type: "action",
            id: "edit-undo",
            label: t("linuxMenu.edit.undo"),
            shortcut: "Ctrl+Z",
            onSelect: onEditUndo,
          },
          {
            type: "action",
            id: "edit-redo",
            label: t("linuxMenu.edit.redo"),
            shortcut: "Ctrl+Shift+Z",
            onSelect: onEditRedo,
          },
          { type: "separator", id: "edit-sep-1" },
          {
            type: "action",
            id: "edit-cut",
            label: t("linuxMenu.edit.cut"),
            shortcut: "Ctrl+X",
            onSelect: onEditCut,
          },
          {
            type: "action",
            id: "edit-copy",
            label: t("linuxMenu.edit.copy"),
            shortcut: "Ctrl+C",
            onSelect: onEditCopy,
          },
          {
            type: "action",
            id: "edit-paste",
            label: t("linuxMenu.edit.paste"),
            shortcut: "Ctrl+V",
            onSelect: onEditPaste,
          },
          {
            type: "action",
            id: "edit-select-all",
            label: t("linuxMenu.edit.selectAll"),
            shortcut: "Ctrl+A",
            onSelect: onEditSelectAll,
          },
        ],
      },
      {
        key: "composer",
        label: t("linuxMenu.menu.composer"),
        items: [
          {
            type: "action",
            id: "composer-cycle-model",
            label: t("linuxMenu.composer.cycleModel"),
            shortcut: "Ctrl+Shift+M",
            onSelect: onComposerCycleModel,
          },
          {
            type: "action",
            id: "composer-cycle-access",
            label: t("linuxMenu.composer.cycleAccessMode"),
            shortcut: "Ctrl+Shift+A",
            onSelect: onComposerCycleAccess,
          },
          {
            type: "action",
            id: "composer-cycle-reasoning",
            label: t("linuxMenu.composer.cycleReasoning"),
            shortcut: "Ctrl+Shift+R",
            onSelect: onComposerCycleReasoning,
          },
          {
            type: "action",
            id: "composer-cycle-collaboration",
            label: t("linuxMenu.composer.cycleCollaboration"),
            shortcut: "Shift+Tab",
            onSelect: onComposerCycleCollaboration,
          },
        ],
      },
      {
        key: "view",
        label: t("linuxMenu.menu.view"),
        items: [
          {
            type: "action",
            id: "view-toggle-projects",
            label: sidebarCollapsed
              ? t("linuxMenu.view.showProjectsSidebar")
              : t("linuxMenu.view.hideProjectsSidebar"),
            shortcut: "Ctrl+B",
            onSelect: onToggleProjectsSidebar,
          },
          {
            type: "action",
            id: "view-toggle-git",
            label: rightPanelCollapsed
              ? t("linuxMenu.view.showGitSidebar")
              : t("linuxMenu.view.hideGitSidebar"),
            shortcut: "Ctrl+J",
            onSelect: onToggleGitSidebar,
          },
          { type: "separator", id: "view-sep-1" },
          {
            type: "action",
            id: "view-toggle-debug",
            label: t("linuxMenu.view.toggleDebugPanel"),
            shortcut: "Ctrl+Shift+D",
            onSelect: onToggleDebugPanel,
          },
          {
            type: "action",
            id: "view-toggle-terminal",
            label: t("linuxMenu.view.toggleTerminal"),
            shortcut: "Ctrl+Shift+T",
            onSelect: onToggleTerminal,
          },
          { type: "separator", id: "view-sep-2" },
          {
            type: "action",
            id: "view-next-agent",
            label: t("linuxMenu.view.nextAgent"),
            disabled: !canCycleAgent,
            shortcut: "Ctrl+PgDown",
            onSelect: onNextAgent,
          },
          {
            type: "action",
            id: "view-prev-agent",
            label: t("linuxMenu.view.previousAgent"),
            disabled: !canCycleAgent,
            shortcut: "Ctrl+PgUp",
            onSelect: onPrevAgent,
          },
          {
            type: "action",
            id: "view-next-workspace",
            label: t("linuxMenu.view.nextWorkspace"),
            disabled: !canCycleWorkspace,
            shortcut: "Ctrl+Tab",
            onSelect: onNextWorkspace,
          },
          {
            type: "action",
            id: "view-prev-workspace",
            label: t("linuxMenu.view.previousWorkspace"),
            disabled: !canCycleWorkspace,
            shortcut: "Ctrl+Shift+Tab",
            onSelect: onPrevWorkspace,
          },
        ],
      },
      {
        key: "window",
        label: t("linuxMenu.menu.window"),
        items: [
          {
            type: "action",
            id: "window-minimize",
            label: t("linuxMenu.window.minimize"),
            onSelect: onWindowMinimize,
          },
          {
            type: "action",
            id: "window-maximize",
            label: t("linuxMenu.window.maximizeRestore"),
            onSelect: onWindowToggleMaximize,
          },
          { type: "separator", id: "window-sep-1" },
          {
            type: "action",
            id: "window-close",
            label: t("linuxMenu.window.closeWindow"),
            onSelect: onCloseWindow,
          },
        ],
      },
      {
        key: "help",
        label: t("linuxMenu.menu.help"),
        items: [
          {
            type: "action",
            id: "help-check-updates",
            label: t("linuxMenu.help.checkForUpdates"),
            onSelect: onHelpCheckUpdates,
          },
          {
            type: "action",
            id: "help-about",
            label: t("linuxMenu.help.about"),
            onSelect: onHelpAbout,
          },
        ],
      },
    ],
    [
      canAddWorkspaceAgent,
      canAddDerivedAgent,
      canCycleAgent,
      canCycleWorkspace,
      onNewAgent,
      onNewWorktreeAgent,
      onNewCloneAgent,
      onAddWorkspace,
      onAddWorkspaceFromUrl,
      onOpenSettings,
      onCloseWindow,
      onQuitApp,
      onEditUndo,
      onEditRedo,
      onEditCut,
      onEditCopy,
      onEditPaste,
      onEditSelectAll,
      onComposerCycleModel,
      onComposerCycleAccess,
      onComposerCycleReasoning,
      onComposerCycleCollaboration,
      onToggleProjectsSidebar,
      onToggleGitSidebar,
      onToggleDebugPanel,
      onToggleTerminal,
      onNextAgent,
      onPrevAgent,
      onNextWorkspace,
      onPrevWorkspace,
      onWindowMinimize,
      onWindowToggleMaximize,
      onHelpAbout,
      onHelpCheckUpdates,
      sidebarCollapsed,
      rightPanelCollapsed,
      t,
    ],
  );

  const handleSelectItem = (item: MenuActionItem) => {
    if (item.disabled) {
      return;
    }
    item.onSelect();
    close();
  };

  const portalMenu =
    isOpen && typeof document !== "undefined"
      ? createPortal(
        <PopoverSurface
          className="linux-app-menu-dropdown linux-app-menu-dropdown-single linux-app-menu-dropdown-portal"
          role="menu"
          ref={popoverRef}
          style={{
            top: `${menuPosition.top}px`,
            left: `${menuPosition.left}px`,
            width: menuWidth ? `${menuWidth}px` : undefined,
          }}
          data-tauri-drag-region="false"
        >
          {menus.map((menu) => (
            <section
              key={menu.key}
              className="linux-app-menu-section"
              aria-label={t("linuxMenu.section.aria", { label: menu.label })}
            >
              <h3 className="linux-app-menu-section-title sidebar-sort-section-label">{menu.label}</h3>
              {menu.items.map((item) => {
                if (item.type === "separator") {
                  return (
                    <div
                      key={item.id}
                      className="linux-app-menu-separator sidebar-sort-divider"
                      role="separator"
                    />
                  );
                }
                return (
                  <PopoverMenuItem
                    key={item.id}
                    className="linux-app-menu-item"
                    role="menuitem"
                    disabled={item.disabled}
                    onClick={() => handleSelectItem(item)}
                    data-tauri-drag-region="false"
                  >
                    <span className="linux-app-menu-item-row">
                      <span className="linux-app-menu-item-label">{item.label}</span>
                      {item.shortcut ? (
                        <span className="linux-app-menu-item-shortcut">{item.shortcut}</span>
                      ) : null}
                    </span>
                  </PopoverMenuItem>
                );
              })}
            </section>
          ))}
        </PopoverSurface>,
        document.body,
      )
      : null;

  return (
    <div
      className="linux-app-menu"
      ref={containerRef}
      role="group"
      aria-label={t("linuxMenu.group.applicationMenu")}
    >
      <MenuTrigger
        isOpen={isOpen}
        activeClassName="is-open"
        className="linux-app-menu-launcher"
        onClick={toggle}
        aria-label={t("linuxMenu.trigger.openApplicationMenu")}
        title={t("linuxMenu.trigger.title")}
      >
        <img className="linux-app-menu-app-icon" src={appIconUrl} alt="" aria-hidden />
      </MenuTrigger>
      {portalMenu}
    </div>
  );
}
