export const truncate = (value: string, maxLength: number) => {
  if (!value) {
    return "";
  }

  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength - 1).trimEnd()}…`;
};

export const normalizeWhitespace = (value: string) =>
  value.replace(/\s+/g, " ").trim();

export const getPlainTextFromHtml = (value: string) => {
  if (!value) {
    return "";
  }

  if (typeof window !== "undefined" && typeof document !== "undefined") {
    const container = document.createElement("div");
    container.innerHTML = value;
    const text = container.textContent ?? container.innerText ?? "";
    return normalizeWhitespace(text);
  }

  return normalizeWhitespace(value.replace(/<[^>]*>/g, " "));
};

export const trimTrailingTranscript = (value: string, transcript: string) => {
  if (!transcript) {
    return value;
  }

  if (value === transcript) {
    return "";
  }

  if (value.endsWith(transcript)) {
    return value
      .slice(0, value.length - transcript.length)
      .replace(/[ \t]*$/, "");
  }

  return value;
};

export const combineValueWithTranscript = (
  value: string,
  transcript: string,
) => {
  if (!transcript) {
    return value;
  }

  if (!value) {
    return transcript;
  }

  const needsSeparator =
    !value.endsWith(" ") && !value.endsWith("\n") && !value.endsWith("\t");

  return `${value}${needsSeparator ? " " : ""}${transcript}`;
};
