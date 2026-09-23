import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Belt and braces alongside robots.txt and the <meta name="robots"> tag: covers responses that
  // carry no HTML, and cannot be overridden by a page's own metadata.
  async headers() {
    return [{ source: "/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] }];
  },
};

export default nextConfig;
