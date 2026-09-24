import Image from "next/image";
import type { CSSProperties } from "react";

/** The round DHA logo inside the `.brand-logo` chip (sidebar, login screens). */
export function BrandMark({ style }: { style?: CSSProperties }) {
  return (
    <span className="brand-logo brand-logo-mark" style={style}>
      <Image src="/brand/logo-mark.png" alt="" width={256} height={256} priority />
    </span>
  );
}
