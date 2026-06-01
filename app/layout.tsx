import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import AsistenteChat from "@/components/AsistenteChat";
import { BASE_URL, DEFAULT_DESCRIPTION, SITE_NAME } from "@/lib/seo";

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: { default: SITE_NAME, template: `%s | ${SITE_NAME}` },
  description: DEFAULT_DESCRIPTION,
  openGraph: {
    type: "website",
    locale: "es_ES",
    siteName: SITE_NAME,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
        <AsistenteChat />
      </body>
    </html>
  );
}
