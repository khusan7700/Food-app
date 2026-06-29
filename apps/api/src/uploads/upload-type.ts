export const UPLOAD_TYPES = ['user', 'restaurant', 'menu-item'] as const;

export type UploadType = (typeof UPLOAD_TYPES)[number];

export function isUploadType(value: string): value is UploadType {
  return (UPLOAD_TYPES as readonly string[]).includes(value);
}
