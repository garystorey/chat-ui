import { describe, expect, it, vi } from "vitest";
import {
  buildAttachmentContentParts,
  buildChatCompletionResponse,
  extractAssistantReply,
  extractAssistantToolCalls,
  getChatCompletionContentText,
  stripAssistantArtifacts,
} from "../../src/utils/transform";
import type {
  ChatCompletionResponse,
  ChatCompletionStreamResponse,
  MessageAttachment,
} from "../../src/types";

describe("chat transforms", () => {
  it("converts supported attachments into chat completion content parts", () => {
    const attachments: MessageAttachment[] = [
      {
        id: "image-1",
        name: "screenshot.png",
        type: "image",
        mimeType: "image/png",
        size: 128,
        url: "abc123",
      },
      {
        id: "file-1",
        name: "notes.txt",
        type: "file",
        mimeType: "text/plain",
        size: 32,
        url: "hello",
      },
    ];

    expect(buildAttachmentContentParts(attachments)).toEqual([
      {
        type: "image_url",
        image_url: {
          url: "data:image/png;base64,abc123",
        },
      },
      {
        type: "text",
        text: "Attachment: notes.txt (text/plain, 32 bytes)\nData: data:text/plain;base64,hello",
      },
    ]);
  });

  it("skips unsupported image attachments without failing the transform", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const attachments: MessageAttachment[] = [
      {
        id: "image-1",
        name: "animation.gif",
        type: "image",
        mimeType: "image/gif",
        size: 64,
        url: "abc123",
      },
    ];

    expect(buildAttachmentContentParts(attachments)).toEqual([]);
    expect(warnSpy).toHaveBeenCalledWith(
      "Skipping unsupported image attachment mime type.",
      "image/gif",
    );
  });

  it("collects content text and strips assistant artifacts", () => {
    expect(getChatCompletionContentText("ready")).toBe("ready");
    expect(
      getChatCompletionContentText([
        { type: "text", text: "foo" },
        { type: "output_text", text: "bar" },
      ]),
    ).toBe("foobar");
    expect(stripAssistantArtifacts("a <|begin_of_box|> b <end_of_box> c")).toBe(
      "abc",
    );
  });

  it("extracts trimmed assistant replies and falls back to an empty string", () => {
    const response: ChatCompletionResponse = {
      choices: [
        {
          index: 0,
          message: {
            role: "assistant",
            content: [{ type: "text", text: " Done " }],
          },
        },
      ],
    };

    expect(extractAssistantReply(response)).toBe("Done");
    expect(extractAssistantReply({ choices: [] })).toBe("");
  });

  it("reconstructs streamed tool call chunks into full assistant tool calls", () => {
    const chunks: ChatCompletionStreamResponse[] = [
      {
        id: "cmpl-1",
        choices: [
          {
            index: 0,
            delta: {
              role: "assistant",
              tool_calls: [
                {
                  index: 0,
                  id: "call_1",
                  type: "function",
                  function: {
                    name: "echo",
                    arguments: "{",
                  },
                },
              ],
            },
          },
        ],
      },
      {
        id: "cmpl-1",
        choices: [
          {
            index: 0,
            delta: {
              tool_calls: [
                {
                  index: 0,
                  function: {
                    arguments: '"text":"hello"}',
                  },
                },
              ],
            },
            finish_reason: "tool_calls",
          },
        ],
      },
    ];

    const response = buildChatCompletionResponse(chunks);

    expect(response.choices[0]?.finish_reason).toBe("tool_calls");
    expect(response.choices[0]?.message.content).toBeNull();
    expect(extractAssistantToolCalls(response)).toEqual([
      {
        id: "call_1",
        type: "function",
        function: {
          name: "echo",
          arguments: '{"text":"hello"}',
        },
      },
    ]);
  });
});
