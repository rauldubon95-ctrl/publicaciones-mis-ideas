import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import AsistenteChat from "@/components/AsistenteChat";
import JsonLd from "@/components/JsonLd";
import { BASE_URL, DEFAULT_DESCRIPTION, SITE_NAME } from "@/lib/seo";

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: { default: SITE_NAME, template: `%s | ${SITE_NAME}` },
  description: DEFAULT_DESCRIPTION,
  openGraph: {
    type: "website",
    locale: "es_ES",
    siteName: SITE_NAME,
    images: [
      {
        url: "/og-image-rauldubon.png",
        width: 1200,
        height: 630,
        alt: "Raúl Dubón — Divulgación académica",
        type: "image/png",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_NAME,
    description: DEFAULT_DESCRIPTION,
    images: ["/og-image-rauldubon.png"],
  },
};

const personaJsonLd = {
  "@context": "https://schema.org",
  "@type": "Person",
  name: SITE_NAME,
  url: BASE_URL,
  description: DEFAULT_DESCRIPTION,
  jobTitle: "Investigador en ciencias sociales",
  knowsAbout: [
    "Sociología",
    "Ciencias sociales",
    "América Latina",
    "Historia",
    "Análisis político",
  ],
};

const sitioJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: SITE_NAME,
  url: BASE_URL,
  description: DEFAULT_DESCRIPTION,
  inLanguage: "es",
  author: { "@type": "Person", name: SITE_NAME, url: BASE_URL },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="min-h-screen flex flex-col">
        <JsonLd data={[personaJsonLd, sitioJsonLd]} />
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
        <AsistenteChat />
      </body>
    </html>
  );
}
