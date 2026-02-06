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

const SANITIZE_CONFIG = {
  ALLOWED_TAGS: [
    "a",
    "p",
    "br",
    "strong",
    "em",
    "b",
    "i",
    "u",
    "s",
    "code",
    "pre",
    "blockquote",
    "ul",
    "ol",
    "li",
    "hr",
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "span",
  ],
  ALLOWED_ATTR: ["href", "title", "class"],
  FORBID_TAGS: [
    "style",
    "script",
    "iframe",
    "object",
    "embed",
    "link",
    "meta",
    "svg",
    "math",
    "form",
    "input",
    "button",
  ],
};

let hooksConfigured = false;

const ensureHooks = () => {
  if (hooksConfigured) {
    return;
  }

  DOMPurify.addHook("afterSanitizeAttributes", (node) => {
    if (!(node instanceof Element)) {
      return;
    }

    if (node.tagName.toLowerCase() !== "a") {
      return;
    }

    const href = node.getAttribute("href") ?? "";
    if (!href) {
      return;
    }

    node.setAttribute("rel", "noopener noreferrer");

    if (href.startsWith("http://") || href.startsWith("https://")) {
      node.setAttribute("target", "_blank");
    }
  });

  hooksConfigured = true;
};

const sanitize = (html: string): string => {
  ensureHooks();
  return DOMPurify.sanitize(html, SANITIZE_CONFIG);
};

export function renderMarkdown(text: string): string {
  return sanitize(marked.parse(text) as string);
}

export function sanitizeHtml(html: string): string {
  return sanitize(html);
}
