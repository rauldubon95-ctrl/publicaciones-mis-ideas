import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import AsistenteChat from "@/components/AsistenteChat";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "https://rauldubon.org"),
  title: { default: "Raúl Dubón", template: "%s | Raúl Dubón" },
  description: "Espacio de divulgación académica, proyectos e ideas de Raúl Dubón",
  openGraph: {
    type: "website",
    locale: "es_ES",
    siteName: "Raúl Dubón",
  },
  alternates: {
    canonical: "/",
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
