import type { Amenity } from "@/types/api";

export type AmenityBlock<T extends Amenity> = {
  key: string;
  /** Null when nothing is grouped, so a plain list needs no "Other" heading. */
  label: string | null;
  amenities: T[];
};

/** Amenities under their group headings: groups in their sort order, ungrouped ones last under "Other". */
export function groupAmenities<T extends Amenity>(amenities: T[]): AmenityBlock<T>[] {
  const blocks = new Map<string, AmenityBlock<T> & { sort: number }>();

  for (const amenity of amenities) {
    const key = amenity.group ? `group-${amenity.group.id}` : "other";
    const block = blocks.get(key) ?? { key, label: amenity.group?.name ?? "Other", amenities: [], sort: amenity.group?.sort_order ?? Number.MAX_SAFE_INTEGER };
    block.amenities.push(amenity);
    blocks.set(key, block);
  }

  const sorted = [...blocks.values()].sort((a, b) => a.sort - b.sort || (a.label ?? "").localeCompare(b.label ?? ""));

  return sorted.map(({ key, label, amenities: items }) => ({ key, label: sorted.length === 1 && key === "other" ? null : label, amenities: items }));
}
