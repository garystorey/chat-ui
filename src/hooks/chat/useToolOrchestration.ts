import { useCallback, useState } from "react";
import type {
  ChatCompletionMessage,
  ChatCompletionTool,
  MessageToolInvocation,
} from "../../types";
import { runToolOrchestration } from "../../utils/tools";

export default function useToolOrchestration() {
  const [status, setStatus] = useState<"idle" | "running" | "error">("idle");
  const [toolInvocations, setToolInvocations] = useState<
    MessageToolInvocation[] | undefined
  >(undefined);
  const [error, setError] = useState<unknown>(null);

  const run = useCallback(
    async (opts: {
      model: string;
      initialMessages: ChatCompletionMessage[];
      tools: ChatCompletionTool[];
      maxToolRounds: number;
      sendChatCompletion: any;
      executeLocalToolCalls: any;
      onStreamUpdate: (content: string) => void;
      onStreamComplete: (content: string) => void;
      applyToolInvocations?: (invocations: MessageToolInvocation[]) => void;
    }) => {
      const {
        model,
        initialMessages,
        tools,
        maxToolRounds,
        sendChatCompletion,
        executeLocalToolCalls,
        onStreamUpdate,
        onStreamComplete,
        applyToolInvocations,
      } = opts;

      setStatus("running");
      setError(null);
      setToolInvocations(undefined);

      try {
        const response = await runToolOrchestration({
          model,
          initialMessages,
          tools,
          maxToolRounds,
          sendChatCompletion,
          executeLocalToolCalls,
          updateAssistantToolInvocations: (invocations) => {
            setToolInvocations(invocations);
            applyToolInvocations?.(invocations);
          },
          onStreamUpdate: (content) => {
            onStreamUpdate(content);
          },
          onStreamComplete: (content) => {
            onStreamComplete(content);
          },
          onError: (err) => {
            setError(err);
            setStatus("error");
          },
        });

        setStatus("idle");
        return response;
      } catch (err) {
        setError(err);
        setStatus("error");
        throw err;
      }
    },
    [],
  );

  return { status, toolInvocations, error, run } as const;
}
