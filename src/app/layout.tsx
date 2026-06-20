import type { Metadata } from "next";
import { Providers } from "@/components/providers";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "AFRICRM Shop",
    template: "%s | AFRICRM Shop",
  },
  description:
    "La caisse moderne conçue au Sénégal pour les boutiques, PME et PMI.",
  applicationName: "AFRICRM Shop",
  keywords: [
    "logiciel de caisse Sénégal",
    "gestion de stock",
    "caisse PME",
    "point de vente",
    "AFRICRM",
  ],
  openGraph: {
    title: "AFRICRM Shop — La caisse qui fait grandir votre commerce",
    description:
      "Caisse, stock, clients et pilotage réunis dans une expérience pensée pour les commerces africains.",
    locale: "fr_SN",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      className="h-full antialiased"
      data-scroll-behavior="smooth"
    >
      <body className="flex min-h-full flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
