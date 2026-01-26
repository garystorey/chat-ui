// export type ThemeMode = "light" | "dark";

// export type ThemeId =
//   | "dava-orange"
//   | "dragula"
//   | "ayu"
//   | "one-dark-pro"
//   | "cappuccino"
//   | "owl"
//   | "monokai-pro"
//   | "github"
//   | "solarized"
//   | "nord"
//   | "tokyo-night"
//   | "material-theme"
//   | "gruvbox"
//   | "high-contrast";

// export type ThemePreference = {
//   id: ThemeId;
//   mode: ThemeMode;
// };

// export type ConnectionStatus = "online" | "offline" | "connecting";

// export type Message = {
//   id: string;
//   sender: "user" | "bot";
//   content: string;
//   renderAsHtml?: boolean;
//   attachments?: MessageAttachment[];
// };

// export type PreviewChat = {
//   id: string;
//   title: string;
//   preview: string;
// };

// export type ChatSummary = {
//   id: string;
//   title: string;
//   preview: string;
//   updatedAt: number;
//   messages: Message[];
// };

// export type UserInputSendPayload = {
//   text: string;
//   attachments?: MessageAttachment[];
//   model?: string;
// };

// export type ApiRequestOptions = {
//   path: string;
//   method?: string;
//   body?: unknown;
//   headers?: Record<string, string>;
//   signal?: AbortSignal;
// };

// export type ApiStreamRequestOptions<TMessage, TResponse> = {
//   path: string;
//   method?: string;
//   body?: unknown;
//   headers?: Record<string, string>;
//   signal?: AbortSignal;
//   onMessage?: (message: TMessage) => void;
//   parseMessage?: (data: string) => TMessage;
//   buildResponse: (messages: TMessage[]) => TResponse;
// };

// export type ChatCompletionRole = "system" | "user" | "assistant";

// export type ChatCompletionContentPart =
//   | {
//       type: "text" | "output_text";
//       text: string;
//     }
//   | {
//       type: "input_text";
//       text: string;
//     }
//   | ChatCompletionImageContentPart;

// export type ChatCompletionImageContentPart = {
//   type: "image_url";
//   image_url: {
//     url: string;
//     detail?: "low" | "high";
//   };
// };

// export type MessageAttachment = {
//   id: string;
//   type: "image";
//   name: string;
//   mimeType: string;
//   size: number;
//   url: string;
// };

// export type ChatCompletionMessage = {
//   role: ChatCompletionRole;
//   content: string | ChatCompletionContentPart[];
// };

// export type ChatCompletionRequest = {
//   model: string;
//   messages: ChatCompletionMessage[];
//   stream?: boolean;
//   [key: string]: unknown;
// };

// export type ChatCompletionChoice = {
//   index: number;
//   message: ChatCompletionMessage;
//   finish_reason?: string | null;
// };

// export type ChatCompletionResponse = {
//   id?: string;
//   choices: ChatCompletionChoice[];
// };

// export type ChatCompletionStreamChoice = {
//   index: number;
//   delta?: Partial<ChatCompletionMessage>;
//   finish_reason?: string | null;
// };

// export type ChatCompletionStreamResponse = {
//   id?: string;
//   choices: ChatCompletionStreamChoice[];
// };

// export type ChatCompletionStreamArgs = {
//   body: ChatCompletionRequest;
//   onStreamUpdate: (content: string) => void;
//   onStreamComplete: (content: string) => void;
//   onError: (error: unknown) => void;
//   onSettled?: () => void;
// };

// export type ChatCompletionMutationVariables = {
//   body: ChatCompletionRequest;
//   signal?: AbortSignal;
//   onChunk?: (chunk: ChatCompletionStreamResponse) => void;
// };

// export type Suggestion = {
//   id: number;
//   title: string;
//   description: string;
//   actionLabel: string;
//   icon: string;
//   handleSelect: () => void;
// };

// export type ToastType = "success" | "error" | "warning" | "info";

// export type ToastItem = {
//   id: string;
//   message: string;
//   type: ToastType;
// };

// export type HomeTab = {
//   id: "suggestions" | "recent";
//   label: string;
//   tabId: string;
//   panelId: string;
// };


export type ThemeMode = "light" | "dark";

export type ThemeId =
  | "dava-orange"
  | "dragula"
  | "ayu"
  | "one-dark-pro"
  | "cappuccino"
  | "owl"
  | "monokai-pro"
  | "github"
  | "solarized"
  | "nord"
  | "tokyo-night"
  | "material-theme"
  | "gruvbox"
  | "high-contrast";

export type ThemePreference = {
  id: ThemeId;
  mode: ThemeMode;
};

