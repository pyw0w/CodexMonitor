import type {
  ApprovalRequest,
  DebugEntry,
  DynamicToolCallRequest,
  RequestUserInputRequest,
} from "../../../types";
import { useWindowFocusState } from "../../layout/hooks/useWindowFocusState";
import { useAgentResponseRequiredNotifications } from "../../notifications/hooks/useAgentResponseRequiredNotifications";

type Params = {
  systemNotificationsEnabled: boolean;
  subagentSystemNotificationsEnabled: boolean;
  isSubagentThread?: (workspaceId: string, threadId: string) => boolean;
  approvals: ApprovalRequest[];
  toolCallRequests: DynamicToolCallRequest[];
  userInputRequests: RequestUserInputRequest[];
  getWorkspaceName?: (workspaceId: string) => string | undefined;
  onDebug?: (entry: DebugEntry) => void;
};

export function useResponseRequiredNotificationsController({
  systemNotificationsEnabled,
  subagentSystemNotificationsEnabled,
  isSubagentThread,
  approvals,
  toolCallRequests,
  userInputRequests,
  getWorkspaceName,
  onDebug,
}: Params) {
  const isWindowFocused = useWindowFocusState();

  useAgentResponseRequiredNotifications({
    enabled: systemNotificationsEnabled,
    subagentNotificationsEnabled: subagentSystemNotificationsEnabled,
    isSubagentThread,
    isWindowFocused,
    approvals,
    toolCallRequests,
    userInputRequests,
    getWorkspaceName,
    onDebug,
  });
}
