import { useEffect, useMemo, useState } from "react";
import type {
  DynamicToolCallRequest,
  DynamicToolCallResponse,
} from "../../../types";

type RequestToolCallMessageProps = {
  requests: DynamicToolCallRequest[];
  activeThreadId: string | null;
  activeWorkspaceId?: string | null;
  onSubmit: (
    request: DynamicToolCallRequest,
    response: DynamicToolCallResponse,
  ) => void;
};

function prettyJson(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

export function RequestToolCallMessage({
  requests,
  activeThreadId,
  activeWorkspaceId,
  onSubmit,
}: RequestToolCallMessageProps) {
  const activeRequests = useMemo(
    () =>
      requests.filter((request) => {
        if (!activeThreadId) {
          return false;
        }
        if (request.params.thread_id !== activeThreadId) {
          return false;
        }
        if (activeWorkspaceId && request.workspace_id !== activeWorkspaceId) {
          return false;
        }
        return true;
      }),
    [activeThreadId, activeWorkspaceId, requests],
  );

  const activeRequest = activeRequests[0] ?? null;
  const [text, setText] = useState("");
  const [success, setSuccess] = useState(true);

  useEffect(() => {
    setText("");
    setSuccess(true);
  }, [activeRequest?.request_id]);

  if (!activeRequest) {
    return null;
  }

  const requestCount = activeRequests.length;

  const handleSubmit = () => {
    const trimmed = text.trim();
    onSubmit(activeRequest, {
      contentItems: trimmed.length
        ? [{ type: "inputText", text: trimmed }]
        : [],
      success,
    });
  };

  return (
    <div className="message request-user-input-message request-tool-call-message">
      <div
        className="bubble request-user-input-card"
        role="group"
        aria-label="Tool call requested"
      >
        <div className="request-user-input-header">
          <div className="request-user-input-title">Tool call requested</div>
          {requestCount > 1 ? (
            <div className="request-user-input-queue">
              {`Request 1 of ${requestCount}`}
            </div>
          ) : null}
        </div>
        <div className="request-user-input-body">
          <section className="request-user-input-question">
            <div className="request-user-input-question-header">Tool</div>
            <div className="request-user-input-question-text">{activeRequest.params.tool}</div>
            <div className="request-user-input-question-header">Arguments</div>
            <pre className="request-user-input-option-description request-tool-call-args">
              {prettyJson(activeRequest.params.arguments)}
            </pre>
            <textarea
              className="request-user-input-notes"
              placeholder="Tool result text (optional)"
              value={text}
              onChange={(event) => setText(event.target.value)}
              rows={3}
            />
            <label className="request-tool-call-success-toggle">
              <input
                type="checkbox"
                checked={success}
                onChange={(event) => setSuccess(event.target.checked)}
              />
              Mark call as successful
            </label>
          </section>
        </div>
        <div className="request-user-input-actions">
          <button className="primary" onClick={handleSubmit}>
            Submit tool result
          </button>
        </div>
      </div>
    </div>
  );
}
