import type { PropertyMedia } from "@/types/api";

/** The listing's cover photo, or its first photo. */
export function coverPhoto(media: PropertyMedia[] | undefined): PropertyMedia | undefined {
  return media?.find((item) => item.type === "image" && item.is_cover) ?? media?.find((item) => item.type === "image");
}

/** Small image for lists and cards (≈480px), falling back to the original. */
export function thumbnailUrl(media: PropertyMedia | undefined): string | undefined {
  return media ? media.thumbnail_url || media.url : undefined;
}

/** Larger image for previews (≈1280px), falling back to the original. */
export function mediumUrl(media: PropertyMedia | undefined): string | undefined {
  return media ? media.medium_url || media.url : undefined;
}
