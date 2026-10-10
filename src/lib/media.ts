import type { ProjectMedia, PropertyMedia } from "@/types/api";

/** The listing's cover photo, or its first photo. */
export function coverPhoto(media: PropertyMedia[] | undefined): PropertyMedia | undefined {
  return media?.find((item) => item.type === "image" && item.is_cover) ?? media?.find((item) => item.type === "image");
}

/** Small image for lists and cards (≈480px), falling back to the original. */
export function thumbnailUrl(media: PropertyMedia | ProjectMedia | undefined): string | undefined {
  return media ? media.thumbnail_url || media.url : undefined;
}

/** Larger image for previews (≈1280px), falling back to the original. */
export function mediumUrl(media: PropertyMedia | ProjectMedia | undefined): string | undefined {
  return media ? media.medium_url || media.url : undefined;
}

export type ImageSize = "thumbnail" | "medium" | "full";

const SIZE_SUFFIX = { thumbnail: "-480.webp", medium: "-1280.webp" } as const;

/** Smaller copy of an uploaded image: the API stores {name}-full.{ext} with -1280.webp and -480.webp beside it. Other URLs come back unchanged. */
export function sizedImage<T extends string | null | undefined>(url: T, size: ImageSize): T {
  if (!url || size === "full") {
    return url;
  }

  return url.replace(/-full\.[a-z0-9]+(?=$|\?)/i, SIZE_SUFFIX[size]) as T;
}
