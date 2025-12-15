import { getId } from './id';
import { buildRequest, parseJson } from './request';
import type { Attachment, AttachmentIngestionState } from '../types';

const BASE64_CHUNK_SIZE = 0x8000;
type FileLike = Pick<File, 'name' | 'type'> & {
  arrayBuffer?: () => Promise<ArrayBuffer>;
  text?: () => Promise<string>;
};

const isFileLike = (value: unknown): value is FileLike =>
  typeof value === 'object' &&
  value !== null &&
  typeof (value as Partial<FileLike>).arrayBuffer === 'function';

const readFileAsArrayBuffer = async (file: FileLike): Promise<ArrayBuffer> => {
  if (typeof file.arrayBuffer === 'function') {
    return file.arrayBuffer();
  }

  if (typeof FileReader !== 'undefined') {
    return new Promise<ArrayBuffer>((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(reader.error ?? new Error('Unable to read file.'));
      reader.onload = () => resolve(reader.result as ArrayBuffer);
      reader.readAsArrayBuffer(file as Blob);
    });
  }

  if (typeof Response === 'function') {
    const response = new Response(file);
    return response.arrayBuffer();
  }

  throw new Error('File reading is not supported in this environment.');
};

export const arrayBufferToBase64 = (buffer: ArrayBuffer) => {
  let binary = '';
  const bytes = new Uint8Array(buffer);

  for (let index = 0; index < bytes.length; index += BASE64_CHUNK_SIZE) {
    const chunk = bytes.subarray(index, index + BASE64_CHUNK_SIZE);
    binary += String.fromCharCode(...chunk);
  }

  if (typeof globalThis.btoa === 'function') {
    return globalThis.btoa(binary);
  }

  throw new Error('Base64 encoding is not supported in this environment.');
};

export const encodeFileToBase64 = async (file: FileLike) => {
  const buffer = await readFileAsArrayBuffer(file);
  return arrayBufferToBase64(buffer);
};

export const buildAttachmentsFromFiles = (files: File[]): Attachment[] =>
  files.map((file) => ({
    id: getId(),
    name: file.name,
    size: file.size,
    type: file.type,
    file,
  }));

export const normalizeMessageAttachments = (
  attachments: unknown,
  fallbackPrefix = 'attachment'
): Attachment[] => {
  if (!attachments) {
    return [];
  }

  const list: Partial<Attachment>[] = Array.isArray(attachments)
    ? (attachments as Partial<Attachment>[])
    : typeof attachments === 'object'
      ? Object.values(
          attachments as Record<string, Partial<Attachment>>
        )
      : [];

  return list.map((item, index) => {
    const numericSize = Number(item.size);
    const safeSize = Number.isFinite(numericSize) && numericSize >= 0 ? numericSize : 0;

    return {
      id: (item.id as string) ?? `${fallbackPrefix}-${index}`,
      name: item.name ?? `Attachment ${index + 1}`,
      size: safeSize,
      type: item.type ?? '',
    };
  });
};

const hasReadableFile = (
  attachment: Attachment
): attachment is Attachment & { file: FileLike } => {
  const candidate = attachment.file as unknown as FileLike | undefined;

  if (!candidate) {
    return false;
  }

  if (typeof File !== 'undefined' && candidate instanceof File) {
    return true;
  }

  return isFileLike(candidate);
};

type IngestAttachmentOptions = {
  onStatusUpdate?: (id: string, state: AttachmentIngestionState) => void;
};

const uploadFile = async (attachment: Attachment & { file: FileLike }, attachmentId: string) => {
  const filename = attachment.name ?? attachment.file.name ?? attachmentId;
  const mimeType =
    attachment.type || (attachment.file as { type?: string }).type || 'application/octet-stream';
  const formData = new FormData();
  formData.append('file', attachment.file as Blob, filename);
  formData.append('purpose', 'assistants');
  formData.append('mime_type', mimeType);

  const { url, requestHeaders, method } = buildRequest({
    path: '/v1/files',
    method: 'POST',
    body: formData,
  });

  const response = await fetch(url, {
    method,
    body: formData,
    headers: requestHeaders,
  });

  if (!response.ok) {
    throw new Error(`File upload failed (${response.status})`);
  }

  const data = await parseJson(response).catch(() => null);
  const fileId =
    (data && typeof (data as { file_id?: unknown }).file_id === 'string'
      ? (data as { file_id: string }).file_id
      : null) ||
    (data && typeof (data as { id?: unknown }).id === 'string'
      ? (data as { id: string }).id
      : null) ||
    attachmentId;

  return { fileId };
};

const normalizeFileAttachment = (attachment: Attachment, fileId: string): Attachment => ({
  id: attachment.id ?? getId(),
  name: attachment.name,
  size: attachment.size,
  type: attachment.type,
  fileId,
});

export const ingestAttachments = async (
  attachments: Attachment[],
  { onStatusUpdate }: IngestAttachmentOptions = {}
): Promise<Attachment[]> => {
  const attachmentsWithFile = attachments.filter(hasReadableFile);
  if (!attachmentsWithFile.length) {
    return [];
  }

  const ingested: Attachment[] = [];
  const errors: string[] = [];

  for (const attachment of attachmentsWithFile) {
    const attachmentId = attachment.id ?? getId();
    const updateStatus = (state: AttachmentIngestionState) =>
      onStatusUpdate?.(attachmentId, state);

    updateStatus({ status: 'uploading', message: 'Uploading attachment…' });

    try {
      const uploadResult = await uploadFile(attachment, attachmentId);
      const normalized = normalizeFileAttachment(attachment, uploadResult.fileId);

      ingested.push(normalized);
      updateStatus({ status: 'complete', message: 'Ready for chat' });
    } catch (error) {
      console.error('Attachment ingestion failed', error);
      errors.push(attachmentId);
      updateStatus({
        status: 'error',
        message: 'Unable to process attachment',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  if (errors.length) {
    throw new Error('One or more attachments failed to ingest');
  }

  return ingested;
};

const FILE_SIZE_UNITS = ['B', 'KB', 'MB', 'GB', 'TB'];

export const formatFileSize = (bytes: number) => {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return '0 B';
  }

  const exponent = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    FILE_SIZE_UNITS.length - 1
  );
  const value = bytes / 1024 ** exponent;

  if (value >= 100) {
    return `${Math.round(value)} ${FILE_SIZE_UNITS[exponent]}`;
  }

  const decimals = value < 10 ? 1 : 0;
  return `${value.toFixed(decimals)} ${FILE_SIZE_UNITS[exponent]}`;
};

export const getAttachmentDisplayType = ({
  name,
  type,
}: Pick<Attachment, 'name' | 'type'>) => {
  const extension = name?.split('.').pop();
  if (extension && extension.length <= 5) {
    return extension.toUpperCase();
  }

  if (type) {
    const subtype = type.split('/')[1];
    if (subtype) {
      return subtype.toUpperCase();
    }
    return type.toUpperCase();
  }

  return '';
};
