import "@fontsource-variable/inter";
import "@fontsource-variable/plus-jakarta-sans";
import { AntdRegistry } from "@ant-design/nextjs-registry";
import type { Metadata } from "next";
import { Providers } from "./providers";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "DHA GUJ Property Portal", template: "%s · DHA GUJ Property Portal" },
  description: "Manage your property listings, plan and quota",
  // A private app: keep it out of search results wherever it is deployed.
  robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false, noimageindex: true } },
};

/** Applies the saved light/dark mode before first paint to avoid a white flash in dark mode. */
const themeScript = `(function(){try{var s=JSON.parse(localStorage.getItem('dha-portal-theme')||'{}');var m=s.mode||'system';var d=m==='dark'||(m==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.dataset.theme=d?'dark':'light';}catch(e){}})();`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <AntdRegistry>
          <Providers>{children}</Providers>
        </AntdRegistry>
      </body>
    </html>
  );
}
