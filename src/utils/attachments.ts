import { getId } from './id';
import type { AttachmentRequest, Attachment } from '../types';


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

const readFileAsText = async (file: FileLike): Promise<string> => {
  if (typeof file.text === 'function') {
    return file.text();
  }

  if (typeof FileReader !== 'undefined') {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(reader.error ?? new Error('Unable to read file.'));
      reader.onload = () => resolve(reader.result as string);
      reader.readAsText(file as Blob);
    });
  }

  if (typeof Response === 'function') {
    const response = new Response(file);
    return response.text();
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

export const getImageAttachmentDataUrls = (
  attachments: AttachmentRequest[]
): Record<string, string> =>
  attachments.reduce<Record<string, string>>((acc, attachment) => {
    if (!attachment?.data || !attachment?.mime_type?.startsWith('image/')) {
      return acc;
    }

    const isDataUrl = attachment.data.startsWith('data:');
    const isHttpUrl = /^(https?:)?\/\//i.test(attachment.data);
    const dataUrl = isDataUrl
      ? attachment.data
      : isHttpUrl
        ? attachment.data
        : `data:${attachment.mime_type};base64,${attachment.data}`;

    acc[attachment.id] = dataUrl;
    return acc;
  }, {});

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

export const buildAttachmentRequestPayload = async (
  attachments: Attachment[]
): Promise<AttachmentRequest[]> => {
  const attachmentsWithFile = attachments.filter(hasReadableFile);

  if (!attachmentsWithFile.length) {
    return [];
  }

  return Promise.all(
    attachmentsWithFile.map(async (attachment) => ({
      id: attachment.id ?? getId(),
      filename: attachment.name ?? attachment.file.name,
      mime_type:
        attachment.type || attachment.file.type || 'application/octet-stream',
      data: await encodeFileToBase64(attachment.file),
    }))
  );
};

export const buildAttachmentPromptText = (attachments: Attachment[]): string => {
  if (!attachments.length) {
    return '';
  }

  return attachments
    .map((attachment, index) => {
      const filename =
        attachment.name ?? attachment.file?.name ?? `Attachment ${index + 1}`;
      return `attachment ${filename} content added`;
    })
    .join('\n');
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
