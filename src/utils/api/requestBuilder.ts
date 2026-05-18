import { OPENAI_BETA_FEATURES } from "../../config/App.config";
import { ApiRequestOptions } from "../../types";
import { getApiBaseUrl, getOpenAIApiKey } from "../shared/config";

export const buildRequestOptions = ({
  path,
  method = "GET",
  body,
  headers,
  signal,
}: ApiRequestOptions) => {
  const requestHeaders: Record<string, string> = {
    Accept: "application/json",
    ...headers,
  };

  const openAIApiKey = getOpenAIApiKey();
  if (openAIApiKey && !requestHeaders.Authorization) {
    requestHeaders.Authorization = `Bearer ${openAIApiKey}`;
  }

  if (OPENAI_BETA_FEATURES && !requestHeaders["OpenAI-Beta"]) {
    requestHeaders["OpenAI-Beta"] = OPENAI_BETA_FEATURES;
  }

  let requestBody: BodyInit | undefined;

  if (
    body instanceof FormData ||
    body instanceof Blob ||
    typeof body === "string"
  ) {
    requestBody = body as BodyInit;
  } else if (body !== undefined) {
    requestBody = JSON.stringify(body);
    if (!requestHeaders["Content-Type"]) {
      requestHeaders["Content-Type"] = "application/json";
    }
  }

  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}${path.startsWith("/") ? path : `/${path}`}`;

  return {
    url,
    requestHeaders,
    requestBody,
    method,
    signal,
  };
};
