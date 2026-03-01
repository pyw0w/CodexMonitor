import { useCallback, useMemo } from "react";
import type { MouseEvent } from "react";
import { Menu, MenuItem, PredefinedMenuItem } from "@tauri-apps/api/menu";
import { LogicalPosition } from "@tauri-apps/api/dpi";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { revealItemInDir } from "@tauri-apps/plugin-opener";
import * as Sentry from "@sentry/react";
import { useI18n } from "@/i18n/useI18n";
import { openWorkspaceIn } from "../../../services/tauri";
import { pushErrorToast } from "../../../services/toasts";
import type { OpenAppTarget } from "../../../types";
import {
  isAbsolutePath,
  joinWorkspacePath,
  revealInFileManagerLabel,
} from "../../../utils/platformPaths";

type OpenTarget = {
  id: string;
  label: string;
  appName?: string | null;
  kind: OpenAppTarget["kind"];
  command?: string | null;
  args: string[];
};

const DEFAULT_OPEN_TARGET_BASE: Omit<OpenTarget, "label"> = {
  id: "vscode",
  appName: "Visual Studio Code",
  kind: "app",
  command: null,
  args: [],
};

const resolveAppName = (target: OpenTarget) => (target.appName ?? "").trim();
const resolveCommand = (target: OpenTarget) => (target.command ?? "").trim();
const canOpenTarget = (target: OpenTarget) => {
  if (target.kind === "finder") {
    return true;
  }
  if (target.kind === "command") {
    return Boolean(resolveCommand(target));
  }
  return Boolean(resolveAppName(target));
};

function resolveFilePath(path: string, workspacePath?: string | null) {
  const trimmed = path.trim();
  if (!workspacePath) {
    return trimmed;
  }
  if (isAbsolutePath(trimmed)) {
    return trimmed;
  }
  return joinWorkspacePath(workspacePath, trimmed);
}

function stripLineSuffix(path: string) {
  const match = path.match(/^(.*?)(?::\d+(?::\d+)?)?$/);
  return match ? match[1] : path;
}

export function useFileLinkOpener(
  workspacePath: string | null,
  openTargets: OpenAppTarget[],
  selectedOpenAppId: string,
) {
  const { t } = useI18n();
  const defaultOpenTarget = useMemo<OpenTarget>(
    () => ({
      ...DEFAULT_OPEN_TARGET_BASE,
      label: t("fileLink.defaultTargetLabel"),
    }),
    [t],
  );

  const reportOpenError = useCallback(
    (error: unknown, context: Record<string, string | null>) => {
      const details = error instanceof Error ? error.message : String(error);
      Sentry.captureException(
        error instanceof Error ? error : new Error(details),
        {
          tags: {
            feature: "file-link-open",
          },
          extra: context,
        },
      );
      pushErrorToast({
        title: t("errors.openFile.title"),
        message: t("errors.openFile.message"),
        details,
      });
      console.warn("Failed to open file link", { details, ...context });
    },
    [t],
  );

  const openFileLink = useCallback(
    async (rawPath: string) => {
      const target = {
        ...defaultOpenTarget,
        ...(openTargets.find((entry) => entry.id === selectedOpenAppId) ??
          openTargets[0]),
      };
      const resolvedPath = resolveFilePath(stripLineSuffix(rawPath), workspacePath);

      try {
        if (!canOpenTarget(target)) {
          return;
        }
        if (target.kind === "finder") {
          await revealItemInDir(resolvedPath);
          return;
        }

        if (target.kind === "command") {
          const command = resolveCommand(target);
          if (!command) {
            return;
          }
          await openWorkspaceIn(resolvedPath, {
            command,
            args: target.args,
          });
          return;
        }

        const appName = resolveAppName(target);
        if (!appName) {
          return;
        }
        await openWorkspaceIn(resolvedPath, {
          appName,
          args: target.args,
        });
      } catch (error) {
        reportOpenError(error, {
          rawPath,
          resolvedPath,
          workspacePath,
          targetId: target.id,
          targetKind: target.kind,
          targetAppName: target.appName ?? null,
          targetCommand: target.command ?? null,
        });
      }
    },
    [defaultOpenTarget, openTargets, reportOpenError, selectedOpenAppId, workspacePath],
  );

  const showFileLinkMenu = useCallback(
    async (event: MouseEvent, rawPath: string) => {
      event.preventDefault();
      event.stopPropagation();
      const target = {
        ...defaultOpenTarget,
        ...(openTargets.find((entry) => entry.id === selectedOpenAppId) ??
          openTargets[0]),
      };
      const resolvedPath = resolveFilePath(stripLineSuffix(rawPath), workspacePath);
      const appName = resolveAppName(target);
      const command = resolveCommand(target);
      const canOpen = canOpenTarget(target);
      const openLabel =
        target.kind === "finder"
          ? revealInFileManagerLabel()
          : target.kind === "command"
            ? command
              ? t("fileLink.menu.openIn", { app: target.label })
              : t("fileLink.menu.setCommandInSettings")
            : appName
              ? t("fileLink.menu.openIn", { app: appName })
              : t("fileLink.menu.setAppNameInSettings");
      const items = [
        await MenuItem.new({
          text: openLabel,
          enabled: canOpen,
          action: async () => {
            await openFileLink(rawPath);
          },
        }),
        ...(target.kind === "finder"
          ? []
          : [
              await MenuItem.new({
                text: revealInFileManagerLabel(),
                action: async () => {
                  try {
                    await revealItemInDir(resolvedPath);
                  } catch (error) {
                    reportOpenError(error, {
                      rawPath,
                      resolvedPath,
                      workspacePath,
                      targetId: target.id,
                      targetKind: "finder",
                      targetAppName: null,
                      targetCommand: null,
                    });
                  }
                },
              }),
            ]),
        await MenuItem.new({
          text: t("fileLink.menu.downloadLinkedFile"),
          enabled: false,
        }),
        await MenuItem.new({
          text: t("fileLink.menu.copyLink"),
          action: async () => {
            const link =
              resolvedPath.startsWith("/") ? `file://${resolvedPath}` : resolvedPath;
            try {
              await navigator.clipboard.writeText(link);
            } catch {
              // Clipboard failures are non-fatal here.
            }
          },
        }),
        await PredefinedMenuItem.new({ item: "Separator" }),
        await PredefinedMenuItem.new({ item: "Services" }),
      ];

      const menu = await Menu.new({ items });
      const window = getCurrentWindow();
      const position = new LogicalPosition(event.clientX, event.clientY);
      await menu.popup(position, window);
    },
    [
      defaultOpenTarget,
      openFileLink,
      openTargets,
      reportOpenError,
      selectedOpenAppId,
      t,
      workspacePath,
    ],
  );

  return { openFileLink, showFileLinkMenu };
}
