export const parseSseEvents = <TMessage>(
  chunk: string,
  flush: boolean,
  handleEvent: (data: string) => boolean,
) => {
  const normalized = chunk.replace(/\r\n/g, "\n");
  const segments = normalized.split("\n\n");
  const remainder = flush ? "" : (segments.pop() ?? "");

  for (const segment of segments) {
    const lines = segment.split("\n");
    const dataLines: string[] = [];
    for (const line of lines) {
      if (!line || line.startsWith(":")) {
        continue;
      }
      if (line.startsWith("data:")) {
        dataLines.push(line.replace(/^data:\s*/, ""));
      }
    }

    if (!dataLines.length) {
      continue;
    }

    const data = dataLines.join("\n");
    const shouldStop = handleEvent(data);
    if (shouldStop) {
      return { remainder: "", shouldStop: true };
    }
  }

  return { remainder, shouldStop: false };
};
