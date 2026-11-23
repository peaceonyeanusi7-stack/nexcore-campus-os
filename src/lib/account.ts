export const MIN_PASSWORD_LENGTH = 6;
export const PROFILE_PHOTO_MAX_BYTES = 5 * 1024 * 1024;
export const PROFILE_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

const PROFILE_PHOTO_EXTENSIONS: Record<(typeof PROFILE_PHOTO_TYPES)[number], string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export function validateProfilePhoto(file: Pick<File, "type" | "size">): string | null {
  if (!PROFILE_PHOTO_TYPES.includes(file.type as (typeof PROFILE_PHOTO_TYPES)[number])) {
    return "Choose a JPG, PNG, or WebP image.";
  }
  if (file.size > PROFILE_PHOTO_MAX_BYTES) {
    return "The photo must be 5 MB or smaller.";
  }
  return null;
}

export function passwordMeetsMinimum(password: string): boolean {
  return password.length >= MIN_PASSWORD_LENGTH;
}

export function profilePhotoObjectPath(userId: string, fileId: string, contentType: string): string | null {
  if (!PROFILE_PHOTO_TYPES.includes(contentType as (typeof PROFILE_PHOTO_TYPES)[number])) return null;
  const extension = PROFILE_PHOTO_EXTENSIONS[contentType as (typeof PROFILE_PHOTO_TYPES)[number]];
  return `${userId}/${fileId}.${extension}`;
}