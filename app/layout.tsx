import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { PREPAINT_SCRIPT } from "@/lib/theme";
import { APP_NAME, APP_DESCRIPTION, BRAND_COLOR } from "@/lib/brand";

// Chunky display face for headings + a clean grotesque for body — the
// risograph-zine pairing.
const display = Bricolage_Grotesque({
  variable: "--ff-display",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
});
const body = Space_Grotesk({
  variable: "--ff-body",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: `${APP_NAME} — Your Library`,
  description: APP_DESCRIPTION,
  applicationName: APP_NAME,
  appleWebApp: { capable: true, statusBarStyle: "default", title: APP_NAME },
  // Favicon + apple-touch icon come from app/icon.png and app/apple-icon.png.
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4ead8" },
    { media: "(prefers-color-scheme: dark)", color: "#181327" },
  ],
  width: "device-width",
  initialScale: 1,
  // NOTE: intentionally NOT using viewport-fit: "cover" — without safe-area
  // padding it lets edge UI slip under a phone's notch/rounded corners,
  // which reads as "a sliver of the UI is hidden / it's zoomed in".
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${display.variable} ${body.variable} h-full`}
    >
      <head>
        {/* Apply saved theme + text size before paint to avoid a flash. */}
        <script dangerouslySetInnerHTML={{ __html: PREPAINT_SCRIPT }} />
        <meta name="theme-color" content={BRAND_COLOR} />
      </head>
      <body className="min-h-full">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
