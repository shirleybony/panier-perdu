import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Panier Perdu",
  description: "Relance automatique de paniers abandonnés pour boutiques Shopify et WooCommerce.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body className="bg-white text-gray-900 antialiased">{children}</body>
    </html>
  );
}
