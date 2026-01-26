import { ApiError } from "./request";

type StackFrameDetails = {
  functionName: string | null;
  fileName: string;
  line: string;
  column: string;
};

const parseStackLine = (line: string): StackFrameDetails | null => {
  const chromeMatch = line.match(
    /^at\s+(?:(.*?)\s+\()?(.+?):(\d+):(\d+)\)?$/,
  );
  if (chromeMatch) {
    return {
      functionName: chromeMatch[1] || null,
      fileName: chromeMatch[2],
      line: chromeMatch[3],
      column: chromeMatch[4],
    };
  }

  const firefoxMatch = line.match(/^(.*?)@(.+?):(\d+):(\d+)$/);
  if (firefoxMatch) {
    return {
      functionName: firefoxMatch[1] || null,
      fileName: firefoxMatch[2],
      line: firefoxMatch[3],
      column: firefoxMatch[4],
    };
  }

  return null;
};

const getStackFrameDetails = (stack?: string): StackFrameDetails | null => {
  if (!stack) {
    return null;
  }

  const lines = stack
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  for (const line of lines) {
    if (!line.startsWith("at ") && !line.includes("@")) {
      continue;
    }

    const parsed = parseStackLine(line);
    if (parsed) {
      return parsed;
    }
  }

  return null;
};

const formatResponseSummary = (data: unknown) => {
  if (data === null || data === undefined) {
    return null;
  }

  if (typeof data === "string") {
    return data;
  }

  try {
    return JSON.stringify(data);
  } catch (error) {
    return "Unable to serialize response body.";
  }
};

export const formatErrorMessage = (error: unknown, fallback: string) => {
  const details: string[] = [];
  let message = fallback;

  if (error instanceof Error && error.message) {
    message = error.message;
  } else if (typeof error === "string" && error.trim().length > 0) {
    message = error;
  }

  if (error instanceof Error && error.name && error.name !== "Error") {
    details.push(`Type: ${error.name}`);
  }

  if (error instanceof ApiError) {
    details.push(`Status: ${error.status}`);
    const responseSummary = formatResponseSummary(error.data);
    if (responseSummary) {
      details.push(`Response: ${responseSummary}`);
    }
  }

  if (error instanceof Error) {
    const stackDetails = getStackFrameDetails(error.stack);
    if (stackDetails) {
      details.push(
        `Function: ${stackDetails.functionName ?? "anonymous"}`,
      );
      details.push(`Location: ${stackDetails.fileName}`);
      details.push(`Line: ${stackDetails.line}`);
    }
  }

  if (details.length === 0) {
    return message;
  }

  return [message, ...details].join("\n");
};
