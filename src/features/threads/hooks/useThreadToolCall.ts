import { useCallback } from "react";
import type { Dispatch } from "react";
import type { DynamicToolCallRequest, DynamicToolCallResponse } from "@/types";
import { respondToToolCallRequest } from "@services/tauri";
import type { ThreadAction } from "./useThreadsReducer";

type UseThreadToolCallOptions = {
  dispatch: Dispatch<ThreadAction>;
};

export function useThreadToolCall({ dispatch }: UseThreadToolCallOptions) {
  const handleToolCallSubmit = useCallback(
    async (request: DynamicToolCallRequest, response: DynamicToolCallResponse) => {
      await respondToToolCallRequest(
        request.workspace_id,
        request.request_id,
        response,
      );
      dispatch({
        type: "removeToolCallRequest",
        requestId: request.request_id,
        workspaceId: request.workspace_id,
      });
    },
    [dispatch],
  );

  return { handleToolCallSubmit };
}
