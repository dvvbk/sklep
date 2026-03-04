import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "react-hot-toast";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import QueryProvider from "@/components/QueryProvider";

const inter = Inter({ subsets: ["latin", "latin-ext"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: {
    default: "Złota Rybka - Sklep Wędkarski",
    template: "%s | Złota Rybka",
  },
  description:
    "Sklep wędkarski Złota Rybka – szeroki wybór wędek, kołowrotków, przynęt i akcesoriów wędkarskich.",
  keywords: ["wędkarstwo", "sklep wędkarski", "wędki", "kołowrotki", "przynęty"],
  openGraph: {
    title: "Złota Rybka - Sklep Wędkarski",
    description: "Twój partner w wędkarstwie",
    locale: "pl_PL",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pl" className={inter.variable}>
      <body className="min-h-screen flex flex-col">
        <QueryProvider>
          <Header />
          <main className="flex-1">{children}</main>
          <Footer />
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 3000,
              style: {
                background: "#1f2937",
                color: "#fff",
                borderRadius: "0.5rem",
              },
            }}
          />
        </QueryProvider>
      </body>
    </html>
  );
}
