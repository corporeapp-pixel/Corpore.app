import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Corpore AI — Análise Corporal com Inteligência Artificial",
  description: "Transforme fotos corporais em um coach físico inteligente.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt">
      <body>{children}</body>
    </html>
  );
}