export type ConnectionStatus = "online" | "offline" | "connecting";

export type MessageAttachment = {
  id: string;
  type: "image";
  name: string;
  mimeType: string;
  size: number;
  url: string;
};

export type Message = {
  id: string;
  sender: "user" | "bot";
  content: string;
  renderAsHtml?: boolean;
  attachments?: MessageAttachment[];
};

export type PreviewChat = {
  id: string;
  title: string;
  preview: string;
};

export type ChatSummary = {
  id: string;
  title: string;
  preview: string;
  updatedAt: number;
  messages: Message[];
};

export type UserInputSendPayload = {
  text: string;
  attachments?: MessageAttachment[];
  model?: string;
};

export type ApiRequestOptions = {
  path: string;
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
  signal?: AbortSignal;
};

export type ApiStreamRequestOptions<TMessage, TResponse> = {
  path: string;
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
  signal?: AbortSignal;
  onMessage?: (message: TMessage) => void;
  parseMessage?: (data: string) => TMessage;
  buildResponse: (messages: TMessage[]) => TResponse;
};

export type ChatCompletionRole =
  | "developer"
  | "system"
  | "user"
  | "assistant"
  | "tool";

type ChatCompletionContentPartType= "text" | "output_text" | "input_text" | "image_url";
type ChatCompletionImageContentPartDetail = "auto" | "low" | "high";

export type ChatCompletionImageContentPart = {
  type:  Extract<ChatCompletionContentPartType, "image_url">;
  image_url: {
    url: string;
    detail?: ChatCompletionImageContentPartDetail
  };
};

export type ChatCompletionContentPart =
  | {
      type: Omit<ChatCompletionContentPartType, "input_text" | "image_url">;
      text: string;
    }
  | {
      type: Extract<ChatCompletionContentPartType, "input_text">;
      text: string;
    }
  | ChatCompletionImageContentPart;

export type ChatCompletionMessage = {
  role: ChatCompletionRole;
  content: string | ChatCompletionContentPart[];
};

export type ChatCompletionRequest = {
  model: string;
  messages: ChatCompletionMessage[];
  stream?: boolean;
  [key: string]: unknown;
};

type ChatCompletionFinishReason = "stop" | "length" | "content_filter" | "tool_calls" | null;
export type ChatCompletionChoice = {
  index: number;
  message: ChatCompletionMessage;
  finish_reason?: ChatCompletionFinishReason;
};

export type ChatCompletionResponse = {
  id?: string;
  choices: ChatCompletionChoice[];
};

export type RequireAtLeastOne<T, Keys extends keyof T = keyof T> = 
  Pick<T, Exclude<keyof T, Keys>> &
  {
    [K in Keys]-?: Required<Pick<T, K>> & Partial<Record<Exclude<Keys, K>, never>>
  }[Keys];

export type ChatCompletionDeltaToolCall =
  | {
      index: number;
      id?: string;
      type?: never;
    }
  | {
      index: number;
      id?: string;
      type: "function";
      function: {
        name: string;
        arguments: string;
      };
    };

export type ChatCompletionDeltaBase = {
  role?: ChatCompletionRole;
  content?: string;
  tool_calls?: ChatCompletionDeltaToolCall[];
};

export type ChatCompletionDelta = RequireAtLeastOne<
  ChatCompletionDeltaBase,
  "role" | "content" | "tool_calls"
>;

export type ChatCompletionStreamChoice = {
  index: number;
  delta?: ChatCompletionDelta;
  finish_reason?: ChatCompletionFinishReason;
};

export type ChatCompletionStreamResponse = {
  id?: string;
  choices: ChatCompletionStreamChoice[];
};


export type ChatCompletionStreamArgs = {
  body: ChatCompletionRequest;
  onStreamUpdate: (content: string) => void;
  onStreamComplete: (content: string) => void;
  onError: (error: unknown) => void;
  onSettled?: () => void;
};

export type ChatCompletionMutationVariables = {
  body: ChatCompletionRequest;
  signal?: AbortSignal;
  onChunk?: (chunk: ChatCompletionStreamResponse) => void;
};

/* ---------------------------------------------
 * UI types
 * --------------------------------------------- */

export type Suggestion = {
  id: number;
  title: string;
  description: string;
  actionLabel: string;
  icon: string;
  handleSelect: () => void;
};

export type ToastType = "success" | "error" | "warning" | "info";

export type ToastItem = {
  id: string;
  message: string;
  type: ToastType;
};

export type HomeTab = {
  id: "suggestions" | "recent";
  label: string;
  tabId: string;
  panelId: string;
};
