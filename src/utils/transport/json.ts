import type { ApiRequestOptions } from "../../types";
import type { ErrorHandler } from "../adapters/errorHandler";
import { defaultErrorHandler } from "../adapters/errorHandler";
import { buildRequest, parseJson } from "../request";
import { throwApiResponseError } from "./response";

export type ApiJsonRequestOptions<TResponse> = ApiRequestOptions & {
  errorHandler?: ErrorHandler;
  parseResponse?: (response: Response) => Promise<TResponse>;
};

export const apiJsonRequest = async <TResponse = unknown>({
  errorHandler = defaultErrorHandler,
  parseResponse,
  ...requestOptions
}: ApiJsonRequestOptions<TResponse>): Promise<TResponse> => {
  const { url, requestHeaders, requestBody, method, signal } =
    buildRequest(requestOptions);

  const response = await fetch(url, {
    method,
    body: requestBody,
    headers: requestHeaders,
    signal,
  });

  if (!response.ok) {
    await throwApiResponseError(response, errorHandler);
  }

  if (parseResponse) {
    return parseResponse(response);
  }

  return parseJson(response) as Promise<TResponse>;
};
