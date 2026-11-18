import type { Metadata } from "next";
import { Inter_Tight } from "next/font/google";
import "./globals.css";

// Inter Tight: compacta e legível em texto pequeno, com números de largura fixa (tabular-nums).
const interTight = Inter_Tight({
  variable: "--font-inter-tight",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Shelper",
  description: "Board ágil com métricas de fluxo calculadas automaticamente.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt-BR"
      className={`${interTight.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
