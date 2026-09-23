import type { MetadataRoute } from "next";

/** The Property Admin app is private — nothing in it should ever reach a search engine, on staging or in production. */
export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: "*", disallow: "/" } };
}
