import DOMPurify from "dompurify";
import hljs from "highlight.js";
import { marked } from "marked";

marked.setOptions({
  highlight(code: string, language?: string) {
    if (language && hljs.getLanguage(language)) {
      return hljs.highlight(code, { language }).value;
    }
    return hljs.highlightAuto(code).value;
  },
  breaks: true,
  gfm: true,
  langPrefix: "hljs language-",
} as any);

export function renderMarkdown(text: string): string {
  return DOMPurify.sanitize(marked.parse(text) as string);
}

export function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html);
}
