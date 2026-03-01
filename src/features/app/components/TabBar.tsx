import type { ReactNode } from "react";
import FolderKanban from "lucide-react/dist/esm/icons/folder-kanban";
import GitBranch from "lucide-react/dist/esm/icons/git-branch";
import House from "lucide-react/dist/esm/icons/house";
import MessagesSquare from "lucide-react/dist/esm/icons/messages-square";
import TerminalSquare from "lucide-react/dist/esm/icons/terminal-square";
import { useI18n } from "@/i18n/useI18n";

type TabKey = "home" | "projects" | "codex" | "git" | "log";

type TabBarProps = {
  activeTab: TabKey;
  onSelect: (tab: TabKey) => void;
};

const tabs: { id: TabKey; labelKey: string; icon: ReactNode }[] = [
  { id: "home", labelKey: "tabbar.tab.home", icon: <House className="tabbar-icon" /> },
  {
    id: "projects",
    labelKey: "tabbar.tab.projects",
    icon: <FolderKanban className="tabbar-icon" />,
  },
  { id: "codex", labelKey: "tabbar.tab.codex", icon: <MessagesSquare className="tabbar-icon" /> },
  { id: "git", labelKey: "tabbar.tab.git", icon: <GitBranch className="tabbar-icon" /> },
  { id: "log", labelKey: "tabbar.tab.log", icon: <TerminalSquare className="tabbar-icon" /> },
];

export function TabBar({ activeTab, onSelect }: TabBarProps) {
  const { t } = useI18n();
  return (
    <nav className="tabbar" aria-label={t("tabbar.aria.primary")}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          className={`tabbar-item ${activeTab === tab.id ? "active" : ""}`}
          onClick={() => onSelect(tab.id)}
          aria-current={activeTab === tab.id ? "page" : undefined}
        >
          {tab.icon}
          <span className="tabbar-label">{t(tab.labelKey)}</span>
        </button>
      ))}
    </nav>
  );
}
