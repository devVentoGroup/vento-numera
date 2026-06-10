import type { Metadata } from "next";
import { Geist_Mono, Manrope } from "next/font/google";
import Script from "next/script";

import { VentoShell } from "@/components/vento/standard/vento-shell";
import "./globals.css";

const manrope = Manrope({ variable: "--font-manrope", subsets: ["latin"], weight: ["400", "500", "600", "700"], display: "swap" });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Vento OS - NUMERA",
  description: "Inteligencia economica operativa para centros de costo, gastos y rentabilidad.",
  applicationName: "Vento OS",
  authors: [{ name: "Vento Group" }],
  metadataBase: new URL("https://numera.ventogroup.co"),
  icons: { icon: "/logos/numera.svg", apple: "/logos/numera.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body className={`${manrope.variable} ${geistMono.variable} antialiased`}>
        <Script id="vento-number-wheel-guard" strategy="afterInteractive">
          {`(() => {
            if (window.__ventoNumberWheelGuard) return;
            window.__ventoNumberWheelGuard = true;
            document.addEventListener('wheel', (event) => {
              const target = event.target;
              if (!(target instanceof Element)) return;
              const input = target.closest('input[type="number"]');
              if (!input) return;
              if (document.activeElement === input) {
                input.blur();
                event.preventDefault();
              }
            }, { passive: false });
          })();`}
        </Script>
        <VentoShell>{children}</VentoShell>
      </body>
    </html>
  );
}

