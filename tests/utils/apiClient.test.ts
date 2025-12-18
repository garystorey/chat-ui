import { afterEach, describe, expect, it, vi } from 'vitest';

import { API_BASE_URL } from '../../src/config';
import { apiStreamRequest } from '../../src/utils';

const encoder = new TextEncoder();
const createSseResponse = (chunks: string[], status = 200) =>
  new Response(
    new ReadableStream({
      start(controller) {
        chunks.forEach((chunk) => controller.enqueue(encoder.encode(chunk)));
        controller.close();
      },
    }),
    {
      status,
      headers: {
        'content-type': 'text/event-stream',
      },
    }
  );

describe('apiStreamRequest', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns parsed JSON for non-stream responses', async () => {
    const responseData = { status: 'ok', payload: { id: '123' } };
    const response = new Response(JSON.stringify(responseData), {
      status: 200,
      headers: {
        'content-type': 'application/json',
      },
    });

    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(response);

    const result = await apiStreamRequest<{ message: string }, typeof responseData>({
      path: '/test',
      method: 'POST',
      body: { query: 'hello' },
      headers: { 'x-test': 'true' },
      buildResponse: () => responseData,
    });

    expect(result).toEqual(responseData);
    expect(fetchMock).toHaveBeenCalledWith(`${API_BASE_URL}/test`, {
      method: 'POST',
      body: JSON.stringify({ query: 'hello' }),
      headers: expect.objectContaining({
        Accept: 'text/event-stream',
        'Content-Type': 'application/json',
        'x-test': 'true',
      }),
      signal: undefined,
    });
  });

  it('throws an ApiError with parsed response information when the request fails', async () => {
    const response = new Response(JSON.stringify({ message: 'Failure' }), {
      status: 500,
      statusText: 'Internal',
      headers: { 'content-type': 'application/json' },
    });

    vi.spyOn(globalThis, 'fetch').mockResolvedValue(response);

    await expect(
      apiStreamRequest<{ message: string }, { data: string }>({
        path: '/error',
        buildResponse: () => ({ data: 'noop' }),
      })
    ).rejects.toMatchObject({
      message: 'Failure',
      status: 500,
      data: { message: 'Failure' },
    });
  });

  it('streams SSE messages, parsing and forwarding each message to callbacks', async () => {
    const response = createSseResponse([
      'data: {"text":"first"}\n\n',
      'data: {"text":"se',
      'cond"}\n\n',
      'data: [DONE]\n\n',
    ]);

    vi.spyOn(globalThis, 'fetch').mockResolvedValue(response);
    const onMessage = vi.fn();
    const parseMessage = vi.fn((data: string) => JSON.parse(data) as { text: string });
    const buildResponse = vi.fn((messages: { text: string }[]) => messages.map((m) => m.text));

    const result = await apiStreamRequest<{ text: string }, string[]>({
      path: '/stream',
      onMessage,
      parseMessage,
      buildResponse,
    });

    expect(parseMessage).toHaveBeenCalledTimes(2);
    expect(onMessage).toHaveBeenCalledTimes(2);
    expect(onMessage).toHaveBeenCalledWith({ text: 'first' });
    expect(onMessage).toHaveBeenCalledWith({ text: 'second' });
    expect(buildResponse).toHaveBeenCalledWith([{ text: 'first' }, { text: 'second' }]);
    expect(result).toEqual(['first', 'second']);
  });

  it('logs parse errors and continues processing subsequent SSE messages', async () => {
    const response = createSseResponse([
      'data: {"text":"ok"}\n\n',
      'data: invalid-json\n\n',
      'data: [DONE]\n\n',
    ]);

    vi.spyOn(globalThis, 'fetch').mockResolvedValue(response);
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const buildResponse = vi.fn((messages: unknown[]) => messages);

    const result = await apiStreamRequest<{ text: string }, unknown[]>({
      path: '/stream',
      buildResponse,
    });

    expect(consoleSpy).toHaveBeenCalled();
    expect(result).toEqual([{ text: 'ok' }]);
    expect(buildResponse).toHaveBeenCalledWith([{ text: 'ok' }]);
  });
});
